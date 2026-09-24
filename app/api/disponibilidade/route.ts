import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularDisponibilidade } from '@/lib/agendamento/calcular-disponibilidade'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATA=/^\d{4}-\d{2}-\d{2}$/
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}
export async function GET(request:NextRequest){
 const servicoId=request.nextUrl.searchParams.get('servico');const data=request.nextUrl.searchParams.get('data')
 if(!servicoId||!data||!UUID.test(servicoId)||!DATA.test(data))return NextResponse.json({erro:'Serviço ou data inválidos.'},{status:400,headers})
 const parsed=new Date(data+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==data)return NextResponse.json({erro:'Data inválida.'},{status:400,headers})
 const supabase=createAdminClient();const {data:servico}=await supabase.from('servicos').select('id,duracao_minutos').eq('id',servicoId).eq('ativo',true).single()
 if(!servico)return NextResponse.json({erro:'Serviço indisponível.'},{status:404,headers})
 try{return NextResponse.json({horarios:await calcularDisponibilidade({data,duracaoMinutos:servico.duracao_minutos})},{headers})}catch{return NextResponse.json({erro:'Não foi possível consultar a disponibilidade.'},{status:500,headers})}
}
