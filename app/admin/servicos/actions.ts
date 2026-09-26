'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/require-admin'
import { registrarAuditoria } from '@/lib/auditoria'

function converterPreco(valor: string) {
  const limpo = valor.trim().replace(/\s/g, '')
  if (!limpo) return Number.NaN
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  return Number(normalizado)
}

function duracaoValida(duracao: number) {
  return Number.isInteger(duracao) && duracao >= 5 && duracao <= 480 && duracao % 5 === 0
}

export async function criarServico(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const nome = String(formData.get('nome') || '').trim()
  const descricao = String(formData.get('descricao') || '').trim()
  const preco = converterPreco(String(formData.get('preco') || ''))
  const duracao = Number(formData.get('duracao_minutos'))

  if (!nome || Number.isNaN(preco) || preco < 0 || !duracaoValida(duracao)) {
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
  revalidatePath('/agendar')
  redirect('/admin/servicos?sucesso=criado')
}

export async function alterarStatusServico(formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const id = String(formData.get('id') || '')
  if (!id) redirect('/admin/servicos?erro=dados')

  const { data: servico, error: erroServico } = await supabase
    .from('servicos')
    .select('id,ativo')
    .eq('id', id)
    .maybeSingle()

  if (erroServico) redirect('/admin/servicos?erro=banco')
  if (!servico) redirect('/admin/servicos?erro=dados')

  if (servico.ativo) {
    const { count, error: erroContagem } = await supabase
      .from('servicos')
      .select('id',{count:'exact',head:true})
      .eq('ativo',true)
    if (erroContagem) redirect('/admin/servicos?erro=banco')
    if ((count||0) <= 1) redirect('/admin/servicos?erro=ultimo-ativo')
  }

  const novoStatus = !servico.ativo
  const { data: alterado, error } = await supabase
    .from('servicos')
    .update({ ativo: novoStatus })
    .eq('id', id)
    .eq('ativo', servico.ativo)
    .select('id')
    .maybeSingle()

  if (error) redirect('/admin/servicos?erro=banco')
  if (!alterado) redirect('/admin/servicos?erro=banco')

  await registrarAuditoria({ supabase, atorId: String(claims.sub), acao: novoStatus ? 'SERVICO_ATIVADO' : 'SERVICO_DESATIVADO', entidade: 'SERVICO', entidadeId: id })
  revalidatePath('/admin/servicos')
  revalidatePath('/agendar')
}

export async function editarServico(id: string, formData: FormData) {
  const { supabase, claims } = await requireAdmin()
  const nome = String(formData.get('nome') || '').trim()
  const descricao = String(formData.get('descricao') || '').trim()
  const preco = converterPreco(String(formData.get('preco') || ''))
  const duracao = Number(formData.get('duracao_minutos'))

  if (!nome || Number.isNaN(preco) || preco < 0 || !duracaoValida(duracao)) {
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
  revalidatePath('/agendar')
  redirect('/admin/servicos?sucesso=editado')
}
