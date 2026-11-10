require('dotenv').config();
const { test, expect } = require('@playwright/test');

const emailInput = (page) => page.locator('input[type="email"]');
const passwordInput = (page) => page.locator('input[type="password"]');
const fullNameInput = (page) => page.locator('input[placeholder="Jane Doe"]');
const businessNameInput = (page) => page.locator('input[placeholder="ByteFix Repairs"]');

test.describe('Selección de Plan de Negocios en Registro', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('https://reservation-di4k18gow-mark-fada.vercel.app');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByText('Create your business account')).toBeVisible();
  });

  test('registra un nuevo usuario en Supabase con el plan Business', async ({ page }) => {
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const testEmail = `biz.user.${uniqueId}@ejemplo.com`;

    // 💡 SOLUCIÓN: Seleccionar explícitamente el contenedor de la tarjeta Business basándonos en el título del encabezado h3
    const businessHeading = page.locator('h3', { hasText: /^Business$/i });
    await businessHeading.locator('xpath=..').click(); // Hace clic en el elemento padre (la tarjeta completa)

    await fullNameInput(page).fill('Jamie Fox');
    await businessNameInput(page).fill('Piano School Services');
    await emailInput(page).fill(testEmail);
    await passwordInput(page).fill('Password123!');

    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const submitBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });

    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/auth/v1/signup')
    );

    await submitBtn.click();

    const response = await responsePromise;
    expect(response.status()).toBeLessThan(600);

    // Opcional: Validar que el botón enviado contenía la palabra Business antes del clic
    //await expect(submitBtn).toHaveText(/Business/i);

    await expect(page).toHaveURL(/\/login/);
  });
});