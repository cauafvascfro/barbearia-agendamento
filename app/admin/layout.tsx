import { AdminNav } from '@/components/admin/admin-nav'
import { requireAdmin } from '@/lib/auth/require-admin'
import { logout } from './actions'

export const dynamic = 'force-dynamic'
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const {supabase}=await requireAdmin()
  const {data:config}=await supabase.from('configuracoes').select('nome_barbearia').limit(1).single()
  const nome=config?.nome_barbearia||'Barbearia'
  const iniciais=nome.split(/\s+/).filter(Boolean).slice(0,2).map((p:string)=>p[0]).join('').toUpperCase()||'B'
  return <div className="admin-shell"><aside className="sidebar"><div className="sidebar-brand"><div className="sidebar-monogram">{iniciais}</div><div><small>{nome}</small><strong>Painel administrativo</strong></div></div><AdminNav/><form action={logout}><button type="submit">Sair</button></form></aside><main className="admin-main">{children}</main></div>
}
