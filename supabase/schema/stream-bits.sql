-- Private stream bits. No public WEB settings or user_roulette_settings writes.
create table public.stream_bits_settings (
 workspace_id uuid primary key references public.streamer_workspaces(id) on delete cascade,
 alert_token uuid not null unique default gen_random_uuid(), sound_enabled boolean not null default true
);
create table public.stream_bits_rules (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 bits integer not null check(bits between 1 and 1000000), kind text not null check(kind in ('killers','survivor','killerPerks')),
 item_key text not null check(length(item_key) between 1 and 120), item_name text not null check(length(item_name) between 1 and 150),
 image text not null check(length(image)<500), quantity integer not null default 1 check(quantity between 1 and 20),
 duration_minutes integer not null default 0 check(duration_minutes between 0 and 10080), enabled boolean not null default true,
 unique(workspace_id,bits)
);
create table public.stream_bits_channels (
 workspace_id uuid primary key references public.streamer_workspaces(id) on delete cascade,
 broadcaster_id text not null unique, subscription_id text, connected boolean not null default false
);
create table public.stream_bits_oauth (
 state uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, expires_at timestamptz not null default now()+interval '10 minutes'
);
create table public.stream_bits_receipts (message_id text primary key, received_at timestamptz not null default now());
create table public.stream_bits_events (
 id bigint generated always as identity primary key, workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 donor text not null, bits integer not null, item_name text not null, image text not null, kind text not null, quantity integer not null,
 created_at timestamptz not null default now()
);
create table public.stream_bits_bonuses (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.streamer_workspaces(id) on delete cascade,
 event_id bigint not null references public.stream_bits_events(id) on delete cascade, kind text not null, item_key text not null,
 donor text not null, expires_at timestamptz, created_at timestamptz not null default now()
);
create index stream_bits_events_workspace_idx on public.stream_bits_events(workspace_id,id);
create index stream_bits_bonuses_workspace_idx on public.stream_bits_bonuses(workspace_id,kind);
create index stream_bits_bonuses_event_idx on public.stream_bits_bonuses(event_id);
create index stream_bits_oauth_workspace_idx on public.stream_bits_oauth(workspace_id);
create index stream_bits_oauth_user_idx on public.stream_bits_oauth(user_id);
alter table public.stream_bits_settings enable row level security;
alter table public.stream_bits_rules enable row level security;
alter table public.stream_bits_channels enable row level security;
alter table public.stream_bits_oauth enable row level security;
alter table public.stream_bits_receipts enable row level security;
alter table public.stream_bits_events enable row level security;
alter table public.stream_bits_bonuses enable row level security;
revoke all on public.stream_bits_settings,public.stream_bits_rules,public.stream_bits_channels,public.stream_bits_oauth,public.stream_bits_receipts,public.stream_bits_events,public.stream_bits_bonuses from anon,authenticated;
grant select,insert,update,delete on public.stream_bits_settings,public.stream_bits_rules to authenticated;
grant select,delete on public.stream_bits_bonuses to authenticated;
grant select on public.stream_bits_events to authenticated;
grant all on public.stream_bits_settings,public.stream_bits_rules,public.stream_bits_channels,public.stream_bits_oauth,public.stream_bits_receipts,public.stream_bits_events,public.stream_bits_bonuses to service_role;
grant usage,select on sequence public.stream_bits_events_id_seq to service_role;
create policy bits_settings_owner on public.stream_bits_settings for all to authenticated using (exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid()))) with check (exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy bits_rules_owner on public.stream_bits_rules for all to authenticated using (exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid()))) with check (exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy bits_bonus_read on public.stream_bits_bonuses for select to authenticated using(private.sanlean_has_workspace_access(workspace_id,'overlays'));
create policy bits_bonus_delete on public.stream_bits_bonuses for delete to authenticated using(exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create policy bits_events_read on public.stream_bits_events for select to authenticated using(exists(select 1 from public.streamer_workspaces w where w.id=workspace_id and w.owner_user_id=(select auth.uid())));
create function public.stream_bits_ingest(p_message_id text,p_broadcaster text,p_bits integer,p_donor text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare v_workspace uuid; v_rule public.stream_bits_rules%rowtype; v_event bigint;
begin
 if p_bits<1 or length(p_message_id)>200 or length(p_donor)>100 then raise exception 'Invalid event'; end if;
 select workspace_id into v_workspace from public.stream_bits_channels where broadcaster_id=p_broadcaster and connected;
 if v_workspace is null then return false; end if;
 insert into public.stream_bits_receipts(message_id) values(p_message_id) on conflict do nothing;
 if not found then return false; end if;
 select * into v_rule from public.stream_bits_rules where workspace_id=v_workspace and bits=p_bits and enabled;
 if not found then return false; end if;
 insert into public.stream_bits_events(workspace_id,donor,bits,item_name,image,kind,quantity)
 values(v_workspace,p_donor,p_bits,v_rule.item_name,v_rule.image,v_rule.kind,v_rule.quantity) returning id into v_event;
 insert into public.stream_bits_bonuses(workspace_id,event_id,kind,item_key,donor,expires_at)
 select v_workspace,v_event,v_rule.kind,v_rule.item_key,p_donor,case when v_rule.duration_minutes=0 then null else now()+v_rule.duration_minutes*interval '1 minute' end from generate_series(1,v_rule.quantity);
 return true;
end $$;
revoke all on function public.stream_bits_ingest(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.stream_bits_ingest(text,text,integer,text) to service_role;
