create table public.aberturas_extras (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  hora_inicio time not null,
  hora_fim time not null,
  motivo varchar(255),
  criado_em timestamptz not null default now(),
  constraint abertura_extra_periodo_valido check (hora_fim > hora_inicio)
);

create index idx_aberturas_extras_data on public.aberturas_extras(data, hora_inicio);

alter table public.aberturas_extras enable row level security;

create policy "Admin gerencia aberturas extras"
on public.aberturas_extras for all to authenticated
using (true) with check (true);

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
  select
    exists (
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
    )
    or exists (
      select 1
      from public.aberturas_extras e
      where e.data = (p_inicio at time zone p_timezone)::date
        and (p_inicio at time zone p_timezone)::time >= e.hora_inicio
        and (p_fim at time zone p_timezone)::time <= e.hora_fim
        and mod(
          (extract(epoch from (((p_inicio at time zone p_timezone)::time) - e.hora_inicio)) / 60)::integer,
          greatest(p_intervalo, 1)
        ) = 0
    );
$$;

revoke execute on function private.horario_valido_expediente(
  timestamptz, timestamptz, text, integer
) from public, anon, authenticated;
grant execute on function private.horario_valido_expediente(
  timestamptz, timestamptz, text, integer
) to service_role;
