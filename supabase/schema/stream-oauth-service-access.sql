-- Server OAuth functions must read ownership and persist verified connections.
-- These grants do not grant browser roles any additional access.
grant select on public.streamer_workspaces to service_role;
grant select,insert,update on public.stream_platform_connections to service_role;
grant select,insert,update,delete on public.stream_platform_tokens to service_role;
