import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')

  const { data: admin, error } = await supabase
    .from('admin_usuarios')
    .select('user_id')
    .eq('user_id', String(claims.sub))
    .maybeSingle()

  if (error || !admin) redirect('/login?erro=acesso')
  return { supabase, claims }
}
