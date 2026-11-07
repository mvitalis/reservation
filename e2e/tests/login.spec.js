const { test, expect } = require('@playwright/test');

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

// Selectores basados en los textos visibles de la pantalla de login
const emailInput = (page) => page.getByLabel('Dirección de correo electrónico');
const passwordInput = (page) => page.getByLabel('Contraseña');
const submitButton = (page) => page.getByRole('button', { name: 'Iniciar sesión' });

test.describe('Pantalla de inicio de sesión', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('muestra el formulario de login', async ({ page }) => {
    await expect(page.getByText(/inicia sesión en tu cuenta/i)).toBeVisible();
    await expect(emailInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();
    await expect(submitButton(page)).toBeEnabled();
  });

  test('el enlace de registro lleva a la página de registro', async ({ page }) => {
    await page.getByText('Inscribirse').click();
    await expect(page).not.toHaveURL(/login/i);
    await expect(emailInput(page)).toBeVisible();
  });

  test('no permite enviar el formulario vacío', async ({ page }) => {
    await submitButton(page).click();
    // Sigue en la misma pantalla de login
    await expect(page.getByText(/inicia sesión en tu cuenta/i)).toBeVisible();
  });

  test('rechaza credenciales incorrectas', async ({ page }) => {
    await emailInput(page).fill('no-existe@ejemplo.com');
    await passwordInput(page).fill('contraseña-incorrecta');
    await submitButton(page).click();

    // No debe entrar: el título de login sigue visible
    await expect(page.getByText(/inicia sesión en tu cuenta/i)).toBeVisible();
  });

  test('inicia sesión con credenciales válidas', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'Define TEST_EMAIL y TEST_PASSWORD en .env');

    await emailInput(page).fill(EMAIL);
    await passwordInput(page).fill(PASSWORD);
    await submitButton(page).click();

    // Al entrar, el formulario de login desaparece
    await expect(page.getByText(/inicia sesión en tu cuenta/i)).toBeHidden();
  });
});
