require('dotenv').config();
const { test, expect } = require('@playwright/test');

const emailInput = (page) => page.locator('input[type="email"]');
const passwordInput = (page) => page.locator('input[type="password"]');
const fullNameInput = (page) => page.locator('input[placeholder="Jane Doe"]');
const businessNameInput = (page) => page.locator('input[placeholder="ByteFix Repairs"]');

test.describe('Selección de Plan de Negocios en Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://reservation-56s917ffp-mark-fada.vercel.app');
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByText('Create your business account')).toBeVisible();
  });

  test('permite seleccionar el plan Business y actualiza los detalles en la interfaz', async ({ page }) => {
    const businessCard = page.locator('div').filter({ hasText: /Business/i }).first();
    await businessCard.click();

    await fullNameInput(page).fill('Bob Vitalis');
    await businessNameInput(page).fill('Clinic');
    await emailInput(page).fill('clinic.test@example.com');
    await passwordInput(page).fill('Password123!');

    // Ajustado para coincidir exactamente con "Create Business Plan Account (Skip Payment)" o similar
    const skipPaymentBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });
    await expect(skipPaymentBtn).toBeVisible();
    await expect(skipPaymentBtn).toBeEnabled();
  });

  test('completa el registro seleccionando el plan Business (Skip Payment)', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `business.user.${timestamp}@ejemplo.com`;

    const businessCard = page.locator('div').filter({ hasText: /Business/i }).first();
    await businessCard.click();

    await fullNameInput(page).fill('Bob Vitalis');
    await businessNameInput(page).fill('Clinic');
    await emailInput(page).fill(testEmail);
    await passwordInput(page).fill('Password123!');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Account created successfully');
      await dialog.dismiss();
    });

     // Enviar el formulario haciendo clic en el botón de registro sin pago
    const submitBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect(page).toHaveURL(/\/login/);
  });
});