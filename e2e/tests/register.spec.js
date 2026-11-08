require('dotenv').config();
const { test, expect } = require('@playwright/test');

const EMAIL ='markvitalis@hotmail.com';
const PASSWORD = '123456';

// Selectores basados en los atributos y etiquetas reales de tu componente React
const emailInput = (page) => page.locator('input[type="email"]');
const passwordInput = (page) => page.locator('input[type="password"]');
const submitButton = (page) => page.locator('button[type="submit"]');

test.describe('Autenticación Unificada (Login y Registro)', () => {
  test.beforeEach(async ({ page }) => {
    // Como comparten página, entramos a la ruta base de login/auth
    await page.goto('https://reservation-xo6fchjsw-mark-fada.vercel.app'); 
  });

  test('muestra la vista de inicio de sesión por defecto', async ({ page }) => {
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();
    await expect(emailInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
  });

  test('permite cambiar a la vista de registro (Sign Up)', async ({ page }) => {
    // Hace clic en el botón de cambiar a Sign Up
    await page.getByRole('button', { name: 'Sign Up' }).click();

    // Verifica que el título cambió y que aparecen los campos adicionales de registro
    await expect(page.getByText(/Create your business account/i)).toBeVisible();
    await expect(page.locator('input[placeholder="Jane Doe"]')).toBeVisible(); // Full Name
    await expect(page.locator('input[placeholder="ByteFix Repairs"]')).toBeVisible(); // Business Name
  });

  test('no permite enviar el formulario de login vacío', async ({ page }) => {
    await submitButton(page).click();
    // Sigue en la misma pantalla mostrando el formulario
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();
  });

  test('rechaza credenciales incorrectas en el login', async ({ page }) => {
    await emailInput(page).fill('no-existe@ejemplo.com');
    await passwordInput(page).fill('contraseña-incorrecta');
    await submitButton(page).click();

    // El título de login debe seguir visible (no redirige)
    await expect(page.getByText(/Sign in to your account/i)).toBeVisible();
  });

  test('inicia sesión con credenciales válidas', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Define TEST_EMAIL y TEST_PASSWORD en .env');

    await emailInput(page).fill(EMAIL);
    await passwordInput(page).fill(PASSWORD);
    await submitButton(page).click();

    // Al entrar con éxito, el formulario de login debe desaparecer o redirigir
    await expect(page.getByText(/Sign in to your account/i)).toBeHidden();
  });
});