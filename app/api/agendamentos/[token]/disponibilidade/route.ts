import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularDisponibilidade } from '@/lib/agendamento/calcular-disponibilidade'
type Props={params:Promise<{token:string}>}
export async function GET(request:NextRequest,{params}:Props){const {token}=await params;const data=request.nextUrl.searchParams.get('data');if(!data)return NextResponse.json({erro:'Informe a data.'},{status:400});const supabase=createAdminClient();const {data:a}=await supabase.from('agendamentos').select('id,status,duracao_minutos').eq('token_cliente',token).single();if(!a||a.status!=='CONFIRMADO')return NextResponse.json({erro:'Agendamento indisponível para remarcação.'},{status:404});try{return NextResponse.json({horarios:await calcularDisponibilidade({data,duracaoMinutos:a.duracao_minutos,ignorarAgendamentoId:a.id})})}catch{return NextResponse.json({erro:'Falha ao consultar horários.'},{status:500})}}
