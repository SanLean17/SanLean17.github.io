begin;
select set_config('test.owner',gen_random_uuid()::text,true);
select set_config('test.workspace',gen_random_uuid()::text,true);
select set_config('test.session',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role) values(current_setting('test.owner')::uuid,'authenticated','authenticated');
insert into public.streamer_workspaces(id,owner_user_id,name) values(current_setting('test.workspace')::uuid,current_setting('test.owner')::uuid,'EXCLUSION QA ROLLBACK');
insert into public.stream_giveaway_sessions(id,workspace_id,platform,keyword,status,starts_at)
values(current_setting('test.session')::uuid,current_setting('test.workspace')::uuid,'both','TULIPÁN','active',now()-interval '1 minute');
set local role service_role;
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','one','viewer','VIEWER','tulipan',now(),'{}');
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'kick','one','viewer','VIEWER','TULIPÁN',now(),'{}');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
set local role authenticated;
update public.stream_giveaway_entries set excluded=true where session_id=current_setting('test.session')::uuid and platform='twitch';
do $$ begin
 if(select count(*) from public.stream_giveaway_entries where session_id=current_setting('test.session')::uuid and excluded)<>1 then raise exception 'Owner exclusion/platform isolation failed';end if;
 begin update public.stream_giveaway_entries set eligible=false where session_id=current_setting('test.session')::uuid;raise exception 'Eligibility tampering allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role service_role;
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','two','viewer','RENAMED','TULIPAN',now(),'{"is_subscriber":true}');
do $$ begin
 if not exists(select 1 from public.stream_giveaway_entries where session_id=current_setting('test.session')::uuid and platform='twitch' and excluded) then raise exception 'Chat cleared exclusion';end if;
end $$;
reset role;
set local role authenticated;
update public.stream_giveaway_sessions set status='closed' where id=current_setting('test.session')::uuid;
update public.stream_giveaway_sessions set status='active' where id=current_setting('test.session')::uuid;
do $$ begin
 if not exists(select 1 from public.stream_giveaway_entries where session_id=current_setting('test.session')::uuid and excluded) then raise exception 'Reopening cleared exclusion';end if;
end $$;
update public.stream_giveaway_entries set excluded=false where session_id=current_setting('test.session')::uuid and platform='twitch';
do $$ begin
 if exists(select 1 from public.stream_giveaway_entries where session_id=current_setting('test.session')::uuid and excluded) then raise exception 'Reauthorization failed';end if;
end $$;
update public.stream_giveaway_entries set excluded=true where session_id=current_setting('test.session')::uuid and platform='twitch';
reset role;
select set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare n integer;begin
 update public.stream_giveaway_entries set excluded=false where session_id=current_setting('test.session')::uuid;get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-owner moderation allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner'),'role','authenticated')::text,true);
set local role authenticated;
update public.stream_giveaway_sessions set status='finished' where id=current_setting('test.session')::uuid;
do $$ declare n integer;begin
 update public.stream_giveaway_entries set excluded=false where session_id=current_setting('test.session')::uuid;get diagnostics n=row_count;
 if n<>0 then raise exception 'Finished session modified';end if;
end $$;
insert into public.stream_giveaway_sessions(workspace_id,platform,keyword,status,starts_at)
values(current_setting('test.workspace')::uuid,'both','TULIPÁN','active',now()-interval '1 minute');
reset role;
set local role service_role;
select public.stream_chat_ingest(current_setting('test.workspace')::uuid,'twitch','new-session','viewer','VIEWER','tulipán',now(),'{}');
do $$ begin
 if not exists(select 1 from public.stream_giveaway_entries e join public.stream_giveaway_sessions s on s.id=e.session_id where s.workspace_id=current_setting('test.workspace')::uuid and s.status='active' and e.eligible and not e.excluded) then raise exception 'New session inherited exclusion';end if;
end $$;
reset role;
rollback;
select 'PASS: exclude, repeated keyword and rename remain blocked, platform isolation, close/reopen, reauthorize, new session resets, owner authorization, field permissions and finished session protection; rollback' as result;
