create type public.tipo_notificacao as enum ('CONFIRMACAO','LEMBRETE','REMARCACAO','CANCELAMENTO');
create type public.status_notificacao as enum ('PENDENTE','ENVIADA','ERRO');

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  tipo public.tipo_notificacao not null,
  status public.status_notificacao not null default 'PENDENTE',
  destinatario varchar(20) not null,
  mensagem_id varchar(255),
  tentativas integer not null default 0 check (tentativas >= 0),
  ultimo_erro text,
  enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (agendamento_id, tipo)
);

create trigger atualizar_notificacoes_timestamp
before update on public.notificacoes
for each row execute function public.atualizar_timestamp();

alter table public.notificacoes enable row level security;
create policy "Admin consulta notificacoes"
on public.notificacoes for select to authenticated using (true);

create index idx_notificacoes_status on public.notificacoes(status, tipo);
