create table public.stream_kick_oauth (
 state uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, verifier text not null,
 expires_at timestamptz not null default now()+interval '10 minutes'
);
create index stream_kick_oauth_workspace_idx on public.stream_kick_oauth(workspace_id);
create index stream_kick_oauth_user_idx on public.stream_kick_oauth(user_id);
create table public.stream_kick_channels (
 workspace_id uuid primary key references public.streamer_workspaces(id) on delete cascade,
 broadcaster_id text not null unique
);
alter table public.stream_kick_oauth enable row level security;
alter table public.stream_kick_channels enable row level security;
revoke all on public.stream_kick_oauth,public.stream_kick_channels from public,anon,authenticated;
grant all on public.stream_kick_oauth,public.stream_kick_channels to service_role;
