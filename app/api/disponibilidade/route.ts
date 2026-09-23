import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularDisponibilidade } from '@/lib/agendamento/calcular-disponibilidade'

export async function GET(request:NextRequest){const servicoId=request.nextUrl.searchParams.get('servico');const data=request.nextUrl.searchParams.get('data');if(!servicoId||!data)return NextResponse.json({erro:'Serviço e data são obrigatórios.'},{status:400});const supabase=createAdminClient();const {data:servico}=await supabase.from('servicos').select('id,duracao_minutos').eq('id',servicoId).eq('ativo',true).single();if(!servico)return NextResponse.json({erro:'Serviço indisponível.'},{status:404});try{return NextResponse.json({horarios:await calcularDisponibilidade({data,duracaoMinutos:servico.duracao_minutos})})}catch{return NextResponse.json({erro:'Não foi possível consultar a disponibilidade.'},{status:500})}}
