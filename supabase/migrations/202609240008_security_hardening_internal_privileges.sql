-- Harden database privileges reported by Supabase advisors.
-- rls_auto_enable exists on hosted projects created by Supabase, but is not
-- present in every local CLI database. Keep this migration portable.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

-- private.rate_limits is internal-only. RLS adds defense in depth while the
-- backend service role continues to bypass RLS for rate-limit operations.
alter table private.rate_limits enable row level security;

-- Support the agendamentos -> servicos foreign key and common service filters.
create index if not exists idx_agendamentos_servico_id on public.agendamentos(servico_id);
