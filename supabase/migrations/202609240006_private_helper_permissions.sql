-- The booking/reminder API uses a server-only Supabase secret key.
-- Public booking RPCs run as the caller (service_role) and call a helper
-- in the private schema, so service_role needs explicit schema/function access.

revoke usage on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

revoke execute on function private.horario_valido_expediente(
  timestamptz,
  timestamptz,
  text,
  integer
) from public, anon, authenticated;

grant execute on function private.horario_valido_expediente(
  timestamptz,
  timestamptz,
  text,
  integer
) to service_role;
