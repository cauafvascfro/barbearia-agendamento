import type { SupabaseClient } from '@supabase/supabase-js'

export async function registrarAuditoria(args: {
  supabase: SupabaseClient
  atorId: string
  acao: string
  entidade: string
  entidadeId?: string
  detalhes?: Record<string, unknown>
}) {
  const { error } = await args.supabase.from('auditoria_admin').insert({
    ator_id: args.atorId,
    acao: args.acao,
    entidade: args.entidade,
    entidade_id: args.entidadeId || null,
    detalhes: args.detalhes || {},
  })
  if (error) console.error('Falha ao registrar auditoria:', error)
}
