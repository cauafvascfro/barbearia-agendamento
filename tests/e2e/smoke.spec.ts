import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

function proximaDataAberta() {
  const data = new Date()
  data.setUTCDate(data.getUTCDate() + 1)

  while (data.getUTCDay() === 0) {
    data.setUTCDate(data.getUTCDate() + 1)
  }

  return data.toISOString().slice(0, 10)
}

test('página pública carrega serviços do banco', async ({ page }) => {
  await page.goto('/agendar')

  await expect(page).toHaveURL(/\/agendar/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /Corte masculino/ }).first()).toBeVisible()
})

test('rota administrativa exige autenticação', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('cliente agenda e cancela um horário pelo link seguro', async ({ page }) => {
  await page.goto('/agendar')

  await page.getByRole('button', { name: /Corte masculino/ }).first().click()
  await page.locator('input[type="date"]').fill(proximaDataAberta())

  const primeiroHorario = page.locator('.time-choice').first()
  await expect(primeiroHorario).toBeVisible({ timeout: 15_000 })
  await primeiroHorario.click()

  await page.getByLabel('Nome').fill('Cliente Teste E2E')
  await page.getByLabel('Telefone').fill('(75) 99999-9999')
  const respostaAgendamento = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/agendamentos') &&
      response.request().method() === 'POST',
  )

  await page.getByRole('button', { name: 'Confirmar agendamento' }).click()

  const resposta = await respostaAgendamento
  const corpo = await resposta.text()

  expect(
    resposta.status(),
    `POST /api/agendamentos respondeu ${resposta.status()}: ${corpo}`,
  ).toBe(201)

  await expect(page).toHaveURL(/\/agendamento\/[0-9a-f-]{36}$/i, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Seu agendamento' })).toBeVisible()
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible()

  page.once('dialog', async (dialog) => {
    await dialog.accept()
  })

  await page.getByRole('button', { name: 'Cancelar' }).click()

  await expect(page.getByRole('heading', { name: 'Agendamento cancelado' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
})

test('API pública rejeita parâmetros inválidos de disponibilidade', async ({ request }) => {
  const resposta = await request.get('/api/disponibilidade?servico=invalido&data=2026-99-99')
  expect(resposta.status()).toBe(400)
  expect(resposta.headers()['cache-control']).toContain('no-store')
})

test('API de agendamento exige JSON', async ({ request }) => {
  const resposta = await request.post('/api/agendamentos', {
    data: 'conteudo-invalido',
    headers: { 'content-type': 'text/plain' },
  })
  expect(resposta.status()).toBe(415)
  expect(resposta.headers()['x-content-type-options']).toBe('nosniff')
})


test('usuário autenticado fora da allowlist não acessa o painel', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Credenciais do Supabase ausentes no E2E')

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = 'nao-admin-e2e@example.com'
  const senha = 'TesteE2E!123456'
  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  if (error) throw error

  try {
    await page.goto('/login')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(senha)
    await page.getByRole('button', { name: 'Entrar no painel' }).click()

    await expect(page).toHaveURL(/\/login\?erro=acesso/)
    await expect(page.getByText('Este usuário não tem permissão para acessar o painel administrativo.')).toBeVisible()

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/)
  } finally {
    if (criado.user?.id) await admin.auth.admin.deleteUser(criado.user.id)
  }
})

test('proprietário cria, remarca e cancela agendamento com histórico', async ({ page }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Credenciais do Supabase ausentes no E2E')

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const email = `admin-manual-${Date.now()}@example.com`
  const senha = 'TesteE2E!123456'
  const telefone = '5575988888888'
  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  })
  if (erroUsuario || !criado.user) throw erroUsuario || new Error('Usuário de teste não criado')

  try {
    const { error: erroAcesso } = await admin.from('admin_usuarios').insert({ user_id: criado.user.id })
    if (erroAcesso) throw erroAcesso

    await page.goto('/login')
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha').fill(senha)
    await page.getByRole('button', { name: 'Entrar no painel' }).click()
    await expect(page).toHaveURL(/\/admin/)

    const dataAgendamento = proximaDataAberta()
    await page.goto(`/admin/agenda?data=${dataAgendamento}`)
    const formulario = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Novo agendamento' }) })
    await formulario.locator('input[name="nome"]').fill('Cliente Manual E2E')
    await formulario.locator('input[name="telefone"]').fill('(75) 98888-8888')
    await formulario.locator('select[name="servico_id"]').selectOption({ index: 1 })
    await expect(formulario.locator('.manual-time').first()).toBeVisible({ timeout: 15_000 })
    await formulario.locator('.manual-time').first().click()
    await formulario.getByRole('button', { name: 'Agendar' }).click()

    await expect(page).toHaveURL(/sucesso=agendamento/, { timeout: 15_000 })
    await expect(page.getByText('Cliente Manual E2E')).toBeVisible()

    const atendimento = page.locator('article.appointment').filter({ hasText: 'Cliente Manual E2E' })
    await atendimento.locator('summary').filter({ hasText: 'Remarcar' }).click()
    await atendimento.locator('input[name="nova_data"]').fill(dataAgendamento)
    await atendimento.locator('input[name="nova_hora"]').fill('11:00')
    await atendimento.getByRole('button', { name: 'Confirmar remarcação' }).click()

    await expect(page).toHaveURL(/sucesso=remarcado/, { timeout: 15_000 })
    await expect(page.locator('article.appointment').filter({ hasText: 'Cliente Manual E2E' }).locator('.appointment-time')).toHaveText('11:00')

    await page.locator('article.appointment').filter({ hasText: 'Cliente Manual E2E' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(page).toHaveURL(/sucesso=status/, { timeout: 15_000 })
    await expect(page.locator('article.appointment').filter({ hasText: 'Cliente Manual E2E' })).toContainText('Cancelado')

    const { data: cliente, error: erroCliente } = await admin.from('clientes').select('id').eq('telefone', telefone).single()
    if (erroCliente || !cliente) throw erroCliente || new Error('Cliente de teste não encontrado')
    const { data: agendamento, error: erroAgendamento } = await admin.from('agendamentos')
      .select('id,status,inicio,fim').eq('cliente_id', cliente.id).single()
    if (erroAgendamento || !agendamento) throw erroAgendamento || new Error('Agendamento de teste não encontrado')
    expect(agendamento.status).toBe('CANCELADO')
    const { data: eventos, error: erroEventos } = await admin.from('agendamento_eventos')
      .select('tipo,inicio_anterior,fim_anterior').eq('agendamento_id', agendamento.id).eq('tipo', 'CANCELADO_ADMIN')
    if (erroEventos) throw erroEventos
    expect(eventos).toHaveLength(1)
    expect(eventos?.[0]).toMatchObject({ inicio_anterior: agendamento.inicio, fim_anterior: agendamento.fim })
  } finally {
    const { data: cliente } = await admin.from('clientes').select('id').eq('telefone', telefone).maybeSingle()
    if (cliente) {
      await admin.from('agendamentos').delete().eq('cliente_id', cliente.id)
      await admin.from('clientes').delete().eq('id', cliente.id)
    }
    await admin.auth.admin.deleteUser(criado.user.id)
  }
})


test('banco impede desativar o último serviço ativo', async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Credenciais do Supabase ausentes no E2E')

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: servicos, error: erroConsulta } = await admin
    .from('servicos')
    .select('id')
    .eq('ativo', true)
    .order('id')

  if (erroConsulta) throw erroConsulta
  if (!servicos?.length) throw new Error('Seed sem serviço ativo para o E2E')

  const ids = servicos.map((servico) => servico.id)
  const ultimoId = ids[ids.length - 1]

  try {
    if (ids.length > 1) {
      const { error } = await admin
        .from('servicos')
        .update({ ativo: false })
        .in('id', ids.slice(0, -1))
      if (error) throw error
    }

    const { error } = await admin
      .from('servicos')
      .update({ ativo: false })
      .eq('id', ultimoId)

    expect(error?.message).toContain('ULTIMO_SERVICO_ATIVO')
  } finally {
    const { error } = await admin.from('servicos').update({ ativo: true }).in('id', ids)
    if (error) throw error
  }
})
