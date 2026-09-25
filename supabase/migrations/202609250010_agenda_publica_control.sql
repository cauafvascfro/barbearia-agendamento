alter table public.configuracoes
add column if not exists agenda_publica_ativa boolean not null default true;
