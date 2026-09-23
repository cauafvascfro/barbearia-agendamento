import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agendamento da Barbearia',
  description: 'Agendamento online e gestão da barbearia',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
