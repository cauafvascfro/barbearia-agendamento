'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const senha = String(formData.get('senha') || '')
  if (!email || !senha) redirect('/login?erro=campos')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) redirect('/login?erro=credenciais')
  redirect('/admin')
}
