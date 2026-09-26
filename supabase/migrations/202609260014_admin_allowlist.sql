create table if not exists public.admin_usuarios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.admin_usuarios enable row level security;

drop policy if exists "Admin consulta próprio acesso" on public.admin_usuarios;
create policy "Admin consulta próprio acesso"
on public.admin_usuarios for select to authenticated
using (user_id = (select auth.uid()));

insert into public.admin_usuarios(user_id)
select id
from auth.users
where deleted_at is null
on conflict (user_id) do nothing;

create or replace function private.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_usuarios a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function private.eh_admin() from public, anon;
grant execute on function private.eh_admin() to authenticated, service_role;

drop policy if exists "Admin gerencia servicos" on public.servicos;
create policy "Admin gerencia servicos"
on public.servicos for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia clientes" on public.clientes;
create policy "Admin gerencia clientes"
on public.clientes for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia agendamentos" on public.agendamentos;
create policy "Admin gerencia agendamentos"
on public.agendamentos for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia horarios" on public.horarios_funcionamento;
create policy "Admin gerencia horarios"
on public.horarios_funcionamento for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia bloqueios" on public.bloqueios_agenda;
create policy "Admin gerencia bloqueios"
on public.bloqueios_agenda for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia configuracoes" on public.configuracoes;
create policy "Admin gerencia configuracoes"
on public.configuracoes for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin consulta eventos" on public.agendamento_eventos;
create policy "Admin consulta eventos"
on public.agendamento_eventos for select to authenticated
using ((select private.eh_admin()));

drop policy if exists "Admin registra eventos" on public.agendamento_eventos;
create policy "Admin registra eventos"
on public.agendamento_eventos for insert to authenticated
with check ((select private.eh_admin()));

drop policy if exists "Admin gerencia aberturas extras" on public.aberturas_extras;
create policy "Admin gerencia aberturas extras"
on public.aberturas_extras for all to authenticated
using ((select private.eh_admin())) with check ((select private.eh_admin()));

drop policy if exists "Admin consulta auditoria" on public.auditoria_admin;
create policy "Admin consulta auditoria"
on public.auditoria_admin for select to authenticated
using ((select private.eh_admin()));

drop policy if exists "Admin registra auditoria" on public.auditoria_admin;
create policy "Admin registra auditoria"
on public.auditoria_admin for insert to authenticated
with check ((select private.eh_admin()) and ator_id = (select auth.uid()));

drop policy if exists "Admin consulta notificacoes" on public.notificacoes;
create policy "Admin consulta notificacoes"
on public.notificacoes for select to authenticated
using ((select private.eh_admin()));
