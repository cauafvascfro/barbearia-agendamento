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
  const [{ data: config }, { data: horarios }] = await Promise.all([
    supabase.from('configuracoes').select('*').limit(1).single(),
    supabase.from('horarios_funcionamento').select('*').eq('ativo', true).order('hora_inicio'),
  ])

  if (!config) return <div className="notice notice-error">Execute as migrations/seed antes de configurar o sistema.</div>

  const periodos = (dia: number) => (horarios || []).filter((h) => h.dia_semana === dia)
  return (
    <div className="stack-lg">
      <header><p className="eyebrow">Administração</p><h1 className="page-title">Configurações</h1><p className="muted">Personalize a barbearia sem precisar alterar o código.</p></header>
      {params.sucesso && <div className="notice notice-success">Configurações salvas.</div>}
      {params.erro && <div className="notice notice-error">Revise os dados informados.</div>}

      <form action={salvarConfiguracoes} className="card stack-lg">
        <div><h2>Identidade e contato</h2><p className="muted small">O nome e o telefone salvos aqui também são usados na área pública do agendamento.</p></div>
        <div className="grid-2">
          <div className="field"><label>Nome da barbearia</label><input className="input" name="nome_barbearia" required defaultValue={config.nome_barbearia} /></div>
          <div className="field"><label>Telefone</label><input className="input" name="telefone" defaultValue={config.telefone || ''} /></div>
          <input type="hidden" name="whatsapp" value={config.whatsapp || ''} />
          <div className="field"><label>Endereço</label><input className="input" name="endereco" defaultValue={config.endereco || ''} /></div>
          <div className="field"><label>Intervalo entre inícios (min)</label><input className="input" type="number" min="5" name="intervalo_agendamento" defaultValue={config.intervalo_agendamento} /></div>
          <div className="field"><label>Antecedência mínima (min)</label><input className="input" type="number" min="0" name="antecedencia_minima_minutos" defaultValue={config.antecedencia_minima_minutos} /></div>
          <div className="field"><label>Agenda aberta por (dias)</label><input className="input" type="number" min="1" name="antecedencia_maxima_dias" defaultValue={config.antecedencia_maxima_dias} /></div>
          <div className="field"><label>Prazo mínimo para cancelar/remarcar (h)</label><input className="input" type="number" min="0" name="cancelamento_minimo_horas" defaultValue={config.cancelamento_minimo_horas} /></div>
          <input type="hidden" name="lembrete_horas_antes" value={config.lembrete_horas_antes} />
          <input type="hidden" name="whatsapp_ativo" value="off" />
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
