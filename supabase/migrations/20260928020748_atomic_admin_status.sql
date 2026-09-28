-- Mantém a mudança de status e o evento de cancelamento na mesma transação.
-- A ação do servidor valida o administrador antes de usar service_role.
create or replace function public.alterar_status_agendamento_admin(
  p_agendamento_id uuid,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_agendamento public.agendamentos%rowtype;
begin
  if p_status is null or p_status not in ('CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU') then
    raise exception 'STATUS_INVALIDO';
  end if;

  select * into v_agendamento
  from public.agendamentos
  where id = p_agendamento_id
  for update;

  if not found or v_agendamento.status <> 'CONFIRMADO' then
    raise exception 'STATUS_INVALIDO';
  end if;

  update public.agendamentos
  set status = p_status::public.status_agendamento
  where id = p_agendamento_id;

  if p_status = 'CANCELADO' then
    insert into public.agendamento_eventos (
      agendamento_id, tipo, inicio_anterior, fim_anterior
    ) values (
      p_agendamento_id, 'CANCELADO_ADMIN', v_agendamento.inicio, v_agendamento.fim
    );
  end if;
end;
$$;

revoke execute on function public.alterar_status_agendamento_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.alterar_status_agendamento_admin(uuid, text) to service_role;
