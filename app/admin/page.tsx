import Link from 'next/link'
import { DateTime } from 'luxon'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda } from '@/lib/formatters'
import { avaliarProntidaoInstalacao } from '@/lib/instalacao'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { supabase } = await requireAdmin()
  const { data: config } = await supabase.from('configuracoes').select('nome_barbearia,telefone,timezone,agenda_publica_ativa,intervalo_agendamento,antecedencia_maxima_dias').limit(1).single()
  const timezone=config?.timezone||'America/Bahia'
  const agora=DateTime.now().setZone(timezone)
  const inicioHoje=agora.startOf('day').toUTC(); const fimHoje=agora.endOf('day').toUTC(); const inicioMes=agora.startOf('month').toUTC(); const fimMes=agora.endOf('month').toUTC()
  const [{data:hoje},{data:mes},{count:clientesTotal},{count:servicosAtivos},{count:horariosAtivos},{count:aberturasFuturas}]=await Promise.all([
    supabase.from('agendamentos').select('id,inicio,fim,nome_servico,preco,status,cliente:clientes(nome,telefone)').gte('inicio',inicioHoje.toISO()).lte('inicio',fimHoje.toISO()).order('inicio'),
    supabase.from('agendamentos').select('preco,status').gte('inicio',inicioMes.toISO()).lte('inicio',fimMes.toISO()),
    supabase.from('clientes').select('id',{count:'exact',head:true}),
    supabase.from('servicos').select('id',{count:'exact',head:true}).eq('ativo',true),
    supabase.from('horarios_funcionamento').select('id',{count:'exact',head:true}).eq('ativo',true),
    supabase.from('aberturas_extras').select('id',{count:'exact',head:true}).gte('data',agora.toISODate()),
  ])
  const concluidos=(hoje||[]).filter((a)=>a.status==='CONCLUIDO'); const confirmados=(hoje||[]).filter((a)=>a.status==='CONFIRMADO')
  const faturamentoHoje=concluidos.reduce((n,a)=>n+Number(a.preco),0); const concluidosMes=(mes||[]).filter((a)=>a.status==='CONCLUIDO'); const faturamentoMes=concluidosMes.reduce((n,a)=>n+Number(a.preco),0); const ticketMedio=concluidosMes.length?faturamentoMes/concluidosMes.length:0; const canceladosMes=(mes||[]).filter((a)=>a.status==='CANCELADO').length; const faltasMes=(mes||[]).filter((a)=>a.status==='NAO_COMPARECEU').length
  const proximo=confirmados.find((a)=>DateTime.fromISO(a.inicio).setZone(timezone)>=agora)
  const prontidao=avaliarProntidaoInstalacao(config,servicosAtivos||0,horariosAtivos||0,aberturasFuturas||0)
  const instalacaoPronta=prontidao.pronta
  const pendenciasInstalacao=prontidao.pendencias.join(', ')
  const taxaConclusaoMes=(concluidosMes.length+canceladosMes+faltasMes)>0?Math.round((concluidosMes.length/(concluidosMes.length+canceladosMes+faltasMes))*100):0

  return <div className="stack-lg">
    <header className="split"><div><div className="wrap"><p className="eyebrow">{agora.setLocale('pt-BR').toFormat("cccc, dd 'de' LLLL")}</p><span className={`badge ${config?.agenda_publica_ativa===false?'badge-gray':'badge-green'}`}>{config?.agenda_publica_ativa===false?'Agenda pública pausada':'Agenda pública online'}</span></div><h1 className="page-title">{config?.nome_barbearia||'Dashboard'}</h1></div><div className="wrap"><Link className="btn" href="/admin/clientes">Clientes</Link><Link className="btn btn-primary" href={`/admin/agenda?data=${agora.toISODate()}`}>+ Novo agendamento</Link></div></header>
    {!instalacaoPronta&&<section className="notice notice-error split"><div><strong>Instalação incompleta</strong><p className="small">Antes de divulgar o agendamento, conclua: {pendenciasInstalacao}.</p></div><Link className="btn" href="/admin/configuracoes">Concluir configuração</Link></section>}
    <section className="grid-4"><Stat titulo="Agendamentos hoje" valor={String((hoje||[]).length)} detalhe={`${confirmados.length} pendentes`}/><Stat titulo="Concluídos hoje" valor={String(concluidos.length)}/><Stat titulo="Faturamento hoje" valor={formatarMoeda(faturamentoHoje)}/><Stat titulo="Faturamento no mês" valor={formatarMoeda(faturamentoMes)}/><Stat titulo="Ticket médio no mês" valor={formatarMoeda(ticketMedio)}/><Stat titulo="Clientes cadastrados" valor={String(clientesTotal||0)}/><Stat titulo="Cancelamentos no mês" valor={String(canceladosMes)}/><Stat titulo="Faltas no mês" valor={String(faltasMes)}/></section>
    <div className="admin-grid">
      <section className="card stack"><div className="split"><div><h2>Agenda de hoje</h2><p className="muted small">Próximos e realizados</p></div><Link className="btn" href={`/admin/agenda?data=${agora.toISODate()}`}>Abrir agenda</Link></div>{!(hoje||[]).length?<p className="muted">Nenhum agendamento para hoje.</p>:(hoje||[]).map((a)=>{const cliente=Array.isArray(a.cliente)?a.cliente[0]:a.cliente;return <div className="table-row split" key={a.id}><div className="wrap"><strong>{DateTime.fromISO(a.inicio).setZone(timezone).toFormat('HH:mm')}</strong><div><strong>{cliente?.nome||'Cliente'}</strong><div className="muted small">{a.nome_servico}</div></div></div><Status status={a.status}/></div>})}</section>
      <aside className="stack"><section className="card" style={{background:'#09090b',color:'white'}}><p className="muted small">Próximo atendimento</p>{proximo?<><h2>{DateTime.fromISO(proximo.inicio).setZone(timezone).toFormat('HH:mm')}</h2><strong>{(Array.isArray(proximo.cliente)?proximo.cliente[0]:proximo.cliente)?.nome}</strong><p style={{color:'#a1a1aa'}}>{proximo.nome_servico}</p></>:<p>Nenhum atendimento pendente hoje.</p>}</section><section className="card stack"><h2>Este mês</h2><Linha nome="Cancelamentos" valor={canceladosMes}/><Linha nome="Não compareceram" valor={faltasMes}/><Linha nome="Concluídos" valor={concluidosMes.length}/><Linha nome="Taxa de conclusão" valor={`${taxaConclusaoMes}%`}/></section></aside>
    </div>
  </div>
}
function Stat({titulo,valor,detalhe}:{titulo:string;valor:string;detalhe?:string}){return <div className="card stat"><span className="muted small">{titulo}</span><strong>{valor}</strong>{detalhe&&<div className="muted small">{detalhe}</div>}</div>}
function Linha({nome,valor}:{nome:string;valor:number|string}){return <div className="split"><span className="muted small">{nome}</span><strong>{valor}</strong></div>}
function Status({status}:{status:string}){const m:Record<string,[string,string]>={CONFIRMADO:['Confirmado','badge-blue'],CONCLUIDO:['Concluído','badge-green'],CANCELADO:['Cancelado','badge-gray'],NAO_COMPARECEU:['Faltou','badge-red']};const i=m[status]||[status,'badge-gray'];return <span className={`badge ${i[1]}`}>{i[0]}</span>}
