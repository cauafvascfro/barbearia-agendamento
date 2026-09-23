create extension if not exists pgcrypto;

create type public.status_agendamento as enum (
  'CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'
);

create type public.origem_agendamento as enum ('SITE', 'MANUAL');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) not null,
  telefone varchar(20) not null unique,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  nome varchar(100) not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  duracao_minutos integer not null check (duracao_minutos > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.horarios_funcionamento (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fim time not null,
  ativo boolean not null default true,
  constraint horario_valido check (hora_fim > hora_inicio)
);

create table public.bloqueios_agenda (
  id uuid primary key default gen_random_uuid(),
  inicio timestamptz not null,
  fim timestamptz not null,
  motivo varchar(255),
  criado_em timestamptz not null default now(),
  constraint bloqueio_periodo_valido check (fim > inicio)
);

create table public.configuracoes (
  id uuid primary key default gen_random_uuid(),
  nome_barbearia varchar(150) not null,
  telefone varchar(20),
  whatsapp varchar(20),
  endereco text,
  intervalo_agendamento integer not null default 30 check (intervalo_agendamento > 0),
  antecedencia_minima_minutos integer not null default 30 check (antecedencia_minima_minutos >= 0),
  antecedencia_maxima_dias integer not null default 30 check (antecedencia_maxima_dias > 0),
  cancelamento_minimo_horas integer not null default 2 check (cancelamento_minimo_horas >= 0),
  timezone varchar(50) not null default 'America/Bahia',
  whatsapp_ativo boolean not null default false,
  lembrete_horas_antes integer not null default 3 check (lembrete_horas_antes >= 1),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Garante uma única linha de configuração para esta instalação mono-barbearia.
create unique index configuracoes_singleton on public.configuracoes ((true));

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id),
  servico_id uuid references public.servicos(id),
  inicio timestamptz not null,
  fim timestamptz not null,
  nome_servico varchar(100) not null,
  preco numeric(10,2) not null check (preco >= 0),
  duracao_minutos integer not null check (duracao_minutos > 0),
  status public.status_agendamento not null default 'CONFIRMADO',
  origem public.origem_agendamento not null default 'SITE',
  observacoes text,
  token_cliente uuid not null default gen_random_uuid() unique,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint periodo_agendamento_valido check (fim > inicio)
);

-- Última defesa contra duas reservas sobrepostas, inclusive em concorrência.
alter table public.agendamentos
add constraint agendamentos_sem_sobreposicao
exclude using gist (
  tstzrange(inicio, fim, '[)') with &&
)
where (status <> 'CANCELADO');

create table public.agendamento_eventos (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references public.agendamentos(id) on delete cascade,
  tipo varchar(40) not null check (tipo in ('REMARCADO','CANCELADO_CLIENTE','CANCELADO_ADMIN')),
  inicio_anterior timestamptz,
  fim_anterior timestamptz,
  inicio_novo timestamptz,
  fim_novo timestamptz,
  criado_em timestamptz not null default now()
);

create or replace function public.atualizar_timestamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger atualizar_clientes_timestamp
before update on public.clientes
for each row execute function public.atualizar_timestamp();

create trigger atualizar_servicos_timestamp
before update on public.servicos
for each row execute function public.atualizar_timestamp();

create trigger atualizar_agendamentos_timestamp
before update on public.agendamentos
for each row execute function public.atualizar_timestamp();

create trigger atualizar_configuracoes_timestamp
before update on public.configuracoes
for each row execute function public.atualizar_timestamp();

create index idx_agendamentos_inicio on public.agendamentos(inicio);
create index idx_agendamentos_status on public.agendamentos(status);
create index idx_agendamentos_cliente on public.agendamentos(cliente_id);
create index idx_agendamentos_cliente_inicio on public.agendamentos(cliente_id, inicio desc);
create index idx_agendamentos_status_inicio on public.agendamentos(status, inicio);
create index idx_bloqueios_inicio on public.bloqueios_agenda(inicio);
create index idx_horarios_dia on public.horarios_funcionamento(dia_semana);
create index idx_agendamento_eventos_agendamento on public.agendamento_eventos(agendamento_id, criado_em desc);
create index idx_clientes_nome on public.clientes(lower(nome));
