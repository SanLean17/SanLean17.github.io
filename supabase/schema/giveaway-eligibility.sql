grant update(eligible,eligibility,participant_name) on public.stream_giveaway_entries to service_role;
-- Metadata is supplied only by verified platform webhooks using service_role.
alter table public.stream_chat_messages add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.stream_giveaway_sessions add column if not exists follower_only boolean not null default false;
alter table public.stream_giveaway_sessions add column if not exists min_follower_months integer not null default 0 check(min_follower_months>=0);
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.stream_giveaway_sessions'::regclass and contype='c' and pg_get_constraintdef(oid) like '%status%' loop
  execute format('alter table public.stream_giveaway_sessions drop constraint %I',c.conname);
 end loop;
 alter table public.stream_giveaway_sessions add constraint stream_giveaway_sessions_status_check check(status in ('draft','active','closed','cancelled','finished'));
end $$;
create or replace function public.stream_chat_ingest(p_workspace uuid,p_platform text,p_message_id text,p_user_id text,p_username text,p_message text,p_sent_at timestamptz,p_metadata jsonb)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare inserted_id bigint; meta jsonb:=coalesce(p_metadata,'{}'::jsonb);
begin
 if p_platform not in ('twitch','kick') or length(p_message)>4000 or length(p_user_id)=0 then raise exception 'invalid message'; end if;
 insert into public.stream_chat_messages(workspace_id,platform,message_id,user_id,username,message,sent_at,metadata)
 values(p_workspace,p_platform,p_message_id,p_user_id,left(p_username,100),p_message,p_sent_at,meta)
 on conflict(workspace_id,platform,message_id) do nothing returning id into inserted_id;
 if inserted_id is null then return; end if;
 insert into public.stream_giveaway_entries(session_id,platform,participant_external_id,participant_name,message_id,eligible,eligibility)
 select s.id,p_platform,p_user_id,left(p_username,100),p_message_id,
 (not s.subscriber_only or coalesce((meta->>'is_subscriber')::boolean,false))
 and (not s.vip_only or coalesce((meta->>'is_vip')::boolean,false))
 and (not s.moderator_only or coalesce((meta->>'is_moderator')::boolean,false))
 and (not(s.follower_only or coalesce(s.min_follower_days,0)>0 or s.min_follower_months>0)
  or (coalesce((meta->>'is_follower')::boolean,false)
   and (coalesce(s.min_follower_days,0)=0 or coalesce((meta->>'followed_at')::timestamptz,'infinity'::timestamptz)<=p_sent_at-make_interval(days=>s.min_follower_days))
   and (s.min_follower_months=0 or coalesce((meta->>'followed_at')::timestamptz,'infinity'::timestamptz)<=p_sent_at-make_interval(months=>s.min_follower_months)))),
 meta||jsonb_build_object('source','verified_chat')
 from public.stream_giveaway_sessions s
 where s.workspace_id=p_workspace and s.status='active' and s.platform in (p_platform,'both')
 and p_sent_at>=s.starts_at
 and lower(regexp_replace(normalize(trim(p_message),NFD),U&'[\0300-\036f]','','g'))=lower(regexp_replace(normalize(trim(s.keyword),NFD),U&'[\0300-\036f]','','g'))
 on conflict(session_id,platform,participant_external_id) do update
 set eligible=excluded.eligible,eligibility=excluded.eligibility,participant_name=excluded.participant_name
 where not stream_giveaway_entries.eligible;
end $$;
revoke all on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz,jsonb) to service_role;
-- Compatibility for old webhook deployments; absence of metadata cannot pass role filters.
create or replace function public.stream_chat_ingest(p_workspace uuid,p_platform text,p_message_id text,p_user_id text,p_username text,p_message text,p_sent_at timestamptz)
returns void language sql security invoker set search_path=public,pg_temp as $$
 select public.stream_chat_ingest(p_workspace,p_platform,p_message_id,p_user_id,p_username,p_message,p_sent_at,'{}'::jsonb);
$$;
revoke all on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz) to service_role;
