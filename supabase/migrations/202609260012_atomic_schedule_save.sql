create or replace function public.salvar_expediente_admin(p_horarios jsonb)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  item jsonb;
  v_dia integer;
  v_inicio time;
  v_fim time;
begin
  if jsonb_typeof(p_horarios) is distinct from 'array' then
    raise exception 'HORARIOS_INVALIDOS';
  end if;

  create temporary table if not exists pg_temp.novos_horarios (
    dia_semana integer not null,
    hora_inicio time not null,
    hora_fim time not null
  ) on commit drop;
  truncate pg_temp.novos_horarios;

  for item in select value from jsonb_array_elements(p_horarios)
  loop
    begin
      v_dia := (item->>'dia_semana')::integer;
      v_inicio := (item->>'hora_inicio')::time;
      v_fim := (item->>'hora_fim')::time;
    exception when others then
      raise exception 'HORARIOS_INVALIDOS';
    end;
    if v_dia < 0 or v_dia > 6 or v_inicio >= v_fim then
      raise exception 'HORARIOS_INVALIDOS';
    end if;
    insert into pg_temp.novos_horarios values (v_dia, v_inicio, v_fim);
  end loop;

  if exists (
    select 1
    from pg_temp.novos_horarios a
    join pg_temp.novos_horarios b
      on a.dia_semana = b.dia_semana
     and (a.hora_inicio, a.hora_fim) <> (b.hora_inicio, b.hora_fim)
     and a.hora_inicio < b.hora_fim
     and b.hora_inicio < a.hora_fim
  ) then
    raise exception 'HORARIOS_SOBREPOSTOS';
  end if;

  delete from public.horarios_funcionamento;
  insert into public.horarios_funcionamento (dia_semana, hora_inicio, hora_fim, ativo)
  select dia_semana, hora_inicio, hora_fim, true
  from pg_temp.novos_horarios
  order by dia_semana, hora_inicio;
end;
$$;

revoke all on function public.salvar_expediente_admin(jsonb) from public, anon;
grant execute on function public.salvar_expediente_admin(jsonb) to authenticated, service_role;
