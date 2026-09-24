import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatarMoeda } from '@/lib/formatters'
import { GerenciarAgendamento } from '@/components/agendamento/gerenciar-agendamento'

type Props={params:Promise<{token:string}>}
export const dynamic='force-dynamic'

export default async function AgendamentoPage({params}:Props){const {token}=await params;const supabase=createAdminClient();const [{data:config},{data:a}]=await Promise.all([supabase.from('configuracoes').select('nome_barbearia,timezone,antecedencia_maxima_dias,cancelamento_minimo_horas').limit(1).single(),supabase.from('agendamentos').select('inicio,fim,nome_servico,preco,status').eq('token_cliente',token).single()]);if(!a)notFound();const timezone=config?.timezone||'America/Bahia';const inicio=DateTime.fromISO(a.inicio).setZone(timezone);const agora=DateTime.now().setZone(timezone);const limite=inicio.minus({hours:config?.cancelamento_minimo_horas||0});const podeAlterar=a.status==='CONFIRMADO'&&agora<limite;return <main className="public-shell newstyle-public"><div className="container" style={{maxWidth:560}}><section className="card stack-lg" style={{textAlign:'center'}}><div className="success-mark">✓</div><div><h1 className="page-title">{a.status==='CANCELADO'?'Agendamento cancelado':'Seu agendamento'}</h1><p className="eyebrow">New Style Barbearia</p><p className="muted">${a.status==='CONFIRMADO'?'Horário reservado com sucesso. Guarde esta página para consultar ou alterar seu agendamento.':'Consulte abaixo os dados deste agendamento.'}</p></div><div className="card-soft stack" style={{textAlign:'left'}}><Info titulo="Serviço" valor={a.nome_servico}/><Info titulo="Data" valor={inicio.toFormat('dd/MM/yyyy')}/><Info titulo="Horário" valor={inicio.toFormat('HH:mm')}/><Info titulo="Valor" valor={formatarMoeda(a.preco)}/><Info titulo="Status" valor={nomeStatus(a.status)}/></div><GerenciarAgendamento token={token} podeAlterar={podeAlterar} dataMinima={agora.toISODate()!} dataMaxima={agora.plus({days:config?.antecedencia_maxima_dias||30}).toISODate()!}/><Link className="btn" href="/agendar">Fazer outro agendamento</Link></section></div></main>}
function Info({titulo,valor}:{titulo:string;valor:string}){return <div className="split"><span className="muted">{titulo}</span><strong>{valor}</strong></div>}
function nomeStatus(s:string){return s==='CONFIRMADO'?'Confirmado':s==='CONCLUIDO'?'Concluído':s==='CANCELADO'?'Cancelado':'Não compareceu'}
