import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'

type Props = {
  data: string
  duracaoMinutos: number
  ignorarAgendamentoId?: string
}

export async function calcularDisponibilidade({ data, duracaoMinutos, ignorarAgendamentoId }: Props) {
  const supabase = createAdminClient()
  const { data: configuracao } = await supabase.from('configuracoes').select('*').limit(1).single()
  if (!configuracao) throw new Error('CONFIGURACAO_NAO_ENCONTRADA')

  const timezone = configuracao.timezone || 'America/Bahia'
  const dia = DateTime.fromISO(data, { zone: timezone })
  if (!dia.isValid) throw new Error('DATA_INVALIDA')

  const agora = DateTime.now().setZone(timezone)
  const limite = agora.startOf('day').plus({ days: configuracao.antecedencia_maxima_dias })
  if (dia.startOf('day') < agora.startOf('day') || dia.startOf('day') > limite) return []

  const [{ data: expedienteSemanal }, { data: aberturasExtras }] = await Promise.all([
    supabase.from('horarios_funcionamento').select('hora_inicio,hora_fim').eq('dia_semana', dia.weekday % 7).eq('ativo', true).order('hora_inicio'),
    supabase.from('aberturas_extras').select('hora_inicio,hora_fim').eq('data', data).order('hora_inicio'),
  ])
  const expediente = [...(expedienteSemanal || []), ...(aberturasExtras || [])]
    .sort((a, b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)))
  if (!expediente.length) return []

  const inicioDia = dia.startOf('day').toUTC()
  const fimDia = dia.endOf('day').toUTC()

  let consulta = supabase
    .from('agendamentos')
    .select('id,inicio,fim')
    .neq('status', 'CANCELADO')
    .lt('inicio', fimDia.toISO())
    .gt('fim', inicioDia.toISO())

  if (ignorarAgendamentoId) consulta = consulta.neq('id', ignorarAgendamentoId)

  const [{ data: agendamentos }, { data: bloqueios }] = await Promise.all([
    consulta,
    supabase.from('bloqueios_agenda').select('inicio,fim').lt('inicio', fimDia.toISO()).gt('fim', inicioDia.toISO()),
  ])

  const minimoPermitido = agora.plus({ minutes: configuracao.antecedencia_minima_minutos })
  const intervalo = Math.max(Number(configuracao.intervalo_agendamento) || 30, 1)
  const horarios: Array<{ inicio: string; fim: string; hora: string }> = []

  const conflita = (inicio: DateTime, fim: DateTime) => {
    const ocupado = agendamentos?.some((item) => {
      const i = DateTime.fromISO(item.inicio)
      const f = DateTime.fromISO(item.fim)
      return inicio < f && fim > i
    })
    if (ocupado) return true
    return bloqueios?.some((item) => {
      const i = DateTime.fromISO(item.inicio)
      const f = DateTime.fromISO(item.fim)
      return inicio < f && fim > i
    }) || false
  }

  for (const periodo of expediente) {
    const inicioPeriodo = String(periodo.hora_inicio).slice(0, 5)
    const fimPeriodo = String(periodo.hora_fim).slice(0, 5)
    let cursor = DateTime.fromISO(`${data}T${inicioPeriodo}`, { zone: timezone })
    const limitePeriodo = DateTime.fromISO(`${data}T${fimPeriodo}`, { zone: timezone })

    while (cursor.plus({ minutes: duracaoMinutos }) <= limitePeriodo) {
      const fim = cursor.plus({ minutes: duracaoMinutos })
      if (cursor >= minimoPermitido && !conflita(cursor, fim)) {
        horarios.push({ inicio: cursor.toISO()!, fim: fim.toISO()!, hora: cursor.toFormat('HH:mm') })
      }
      cursor = cursor.plus({ minutes: intervalo })
    }
  }

  return horarios
}
