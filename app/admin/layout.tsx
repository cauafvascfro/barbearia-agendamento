import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/require-admin'
import { logout } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><small>Gestão</small><strong>Barbearia</strong></div>
        <nav className="nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/agenda">Agenda</Link>
          <Link href="/admin/clientes">Clientes</Link>
          <Link href="/admin/servicos">Serviços</Link>
          <Link href="/admin/configuracoes">Configurações</Link>
        </nav>
        <form action={logout}><button type="submit">Sair</button></form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  )
}
