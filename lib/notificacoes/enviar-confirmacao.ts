import { enviarNotificacaoAgendamento } from '@/lib/notificacoes/enviar-notificacao'

export async function enviarConfirmacao(agendamentoId:string){
  return enviarNotificacaoAgendamento(agendamentoId,'CONFIRMACAO')
}
