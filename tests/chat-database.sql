begin;
select set_config('test.owner',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('test.owner')::uuid,'authenticated','authenticated');
select set_config('test.workspace',gen_random_uuid()::text,true);
insert into public.streamer_workspaces(id,owner_user_id,name) values(current_setting('test.workspace')::uuid,current_setting('test.owner')::uuid,'ISOLATED CHAT QA - ROLLBACK');
insert into public.stream_giveaway_sessions(workspace_id,platform,keyword,status,starts_at) values(current_setting('test.workspace')::uuid,'both','PARTICIPO','active',now()-interval '1 minute');
set local role service_role;
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','qa-1','viewer','VIEWER','participo',now());
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','qa-1','viewer','VIEWER','participo',now());
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'kick','qa-1','viewer','VIEWER','participo',now());
do $$ begin
 if(select count(*) from public.stream_chat_messages where workspace_id=current_setting('test.workspace')::uuid)<>2 then raise exception 'Dedup/platform isolation failed';end if;
 if(select count(*) from public.stream_giveaway_entries e join public.stream_giveaway_sessions s on e.session_id=s.id where s.workspace_id=current_setting('test.workspace')::uuid)<>2 then raise exception 'Giveaway reception failed';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if(select count(*) from public.stream_chat_messages where workspace_id=current_setting('test.workspace')::uuid)<>2 then raise exception 'Owner read failed';end if;
 begin perform public.stream_chat_ingest(current_setting('test.workspace')::uuid,'kick','fake','fake','fake','A',now());raise exception 'Forgery allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.stream_chat_messages where workspace_id=current_setting('test.workspace')::uuid) then raise exception 'Cross-owner leak';end if;
end $$;
reset role;
rollback;
select 'PASS: real role permissions, deduplication, platform isolation, giveaway registration, owner read, forgery denied, cross-owner read denied; fixtures rolled back' as result;
