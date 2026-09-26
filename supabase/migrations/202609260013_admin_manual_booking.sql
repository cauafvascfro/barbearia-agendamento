create or replace function public.criar_agendamento_admin(
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

  if p_inicio < now() then
    raise exception 'HORARIO_PASSADO';
  end if;

  v_fim := p_inicio + make_interval(mins => v_servico.duracao_minutos);

  if (p_inicio at time zone v_config.timezone)::date <>
     (v_fim at time zone v_config.timezone)::date then
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
      'CONFIRMADO', 'MANUAL', nullif(trim(p_observacoes), '')
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

revoke all on function public.criar_agendamento_admin(uuid,timestamptz,text,text,text) from public, anon;
grant execute on function public.criar_agendamento_admin(uuid,timestamptz,text,text,text) to authenticated, service_role;
