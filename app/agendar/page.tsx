import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgendamentoForm } from '@/components/agendamento/agendamento-form'

export const dynamic = 'force-dynamic'

export default async function AgendarPage() {
  const supabase = createAdminClient()
  const [{ data: servicos }, { data: config }] = await Promise.all([
    supabase.from('servicos').select('id,nome,descricao,preco,duracao_minutos').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').limit(1).single(),
  ])

  if (!config) return <main className="public-shell"><div className="container"><div className="notice notice-error">Sistema ainda não configurado.</div></div></main>
  const timezone = config.timezone || 'America/Bahia'
  const hoje = DateTime.now().setZone(timezone)

  return <main className="public-shell"><div className="container" style={{maxWidth:760}}><header style={{textAlign:'center',marginBottom:28}}><p className="eyebrow">Agendamento online</p><h1 className="page-title">{config.nome_barbearia}</h1><p className="muted">Escolha o serviço, data e horário.</p></header><AgendamentoForm servicos={servicos || []} dataMinima={hoje.toISODate()!} dataMaxima={hoje.plus({days:config.antecedencia_maxima_dias}).toISODate()!}/></div></main>
}
