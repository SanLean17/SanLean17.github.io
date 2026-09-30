-- Verified platform messages; clients cannot insert or impersonate viewers.
create table if not exists public.stream_chat_subscriptions (
 workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 platform text not null check(platform in ('twitch','kick')),
 broadcaster_id text not null, subscription_id text, connected boolean not null default false,
 primary key(workspace_id,platform), unique(platform,broadcaster_id)
);
alter table public.stream_chat_subscriptions enable row level security;
revoke all on public.stream_chat_subscriptions from public,anon,authenticated;
grant all on public.stream_chat_subscriptions to service_role;
create table if not exists public.stream_chat_messages (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 platform text not null check(platform in ('twitch','kick')),
 message_id text not null, user_id text not null, username text not null,
 message text not null check(length(message)<=4000), sent_at timestamptz not null,
 created_at timestamptz not null default now(), unique(workspace_id,platform,message_id)
);
create index if not exists stream_chat_workspace_cursor on public.stream_chat_messages(workspace_id,id);
alter table public.stream_chat_messages enable row level security;
revoke all on public.stream_chat_messages from public,anon,authenticated;
grant select on public.stream_chat_messages to authenticated;
grant all on public.stream_chat_messages to service_role;
grant usage,select on sequence public.stream_chat_messages_id_seq to service_role;
create policy chat_messages_read on public.stream_chat_messages for select to authenticated
 using(private.sanlean_has_workspace_access(workspace_id,'votes') or private.sanlean_has_workspace_access(workspace_id,'giveaways'));

grant select on public.stream_giveaway_sessions to service_role;
grant select,insert on public.stream_giveaway_entries to service_role;
grant usage,select on sequence public.stream_giveaway_entries_id_seq to service_role;
create or replace function public.stream_chat_ingest(p_workspace uuid,p_platform text,p_message_id text,p_user_id text,p_username text,p_message text,p_sent_at timestamptz)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare inserted_id bigint;
begin
 if p_platform not in ('twitch','kick') or length(p_message)>4000 or length(p_user_id)=0 then raise exception 'invalid message'; end if;
 insert into public.stream_chat_messages(workspace_id,platform,message_id,user_id,username,message,sent_at)
 values(p_workspace,p_platform,p_message_id,p_user_id,left(p_username,100),p_message,p_sent_at)
 on conflict(workspace_id,platform,message_id) do nothing returning id into inserted_id;
 if inserted_id is null then return; end if;
 insert into public.stream_giveaway_entries(session_id,platform,participant_external_id,participant_name,message_id,eligible,eligibility)
 select s.id,p_platform,p_user_id,left(p_username,100),p_message_id,
 not (coalesce(s.min_follower_days,0)>0 or coalesce(s.subscriber_only,false) or coalesce(s.vip_only,false) or coalesce(s.moderator_only,false)),
 jsonb_build_object('source','verified_chat','restrictions_pending',coalesce(s.min_follower_days,0)>0 or coalesce(s.subscriber_only,false) or coalesce(s.vip_only,false) or coalesce(s.moderator_only,false))
 from public.stream_giveaway_sessions s
 where s.workspace_id=p_workspace and s.status='active' and s.platform in (p_platform,'both')
 and p_sent_at>=s.starts_at and lower(trim(p_message))=lower(trim(s.keyword))
 on conflict(session_id,platform,participant_external_id) do nothing;
end $$;
revoke all on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.stream_chat_ingest(uuid,text,text,text,text,text,timestamptz) to service_role;
