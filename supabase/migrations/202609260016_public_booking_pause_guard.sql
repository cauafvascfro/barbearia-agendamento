-- Impede que uma reserva online seja criada enquanto a agenda pública estiver pausada.
-- O lock compartilhado na configuração evita corrida entre a pausa da agenda e a
-- confirmação de um novo agendamento pelo site.

create or replace function private.proteger_agendamento_publico_pausado()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ativa boolean;
begin
  if new.origem <> 'SITE' then
    return new;
  end if;

  select agenda_publica_ativa
    into v_ativa
  from public.configuracoes
  limit 1
  for share;

  if not found or v_ativa is not true then
    raise exception 'AGENDA_PUBLICA_INATIVA';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_agendamento_publico_pausado on public.agendamentos;
create trigger proteger_agendamento_publico_pausado
before insert
on public.agendamentos
for each row
execute function private.proteger_agendamento_publico_pausado();

revoke all on function private.proteger_agendamento_publico_pausado() from public, anon, authenticated;
