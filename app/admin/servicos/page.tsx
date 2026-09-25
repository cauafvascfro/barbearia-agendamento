import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda } from '@/lib/formatters'
import { alterarStatusServico, criarServico } from './actions'

export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<{ sucesso?: string; erro?: string }> }

export default async function ServicosPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data: servicos } = await supabase.from('servicos').select('*').order('nome')
  const ativos=(servicos||[]).filter((s)=>s.ativo)
  const inativos=(servicos||[]).filter((s)=>!s.ativo)
  const ticketCatalogo=ativos.length?ativos.reduce((n,s)=>n+Number(s.preco),0)/ativos.length:0
  const duracaoMedia=ativos.length?Math.round(ativos.reduce((n,s)=>n+Number(s.duracao_minutos),0)/ativos.length):0

  return (
    <div className="stack-lg">
      <header><p className="eyebrow">Administração</p><h1 className="page-title">Serviços</h1><p className="muted">Preços e durações usados na agenda.</p></header>
      {params.sucesso && <div className="notice notice-success">Operação realizada com sucesso.</div>}
      {params.erro === 'ultimo-ativo' ? <div className="notice notice-error">Mantenha pelo menos um serviço ativo. Para interromper novos agendamentos, pause a agenda pública em Configurações.</div> : params.erro && <div className="notice notice-error">Não foi possível realizar a operação.</div>}
      <section className="grid-4"><div className="card stat"><span className="muted small">Serviços ativos</span><strong>{ativos.length}</strong></div><div className="card stat"><span className="muted small">Serviços inativos</span><strong>{inativos.length}</strong></div><div className="card stat"><span className="muted small">Preço médio</span><strong>{formatarMoeda(ticketCatalogo)}</strong></div><div className="card stat"><span className="muted small">Duração média</span><strong>{duracaoMedia} min</strong></div></section>
      <div className="admin-grid">
        <section className="card stack">
          <h2>Novo serviço</h2>
          <form action={criarServico} className="stack">
            <div className="field"><label>Nome</label><input className="input" name="nome" required placeholder="Ex.: Corte" /></div>
            <div className="field"><label>Descrição</label><textarea className="textarea" name="descricao" placeholder="Opcional" /></div>
            <div className="field"><label>Preço</label><input className="input" name="preco" required inputMode="decimal" placeholder="30,00" /></div>
            <div className="field"><label>Duração</label><select className="select" name="duracao_minutos" defaultValue="30"><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="45">45 minutos</option><option value="60">1 hora</option><option value="90">1h30</option><option value="120">2 horas</option></select></div>
            <button className="btn btn-primary btn-block">Cadastrar serviço</button>
          </form>
        </section>
        <section className="stack">
          {!(servicos||[]).length&&<div className="card empty-state"><strong>Nenhum serviço cadastrado</strong><p className="muted">Cadastre o primeiro serviço para começar a disponibilizar horários aos clientes.</p></div>}
          {(servicos || []).map((servico) => (
            <article key={servico.id} className="card split">
              <div>
                <div className="wrap"><strong>{servico.nome}</strong><span className={`badge ${servico.ativo ? 'badge-green' : 'badge-gray'}`}>{servico.ativo ? 'Ativo' : 'Inativo'}</span></div>
                {servico.descricao && <p className="muted small">{servico.descricao}</p>}
                <div className="wrap small"><strong>{formatarMoeda(servico.preco)}</strong><span className="muted">{servico.duracao_minutos} min</span></div>
              </div>
              <div className="wrap">
                <Link className="btn" href={`/admin/servicos/${servico.id}/editar`}>Editar</Link>
                <form action={alterarStatusServico}><input type="hidden" name="id" value={servico.id} /><input type="hidden" name="ativo" value={String(servico.ativo)} /><button className="btn">{servico.ativo ? 'Pausar serviço' : 'Disponibilizar'}</button></form>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
