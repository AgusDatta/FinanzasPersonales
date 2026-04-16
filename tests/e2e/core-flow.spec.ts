import { test, expect } from '@playwright/test';

test.describe('Core flow', () => {
  test('boots, shows dashboard, creates an account and a transaction', async ({ page }) => {
    await page.goto('/');

    // Dashboard by default, with empty-state
    await expect(page.getByRole('heading', { name: /Finanzas Personales/i })).toBeVisible();

    // Navigate to accounts
    await page.getByRole('link', { name: /Cuentas/i }).click();
    await page.getByRole('button', { name: /\+ Agregar/ }).click();

    // Fill account form
    await page.getByLabel('Nombre').fill('Mi Banco');
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(page.getByText('Mi Banco')).toBeVisible();

    // Navigate to transactions
    await page.getByRole('link', { name: /Movimientos/i }).click();
    await page.getByRole('button', { name: /\+ Agregar/ }).click();

    await page.getByLabel('Descripción').fill('Café');
    await page.getByLabel('Monto').fill('1500');
    await page.getByRole('button', { name: /Guardar/ }).click();
    await expect(page.getByText('Café')).toBeVisible();

    // Dashboard reflects the transaction
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await expect(page.getByText('Café')).toBeVisible();
  });
});
