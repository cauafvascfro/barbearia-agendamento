-- O fluxo de remarcação administrativa registra REMARCADO_ADMIN.
alter table public.agendamento_eventos
  drop constraint agendamento_eventos_tipo_check;

alter table public.agendamento_eventos
  add constraint agendamento_eventos_tipo_check
  check (tipo in ('REMARCADO', 'REMARCADO_ADMIN', 'CANCELADO_CLIENTE', 'CANCELADO_ADMIN'));
