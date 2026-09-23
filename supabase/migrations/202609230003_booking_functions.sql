create schema if not exists private;

create or replace function private.horario_valido_expediente(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_timezone text,
  p_intervalo integer
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.horarios_funcionamento h
    where h.ativo = true
      and h.dia_semana = extract(dow from (p_inicio at time zone p_timezone))::smallint
      and (p_inicio at time zone p_timezone)::time >= h.hora_inicio
      and (p_fim at time zone p_timezone)::time <= h.hora_fim
      and mod(
        (extract(epoch from (((p_inicio at time zone p_timezone)::time) - h.hora_inicio)) / 60)::integer,
        greatest(p_intervalo, 1)
      ) = 0
  );
$$;

create or replace function public.criar_agendamento_publico(
  p_servico_id uuid,
  p_inicio timestamptz,
  p_nome text,
  p_telefone text,
  p_observacoes text default null
)
returns table (
  agendamento_id uuid,
  token uuid,
  inicio timestamptz,
  fim timestamptz,
  nome_servico text,
  preco numeric,
  duracao_minutos integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_config public.configuracoes%rowtype;
  v_servico public.servicos%rowtype;
  v_cliente_id uuid;
  v_agendamento_id uuid;
  v_token uuid;
  v_fim timestamptz;
  v_telefone text;
begin
  if p_nome is null or length(trim(p_nome)) < 2 or length(trim(p_nome)) > 120 then
    raise exception 'NOME_INVALIDO';
  end if;

  if p_inicio is null then
    raise exception 'HORARIO_INVALIDO';
  end if;

  v_telefone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  if length(v_telefone) in (10, 11) then v_telefone := '55' || v_telefone; end if;
  if length(v_telefone) not in (12, 13) or left(v_telefone, 2) <> '55' then
    raise exception 'TELEFONE_INVALIDO';
  end if;

  select * into v_config from public.configuracoes limit 1;
  if not found then raise exception 'CONFIGURACAO_NAO_ENCONTRADA'; end if;

  select * into v_servico
  from public.servicos
  where id = p_servico_id and ativo = true;
  if not found then raise exception 'SERVICO_INDISPONIVEL'; end if;

  v_fim := p_inicio + make_interval(mins => v_servico.duracao_minutos);

  if p_inicio < now() + make_interval(mins => v_config.antecedencia_minima_minutos) then
    raise exception 'ANTECEDENCIA_MINIMA';
  end if;

  if (p_inicio at time zone v_config.timezone)::date >
     (now() at time zone v_config.timezone)::date + v_config.antecedencia_maxima_dias then
    raise exception 'DATA_FORA_DO_LIMITE';
  end if;

  if (p_inicio at time zone v_config.timezone)::date <> (v_fim at time zone v_config.timezone)::date then
    raise exception 'PERIODO_INVALIDO';
  end if;

  if not private.horario_valido_expediente(
    p_inicio, v_fim, v_config.timezone, v_config.intervalo_agendamento
  ) then
    raise exception 'FORA_DO_EXPEDIENTE';
  end if;

  if exists (
    select 1 from public.bloqueios_agenda b
    where b.inicio < v_fim and b.fim > p_inicio
  ) then raise exception 'HORARIO_BLOQUEADO'; end if;

  if exists (
    select 1 from public.agendamentos a
    where a.status <> 'CANCELADO'
      and a.inicio < v_fim and a.fim > p_inicio
  ) then raise exception 'HORARIO_INDISPONIVEL'; end if;

  insert into public.clientes(nome, telefone)
  values (trim(p_nome), v_telefone)
  on conflict (telefone) do update
    set nome = excluded.nome, atualizado_em = now()
  returning id into v_cliente_id;

  begin
    insert into public.agendamentos(
      cliente_id, servico_id, inicio, fim, nome_servico, preco,
      duracao_minutos, status, origem, observacoes
    ) values (
      v_cliente_id, v_servico.id, p_inicio, v_fim, v_servico.nome,
      v_servico.preco, v_servico.duracao_minutos,
      'CONFIRMADO', 'SITE', nullif(trim(p_observacoes), '')
    )
    returning id, token_cliente into v_agendamento_id, v_token;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL';
  end;

  return query select
    v_agendamento_id, v_token, p_inicio, v_fim,
    v_servico.nome::text, v_servico.preco, v_servico.duracao_minutos;
end;
$$;

create or replace function public.cancelar_agendamento_cliente(p_token uuid)
returns table (id uuid, status public.status_agendamento)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_agendamento public.agendamentos%rowtype;
  v_config public.configuracoes%rowtype;
begin
  select * into v_config from public.configuracoes limit 1;
  if not found then raise exception 'CONFIGURACAO_NAO_ENCONTRADA'; end if;

  select * into v_agendamento
  from public.agendamentos
  where token_cliente = p_token
  for update;
  if not found then raise exception 'AGENDAMENTO_NAO_ENCONTRADO'; end if;

  if v_agendamento.status <> 'CONFIRMADO' then raise exception 'AGENDAMENTO_NAO_PODE_SER_CANCELADO'; end if;
  if now() >= v_agendamento.inicio then raise exception 'AGENDAMENTO_JA_INICIADO'; end if;
  if now() > v_agendamento.inicio - make_interval(hours => v_config.cancelamento_minimo_horas) then
    raise exception 'CANCELAMENTO_FORA_DO_PRAZO';
  end if;

  update public.agendamentos set status = 'CANCELADO' where agendamentos.id = v_agendamento.id;
  insert into public.agendamento_eventos(agendamento_id, tipo, inicio_anterior, fim_anterior)
  values (v_agendamento.id, 'CANCELADO_CLIENTE', v_agendamento.inicio, v_agendamento.fim);

  return query select v_agendamento.id, 'CANCELADO'::public.status_agendamento;
end;
$$;

create or replace function public.remarcar_agendamento_cliente(
  p_token uuid,
  p_novo_inicio timestamptz
)
returns table (id uuid, token uuid, inicio timestamptz, fim timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_agendamento public.agendamentos%rowtype;
  v_config public.configuracoes%rowtype;
  v_novo_fim timestamptz;
begin
  select * into v_config from public.configuracoes limit 1;
  if not found then raise exception 'CONFIGURACAO_NAO_ENCONTRADA'; end if;

  select * into v_agendamento
  from public.agendamentos
  where token_cliente = p_token
  for update;
  if not found then raise exception 'AGENDAMENTO_NAO_ENCONTRADO'; end if;

  if v_agendamento.status <> 'CONFIRMADO' then raise exception 'AGENDAMENTO_NAO_PODE_SER_REMARCADO'; end if;
  if now() > v_agendamento.inicio - make_interval(hours => v_config.cancelamento_minimo_horas) then
    raise exception 'REMARCACAO_FORA_DO_PRAZO';
  end if;
  if p_novo_inicio < now() + make_interval(mins => v_config.antecedencia_minima_minutos) then
    raise exception 'ANTECEDENCIA_MINIMA';
  end if;
  if (p_novo_inicio at time zone v_config.timezone)::date >
     (now() at time zone v_config.timezone)::date + v_config.antecedencia_maxima_dias then
    raise exception 'DATA_FORA_DO_LIMITE';
  end if;

  v_novo_fim := p_novo_inicio + make_interval(mins => v_agendamento.duracao_minutos);
  if (p_novo_inicio at time zone v_config.timezone)::date <>
     (v_novo_fim at time zone v_config.timezone)::date then
    raise exception 'PERIODO_INVALIDO';
  end if;

  if not private.horario_valido_expediente(
    p_novo_inicio, v_novo_fim, v_config.timezone, v_config.intervalo_agendamento
  ) then raise exception 'FORA_DO_EXPEDIENTE'; end if;

  if exists (
    select 1 from public.bloqueios_agenda b
    where b.inicio < v_novo_fim and b.fim > p_novo_inicio
  ) then raise exception 'HORARIO_BLOQUEADO'; end if;

  if exists (
    select 1 from public.agendamentos a
    where a.id <> v_agendamento.id
      and a.status <> 'CANCELADO'
      and a.inicio < v_novo_fim and a.fim > p_novo_inicio
  ) then raise exception 'HORARIO_INDISPONIVEL'; end if;

  begin
    update public.agendamentos
    set inicio = p_novo_inicio, fim = v_novo_fim
    where agendamentos.id = v_agendamento.id;
  exception when exclusion_violation then
    raise exception 'HORARIO_INDISPONIVEL';
  end;

  insert into public.agendamento_eventos(
    agendamento_id, tipo, inicio_anterior, fim_anterior, inicio_novo, fim_novo
  ) values (
    v_agendamento.id, 'REMARCADO', v_agendamento.inicio, v_agendamento.fim,
    p_novo_inicio, v_novo_fim
  );

  return query select v_agendamento.id, v_agendamento.token_cliente, p_novo_inicio, v_novo_fim;
end;
$$;

revoke execute on function public.criar_agendamento_publico(uuid,timestamptz,text,text,text) from public, anon, authenticated;
grant execute on function public.criar_agendamento_publico(uuid,timestamptz,text,text,text) to service_role;
revoke execute on function public.cancelar_agendamento_cliente(uuid) from public, anon, authenticated;
grant execute on function public.cancelar_agendamento_cliente(uuid) to service_role;
revoke execute on function public.remarcar_agendamento_cliente(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.remarcar_agendamento_cliente(uuid,timestamptz) to service_role;
