-- Apply after giveaway-eligibility.sql. Exclusion belongs to an entry/session,
-- independently of platform eligibility; verified chat never clears this flag.
alter table public.stream_giveaway_entries add column if not exists excluded boolean not null default false;
revoke update on public.stream_giveaway_entries from authenticated,anon;
grant update(excluded) on public.stream_giveaway_entries to authenticated;
drop policy if exists giveaway_entries_moderate on public.stream_giveaway_entries;
create policy giveaway_entries_moderate on public.stream_giveaway_entries
for update to authenticated
using (exists(select 1 from public.stream_giveaway_sessions s
 where s.id=session_id and s.status in ('active','closed')
 and private.sanlean_has_workspace_access(s.workspace_id,'giveaways')))
with check (exists(select 1 from public.stream_giveaway_sessions s
 where s.id=session_id and s.status in ('active','closed')
 and private.sanlean_has_workspace_access(s.workspace_id,'giveaways')));
