import { NextRequest, NextResponse } from 'next/server'
import { processarLembretes } from '@/lib/notificacoes/processar-lembretes'

async function executar(request:NextRequest){
  if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({erro:'Não autorizado.'},{status:401})
  try{return NextResponse.json({sucesso:true,...await processarLembretes()})}
  catch(error){console.error('Falha ao processar lembretes:',error);return NextResponse.json({erro:'Falha ao processar lembretes.'},{status:500})}
}

export const GET=executar
export const POST=executar
