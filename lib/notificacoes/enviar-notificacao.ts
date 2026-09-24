import 'server-only'
import { DateTime } from 'luxon'
import { createAdminClient } from '@/lib/supabase/admin'
import { enviarTemplateWhatsapp } from '@/lib/whatsapp/enviar-template'

type Tipo = 'CONFIRMACAO' | 'LEMBRETE' | 'REMARCACAO' | 'CANCELAMENTO'

export async function enviarNotificacaoAgendamento(agendamentoId:string,tipo:Tipo){
  const supabase=createAdminClient()
  const {data:config}=await supabase.from('configuracoes').select('whatsapp_ativo,timezone').limit(1).single()
  if(!config?.whatsapp_ativo)return {enviada:false,motivo:'WHATSAPP_DESATIVADO'}

  const {data:a}=await supabase.from('agendamentos').select('id,token_cliente,inicio,nome_servico,cliente:clientes(nome,telefone)').eq('id',agendamentoId).single()
  if(!a)return {enviada:false,motivo:'AGENDAMENTO_NAO_ENCONTRADO'}
  const cliente=Array.isArray(a.cliente)?a.cliente[0]:a.cliente
  if(!cliente)return {enviada:false,motivo:'CLIENTE_NAO_ENCONTRADO'}

  const {data:existente}=await supabase.from('notificacoes').select('id,status,tentativas').eq('agendamento_id',agendamentoId).eq('tipo',tipo).maybeSingle()
  if(existente?.status==='ENVIADA')return {enviada:false,motivo:'JA_ENVIADA'}

  let id=existente?.id
  if(!id){
    const {data:criada}=await supabase.from('notificacoes').insert({agendamento_id:agendamentoId,tipo,destinatario:cliente.telefone}).select('id').single()
    id=criada?.id
  }
  if(!id)return {enviada:false,motivo:'FALHA_REGISTRO'}

  const appUrl=process.env.APP_URL
  if(!appUrl)return {enviada:false,motivo:'APP_URL_NAO_CONFIGURADA'}
  const inicio=DateTime.fromISO(a.inicio).setZone(config.timezone||'America/Bahia')
  const templates:Record<Tipo,string>={CONFIRMACAO:'confirmacao_agendamento',LEMBRETE:'lembrete_agendamento',REMARCACAO:'remarcacao_agendamento',CANCELAMENTO:'cancelamento_agendamento'}
  try{
    const r=await enviarTemplateWhatsapp({telefone:cliente.telefone,template:templates[tipo],parametros:[cliente.nome,a.nome_servico,inicio.toFormat('dd/MM/yyyy'),inicio.toFormat('HH:mm'),`${appUrl}/agendamento/${a.token_cliente}`]})
    await supabase.from('notificacoes').update({status:'ENVIADA',mensagem_id:r.mensagemId||null,enviado_em:new Date().toISOString(),ultimo_erro:null,tentativas:(existente?.tentativas||0)+1}).eq('id',id)
    return {enviada:true}
  }catch(e){
    await supabase.from('notificacoes').update({status:'ERRO',ultimo_erro:e instanceof Error?e.message:'Erro',tentativas:(existente?.tentativas||0)+1}).eq('id',id)
    return {enviada:false,motivo:'ERRO_ENVIO'}
  }
}
