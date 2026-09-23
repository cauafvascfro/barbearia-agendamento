alter table public.clientes enable row level security;
alter table public.servicos enable row level security;
alter table public.horarios_funcionamento enable row level security;
alter table public.bloqueios_agenda enable row level security;
alter table public.agendamentos enable row level security;
alter table public.configuracoes enable row level security;
alter table public.agendamento_eventos enable row level security;

create policy "Publico consulta servicos ativos"
on public.servicos for select to anon
using (ativo = true);

create policy "Admin gerencia servicos"
on public.servicos for all to authenticated
using (true) with check (true);

create policy "Admin gerencia clientes"
on public.clientes for all to authenticated
using (true) with check (true);

create policy "Admin gerencia agendamentos"
on public.agendamentos for all to authenticated
using (true) with check (true);

create policy "Admin gerencia horarios"
on public.horarios_funcionamento for all to authenticated
using (true) with check (true);

create policy "Admin gerencia bloqueios"
on public.bloqueios_agenda for all to authenticated
using (true) with check (true);

create policy "Admin gerencia configuracoes"
on public.configuracoes for all to authenticated
using (true) with check (true);

create policy "Admin consulta eventos"
on public.agendamento_eventos for select to authenticated
using (true);

create policy "Admin registra eventos"
on public.agendamento_eventos for insert to authenticated
with check (true);
