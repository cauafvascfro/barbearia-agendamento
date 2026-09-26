'use server'

import { DateTime } from 'luxon'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { registrarAuditoria } from '@/lib/auditoria'

const STATUS_FINAIS = ['CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'] as const

function inicioFim(data:string,horaInicio:string,horaFim:string,timezone:string){
  const inicio=DateTime.fromISO(`${data}T${horaInicio}`,{zone:timezone})
  const fim=DateTime.fromISO(`${data}T${horaFim}`,{zone:timezone})
  return {inicio,fim}
}

export async function alterarStatusAgendamento(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id = String(formData.get('id') || '')
  const status = String(formData.get('status') || '')
  const data = String(formData.get('data') || '')
  if (!id || !STATUS_FINAIS.includes(status as (typeof STATUS_FINAIS)[number])) redirect(`/admin/agenda?data=${data}&erro=status`)

  const { data: atual, error: erroAtual } = await supabase
    .from('agendamentos')
    .select('status,inicio,fim')
    .eq('id', id)
    .maybeSingle()

  if (erroAtual) redirect(`/admin/agenda?data=${data}&erro=banco`)
  if (!atual || atual.status !== 'CONFIRMADO') redirect(`/admin/agenda?data=${data}&erro=status`)

  const { data: alterado, error } = await supabase
    .from('agendamentos')
    .update({ status })
    .eq('id', id)
    .eq('status', 'CONFIRMADO')
    .select('id')
    .maybeSingle()

  if (error) redirect(`/admin/agenda?data=${data}&erro=banco`)
  if (!alterado) redirect(`/admin/agenda?data=${data}&erro=status`)

  if (status === 'CANCELADO') {
    await supabase.from('agendamento_eventos').insert({
      agendamento_id: id,
      tipo: 'CANCELADO_ADMIN',
      inicio_anterior: atual?.inicio || null,
      fim_anterior: atual?.fim || null,
    })
  }

  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: `AGENDAMENTO_${status}`, entidade: 'AGENDAMENTO', entidadeId: id })
  revalidatePath('/admin/agenda')
  revalidatePath('/admin')
  redirect(`/admin/agenda?data=${data}&sucesso=status`)
}

export async function criarAgendamentoManual(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const servicoId = String(formData.get('servico_id') || '')
  let nome = String(formData.get('nome') || '').trim()
  let telefone = String(formData.get('telefone') || '').trim()
  const clienteId = String(formData.get('cliente_id') || '').trim()
  const data = String(formData.get('data') || '')
  const hora = String(formData.get('hora') || '')
  const observacoes = String(formData.get('observacoes') || '').trim()
  if (!servicoId || !data || !hora || (!clienteId && (!nome || !telefone))) redirect(`/admin/agenda?data=${data}&erro=dados`)

  if (clienteId) {
    const { data: cliente } = await supabase.from('clientes').select('id,nome,telefone').eq('id', clienteId).eq('ativo', true).maybeSingle()
    if (!cliente) redirect(`/admin/agenda?data=${data}&erro=cliente`)
    nome = cliente.nome
    telefone = cliente.telefone
  }
  const { data: config } = await supabase.from('configuracoes').select('timezone').limit(1).single()
  const timezone = config?.timezone || 'America/Bahia'
  const inicio = DateTime.fromISO(`${data}T${hora}`, { zone: timezone })
  if (!inicio.isValid) redirect(`/admin/agenda?data=${data}&erro=horario`)

  const { data: resultado, error } = await supabase.rpc('criar_agendamento_admin', {
    p_servico_id: servicoId,
    p_inicio: inicio.toISO(),
    p_nome: nome,
    p_telefone: telefone,
    p_observacoes: observacoes || null,
  })

  if (error) {
    const msg = error.message
    const codigo = msg.includes('HORARIO_INDISPONIVEL') ? 'ocupado' : msg.includes('HORARIO_BLOQUEADO') ? 'bloqueado' : msg.includes('FORA_DO_EXPEDIENTE') ? 'expediente' : msg.includes('HORARIO_PASSADO') ? 'horario' : 'banco'
    redirect(`/admin/agenda?data=${data}&erro=${codigo}`)
  }

  const agendamento = resultado?.[0]
  if (!agendamento) redirect(`/admin/agenda?data=${data}&erro=banco`)
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'AGENDAMENTO_MANUAL_CRIADO', entidade: 'AGENDAMENTO', entidadeId: agendamento.agendamento_id })
  revalidatePath('/admin/agenda')
  revalidatePath('/admin')
  redirect(`/admin/agenda?data=${data}&sucesso=agendamento`)
}

export async function criarBloqueio(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const data = String(formData.get('data') || '')
  const horaInicio = String(formData.get('hora_inicio') || '')
  const horaFim = String(formData.get('hora_fim') || '')
  const motivo = String(formData.get('motivo') || '').trim()
  if (!data || !horaInicio || !horaFim) redirect(`/admin/agenda?data=${data}&erro=bloqueio`)

  const { data: config } = await supabase.from('configuracoes').select('timezone').limit(1).single()
  const timezone = config?.timezone || 'America/Bahia'
  const inicio = DateTime.fromISO(`${data}T${horaInicio}`, { zone: timezone })
  const fim = DateTime.fromISO(`${data}T${horaFim}`, { zone: timezone })
  if (!inicio.isValid || !fim.isValid || fim <= inicio) redirect(`/admin/agenda?data=${data}&erro=bloqueio`)

  const { data: conflito } = await supabase.from('agendamentos').select('id').neq('status', 'CANCELADO').lt('inicio', fim.toUTC().toISO()).gt('fim', inicio.toUTC().toISO()).limit(1)
  if (conflito?.length) redirect(`/admin/agenda?data=${data}&erro=bloqueio_conflito`)

  const { data: criado, error } = await supabase.from('bloqueios_agenda').insert({ inicio: inicio.toUTC().toISO(), fim: fim.toUTC().toISO(), motivo: motivo || null }).select('id').single()
  if (error) redirect(`/admin/agenda?data=${data}&erro=banco`)
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'BLOQUEIO_CRIADO', entidade: 'BLOQUEIO', entidadeId: criado.id })
  revalidatePath('/admin/agenda')
  revalidatePath('/agendar')
  redirect(`/admin/agenda?data=${data}&sucesso=bloqueio`)
}

export async function removerBloqueio(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id = String(formData.get('id') || '')
  const data = String(formData.get('data') || '')
  if (!id) redirect(`/admin/agenda?data=${data}`)
  const { data: removido, error } = await supabase
    .from('bloqueios_agenda')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error || !removido) redirect(`/admin/agenda?data=${data}&erro=banco`)
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'BLOQUEIO_REMOVIDO', entidade: 'BLOQUEIO', entidadeId: id })
  revalidatePath('/admin/agenda')
  revalidatePath('/agendar')
  redirect(`/admin/agenda?data=${data}&sucesso=bloqueio_removido`)
}

export async function criarAberturaExtra(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const data = String(formData.get('data') || '')
  const horaInicio = String(formData.get('hora_inicio') || '')
  const horaFim = String(formData.get('hora_fim') || '')
  const motivo = String(formData.get('motivo') || '').trim()
  if (!data || !horaInicio || !horaFim || horaInicio >= horaFim) redirect(`/admin/agenda?data=${data}&erro=abertura`)

  const { data: criado, error } = await supabase.from('aberturas_extras').insert({
    data, hora_inicio: horaInicio, hora_fim: horaFim, motivo: motivo || null,
  }).select('id').single()
  if (error) redirect(`/admin/agenda?data=${data}&erro=banco`)

  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'ABERTURA_EXTRA_CRIADA', entidade: 'ABERTURA_EXTRA', entidadeId: criado.id })
  revalidatePath('/admin/agenda')
  revalidatePath('/agendar')
  redirect(`/admin/agenda?data=${data}&sucesso=abertura`)
}

export async function removerAberturaExtra(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id = String(formData.get('id') || '')
  const data = String(formData.get('data') || '')
  if (!id) redirect(`/admin/agenda?data=${data}`)
  const { data: removida, error } = await supabase
    .from('aberturas_extras')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error || !removida) redirect(`/admin/agenda?data=${data}&erro=banco`)
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'ABERTURA_EXTRA_REMOVIDA', entidade: 'ABERTURA_EXTRA', entidadeId: id })
  revalidatePath('/admin/agenda')
  revalidatePath('/agendar')
  redirect(`/admin/agenda?data=${data}&sucesso=abertura_removida`)
}

export async function remarcarAgendamentoAdmin(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id=String(formData.get('id')||'')
  const dataOrigem=String(formData.get('data_origem')||'')
  const novaData=String(formData.get('nova_data')||'')
  const novaHora=String(formData.get('nova_hora')||'')
  if(!id||!novaData||!novaHora) redirect(`/admin/agenda?data=${dataOrigem}&erro=dados`)
  const [{data:agendamento},{data:config}]=await Promise.all([
    supabase.from('agendamentos').select('status').eq('id',id).single(),
    supabase.from('configuracoes').select('timezone').limit(1).single(),
  ])
  if(!agendamento||agendamento.status!=='CONFIRMADO') redirect(`/admin/agenda?data=${dataOrigem}&erro=status`)
  const timezone=config?.timezone||'America/Bahia'
  const inicio=DateTime.fromISO(`${novaData}T${novaHora}`,{zone:timezone})
  if(!inicio.isValid) redirect(`/admin/agenda?data=${dataOrigem}&erro=dados`)
  const {error}=await supabase.rpc('remarcar_agendamento_admin',{p_agendamento_id:id,p_novo_inicio:inicio.toISO()})
  if(error){const msg=error.message; const codigo=msg.includes('HORARIO_INDISPONIVEL')?'ocupado':msg.includes('HORARIO_BLOQUEADO')?'bloqueado':msg.includes('FORA_DO_EXPEDIENTE')?'expediente':msg.includes('ANTECEDENCIA_MINIMA')?'antecedencia':'banco'; redirect(`/admin/agenda?data=${dataOrigem}&erro=${codigo}`)}
  await registrarAuditoria({supabase,atorId:String(claims.sub),acao:'AGENDAMENTO_REMARCADO_ADMIN',entidade:'AGENDAMENTO',entidadeId:id})
  revalidatePath('/admin/agenda'); revalidatePath('/admin')
  redirect(`/admin/agenda?data=${novaData}&sucesso=remarcado`)
}

export async function bloquearDiaInteiro(formData: FormData) {
  const {supabase,claims}=await requireAdmin()
  const data=String(formData.get('data')||'')
  const motivo=String(formData.get('motivo')||'Dia indisponível').trim()
  const {data:config}=await supabase.from('configuracoes').select('timezone').limit(1).single()
  const timezone=config?.timezone||'America/Bahia'
  const inicio=DateTime.fromISO(data,{zone:timezone}).startOf('day')
  const fim=inicio.plus({days:1})
  if(!data||!inicio.isValid) redirect(`/admin/agenda?data=${data}&erro=bloqueio`)
  const {data:conflitos}=await supabase.from('agendamentos').select('id').not('status','in','(CANCELADO,CONCLUIDO,NAO_COMPARECEU)').lt('inicio',fim.toUTC().toISO()).gt('fim',inicio.toUTC().toISO()).limit(1)
  if(conflitos?.length) redirect(`/admin/agenda?data=${data}&erro=bloqueio_conflito`)
  const {data:criado,error}=await supabase.from('bloqueios_agenda').insert({inicio:inicio.toUTC().toISO(),fim:fim.toUTC().toISO(),motivo:motivo||'Dia indisponível'}).select('id').single()
  if(error) redirect(`/admin/agenda?data=${data}&erro=banco`)
  await registrarAuditoria({supabase,atorId:String(claims.sub),acao:'DIA_INTEIRO_BLOQUEADO',entidade:'BLOQUEIO',entidadeId:criado.id})
  revalidatePath('/admin/agenda'); revalidatePath('/agendar')
  redirect(`/admin/agenda?data=${data}&sucesso=bloqueio`)
}
