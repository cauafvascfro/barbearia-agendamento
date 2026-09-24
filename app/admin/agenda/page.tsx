import Link from 'next/link'
import { DateTime } from 'luxon'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda, formatarTelefone } from '@/lib/formatters'
import { AgendamentoManualForm } from '@/components/admin/agendamento-manual-form'
import { alterarStatusAgendamento, criarAgendamentoManual, criarBloqueio, removerBloqueio, criarAberturaExtra, removerAberturaExtra } from './actions'

export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<{ data?: string; erro?: string; sucesso?: string; status?: string }> }

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const { data: config } = await supabase.from('configuracoes').select('*').limit(1).single()
  const timezone = config?.timezone || 'America/Bahia'
  let dia = params.data ? DateTime.fromISO(params.data, { zone: timezone }) : DateTime.now().setZone(timezone)
  if (!dia.isValid) dia = DateTime.now().setZone(timezone)
  const dataSelecionada = dia.toISODate()!
  const inicioDia = dia.startOf('day').toUTC()
  const fimDia = dia.endOf('day').toUTC()

  const [{ data: agendamentos }, { data: bloqueios }, { data: servicos }, { data: expediente }, { data: aberturasExtras }, { data: clientes }] = await Promise.all([
    supabase.from('agendamentos').select('id,inicio,fim,nome_servico,preco,status,origem,observacoes,cliente:clientes(id,nome,telefone)').gte('inicio', inicioDia.toISO()).lte('inicio', fimDia.toISO()).order('inicio'),
    supabase.from('bloqueios_agenda').select('*').lt('inicio', fimDia.toISO()).gt('fim', inicioDia.toISO()).order('inicio'),
    supabase.from('servicos').select('id,nome,preco,duracao_minutos').eq('ativo', true).order('nome'),
    supabase.from('horarios_funcionamento').select('*').eq('dia_semana', dia.weekday % 7).eq('ativo', true).order('hora_inicio'),
    supabase.from('aberturas_extras').select('*').eq('data', dataSelecionada).order('hora_inicio'),
    supabase.from('clientes').select('id,nome,telefone').eq('ativo', true).order('nome').limit(500),
  ])

  const lista = agendamentos || []
  const confirmados = lista.filter((a) => a.status === 'CONFIRMADO')
  const concluidos = lista.filter((a) => a.status === 'CONCLUIDO')
  const cancelados = lista.filter((a) => a.status === 'CANCELADO')
  const faltas = lista.filter((a) => a.status === 'NAO_COMPARECEU')
  const faturamentoDia = concluidos.reduce((total, a) => total + Number(a.preco), 0)
  const agora = DateTime.now().setZone(timezone)
  const proximo = confirmados.find((a) => DateTime.fromISO(a.inicio).setZone(timezone) >= agora)
  const statusSelecionado = ['CONFIRMADO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'].includes(params.status || '') ? params.status : 'TODOS'
  const listaVisivel = statusSelecionado === 'TODOS' ? lista : lista.filter((a) => a.status === statusSelecionado)
  const urlAgenda = (status?: string) => `/admin/agenda?data=${dataSelecionada}${status && status !== 'TODOS' ? `&status=${status}` : ''}`

  return (
    <div className="stack-lg">
      <header className="split">
        <div><p className="eyebrow">Operação diária</p><h1 className="page-title">Agenda</h1><p className="muted">{dia.setLocale('pt-BR').toFormat("cccc, dd 'de' LLLL")}</p></div>
        <div className="wrap"><Link className="btn" href={`/admin/agenda?data=${dia.minus({ days: 1 }).toISODate()}`}>←</Link><Link className="btn" href={`/admin/agenda?data=${DateTime.now().setZone(timezone).toISODate()}`}>Hoje</Link><Link className="btn" href={`/admin/agenda?data=${dia.plus({ days: 1 }).toISODate()}`}>→</Link></div>
      </header>
      {params.erro && <div className="notice notice-error">{mensagemErro(params.erro)}</div>}
      {params.sucesso && <div className="notice notice-success">Operação realizada com sucesso.</div>}

      <section className="agenda-summary">
        <div className="card stat"><span className="muted small">Agendados</span><strong>{lista.length}</strong><span className="muted small">{confirmados.length} pendentes</span></div>
        <div className="card stat"><span className="muted small">Concluídos</span><strong>{concluidos.length}</strong><span className="muted small">{cancelados.length} cancelados · {faltas.length} faltas</span></div>
        <div className="card stat"><span className="muted small">Faturamento do dia</span><strong>{formatarMoeda(faturamentoDia)}</strong><span className="muted small">Somente atendimentos concluídos</span></div>
        <div className="card stat"><span className="muted small">Próximo atendimento</span><strong>{proximo ? DateTime.fromISO(proximo.inicio).setZone(timezone).toFormat('HH:mm') : '—'}</strong><span className="muted small">{proximo?.nome_servico || 'Nenhum pendente'}</span></div>
      </section>

      <nav className="agenda-filters" aria-label="Filtrar agenda por status">
        <Link className={`filter-chip ${statusSelecionado === 'TODOS' ? 'active' : ''}`} href={urlAgenda('TODOS')}>Todos <span>{lista.length}</span></Link>
        <Link className={`filter-chip ${statusSelecionado === 'CONFIRMADO' ? 'active' : ''}`} href={urlAgenda('CONFIRMADO')}>Pendentes <span>{confirmados.length}</span></Link>
        <Link className={`filter-chip ${statusSelecionado === 'CONCLUIDO' ? 'active' : ''}`} href={urlAgenda('CONCLUIDO')}>Concluídos <span>{concluidos.length}</span></Link>
        <Link className={`filter-chip ${statusSelecionado === 'CANCELADO' ? 'active' : ''}`} href={urlAgenda('CANCELADO')}>Cancelados <span>{cancelados.length}</span></Link>
        <Link className={`filter-chip ${statusSelecionado === 'NAO_COMPARECEU' ? 'active' : ''}`} href={urlAgenda('NAO_COMPARECEU')}>Faltas <span>{faltas.length}</span></Link>
      </nav>

      <div className="admin-grid">
        <section className="stack">
          <div className="card"><strong>Expediente</strong><div className="wrap" style={{ marginTop: 10 }}>{expediente?.length ? expediente.map((p) => <span className="badge badge-gray" key={p.id}>{String(p.hora_inicio).slice(0,5)} – {String(p.hora_fim).slice(0,5)}</span>) : <span className="muted">Fechado no expediente semanal.</span>}</div>{(aberturasExtras || []).map((p) => <div className="split" key={p.id} style={{ marginTop: 10 }}><span className="badge badge-green">Especial: {String(p.hora_inicio).slice(0,5)} – {String(p.hora_fim).slice(0,5)}{p.motivo ? ` · ${p.motivo}` : ''}</span><form action={removerAberturaExtra}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="data" value={dataSelecionada}/><button className="btn">Remover</button></form></div>)}</div>

          {(bloqueios || []).map((b) => {
            const inicio = DateTime.fromISO(b.inicio).setZone(timezone); const fim = DateTime.fromISO(b.fim).setZone(timezone)
            return <div className="card" key={b.id} style={{ borderColor: '#fde68a', background: '#fffbeb' }}><div className="split"><div><span className="badge badge-yellow">Bloqueado</span><h3>{inicio.toFormat('HH:mm')} – {fim.toFormat('HH:mm')}</h3>{b.motivo && <p className="muted">{b.motivo}</p>}</div><form action={removerBloqueio}><input type="hidden" name="id" value={b.id}/><input type="hidden" name="data" value={dataSelecionada}/><button className="btn">Remover</button></form></div></div>
          })}

          {!listaVisivel.length && <div className="card empty-state"><strong>{lista.length ? 'Nenhum resultado' : 'Agenda livre'}</strong><p className="muted">{lista.length ? 'Não há atendimentos com este status nesta data.' : 'Nenhum atendimento agendado para esta data.'}</p></div>}
          {listaVisivel.map((a) => {
            const inicio = DateTime.fromISO(a.inicio).setZone(timezone); const fim = DateTime.fromISO(a.fim).setZone(timezone)
            const cliente = Array.isArray(a.cliente) ? a.cliente[0] : a.cliente
            return <article className={`card appointment appointment-${String(a.status).toLowerCase()}`} key={a.id}>
              <div><div className="appointment-time">{inicio.toFormat('HH:mm')}</div><div className="muted small">até {fim.toFormat('HH:mm')}</div></div>
              <div><div className="wrap"><strong>{cliente?.nome || 'Cliente'}</strong><Status status={a.status}/></div><p>{a.nome_servico}</p><p className="muted small">{formatarTelefone(cliente?.telefone)} · {formatarMoeda(a.preco)} · {a.origem === 'SITE' ? 'Online' : 'Manual'}</p>{cliente?.id && <Link className="appointment-client-link small" href={`/admin/clientes/${cliente.id}`}>Ver cliente →</Link>}{a.observacoes && <p className="small">{a.observacoes}</p>}</div>
              {a.status === 'CONFIRMADO' && <div className="wrap"><StatusButton id={a.id} data={dataSelecionada} status="CONCLUIDO">Concluir</StatusButton><StatusButton id={a.id} data={dataSelecionada} status="NAO_COMPARECEU">Faltou</StatusButton><StatusButton id={a.id} data={dataSelecionada} status="CANCELADO">Cancelar</StatusButton></div>}
            </article>
          })}
        </section>

        <aside className="stack">
          <AgendamentoManualForm data={dataSelecionada} servicos={servicos || []} clientes={clientes || []} action={criarAgendamentoManual}/>
          <form action={criarAberturaExtra} className="card stack"><h2>Abrir horário especial</h2><p className="muted small">Use para domingos, feriados ou qualquer data fora do expediente semanal.</p><input type="hidden" name="data" value={dataSelecionada}/><Campo label="Início" name="hora_inicio" type="time" required/><Campo label="Fim" name="hora_fim" type="time" required/><Campo label="Motivo" name="motivo"/><button className="btn btn-primary">Abrir nesta data</button></form>
          <form action={criarBloqueio} className="card stack"><h2>Bloquear horário</h2><input type="hidden" name="data" value={dataSelecionada}/><Campo label="Início" name="hora_inicio" type="time" required/><Campo label="Fim" name="hora_fim" type="time" required/><Campo label="Motivo" name="motivo"/><button className="btn">Bloquear</button></form>
        </aside>
      </div>
    </div>
  )
}

function Campo({ label, name, type='text', required=false }: { label: string; name: string; type?: string; required?: boolean }) { return <div className="field"><label>{label}</label><input className="input" name={name} type={type} required={required}/></div> }
function StatusButton({ id, data, status, children }: { id:string; data:string; status:string; children:React.ReactNode }) { return <form action={alterarStatusAgendamento}><input type="hidden" name="id" value={id}/><input type="hidden" name="data" value={data}/><input type="hidden" name="status" value={status}/><button className="btn">{children}</button></form> }
function Status({ status }: { status:string }) { const map:Record<string,[string,string]>={CONFIRMADO:['Confirmado','badge-blue'],CONCLUIDO:['Concluído','badge-green'],CANCELADO:['Cancelado','badge-gray'],NAO_COMPARECEU:['Não compareceu','badge-red']}; const item=map[status]||[status,'badge-gray']; return <span className={`badge ${item[1]}`}>{item[0]}</span> }
function mensagemErro(erro:string) { const m:Record<string,string>={dados:'Preencha os dados obrigatórios.',ocupado:'Este horário já está ocupado.',bloqueado:'Este horário está bloqueado.',expediente:'O horário está fora do expediente.',antecedencia:'O horário está dentro da antecedência mínima configurada.',bloqueio:'Período de bloqueio inválido.',bloqueio_conflito:'Existe um atendimento neste período.',abertura:'Horário especial inválido.',cliente:'Os dados não correspondem ao cliente selecionado.',status:'Status inválido.',banco:'Não foi possível concluir a operação.'}; return m[erro]||'Ocorreu um erro.' }
