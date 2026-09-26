import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Props={params:Promise<{token:string}>}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}

export async function POST(_request:Request,{params}:Props){
  const {token}=await params
  if(!UUID.test(token))return NextResponse.json({erro:'Agendamento não encontrado.'},{status:404,headers})

  const supabase=createAdminClient()
  const {error}=await supabase.rpc('cancelar_agendamento_cliente',{p_token:token})

  if(error){
    const m=error.message
    if(m.includes('AGENDAMENTO_NAO_ENCONTRADO'))return NextResponse.json({erro:'Agendamento não encontrado.'},{status:404,headers})
    if(m.includes('CANCELAMENTO_FORA_DO_PRAZO'))return NextResponse.json({erro:'O prazo para cancelar terminou.'},{status:422,headers})
    if(m.includes('AGENDAMENTO_NAO_PODE_SER_CANCELADO')||m.includes('AGENDAMENTO_JA_INICIADO'))return NextResponse.json({erro:'Este agendamento não pode mais ser cancelado.'},{status:422,headers})
    return NextResponse.json({erro:'Não foi possível cancelar.'},{status:500,headers})
  }

  return NextResponse.json({sucesso:true},{headers})
}
