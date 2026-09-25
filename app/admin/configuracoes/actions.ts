'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { registrarAuditoria } from '@/lib/auditoria'

const dias = [
  { numero: 1, chave: 'segunda' }, { numero: 2, chave: 'terca' }, { numero: 3, chave: 'quarta' },
  { numero: 4, chave: 'quinta' }, { numero: 5, chave: 'sexta' }, { numero: 6, chave: 'sabado' }, { numero: 0, chave: 'domingo' },
]

export async function salvarConfiguracoes(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const nome = String(formData.get('nome_barbearia') || '').trim()
  const telefone = String(formData.get('telefone') || '').trim()
  const telefoneDigitos = telefone.replace(/\D/g, '')
  const whatsapp = String(formData.get('whatsapp') || '').trim()
  const endereco = String(formData.get('endereco') || '').trim()
  const intervalo = Number(formData.get('intervalo_agendamento'))
  const antecedenciaMinima = Number(formData.get('antecedencia_minima_minutos'))
  const antecedenciaMaxima = Number(formData.get('antecedencia_maxima_dias'))
  const cancelamento = Number(formData.get('cancelamento_minimo_horas'))
  const whatsappAtivo = false
  const lembreteHoras = Number(formData.get('lembrete_horas_antes'))
  const agendaPublicaAtiva = formData.get('agenda_publica_ativa') === 'on'

  if (!nome || nome.length > 120 || (telefone && (telefoneDigitos.length < 10 || telefoneDigitos.length > 13)) || endereco.length > 240 || !Number.isInteger(intervalo) || intervalo < 5 || intervalo > 240 || !Number.isInteger(antecedenciaMinima) || antecedenciaMinima < 0 || !Number.isInteger(antecedenciaMaxima) || antecedenciaMaxima < 1 || antecedenciaMaxima > 365 || !Number.isInteger(cancelamento) || cancelamento < 0 || !Number.isInteger(lembreteHoras) || lembreteHoras < 1 || lembreteHoras > 168) {
    redirect('/admin/configuracoes?erro=dados')
  }

  const { data: config } = await supabase.from('configuracoes').select('id').limit(1).single()
  if (!config) redirect('/admin/configuracoes?erro=configuracao')

  const { error } = await supabase.from('configuracoes').update({
    nome_barbearia: nome,
    telefone: telefone || null,
    whatsapp: whatsapp || null,
    endereco: endereco || null,
    intervalo_agendamento: intervalo,
    antecedencia_minima_minutos: antecedenciaMinima,
    antecedencia_maxima_dias: antecedenciaMaxima,
    cancelamento_minimo_horas: cancelamento,
    whatsapp_ativo: whatsappAtivo,
    lembrete_horas_antes: lembreteHoras,
    agenda_publica_ativa: agendaPublicaAtiva,
  }).eq('id', config.id)

  if (error) redirect('/admin/configuracoes?erro=banco')
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'CONFIGURACOES_EDITADAS', entidade: 'CONFIGURACAO', entidadeId: config.id })
  revalidatePath('/admin/configuracoes')
  revalidatePath('/admin')
  revalidatePath('/agendar')
  redirect('/admin/configuracoes?sucesso=configuracao')
}

export async function salvarExpediente(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const horarios: Array<{ dia_semana: number; hora_inicio: string; hora_fim: string }> = []

  for (const dia of dias) {
    for (const periodo of [1, 2]) {
      const inicio = String(formData.get(`${dia.chave}_${periodo}_inicio`) || '')
      const fim = String(formData.get(`${dia.chave}_${periodo}_fim`) || '')
      if (!inicio && !fim) continue
      if (!inicio || !fim || inicio >= fim) redirect('/admin/configuracoes?erro=horario')
      horarios.push({ dia_semana: dia.numero, hora_inicio: inicio, hora_fim: fim })
    }
  }

  for (const dia of dias) {
    const periodos = horarios.filter((h) => h.dia_semana === dia.numero).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    for (let i = 1; i < periodos.length; i++) {
      if (periodos[i].hora_inicio < periodos[i - 1].hora_fim) redirect('/admin/configuracoes?erro=sobreposicao')
    }
  }

  const { error: deleteError } = await supabase.from('horarios_funcionamento').delete().gte('dia_semana', 0)
  if (deleteError) redirect('/admin/configuracoes?erro=banco')
  if (horarios.length) {
    const { error } = await supabase.from('horarios_funcionamento').insert(horarios)
    if (error) redirect('/admin/configuracoes?erro=banco')
  }

  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'EXPEDIENTE_EDITADO', entidade: 'HORARIO' })
  revalidatePath('/admin/configuracoes')
  revalidatePath('/admin/agenda')
  revalidatePath('/agendar')
  redirect('/admin/configuracoes?sucesso=expediente')
}
