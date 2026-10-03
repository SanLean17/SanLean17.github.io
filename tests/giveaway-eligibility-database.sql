begin;
select set_config('test.owner',gen_random_uuid()::text,true);
select set_config('test.workspace',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('test.owner')::uuid,'authenticated','authenticated');
insert into public.streamer_workspaces(id,owner_user_id,name) values(current_setting('test.workspace')::uuid,current_setting('test.owner')::uuid,'ISOLATED GIVEAWAY QA - ROLLBACK');
insert into public.stream_giveaway_sessions(workspace_id,platform,keyword,status,starts_at,subscriber_only,vip_only,moderator_only,follower_only,min_follower_months)
values(current_setting('test.workspace')::uuid,'twitch','TULIPÁN','active',now()-interval '1 minute',true,true,true,true,2);
set local role service_role;
do $$ declare meta jsonb:=jsonb_build_object('is_subscriber',true,'is_vip',true,'is_moderator',true,'is_follower',true,'followed_at',now()-interval '3 months'); begin
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','qualified','qualified','Qualified','tulipan',now(),meta);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','missing-sub','missing-sub','MissingSub','tulipán',now(),meta||'{"is_subscriber":false}'::jsonb);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','missing-vip','missing-vip','MissingVip','TULIPAN',now(),meta||'{"is_vip":false}'::jsonb);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','missing-mod','missing-mod','MissingMod','TULIPAN',now(),meta||'{"is_moderator":false}'::jsonb);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','missing-follow','missing-follow','MissingFollow','TULIPAN',now(),meta||'{"is_follower":false}'::jsonb);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','too-new','too-new','TooNew','TULIPAN',now(),meta||jsonb_build_object('followed_at',now()-interval '1 month'));
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','missing-date','missing-date','MissingDate','TULIPAN',now(),meta-'followed_at');
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','legacy','legacy','Legacy','TULIPAN',now());
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'kick','other-platform','other-platform','Other','TULIPAN',now(),meta);
 if(select count(*) from public.stream_giveaway_entries e join public.stream_giveaway_sessions s on s.id=e.session_id where s.workspace_id=current_setting('test.workspace')::uuid and e.eligible)<>1 then raise exception 'Filters did not reject unqualified messages';end if;
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','now-qualified','missing-sub','NowQualified','TULIPAN',now(),meta);
 perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','duplicate-participant','qualified','Qualified','TULIPAN',now(),meta);
 if(select count(*) from public.stream_giveaway_entries e join public.stream_giveaway_sessions s on s.id=e.session_id where s.workspace_id=current_setting('test.workspace')::uuid and e.eligible)<>2 then raise exception 'Upgrade/dedup failed';end if;
end $$;
reset role;
update public.stream_giveaway_sessions set status='closed' where workspace_id=current_setting('test.workspace')::uuid;
set local role service_role;
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','closed','closed','Closed','TULIPAN',now(),'{"is_subscriber":true,"is_vip":true,"is_moderator":true,"is_follower":true,"followed_at":"2020-01-01T00:00:00Z"}'::jsonb);
do $$ begin
 if exists(select 1 from public.stream_giveaway_entries e join public.stream_giveaway_sessions s on s.id=e.session_id where s.workspace_id=current_setting('test.workspace')::uuid and e.participant_external_id='closed') then raise exception 'Closed session accepted entry';end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
 begin perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','forged','forged','Forged','TULIPAN',now(),'{"is_subscriber":true}'::jsonb);raise exception 'Client forged metadata';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: all real filters, calendar months, missing metadata, legacy clients, platform isolation, unique entries, renewed eligibility, closed participation and forged metadata denied; fixtures rolled back' as result;
