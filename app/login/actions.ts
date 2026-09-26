'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { obterIpCabecalhos, validarLimiteLogin } from '@/lib/security/rate-limit'

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const senha = String(formData.get('senha') || '')
  if (!email || !senha) redirect('/login?erro=campos')

  const cabecalhos = await headers()
  const ip = obterIpCabecalhos(cabecalhos)
  if (!(await validarLimiteLogin(ip, email))) redirect('/login?erro=credenciais')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) redirect('/login?erro=credenciais')

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  const { data: admin, error: adminError } = userId
    ? await supabase.from('admin_usuarios').select('user_id').eq('user_id', String(userId)).maybeSingle()
    : { data: null, error: null }

  if (adminError || !admin) {
    await supabase.auth.signOut()
    redirect('/login?erro=acesso')
  }

  redirect('/admin')
}
