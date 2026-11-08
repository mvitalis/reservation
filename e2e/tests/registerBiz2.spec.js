require('dotenv').config();
const { test, expect } = require('@playwright/test');

const emailInput = (page) => page.locator('input[type="email"]');
const passwordInput = (page) => page.locator('input[type="password"]');
const fullNameInput = (page) => page.locator('input[placeholder="Jane Doe"]');
const businessNameInput = (page) => page.locator('input[placeholder="ByteFix Repairs"]');

test.describe('Selección de Plan de Negocios en Registro', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('https://reservation-56s917ffp-mark-fada.vercel.app');
    await page.evaluate(() => localStorage.clear());

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByText('Create your business account')).toBeVisible();
  });

  test('registra un nuevo usuario en Supabase con el plan Business', async ({ page }) => {
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const testEmail = `biz.user.${uniqueId}@ejemplo.com`;

    const businessCard = page.locator('div').filter({ hasText: /Business/i }).first();
    await businessCard.click();

    await fullNameInput(page).fill('Kevin Bob');
    await businessNameInput(page).fill('Kevins Bike Shop');
    await emailInput(page).fill(testEmail);
    await passwordInput(page).fill('Password123!');

    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    const submitBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });

    // 1. Configurar la espera de la respuesta ANTES de hacer clic
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes('/auth/v1/signup')
    );

    // 2. Hacer clic para enviar el formulario
    await submitBtn.click();

    // 3. Esperar a que la petición se complete exitosamente
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(600);

    // Confirmar redirección al panel de administración
    await expect(page).toHaveURL(/\/login/);
  });
});