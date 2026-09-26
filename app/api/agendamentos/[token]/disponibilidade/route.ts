import { DateTime } from 'luxon'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularDisponibilidade } from '@/lib/agendamento/calcular-disponibilidade'

type Props={params:Promise<{token:string}>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATA=/^\d{4}-\d{2}-\d{2}$/
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}

export async function GET(request:NextRequest,{params}:Props){
  const {token}=await params
  const data=request.nextUrl.searchParams.get('data')||''

  if(!UUID.test(token))return NextResponse.json({erro:'Agendamento indisponível para remarcação.'},{status:404,headers})
  if(!DATA.test(data)){
    return NextResponse.json({erro:'Informe uma data válida.'},{status:400,headers})
  }

  const dataValida=DateTime.fromISO(data,{zone:'UTC'})
  if(!dataValida.isValid||dataValida.toISODate()!==data){
    return NextResponse.json({erro:'Informe uma data válida.'},{status:400,headers})
  }

  const supabase=createAdminClient()
  const {data:a,error}=await supabase
    .from('agendamentos')
    .select('id,status,duracao_minutos')
    .eq('token_cliente',token)
    .maybeSingle()

  if(error)return NextResponse.json({erro:'Falha ao consultar o agendamento.'},{status:500,headers})
  if(!a||a.status!=='CONFIRMADO'){
    return NextResponse.json({erro:'Agendamento indisponível para remarcação.'},{status:404,headers})
  }

  try{
    const horarios=await calcularDisponibilidade({
      data,
      duracaoMinutos:a.duracao_minutos,
      ignorarAgendamentoId:a.id,
    })
    return NextResponse.json({horarios},{headers})
  }catch{
    return NextResponse.json({erro:'Falha ao consultar horários.'},{status:500,headers})
  }
}
