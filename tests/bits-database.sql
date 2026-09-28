-- All fixture rows are rolled back. This does not create donations for a real stream.
begin;
select set_config('test.owner',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('test.owner')::uuid,'authenticated','authenticated');
select set_config('test.workspace',gen_random_uuid()::text,true);
insert into public.streamer_workspaces(id,owner_user_id,name) values(current_setting('test.workspace')::uuid,current_setting('test.owner')::uuid,'ISOLATED QA - ROLLBACK');
insert into public.stream_bits_channels(workspace_id,broadcaster_id,subscription_id,connected) values(current_setting('test.workspace')::uuid,'qa-broadcaster','qa-subscription',true);
insert into public.stream_bits_rules(workspace_id,bits,kind,item_key,item_name,image,quantity,duration_minutes) values(current_setting('test.workspace')::uuid,300,'killers','leatherface','BUBBA','../assets/killers/K09_TheCannibal_Portrait.png',2,60);
set local role service_role;
do $$ begin
 if not public.stream_bits_ingest('qa-message-1','qa-broadcaster',300,'QA DONOR') then raise exception 'First delivery failed'; end if;
 if public.stream_bits_ingest('qa-message-1','qa-broadcaster',300,'QA DONOR') then raise exception 'Duplicate delivered twice'; end if;
 if public.stream_bits_ingest('qa-message-2','qa-broadcaster',301,'QA DONOR') then raise exception 'Wrong amount matched'; end if;
 if public.stream_bits_ingest('qa-message-3','unconnected-channel',300,'QA DONOR') then raise exception 'Unconnected channel matched'; end if;
 if (select count(*) from public.stream_bits_bonuses where workspace_id=current_setting('test.workspace')::uuid)<>2 then raise exception 'Wrong bonus count'; end if;
 if (select count(*) from public.stream_bits_events where workspace_id=current_setting('test.workspace')::uuid)<>1 then raise exception 'Wrong alert count'; end if;
 if exists(select 1 from public.stream_bits_bonuses where workspace_id=current_setting('test.workspace')::uuid and expires_at is null) then raise exception 'Expiration missing'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.stream_bits_rules where workspace_id=current_setting('test.workspace')::uuid)<>1 then raise exception 'Owner cannot read'; end if;
 begin perform public.stream_bits_ingest('forged','qa-broadcaster',300,'FAKE');raise exception 'Client can forge bits';exception when insufficient_privilege then null;end;
 begin perform 1 from public.stream_bits_channels;raise exception 'Client can access verified channels';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.stream_bits_rules where workspace_id=current_setting('test.workspace')::uuid) then raise exception 'Cross-owner read'; end if;
 update public.stream_bits_rules set bits=999 where workspace_id=current_setting('test.workspace')::uuid;
 if found then raise exception 'Cross-owner write'; end if;
end $$;
reset role;
rollback;
select 'PASS: exact amount, idempotency, quantity, expiry, channel verification, owner access, cross-owner denial, forged-event denial; all fixture rows rolled back' as result;
