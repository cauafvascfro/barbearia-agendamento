-- Use somente em desenvolvimento/teste. Não rode seed em produção.
insert into public.configuracoes (
  nome_barbearia, telefone, intervalo_agendamento, antecedencia_minima_minutos,
  antecedencia_maxima_dias, cancelamento_minimo_horas, timezone
)
values ('Barbearia Demo', '(75) 99999-9999', 30, 30, 30, 2, 'America/Bahia')
on conflict do nothing;

insert into public.servicos(nome, descricao, preco, duracao_minutos)
values
  ('Corte', 'Corte masculino', 30.00, 30),
  ('Barba', 'Modelagem e acabamento da barba', 20.00, 30),
  ('Corte + Barba', 'Corte masculino e barba', 45.00, 60)
on conflict do nothing;

insert into public.horarios_funcionamento(dia_semana, hora_inicio, hora_fim)
values
  (1, '08:00', '12:00'), (1, '13:00', '18:00'),
  (2, '08:00', '12:00'), (2, '13:00', '18:00'),
  (3, '08:00', '12:00'), (3, '13:00', '18:00'),
  (4, '08:00', '12:00'), (4, '13:00', '18:00'),
  (5, '08:00', '12:00'), (5, '13:00', '18:00'),
  (6, '08:00', '13:00')
on conflict do nothing;
