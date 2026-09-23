'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { registrarAuditoria } from '@/lib/auditoria'

function converterPreco(valor: string) {
  return Number(valor.replace(/\./g, '').replace(',', '.'))
}

export async function criarServico(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const nome = String(formData.get('nome') || '').trim()
  const descricao = String(formData.get('descricao') || '').trim()
  const preco = converterPreco(String(formData.get('preco') || ''))
  const duracao = Number(formData.get('duracao_minutos'))

  if (!nome || Number.isNaN(preco) || preco < 0 || !Number.isInteger(duracao) || duracao <= 0) {
    redirect('/admin/servicos?erro=dados')
  }

  const { data, error } = await supabase.from('servicos').insert({
    nome,
    descricao: descricao || null,
    preco,
    duracao_minutos: duracao,
  }).select('id').single()

  if (error) redirect('/admin/servicos?erro=banco')
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'SERVICO_CRIADO', entidade: 'SERVICO', entidadeId: data.id })
  revalidatePath('/admin/servicos')
  redirect('/admin/servicos?sucesso=criado')
}

export async function alterarStatusServico(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id = String(formData.get('id') || '')
  const ativo = formData.get('ativo') === 'true'
  if (!id) redirect('/admin/servicos?erro=dados')

  const { error } = await supabase.from('servicos').update({ ativo: !ativo }).eq('id', id)
  if (error) redirect('/admin/servicos?erro=banco')
  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: !ativo ? 'SERVICO_ATIVADO' : 'SERVICO_DESATIVADO', entidade: 'SERVICO', entidadeId: id })
  revalidatePath('/admin/servicos')
}

export async function editarServico(id: string, formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const nome = String(formData.get('nome') || '').trim()
  const descricao = String(formData.get('descricao') || '').trim()
  const preco = converterPreco(String(formData.get('preco') || ''))
  const duracao = Number(formData.get('duracao_minutos'))

  if (!nome || Number.isNaN(preco) || preco < 0 || !Number.isInteger(duracao) || duracao <= 0) {
    redirect(`/admin/servicos/${id}/editar?erro=dados`)
  }

  const { error } = await supabase.from('servicos').update({
    nome,
    descricao: descricao || null,
    preco,
    duracao_minutos: duracao,
  }).eq('id', id)
  if (error) redirect(`/admin/servicos/${id}/editar?erro=banco`)

  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: 'SERVICO_EDITADO', entidade: 'SERVICO', entidadeId: id })
  revalidatePath('/admin/servicos')
  redirect('/admin/servicos?sucesso=editado')
}
