-- Harden database privileges reported by Supabase advisors.
-- Event trigger functions are invoked by PostgreSQL, never through PostgREST RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- private.rate_limits is internal-only. RLS adds defense in depth while the
-- backend service role continues to bypass RLS for rate-limit operations.
alter table private.rate_limits enable row level security;

-- Support the agendamentos -> servicos foreign key and common service filters.
create index if not exists idx_agendamentos_servico_id on public.agendamentos(servico_id);
