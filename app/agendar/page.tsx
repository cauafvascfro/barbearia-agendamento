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
  return <main className="public-shell newstyle-public"><div className="container booking-container"><header className="brand-hero"><div className="brand-mark" aria-hidden="true"><span className="brand-crown">♛</span><strong>NS</strong><span className="brand-moustache">〰</span></div><div><p className="eyebrow">Agendamento online</p><h1 className="brand-title">NEW STYLE</h1><p className="brand-subtitle">BARBEARIA</p><p className="muted brand-copy">Seu horário, seu estilo. Escolha o serviço, a data e o melhor horário para você.</p></div></header><AgendamentoForm servicos={servicos || []} dataMinima={hoje.toISODate()!} dataMaxima={hoje.plus({days:config.antecedencia_maxima_dias}).toISODate()!}/><footer className="public-footer">New Style Barbearia · Agendamento online</footer></div></main>
}
