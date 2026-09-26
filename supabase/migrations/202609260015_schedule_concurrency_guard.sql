-- Serializa mutações da agenda para impedir corrida entre reservas e bloqueios.
-- A instalação representa uma única barbearia/barbeiro, então um lock transacional
-- global é suficiente e mantém a regra simples e segura.

create or replace function private.proteger_agendamento_contra_bloqueio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(2026092601);

  if new.status <> 'CANCELADO' and exists (
    select 1
    from public.bloqueios_agenda b
    where b.inicio < new.fim
      and b.fim > new.inicio
  ) then
    raise exception 'HORARIO_BLOQUEADO';
  end if;

  return new;
end;
$$;

create or replace function private.proteger_bloqueio_contra_agendamento()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(2026092601);

  if exists (
    select 1
    from public.agendamentos a
    where a.status = 'CONFIRMADO'
      and a.inicio < new.fim
      and a.fim > new.inicio
  ) then
    raise exception 'HORARIO_INDISPONIVEL';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_agendamento_contra_bloqueio on public.agendamentos;
create trigger proteger_agendamento_contra_bloqueio
before insert or update of inicio, fim, status
on public.agendamentos
for each row
execute function private.proteger_agendamento_contra_bloqueio();

drop trigger if exists proteger_bloqueio_contra_agendamento on public.bloqueios_agenda;
create trigger proteger_bloqueio_contra_agendamento
before insert or update of inicio, fim
on public.bloqueios_agenda
for each row
execute function private.proteger_bloqueio_contra_agendamento();

revoke all on function private.proteger_agendamento_contra_bloqueio() from public, anon, authenticated;
revoke all on function private.proteger_bloqueio_contra_agendamento() from public, anon, authenticated;
