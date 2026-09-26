import 'server-only'

import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function hash(valor: string) {
  const salt = process.env.RATE_LIMIT_SALT
  if (!salt) throw new Error('RATE_LIMIT_SALT_NAO_CONFIGURADO')
  return createHash('sha256').update(`${salt}:${valor}`).digest('hex')
}

export function obterIpCliente(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'desconhecido'
}

export function normalizarTelefone(telefone: string) {
  let numero = telefone.replace(/\D/g, '')
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`
  return numero
}

async function consumir(acao: string, chave: string, limite: number, janelaSegundos: number) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('consumir_rate_limit', {
    p_acao: acao,
    p_chave_hash: hash(chave),
    p_limite: limite,
    p_janela_segundos: janelaSegundos,
  })
  if (error) {
    console.error('Rate limit indisponível:', error)
    return false
  }
  return Boolean(data)
}

export async function validarLimiteAgendamento(request: NextRequest, telefone: string) {
  const ipOk = await consumir('CRIAR_AGENDAMENTO_IP', `ip:${obterIpCliente(request)}`, 10, 10 * 60)
  if (!ipOk) return false
  return consumir('CRIAR_AGENDAMENTO_TELEFONE', `telefone:${normalizarTelefone(telefone)}`, 5, 60 * 60)
}
