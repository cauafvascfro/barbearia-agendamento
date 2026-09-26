import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DateTime } from 'luxon'
import { createClient } from '@/lib/supabase/server'
import { formatarMoeda } from '@/lib/formatters'

type Props={searchParams:Promise<{inicio?:string;fim?:string;erro?:string}>}
type Agendamento={id:string;inicio:string;status:string;preco:number|string|null;nome_servico:string|null;cliente_id:string|null}

export default async function RelatoriosPage({searchParams}:Props){
  const params=await searchParams
  const supabase=await createClient()
  const {data:config}=await supabase.from('configuracoes').select('timezone').single()
  const timezone=config?.timezone||'America/Bahia'
  const agora=DateTime.now().setZone(timezone)
  const inicioValido=DateTime.fromISO(params.inicio||'',{zone:timezone})
  const fimValido=DateTime.fromISO(params.fim||'',{zone:timezone})
  if(inicioValido.isValid&&fimValido.isValid&&fimValido<inicioValido)redirect('/admin/relatorios?erro=periodo')
  const inicio=inicioValido.isValid?inicioValido.startOf('day'):agora.startOf('month')
  const fim=fimValido.isValid?fimValido.endOf('day'):agora.endOf('month')
  const dias=Math.max(1,Math.ceil(fim.diff(inicio,'days').days))
  const fimAnterior=inicio.minus({milliseconds:1})
  const inicioAnterior=inicio.minus({days:dias})
  const campos='id,inicio,status,preco,nome_servico,cliente_id'
  const [{data:agendamentos},{data:anteriores}]=await Promise.all([
    supabase.from('agendamentos').select(campos).gte('inicio',inicio.toUTC().toISO()).lte('inicio',fim.toUTC().toISO()).order('inicio'),
    supabase.from('agendamentos').select(campos).gte('inicio',inicioAnterior.toUTC().toISO()).lte('inicio',fimAnterior.toUTC().toISO())
  ])
  const lista=(agendamentos||[]) as Agendamento[]
  const anterior=(anteriores||[]) as Agendamento[]
  const concluidos=lista.filter(a=>a.status==='CONCLUIDO')
  const concluidosAnterior=anterior.filter(a=>a.status==='CONCLUIDO')
  const cancelados=lista.filter(a=>a.status==='CANCELADO')
  const faltas=lista.filter(a=>a.status==='NAO_COMPARECEU')
  const faturamento=somar(concluidos)
  const faturamentoAnterior=somar(concluidosAnterior)
  const ticket=concluidos.length?faturamento/concluidos.length:0
  const ticketAnterior=concluidosAnterior.length?faturamentoAnterior/concluidosAnterior.length:0
  const clientesUnicos=new Set(concluidos.map(a=>a.cliente_id).filter(Boolean)).size
  const servicos=Object.entries(concluidos.reduce<Record<string,{qtd:number,total:number}>>((acc,a)=>{const nome=a.nome_servico||'Serviço';acc[nome]??={qtd:0,total:0};acc[nome].qtd++;acc[nome].total+=Number(a.preco||0);return acc},{})).sort((a,b)=>b[1].qtd-a[1].qtd)
  const meses=Array.from({length:6},(_,i)=>agora.startOf('month').minus({months:5-i}))
  const inicioGrafico=meses[0].startOf('month')
  const {data:historico}=await supabase.from('agendamentos').select(campos).eq('status','CONCLUIDO').gte('inicio',inicioGrafico.toUTC().toISO()).lte('inicio',agora.endOf('month').toUTC().toISO())
  const serie=meses.map(m=>{const itens=((historico||[]) as Agendamento[]).filter(a=>DateTime.fromISO(a.inicio).setZone(timezone).hasSame(m,'month'));return {label:m.setLocale('pt-BR').toFormat('LLL'),total:somar(itens),qtd:itens.length}})
  const max=Math.max(1,...serie.map(x=>x.total))

  return <div className="stack-lg">
    <header className="split"><div><p className="eyebrow">Desempenho</p><h1 className="page-title">Relatórios</h1><p className="muted">Acompanhe os principais números da barbearia.</p></div><form className="report-filter"><div className="field"><label>De</label><input className="input" type="date" name="inicio" defaultValue={inicio.toISODate()||''}/></div><div className="field"><label>Até</label><input className="input" type="date" name="fim" defaultValue={fim.toISODate()||''}/></div><button className="btn btn-primary">Aplicar</button><Link className="btn" href="/admin/relatorios">Mês atual</Link></form></header>
    {params.erro==='periodo'&&<div className="notice notice-error">A data final deve ser igual ou posterior à data inicial.</div>}
    <section className="stats-grid">
      <Card titulo="Faturamento" valor={formatarMoeda(faturamento)} detalhe={comparar(faturamento,faturamentoAnterior)}/>
      <Card titulo="Atendimentos" valor={String(concluidos.length)} detalhe={comparar(concluidos.length,concluidosAnterior.length)}/>
      <Card titulo="Ticket médio" valor={formatarMoeda(ticket)} detalhe={comparar(ticket,ticketAnterior)}/>
      <Card titulo="Ocorrências" valor={String(cancelados.length+faltas.length)} detalhe={`${cancelados.length} cancelado(s) · ${faltas.length} falta(s)`}/>
    </section>
    <section className="card stack"><div><p className="eyebrow">Evolução</p><h2>Faturamento — últimos 6 meses</h2></div><div className="revenue-chart">{serie.map(item=><div className="chart-column" key={item.label}><div className="chart-value">{formatarMoeda(item.total)}</div><div className="chart-track"><div className="chart-bar" style={{height:`${Math.max(item.total?8:0,(item.total/max)*100)}%`}}/></div><strong>{item.label}</strong><span className="muted small">{item.qtd} atend.</span></div>)}</div></section>
    <section className="card stack"><div><p className="eyebrow">Serviços</p><h2>Mais realizados no período</h2></div>{servicos.length?<div className="table">{servicos.map(([nome,dados])=><div className="table-row report-row" key={nome}><div><strong>{nome}</strong><p className="muted small">{dados.qtd} atendimento(s)</p></div><strong>{formatarMoeda(dados.total)}</strong></div>)}</div>:<div className="empty-state"><strong>Sem dados no período</strong><p className="muted">Ainda não há atendimentos concluídos para estas datas.</p></div>}</section>
  </div>
}
function somar(lista:Agendamento[]){return lista.reduce((s,a)=>s+Number(a.preco||0),0)}
function comparar(atual:number,anterior:number){if(!anterior)return atual?'Sem base anterior para comparar':'Sem alteração no período';const p=((atual-anterior)/anterior)*100;return `${p>=0?'↑':'↓'} ${Math.abs(p).toFixed(1)}% vs. período anterior`}
function Card({titulo,valor,detalhe}:{titulo:string;valor:string;detalhe:string}){return <article className="stat-card"><span>{titulo}</span><strong>{valor}</strong><small>{detalhe}</small></article>}
