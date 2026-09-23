create table if not exists private.rate_limits (
  acao text not null,
  chave_hash text not null,
  janela_inicio timestamptz not null default now(),
  contador integer not null default 1,
  atualizado_em timestamptz not null default now(),
  primary key (acao, chave_hash)
);

create or replace function public.consumir_rate_limit(
  p_acao text,
  p_chave_hash text,
  p_limite integer,
  p_janela_segundos integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contador integer;
begin
  if p_limite <= 0 or p_janela_segundos <= 0 then return false; end if;

  insert into private.rate_limits as rl(
    acao, chave_hash, janela_inicio, contador, atualizado_em
  ) values (
    p_acao, p_chave_hash, now(), 1, now()
  )
  on conflict (acao, chave_hash)
  do update set
    contador = case
      when rl.janela_inicio <= now() - make_interval(secs => p_janela_segundos) then 1
      else rl.contador + 1
    end,
    janela_inicio = case
      when rl.janela_inicio <= now() - make_interval(secs => p_janela_segundos) then now()
      else rl.janela_inicio
    end,
    atualizado_em = now()
  returning contador into v_contador;

  return v_contador <= p_limite;
end;
$$;

revoke execute on function public.consumir_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consumir_rate_limit(text,text,integer,integer) to service_role;

create table public.auditoria_admin (
  id uuid primary key default gen_random_uuid(),
  ator_id uuid not null,
  acao varchar(80) not null,
  entidade varchar(80) not null,
  entidade_id uuid,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

alter table public.auditoria_admin enable row level security;

create policy "Admin consulta auditoria"
on public.auditoria_admin for select to authenticated using (true);

create policy "Admin registra auditoria"
on public.auditoria_admin for insert to authenticated
with check (ator_id = auth.uid());

create index idx_auditoria_criado_em on public.auditoria_admin(criado_em desc);
create index idx_auditoria_entidade on public.auditoria_admin(entidade, entidade_id);
