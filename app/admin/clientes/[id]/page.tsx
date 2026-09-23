import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DateTime } from 'luxon'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda, formatarTelefone } from '@/lib/formatters'

type Props = { params: Promise<{ id:string }> }

export default async function ClientePage({ params }: Props) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  const [{ data: cliente }, { data: config }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', id).single(),
    supabase.from('configuracoes').select('timezone').limit(1).single(),
  ])
  if (!cliente) notFound()
  const timezone = config?.timezone || 'America/Bahia'
  const { data: agendamentos } = await supabase.from('agendamentos').select('id,inicio,fim,nome_servico,preco,status,origem,observacoes').eq('cliente_id', id).order('inicio', { ascending:false })
  const concluidos=(agendamentos||[]).filter((a)=>a.status==='CONCLUIDO')
  const total=concluidos.reduce((n,a)=>n+Number(a.preco),0)
  const faltas=(agendamentos||[]).filter((a)=>a.status==='NAO_COMPARECEU').length
  const cancelamentos=(agendamentos||[]).filter((a)=>a.status==='CANCELADO').length

  return <div className="stack-lg">
    <Link className="muted" href="/admin/clientes">← Clientes</Link>
    <header><h1 className="page-title">{cliente.nome}</h1><p className="muted">{formatarTelefone(cliente.telefone)}</p></header>
    <section className="grid-4"><Stat titulo="Atendimentos" valor={String(concluidos.length)}/><Stat titulo="Total gasto" valor={formatarMoeda(total)}/><Stat titulo="Cancelamentos" valor={String(cancelamentos)}/><Stat titulo="Faltas" valor={String(faltas)}/></section>
    <section className="stack"><h2>Histórico</h2>{!(agendamentos||[]).length ? <div className="card"><p className="muted">Sem histórico.</p></div> : (agendamentos||[]).map((a)=>{const inicio=DateTime.fromISO(a.inicio).setZone(timezone);return <article className="card split" key={a.id}><div><div className="wrap"><strong>{a.nome_servico}</strong><Status status={a.status}/></div><p className="muted small">{inicio.toFormat("dd/MM/yyyy 'às' HH:mm")}</p>{a.observacoes&&<p className="small">{a.observacoes}</p>}</div><div style={{textAlign:'right'}}><strong>{formatarMoeda(a.preco)}</strong><p className="muted small">{a.origem==='SITE'?'Online':'Manual'}</p></div></article>})}</section>
  </div>
}
function Stat({titulo,valor}:{titulo:string;valor:string}){return <div className="card stat"><span className="muted small">{titulo}</span><strong>{valor}</strong></div>}
function Status({status}:{status:string}){const m:Record<string,[string,string]>={CONFIRMADO:['Confirmado','badge-blue'],CONCLUIDO:['Concluído','badge-green'],CANCELADO:['Cancelado','badge-gray'],NAO_COMPARECEU:['Faltou','badge-red']};const i=m[status]||[status,'badge-gray'];return <span className={`badge ${i[1]}`}>{i[0]}</span>}
