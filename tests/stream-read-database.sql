-- Synthetic owners/workspaces only; ROLLBACK keeps production state intact.
begin;
select set_config('test.owner',gen_random_uuid()::text,true);
select set_config('test.other_owner',gen_random_uuid()::text,true);
select set_config('test.workspace',gen_random_uuid()::text,true);
select set_config('test.other',gen_random_uuid()::text,true);
select set_config('test.token',gen_random_uuid()::text,true);
select set_config('test.other_token',gen_random_uuid()::text,true);
select set_config('test.view',gen_random_uuid()::text,true);
select set_config('test.control',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('test.owner')::uuid,'authenticated','authenticated');
insert into auth.users(id,aud,role) values(current_setting('test.other_owner')::uuid,'authenticated','authenticated');
insert into public.streamer_workspaces(id,owner_user_id,name) values
 (current_setting('test.workspace')::uuid,current_setting('test.owner')::uuid,'READ QA ROLLBACK'),
 (current_setting('test.other')::uuid,current_setting('test.other_owner')::uuid,'OTHER READ QA ROLLBACK');
insert into public.stream_bits_settings(workspace_id,alert_token) values
 (current_setting('test.workspace')::uuid,current_setting('test.token')::uuid),
 (current_setting('test.other')::uuid,current_setting('test.other_token')::uuid)
on conflict(workspace_id) do update set alert_token=excluded.alert_token;
insert into public.stream_overlays(workspace_id,kind,public_token,control_token,settings,state,is_enabled)
values(current_setting('test.workspace')::uuid,'roulette_killers',current_setting('test.view')::uuid,current_setting('test.control')::uuid,'{"pool":[{"key":"a"}]}','{"visible":true}',true)
on conflict(workspace_id,kind) do update set public_token=excluded.public_token,control_token=excluded.control_token,settings=excluded.settings,state=excluded.state,is_enabled=true;
-- Explicit synthetic IDs do not advance the production identity sequence.
insert into public.stream_bits_events(id,workspace_id,donor,bits,item_name,image,kind,quantity,alert_style,created_at) overriding system value
select 900000000000000000+n,current_setting('test.workspace')::uuid,'QA',300,'QA','../killer/01_agitation.png','killers',1,'neutral',now() from generate_series(1,55)n;
insert into public.stream_bits_events(id,workspace_id,donor,bits,item_name,image,kind,quantity,alert_style) overriding system value
values(900000000000000090,current_setting('test.other')::uuid,'OTHER',300,'OTHER','','killers',1,'neutral');
insert into public.stream_bits_bonuses(workspace_id,event_id,kind,item_key,donor,expires_at,paused_remaining_seconds) values
 (current_setting('test.workspace')::uuid,900000000000000001,'killers','qa','QA',now()+interval '1 hour',null),
 (current_setting('test.workspace')::uuid,900000000000000002,'killers','qa','QA',now()-interval '1 hour',30),
 (current_setting('test.workspace')::uuid,900000000000000003,'killers','qa','QA',null,null);
set local role anon;
do $$ declare first_read record; unchanged record; feed jsonb; begin
 select * into first_read from public.get_stream_overlay_delta(current_setting('test.view'));
 if first_read.payload->>'can_control'<>'false' then raise exception 'View control leak'; end if;
 select * into unchanged from public.get_stream_overlay_delta(current_setting('test.view'),first_read.revision);
 if unchanged.payload is not null then raise exception 'Unchanged payload repeated'; end if;
 if exists(select 1 from public.get_stream_overlay_delta('invalid')) then raise exception 'Invalid overlay token accepted'; end if;
 if public.update_stream_overlay_by_control(current_setting('test.view'),'{}') then raise exception 'View token wrote'; end if;
 if not public.update_stream_overlay_by_control(current_setting('test.control'),'{"visible":false}') then raise exception 'Control token failed'; end if;
 if not exists(select 1 from public.get_stream_overlay_delta(current_setting('test.view'),first_read.revision) where payload is not null) then raise exception 'Changed state missed'; end if;
 begin perform public.get_stream_bits_feed('invalid');raise exception 'Invalid Bits token accepted';exception when insufficient_privilege then null;end;
 begin perform public.get_stream_bits_feed(current_setting('test.token'),'-1');raise exception 'Invalid cursor accepted';exception when invalid_parameter_value then null;end;
 begin perform public.get_stream_bits_feed(current_setting('test.token'),null,'invalid');raise exception 'Invalid mode accepted';exception when invalid_parameter_value then null;end;
 feed:=public.get_stream_bits_feed(current_setting('test.token'));
 if feed->>'cursor'<>'900000000000000055' or jsonb_array_length(feed->'events')<>0 then raise exception 'Initial history replay';end if;
 feed:=public.get_stream_bits_feed(current_setting('test.token'),'0');
 if jsonb_array_length(feed->'events')<>50 or feed->>'cursor'<>'900000000000000050' then raise exception 'Pagination failed';end if;
 feed:=public.get_stream_bits_feed(current_setting('test.token'),feed->>'cursor');
 if jsonb_array_length(feed->'events')<>5 or feed->>'cursor'<>'900000000000000055' then raise exception 'Page lost/cross-workspace leak';end if;
 feed:=public.get_stream_bits_feed(current_setting('test.token'),feed->>'cursor');
 if jsonb_array_length(feed->'events')<>0 or feed->>'cursor'<>'900000000000000055' then raise exception 'Idle cursor changed';end if;
 feed:=public.get_stream_bits_feed(current_setting('test.token'),null,'active');
 if jsonb_array_length(feed->'active')<>2 or jsonb_array_length(feed->'events')<>0 then raise exception 'Active expiry/isolation failed';end if;
 begin perform 1 from public.stream_bits_events;raise exception 'Anonymous table read granted';exception when insufficient_privilege then null;end;
 begin perform public.stream_bits_ingest('qa-forged','none',300,'QA');raise exception 'Anonymous write granted';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.stream_bits_settings set timers_paused=true where workspace_id=current_setting('test.workspace')::uuid;
update public.stream_overlays set is_enabled=false where workspace_id=current_setting('test.workspace')::uuid;
set local role anon;
do $$ declare feed jsonb;begin
 if exists(select 1 from public.get_stream_overlay_delta(current_setting('test.view'))) then raise exception 'Disabled overlay exposed';end if;
 feed:=public.get_stream_bits_feed(current_setting('test.token'),null,'active');
 if jsonb_array_length(feed->'active')<>2 or feed->>'timersPaused'<>'true' then raise exception 'Paused expiration failed';end if;
end $$;
reset role;
rollback;
select 'PASS: token authorization, view/control separation, delta, revocation, workspace isolation, pagination, initial history, expiry/pause, denied table reads/writes; fixtures rolled back' as result;
