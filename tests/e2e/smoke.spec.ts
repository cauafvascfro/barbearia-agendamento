import { expect, test } from '@playwright/test'

test('página pública de agendamento abre', async ({ page }) => {
  await page.goto('/agendar')
  await expect(page).toHaveURL(/\/agendar/)
})

test('rota administrativa exige autenticação', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})
