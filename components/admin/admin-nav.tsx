'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const itens=[
  {href:'/admin',label:'Dashboard',icon:'⌂'},
  {href:'/admin/agenda',label:'Agenda',icon:'◷'},
  {href:'/admin/clientes',label:'Clientes',icon:'♙'},
  {href:'/admin/servicos',label:'Serviços',icon:'✂'},
  {href:'/admin/configuracoes',label:'Configurações',icon:'⚙'},
]

export function AdminNav(){
  const pathname=usePathname()
  return <nav className="nav" aria-label="Navegação administrativa">
    {itens.map(item=>{
      const ativo=item.href==='/admin'?pathname==='/admin':pathname.startsWith(item.href)
      return <Link key={item.href} href={item.href} className={ativo?'active':''} aria-current={ativo?'page':undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></Link>
    })}
  </nav>
}
