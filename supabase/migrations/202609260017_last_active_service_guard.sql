-- Garante no banco que a instalação mantenha ao menos um serviço ativo.
-- O lock transacional evita que duas desativações simultâneas passem pela
-- contagem ao mesmo tempo e deixem a agenda sem nenhum serviço disponível.

create or replace function private.proteger_ultimo_servico_ativo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_outros_ativos integer;
begin
  if old.ativo is true and new.ativo is false then
    perform pg_advisory_xact_lock(2026092602);

    select count(*)
      into v_outros_ativos
    from public.servicos
    where ativo = true
      and id <> old.id;

    if v_outros_ativos = 0 then
      raise exception 'ULTIMO_SERVICO_ATIVO';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_ultimo_servico_ativo on public.servicos;
create trigger proteger_ultimo_servico_ativo
before update of ativo
on public.servicos
for each row
execute function private.proteger_ultimo_servico_ativo();

revoke all on function private.proteger_ultimo_servico_ativo() from public, anon, authenticated;
