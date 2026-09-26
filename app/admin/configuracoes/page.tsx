import { requireAdmin } from '@/lib/auth/require-admin'
import { salvarConfiguracoes, salvarExpediente } from './actions'

export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<{ erro?: string; sucesso?: string }> }

const dias = [
  { numero: 1, chave: 'segunda', nome: 'Segunda' }, { numero: 2, chave: 'terca', nome: 'Terça' }, { numero: 3, chave: 'quarta', nome: 'Quarta' },
  { numero: 4, chave: 'quinta', nome: 'Quinta' }, { numero: 5, chave: 'sexta', nome: 'Sexta' }, { numero: 6, chave: 'sabado', nome: 'Sábado' }, { numero: 0, chave: 'domingo', nome: 'Domingo' },
]

export default async function ConfiguracoesPage({ searchParams }: Props) {
  const params = await searchParams
  const { supabase } = await requireAdmin()
  const [{ data: config }, { data: horarios }, { count: servicosAtivos }, { count: aberturasFuturas }] = await Promise.all([
    supabase.from('configuracoes').select('*').limit(1).single(),
    supabase.from('horarios_funcionamento').select('*').eq('ativo', true).order('hora_inicio'),
    supabase.from('servicos').select('id',{count:'exact',head:true}).eq('ativo',true),
    supabase.from('aberturas_extras').select('id',{count:'exact',head:true}).gte('data',new Date().toISOString().slice(0,10)),
  ])

  if (!config) return <div className="notice notice-error">Execute as migrations/seed antes de configurar o sistema.</div>

  const periodos = (dia: number) => (horarios || []).filter((h) => h.dia_semana === dia)
  const identidadeOk=Boolean(config.nome_barbearia?.trim())
  const contatoOk=Boolean(config.telefone?.trim())
  const expedienteOk=Boolean((horarios||[]).length||(aberturasFuturas||0)>0)
  const servicosOk=Boolean(servicosAtivos&&servicosAtivos>0)
  const regrasOk=Boolean(config.intervalo_agendamento>=5&&config.antecedencia_maxima_dias>=1)
  const publicada=config.agenda_publica_ativa!==false
  const podePublicar=identidadeOk&&contatoOk&&servicosOk&&expedienteOk&&regrasOk
  const itensProntidao=[identidadeOk,contatoOk,servicosOk,expedienteOk,regrasOk]
  const prontidao=itensProntidao.filter(Boolean).length
  const percentualProntidao=Math.round((prontidao/itensProntidao.length)*100)
  return (
    <div className="stack-lg">
      <header><p className="eyebrow">Administração</p><h1 className="page-title">Configurações</h1><p className="muted">Personalize a barbearia sem precisar alterar o código.</p></header>
      {params.sucesso && <div className="notice notice-success">Configurações salvas.</div>}
      {params.erro && <div className="notice notice-error">{mensagemErro(params.erro)}</div>}
      <section className="card stack"><div className="split"><div><p className="eyebrow">Implantação</p><h2>Checklist da instalação</h2></div><div className="wrap"><span className={`badge ${publicada?'badge-green':'badge-gray'}`}>{publicada?'Agenda online':'Agenda pausada'}</span><span className={`badge ${prontidao===5?'badge-green':'badge-gray'}`}>{prontidao}/5 concluídos · {percentualProntidao}%</span></div></div><div className="setup-checklist"><SetupItem ok={identidadeOk} titulo="Identidade" detalhe="Defina o nome comercial da barbearia."/><SetupItem ok={contatoOk} titulo="Contato" detalhe="Informe um telefone para contato com os clientes."/><SetupItem ok={servicosOk} titulo="Serviços" detalhe="Cadastre ao menos um serviço ativo para liberar o agendamento."/><SetupItem ok={expedienteOk} titulo="Expediente" detalhe="Cadastre um período semanal ou uma abertura especial futura."/><SetupItem ok={regrasOk} titulo="Regras da agenda" detalhe="Revise intervalo, antecedência e prazo para cancelamento."/></div></section>
      <section className="card-soft split"><div><strong>{prontidao===5?'Configuração essencial concluída':'Antes de divulgar o link'}</strong><p className="muted small">{prontidao===5?'Os dados essenciais estão preenchidos. Faça um agendamento de homologação e confirme o horário na Agenda administrativa.':'Conclua os itens pendentes do checklist antes de iniciar a homologação pública.'}</p></div>{prontidao===5?<a className="btn" href="/agendar" target="_blank" rel="noreferrer">Testar página pública ↗</a>:<span className="badge badge-gray">Homologação aguardando configuração</span>}</section>

      <form action={salvarConfiguracoes} className="card stack-lg">
        <div><h2>Identidade e contato</h2><p className="muted small">O nome e o telefone salvos aqui também são usados na área pública do agendamento.</p></div>
        <div className="card-soft split"><div><strong>Agenda pública</strong><p className="muted small">{podePublicar?'Permite pausar novos agendamentos sem apagar serviços ou horários.':'Conclua o checklist da instalação antes de publicar novos agendamentos.'}</p></div><label className="wrap"><input type="checkbox" name="agenda_publica_ativa" defaultChecked={config.agenda_publica_ativa !== false} disabled={!podePublicar} /> Aceitar agendamentos online</label>{!podePublicar&&<input type="hidden" name="agenda_publica_ativa" value="off" />}</div>
        <div className="grid-2">
          <div className="field"><label>Nome da barbearia</label><input className="input" name="nome_barbearia" required defaultValue={config.nome_barbearia} /></div>
          <div className="field"><label>Telefone</label><input className="input" name="telefone" inputMode="tel" autoComplete="tel" required placeholder="(75) 99999-9999" defaultValue={config.telefone || ''} /></div>
           <div className="field"><label>Endereço</label><input className="input" name="endereco" defaultValue={config.endereco || ''} /></div>
          <div className="field"><label>Intervalo entre inícios (min)</label><input className="input" type="number" min="5" name="intervalo_agendamento" defaultValue={config.intervalo_agendamento} /></div>
          <div className="field"><label>Antecedência mínima (min)</label><input className="input" type="number" min="0" name="antecedencia_minima_minutos" defaultValue={config.antecedencia_minima_minutos} /></div>
          <div className="field"><label>Agenda aberta por (dias)</label><input className="input" type="number" min="1" name="antecedencia_maxima_dias" defaultValue={config.antecedencia_maxima_dias} /></div>
          <div className="field"><label>Prazo mínimo para cancelar/remarcar (h)</label><input className="input" type="number" min="0" name="cancelamento_minimo_horas" defaultValue={config.cancelamento_minimo_horas} /></div>
         </div>
        <button className="btn btn-primary">Salvar configurações</button>
      </form>

      <form action={salvarExpediente} className="card stack-lg">
        <div><h2>Expediente semanal</h2><p className="muted small">Deixe os dois períodos vazios para marcar o dia como fechado.</p></div>
        <div className="stack">
          {dias.map((dia) => {
            const p = periodos(dia.numero)
            return <div key={dia.chave} className="card-soft"><strong>{dia.nome}</strong><div className="grid-2" style={{ marginTop: 12 }}><Periodo chave={dia.chave} numero={1} inicio={p[0]?.hora_inicio} fim={p[0]?.hora_fim} /><Periodo chave={dia.chave} numero={2} inicio={p[1]?.hora_inicio} fim={p[1]?.hora_fim} /></div></div>
          })}
        </div>
        <button className="btn btn-primary">Salvar expediente</button>
      </form>
    </div>
  )
}

function Periodo({ chave, numero, inicio, fim }: { chave: string; numero: number; inicio?: string; fim?: string }) {
  return <div className="grid-2"><div className="field"><label>Início {numero}</label><input className="input" type="time" name={`${chave}_${numero}_inicio`} defaultValue={inicio?.slice(0, 5) || ''} /></div><div className="field"><label>Fim {numero}</label><input className="input" type="time" name={`${chave}_${numero}_fim`} defaultValue={fim?.slice(0, 5) || ''} /></div></div>
}

function SetupItem({ok,titulo,detalhe}:{ok:boolean;titulo:string;detalhe:string}) { return <div className="setup-item"><span className={`setup-dot ${ok?'done':''}`}>{ok?'✓':'!'}</span><div><strong>{titulo}</strong><p className="muted small">{ok?'Configurado':detalhe}</p>{!ok&&titulo==='Serviços'&&<a className="small" href="/admin/servicos">Configurar serviços →</a>}</div></div> }

function mensagemErro(erro:string){const m:Record<string,string>={dados:'Revise nome, telefone, endereço e regras da agenda.',horario:'Preencha início e fim de cada período ou deixe ambos vazios.',sobreposicao:'Existem períodos de expediente sobrepostos no mesmo dia.',configuracao:'A configuração inicial do sistema não foi encontrada.',banco:'Não foi possível salvar as alterações.'};return m[erro]||'Revise os dados informados.'}
