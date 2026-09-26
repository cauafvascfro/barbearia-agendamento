import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularDisponibilidade } from '@/lib/agendamento/calcular-disponibilidade'
import { avaliarProntidaoInstalacao } from '@/lib/instalacao'
import { DateTime } from 'luxon'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATA=/^\d{4}-\d{2}-\d{2}$/
const headers={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff'}
export async function GET(request:NextRequest){
 const servicoId=request.nextUrl.searchParams.get('servico');const data=request.nextUrl.searchParams.get('data')
 if(!servicoId||!data||!UUID.test(servicoId)||!DATA.test(data))return NextResponse.json({erro:'Serviço ou data inválidos.'},{status:400,headers})
 const parsed=new Date(data+'T00:00:00Z');if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==data)return NextResponse.json({erro:'Data inválida.'},{status:400,headers})
 const supabase=createAdminClient();const {data:config,error:configError}=await supabase.from('configuracoes').select('nome_barbearia,telefone,timezone,agenda_publica_ativa,intervalo_agendamento,antecedencia_maxima_dias').limit(1).single();if(configError||!config)return NextResponse.json({erro:'Disponibilidade indisponível no momento.'},{status:503,headers});if(config.agenda_publica_ativa===false)return NextResponse.json({horarios:[]},{headers});const hoje=DateTime.now().setZone(config.timezone||'America/Bahia').toISODate();const [{count:servicosAtivos},{count:horariosAtivos},{count:aberturasFuturas}]=await Promise.all([supabase.from('servicos').select('id',{count:'exact',head:true}).eq('ativo',true),supabase.from('horarios_funcionamento').select('id',{count:'exact',head:true}).eq('ativo',true),supabase.from('aberturas_extras').select('id',{count:'exact',head:true}).gte('data',hoje)]);if(!avaliarProntidaoInstalacao(config,servicosAtivos||0,horariosAtivos||0,aberturasFuturas||0).pronta)return NextResponse.json({horarios:[]},{status:503,headers});const {data:servico}=await supabase.from('servicos').select('id,duracao_minutos').eq('id',servicoId).eq('ativo',true).single()
 if(!servico)return NextResponse.json({erro:'Serviço indisponível.'},{status:404,headers})
 try{return NextResponse.json({horarios:await calcularDisponibilidade({data,duracaoMinutos:servico.duracao_minutos})},{headers})}catch{return NextResponse.json({erro:'Não foi possível consultar a disponibilidade.'},{status:500,headers})}
}
