import { DateTime } from 'luxon'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Props={params:Promise<{token:string}>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}

export async function POST(request:NextRequest,{params}:Props){
  const {token}=await params
  if(!UUID.test(token))return NextResponse.json({erro:'Agendamento não encontrado.'},{status:404,headers})

  const tipo=request.headers.get('content-type')||''
  if(!tipo.toLowerCase().includes('application/json'))return NextResponse.json({erro:'Formato de dados inválido.'},{status:415,headers})

  const tamanho=Number(request.headers.get('content-length')||0)
  if(tamanho>2000)return NextResponse.json({erro:'Solicitação muito grande.'},{status:413,headers})

  let body:unknown
  try{
    const corpo=await request.text()
    if(corpo.length>2000)return NextResponse.json({erro:'Solicitação muito grande.'},{status:413,headers})
    body=JSON.parse(corpo)
  }catch{
    return NextResponse.json({erro:'Dados inválidos.'},{status:400,headers})
  }

  const inicio=typeof body==='object'&&body!==null&&'inicio' in body?String((body as {inicio?:unknown}).inicio||''):''
  const dataInicio=DateTime.fromISO(inicio,{setZone:true})
  if(!inicio||!dataInicio.isValid)return NextResponse.json({erro:'Selecione um horário válido.'},{status:400,headers})

  const supabase=createAdminClient()
  const {data,error}=await supabase.rpc('remarcar_agendamento_cliente',{p_token:token,p_novo_inicio:dataInicio.toISO()})

  if(error){
    const m=error.message
    if(m.includes('AGENDAMENTO_NAO_ENCONTRADO'))return NextResponse.json({erro:'Agendamento não encontrado.'},{status:404,headers})
    if(m.includes('HORARIO_INDISPONIVEL')||m.includes('HORARIO_BLOQUEADO'))return NextResponse.json({erro:'Este horário não está mais disponível.'},{status:409,headers})
    if(m.includes('REMARCACAO_FORA_DO_PRAZO'))return NextResponse.json({erro:'O prazo para remarcar terminou.'},{status:422,headers})
    if(m.includes('AGENDAMENTO_NAO_PODE_SER_REMARCADO'))return NextResponse.json({erro:'Este agendamento não pode mais ser remarcado.'},{status:422,headers})
    if(m.includes('FORA_DO_EXPEDIENTE')||m.includes('ANTECEDENCIA_MINIMA')||m.includes('DATA_FORA_DO_LIMITE')||m.includes('PERIODO_INVALIDO'))return NextResponse.json({erro:'O horário selecionado não é válido.'},{status:422,headers})
    return NextResponse.json({erro:'Não foi possível remarcar.'},{status:500,headers})
  }

  const agendamento=data?.[0]
  if(!agendamento)return NextResponse.json({erro:'Não foi possível remarcar.'},{status:500,headers})
  return NextResponse.json({sucesso:true,agendamento},{headers})
}
