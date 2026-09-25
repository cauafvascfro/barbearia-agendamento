import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { AgendamentoForm } from '@/components/agendamento/agendamento-form'

export const dynamic = 'force-dynamic'

export default async function AgendarPage() {
  const supabase = createAdminClient()
  const [{ data: servicos }, { data: config }, { count: horariosAtivos }] = await Promise.all([
    supabase.from('servicos').select('id,nome,descricao,preco,duracao_minutos').eq('ativo', true).order('nome'),
    supabase.from('configuracoes').select('*').limit(1).single(),
    supabase.from('horarios_funcionamento').select('id',{count:'exact',head:true}).eq('ativo',true),
  ])
  if (!config) return <main className="public-shell"><div className="container"><div className="notice notice-error">Sistema ainda não configurado.</div></div></main>
  const pronta=Boolean(config.nome_barbearia?.trim()&&(servicos||[]).length&&(horariosAtivos||0)>0)
  if(config.agenda_publica_ativa===false) return <main className="public-shell"><div className="container booking-container"><section className="card empty-state"><strong>Agendamento online temporariamente pausado</strong><p className="muted">A barbearia não está recebendo novos agendamentos online neste momento.</p></section></div></main>
  if(!pronta) return <main className="public-shell"><div className="container booking-container"><section className="card empty-state"><strong>Agendamento online em preparação</strong><p className="muted">A barbearia ainda está finalizando a configuração da agenda. Tente novamente mais tarde.</p></section></div></main>
  const timezone = config.timezone || 'America/Bahia'
  const iniciais=String(config.nome_barbearia||'Barbearia').trim().split(/\s+/).slice(0,2).map((p:string)=>p[0]).join('').toUpperCase()
  const hoje = DateTime.now().setZone(timezone)
  return <main className="public-shell newstyle-public"><div className="container booking-container"><header className="brand-hero"><div className="brand-mark" aria-hidden="true"><span className="brand-crown">♛</span><strong>{iniciais}</strong><span className="brand-moustache">〰</span></div><div><p className="eyebrow">Agendamento online</p><h1 className="brand-title">{String(config.nome_barbearia||'Barbearia').toUpperCase()}</h1><p className="brand-subtitle">BARBEARIA</p><p className="muted brand-copy">Seu horário, seu estilo. Escolha o serviço, a data e o melhor horário para você.</p></div></header><AgendamentoForm servicos={servicos || []} dataMinima={hoje.toISODate()!} dataMaxima={hoje.plus({days:config.antecedencia_maxima_dias}).toISODate()!}/><footer className="public-footer">{config.nome_barbearia} · Agendamento online{config.telefone ? ` · ${config.telefone}` : ''}</footer></div></main>
}
