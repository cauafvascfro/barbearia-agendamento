import { NextRequest, NextResponse } from 'next/server'
import { processarLembretes } from '@/lib/notificacoes/processar-lembretes'
export async function POST(request:NextRequest){if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({erro:'Não autorizado.'},{status:401});return NextResponse.json({sucesso:true,...await processarLembretes()})}
