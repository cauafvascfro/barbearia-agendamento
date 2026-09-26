create or replace function public.remarcar_agendamento_admin(
  p_agendamento_id uuid,
  p_novo_inicio timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_config public.configuracoes%rowtype;
  v_agendamento public.agendamentos%rowtype;
  v_fim timestamptz;
begin
  select * into v_config from public.configuracoes limit 1;
  if not found then raise exception 'CONFIGURACAO_NAO_ENCONTRADA'; end if;

  select * into v_agendamento from public.agendamentos
  where id = p_agendamento_id for update;
  if not found then raise exception 'AGENDAMENTO_NAO_ENCONTRADO'; end if;
  if v_agendamento.status <> 'CONFIRMADO' then raise exception 'STATUS_INVALIDO'; end if;
  if p_novo_inicio is null then raise exception 'HORARIO_INVALIDO'; end if;

  v_fim := p_novo_inicio + make_interval(mins => v_agendamento.duracao_minutos);

  if (p_novo_inicio at time zone v_config.timezone)::date <>
     (v_fim at time zone v_config.timezone)::date then
    raise exception 'PERIODO_INVALIDO';
  end if;

  if not private.horario_valido_expediente(
    p_novo_inicio, v_fim, v_config.timezone, v_config.intervalo_agendamento
  ) then raise exception 'FORA_DO_EXPEDIENTE'; end if;

  if exists (
    select 1 from public.bloqueios_agenda b
    where b.inicio < v_fim and b.fim > p_novo_inicio
  ) then raise exception 'HORARIO_BLOQUEADO'; end if;

  if exists (
    select 1 from public.agendamentos a
    where a.id <> p_agendamento_id
      and a.status <> 'CANCELADO'
      and a.inicio < v_fim and a.fim > p_novo_inicio
  ) then raise exception 'HORARIO_INDISPONIVEL'; end if;

  begin
    update public.agendamentos
    set inicio = p_novo_inicio, fim = v_fim, atualizado_em = now()
    where id = p_agendamento_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL';
  end;

  insert into public.agendamento_eventos(
    agendamento_id, tipo, inicio_anterior, fim_anterior, inicio_novo, fim_novo
  ) values (
    p_agendamento_id, 'REMARCADO_ADMIN', v_agendamento.inicio, v_agendamento.fim,
    p_novo_inicio, v_fim
  );
end;
$$;

revoke execute on function public.remarcar_agendamento_admin(uuid, timestamptz) from public, anon;
grant execute on function public.remarcar_agendamento_admin(uuid, timestamptz) to authenticated, service_role;
