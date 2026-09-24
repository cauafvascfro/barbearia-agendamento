import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/require-admin'
import { formatarMoeda, formatarTelefone } from '@/lib/formatters'

export const dynamic = 'force-dynamic'
type Props = { searchParams: Promise<{ busca?: string }> }

export default async function ClientesPage({ searchParams }: Props) {
  const { busca = '' } = await searchParams
  const termo = busca.trim()
  const { supabase } = await requireAdmin()
  let consulta = supabase.from('clientes').select('id,nome,telefone,ativo,criado_em').eq('ativo', true).order('nome').limit(100)
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,telefone.ilike.%${termo}%`)
  const { data: clientes } = await consulta
  const ids = (clientes || []).map((c) => c.id)
  const { data: agendamentos } = ids.length ? await supabase.from('agendamentos').select('cliente_id,inicio,preco,status').in('cliente_id', ids).order('inicio', { ascending: false }) : { data: [] as any[] }
  const stats = new Map<string, { atendimentos:number; gasto:number }>()
  for (const c of clientes || []) stats.set(c.id, { atendimentos:0, gasto:0 })
  for (const a of agendamentos || []) if (a.status === 'CONCLUIDO') { const s=stats.get(a.cliente_id); if(s){s.atendimentos++;s.gasto+=Number(a.preco)} }

  return <div className="stack-lg">
    <header className="split"><div><p className="eyebrow">Relacionamento</p><h1 className="page-title">Clientes</h1><p className="muted">Histórico e frequência de atendimento.</p></div><form className="customer-search"><input className="input" name="busca" defaultValue={termo} placeholder="Nome ou telefone"/><button className="btn btn-primary">Buscar</button>{termo&&<Link className="btn" href="/admin/clientes">Limpar</Link>}</form></header>
    <section className="table-list">
      {!clientes?.length ? <div className="table-row"><p className="muted">Nenhum cliente encontrado.</p></div> : clientes.map((c) => { const s=stats.get(c.id); return <Link className="table-row split" href={`/admin/clientes/${c.id}`} key={c.id}><div><strong>{c.nome}</strong><p className="muted small">{formatarTelefone(c.telefone)}</p></div><div className="wrap"><span className="badge badge-gray">{s?.atendimentos || 0} atend.</span><strong>{formatarMoeda(s?.gasto || 0)}</strong><span>Ver histórico →</span></div></Link> })}
    </section>
  </div>
}
