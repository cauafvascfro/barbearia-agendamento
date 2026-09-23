import { z } from 'zod'

export const criarAgendamentoSchema = z.object({
  servico_id: z.string().uuid(),
  inicio: z.string().datetime({ offset: true }),
  nome: z.string().trim().min(2).max(120),
  telefone: z.string().trim().min(10).max(25),
  observacoes: z.string().trim().max(500).optional().nullable(),
})
