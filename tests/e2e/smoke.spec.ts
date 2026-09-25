import { expect, test } from '@playwright/test'

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
