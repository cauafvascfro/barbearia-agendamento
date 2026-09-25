import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Agendamento online', template: '%s | Agendamento online' },
  description: 'Agendamento online de serviços. Escolha o serviço, a data e o horário.',
  applicationName: 'Agendamento online',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
