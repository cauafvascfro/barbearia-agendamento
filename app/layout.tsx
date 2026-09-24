import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'New Style Barbearia', template: '%s | New Style Barbearia' },
  description: 'Agendamento online da New Style Barbearia. Escolha seu serviço, data e horário.',
  applicationName: 'New Style Barbearia',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
