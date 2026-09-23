import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { editarServico } from '../../actions'

type Props = { params: Promise<{ id: string }> }

export default async function EditarServicoPage({ params }: Props) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  const { data: servico } = await supabase.from('servicos').select('*').eq('id', id).single()
  if (!servico) notFound()
  const action = editarServico.bind(null, id)

  return (
    <div className="stack-lg" style={{ maxWidth: 720 }}>
      <Link className="muted" href="/admin/servicos">← Voltar</Link>
      <header><h1 className="page-title">Editar serviço</h1></header>
      <form action={action} className="card stack">
        <div className="field"><label>Nome</label><input className="input" name="nome" required defaultValue={servico.nome} /></div>
        <div className="field"><label>Descrição</label><textarea className="textarea" name="descricao" defaultValue={servico.descricao || ''} /></div>
        <div className="field"><label>Preço</label><input className="input" name="preco" required defaultValue={Number(servico.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /></div>
        <div className="field"><label>Duração (min)</label><input className="input" name="duracao_minutos" type="number" min="5" step="5" required defaultValue={servico.duracao_minutos} /></div>
        <button className="btn btn-primary">Salvar alterações</button>
      </form>
    </div>
  )
}
