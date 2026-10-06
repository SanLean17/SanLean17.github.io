-- OBS capabilities remain private bearer tokens. No table access is granted.
-- Deploy before the clients. Keep the old endpoints for rollback/old OBS sources.
create or replace function public.get_stream_overlay_delta(p_token text, p_revision text default null)
returns table(revision text, payload jsonb)
language sql stable security invoker set search_path = '' as $$
  with authorized as materialized (
    select to_jsonb(o) as body from public.get_stream_overlay_by_token(p_token) o
  ), versioned as (
    select body, md5(body::text) as version from authorized
  )
  select version, case when version = p_revision then null else body end
  from versioned;
$$;
revoke all on function public.get_stream_overlay_delta(text,text) from public;
grant execute on function public.get_stream_overlay_delta(text,text) to anon,authenticated,service_role;

-- This helper is outside the exposed API schema. OBS has no login JWT: its
-- existing alert_token authenticates exactly one workspace, just like /alerts.
-- Never accept a workspace ID from the caller or return tokens/OAuth settings.
create or replace function private.stream_bits_feed(p_token text, p_after text, p_mode text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  settings record;
  latest_id bigint;
  next_id bigint;
  event_rows jsonb := '[]'::jsonb;
  active_rows jsonb := '[]'::jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9-]{36}$' then
    raise sqlstate '42501' using message = 'Invalid alert token';
  end if;
  select s.workspace_id,s.sound_enabled,s.timers_paused into settings
    from public.stream_bits_settings s where s.alert_token::text=p_token;
  if not found then raise sqlstate '42501' using message = 'Invalid alert token'; end if;
  if p_mode is null or p_mode not in ('alert','active') then
    raise sqlstate '22023' using message = 'Invalid feed mode';
  end if;
  if p_after is not null and p_after !~ '^[0-9]{1,18}$' then
    raise sqlstate '22023' using message = 'Invalid cursor';
  end if;

  if p_mode='alert' then
    if p_after is null then
      select e.id into latest_id from public.stream_bits_events e
        where e.workspace_id=settings.workspace_id order by e.id desc limit 1;
      next_id := coalesce(latest_id,0);
    else
      select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb),max(e.id)
        into event_rows,next_id from (
          select id,donor,bits,item_name,image,kind,quantity,alert_style,created_at
          from public.stream_bits_events
          where workspace_id=settings.workspace_id and id>p_after::bigint
            and created_at>now()-interval '5 minutes'
          order by id limit 50
        ) e;
      -- Never jump past an undelivered page or move a cursor backwards.
      next_id := coalesce(next_id,p_after::bigint);
    end if;
  else
    -- Match the existing dock's grouping and most recent 200 bonus rows.
    with recent as materialized (
      select event_id,expires_at,paused_remaining_seconds,created_at
      from public.stream_bits_bonuses where workspace_id=settings.workspace_id
      order by created_at desc limit 200
    ), live as (
      select distinct on (event_id) event_id,expires_at,paused_remaining_seconds
      from recent where case when settings.timers_paused
        then expires_at is null or paused_remaining_seconds is not null
        else expires_at is null or expires_at>now() end
      order by event_id,created_at desc
    )
    select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb)
      into active_rows from (
        select e.id,e.donor,e.bits,e.item_name,e.quantity,e.created_at,
               b.expires_at,b.paused_remaining_seconds
        from live b join public.stream_bits_events e on e.id=b.event_id
        where e.workspace_id=settings.workspace_id
      ) e;
    next_id := coalesce(p_after::bigint,0);
  end if;
  return jsonb_build_object('cursor',next_id::text,'events',event_rows,
    'active',active_rows,'sound',settings.sound_enabled,'timersPaused',settings.timers_paused);
end;
$$;
revoke all on function private.stream_bits_feed(text,text,text) from public;
grant usage on schema private to anon,authenticated;
grant execute on function private.stream_bits_feed(text,text,text) to anon,authenticated,service_role;

create or replace function public.get_stream_bits_feed(p_token text,p_after text default null,p_mode text default 'alert')
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.stream_bits_feed(p_token,p_after,p_mode);
$$;
revoke all on function public.get_stream_bits_feed(text,text,text) from public;
grant execute on function public.get_stream_bits_feed(text,text,text) to anon,authenticated,service_role;
