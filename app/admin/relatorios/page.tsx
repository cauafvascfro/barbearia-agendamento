import Link from 'next/link'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatters'

type Props={searchParams:Promise<{inicio?:string;fim?:string}>}

export default async function RelatoriosPage({searchParams}:Props){
  const params=await searchParams
  const supabase=await createClient()
  const {data:config}=await supabase.from('configuracoes').select('timezone').single()
  const timezone=config?.timezone||'America/Bahia'
  const agora=DateTime.now().setZone(timezone)
  const inicioValido=DateTime.fromISO(params.inicio||'',{zone:timezone})
  const fimValido=DateTime.fromISO(params.fim||'',{zone:timezone})
  const inicio=inicioValido.isValid?inicioValido.startOf('day'):agora.startOf('month')
  const fim=fimValido.isValid?fimValido.endOf('day'):agora.endOf('month')
  const {data:agendamentos}=await supabase.from('agendamentos').select('id,inicio,status,preco,nome_servico_snapshot,cliente_id').gte('inicio',inicio.toUTC().toISO()).lte('inicio',fim.toUTC().toISO()).order('inicio')
  const lista=agendamentos||[]
  const concluidos=lista.filter(a=>a.status==='CONCLUIDO')
  const cancelados=lista.filter(a=>a.status==='CANCELADO')
  const faltas=lista.filter(a=>a.status==='NAO_COMPARECEU')
  const faturamento=concluidos.reduce((s,a)=>s+Number(a.preco||0),0)
  const ticket=concluidos.length?faturamento/concluidos.length:0
  const clientesUnicos=new Set(concluidos.map(a=>a.cliente_id).filter(Boolean)).size
  const servicos=Object.entries(concluidos.reduce<Record<string,{qtd:number,total:number}>>((acc,a)=>{const nome=a.nome_servico_snapshot||'Serviço';acc[nome]??={qtd:0,total:0};acc[nome].qtd++;acc[nome].total+=Number(a.preco||0);return acc},{})).sort((a,b)=>b[1].qtd-a[1].qtd)

  return <div className="stack-lg">
    <header className="split"><div><p className="eyebrow">Desempenho</p><h1 className="page-title">Relatórios</h1><p className="muted">Acompanhe os principais números da barbearia.</p></div>
      <form className="report-filter"><div className="field"><label>De</label><input className="input" type="date" name="inicio" defaultValue={inicio.toISODate()||''}/></div><div className="field"><label>Até</label><input className="input" type="date" name="fim" defaultValue={fim.toISODate()||''}/></div><button className="btn btn-primary">Aplicar</button><Link className="btn" href="/admin/relatorios">Mês atual</Link></form>
    </header>
    <section className="stats-grid">
      <Card titulo="Faturamento" valor={formatarMoeda(faturamento)} detalhe="Somente atendimentos concluídos"/>
      <Card titulo="Atendimentos" valor={String(concluidos.length)} detalhe={`${clientesUnicos} cliente(s) atendido(s)`}/>
      <Card titulo="Ticket médio" valor={formatarMoeda(ticket)} detalhe="Média por atendimento concluído"/>
      <Card titulo="Ocorrências" valor={String(cancelados.length+faltas.length)} detalhe={`${cancelados.length} cancelado(s) · ${faltas.length} falta(s)`}/>
    </section>
    <section className="card stack"><div><p className="eyebrow">Serviços</p><h2>Mais realizados no período</h2></div>
      {servicos.length?<div className="table">{servicos.map(([nome,dados])=><div className="table-row report-row" key={nome}><div><strong>{nome}</strong><p className="muted small">{dados.qtd} atendimento(s)</p></div><strong>{formatarMoeda(dados.total)}</strong></div>)}</div>:<div className="empty-state"><strong>Sem dados no período</strong><p className="muted">Ainda não há atendimentos concluídos para estas datas.</p></div>}
    </section>
  </div>
}
function Card({titulo,valor,detalhe}:{titulo:string;valor:string;detalhe:string}){return <article className="stat-card"><span>{titulo}</span><strong>{valor}</strong><small>{detalhe}</small></article>}
