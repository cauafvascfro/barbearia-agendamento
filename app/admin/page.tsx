import Link from 'next/link'
import { DateTime } from 'luxon'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { supabase } = await requireAdmin()
  const { data: config } = await supabase.from('configuracoes').select('nome_barbearia,timezone').limit(1).single()
  const timezone=config?.timezone||'America/Bahia'
  const agora=DateTime.now().setZone(timezone)
  const inicioHoje=agora.startOf('day').toUTC(); const fimHoje=agora.endOf('day').toUTC(); const inicioMes=agora.startOf('month').toUTC(); const fimMes=agora.endOf('month').toUTC()
  const [{data:hoje},{data:mes}]=await Promise.all([
    supabase.from('agendamentos').select('id,inicio,fim,nome_servico,preco,status,cliente:clientes(nome,telefone)').gte('inicio',inicioHoje.toISO()).lte('inicio',fimHoje.toISO()).order('inicio'),
    supabase.from('agendamentos').select('preco,status').gte('inicio',inicioMes.toISO()).lte('inicio',fimMes.toISO()),
  ])
  const concluidos=(hoje||[]).filter((a)=>a.status==='CONCLUIDO'); const confirmados=(hoje||[]).filter((a)=>a.status==='CONFIRMADO')
  const faturamentoHoje=concluidos.reduce((n,a)=>n+Number(a.preco),0); const faturamentoMes=(mes||[]).filter((a)=>a.status==='CONCLUIDO').reduce((n,a)=>n+Number(a.preco),0)
  const proximo=confirmados.find((a)=>DateTime.fromISO(a.inicio)>DateTime.now())

  return <div className="stack-lg">
    <header><p className="eyebrow">{agora.setLocale('pt-BR').toFormat("cccc, dd 'de' LLLL")}</p><h1 className="page-title">{config?.nome_barbearia||'Dashboard'}</h1></header>
    <section className="grid-4"><Stat titulo="Agendamentos hoje" valor={String((hoje||[]).length)} detalhe={`${confirmados.length} pendentes`}/><Stat titulo="Concluídos hoje" valor={String(concluidos.length)}/><Stat titulo="Faturamento hoje" valor={formatarMoeda(faturamentoHoje)}/><Stat titulo="Faturamento no mês" valor={formatarMoeda(faturamentoMes)}/></section>
    <div className="admin-grid">
      <section className="card stack"><div className="split"><div><h2>Agenda de hoje</h2><p className="muted small">Próximos e realizados</p></div><Link className="btn" href={`/admin/agenda?data=${agora.toISODate()}`}>Abrir agenda</Link></div>{!(hoje||[]).length?<p className="muted">Nenhum agendamento para hoje.</p>:(hoje||[]).map((a)=>{const cliente=Array.isArray(a.cliente)?a.cliente[0]:a.cliente;return <div className="table-row split" key={a.id}><div className="wrap"><strong>{DateTime.fromISO(a.inicio).setZone(timezone).toFormat('HH:mm')}</strong><div><strong>{cliente?.nome||'Cliente'}</strong><div className="muted small">{a.nome_servico}</div></div></div><Status status={a.status}/></div>})}</section>
      <aside className="stack"><section className="card" style={{background:'#09090b',color:'white'}}><p className="muted small">Próximo atendimento</p>{proximo?<><h2>{DateTime.fromISO(proximo.inicio).setZone(timezone).toFormat('HH:mm')}</h2><strong>{(Array.isArray(proximo.cliente)?proximo.cliente[0]:proximo.cliente)?.nome}</strong><p style={{color:'#a1a1aa'}}>{proximo.nome_servico}</p></>:<p>Nenhum atendimento pendente hoje.</p>}</section><section className="card stack"><h2>Este mês</h2><Linha nome="Cancelamentos" valor={(mes||[]).filter((a)=>a.status==='CANCELADO').length}/><Linha nome="Não compareceram" valor={(mes||[]).filter((a)=>a.status==='NAO_COMPARECEU').length}/><Linha nome="Concluídos" valor={(mes||[]).filter((a)=>a.status==='CONCLUIDO').length}/></section></aside>
    </div>
  </div>
}
function Stat({titulo,valor,detalhe}:{titulo:string;valor:string;detalhe?:string}){return <div className="card stat"><span className="muted small">{titulo}</span><strong>{valor}</strong>{detalhe&&<div className="muted small">{detalhe}</div>}</div>}
function Linha({nome,valor}:{nome:string;valor:number}){return <div className="split"><span className="muted small">{nome}</span><strong>{valor}</strong></div>}
function Status({status}:{status:string}){const m:Record<string,[string,string]>={CONFIRMADO:['Confirmado','badge-blue'],CONCLUIDO:['Concluído','badge-green'],CANCELADO:['Cancelado','badge-gray'],NAO_COMPARECEU:['Faltou','badge-red']};const i=m[status]||[status,'badge-gray'];return <span className={`badge ${i[1]}`}>{i[0]}</span>}
