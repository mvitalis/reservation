require('dotenv').config();
const { test, expect } = require('@playwright/test');

// Selectores basados en tu componente React (ClientLogin)
const emailInput = (page) => page.locator('input[type="email"]');
const passwordInput = (page) => page.locator('input[type="password"]');
const fullNameInput = (page) => page.locator('input[placeholder="Jane Doe"]');
const businessNameInput = (page) => page.locator('input[placeholder="ByteFix Repairs"]');

test.describe('Flujo de Registro de Usuario (Sign Up)', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Navegar a la página de autenticación
    await page.goto('https://reservation-56s917ffp-mark-fada.vercel.app');

    // 2. Cambiar a modo Registro haciendo clic en "Sign Up"
    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByText('Create your business account')).toBeVisible();
  });

  test('muestra correctamente los campos del formulario de registro y la vista previa del URL', async ({ page }) => {
    await expect(fullNameInput(page)).toBeVisible();
    await expect(businessNameInput(page)).toBeVisible();
    await expect(emailInput(page)).toBeVisible();
    await expect(passwordInput(page)).toBeVisible();

    // Probar la vista previa dinámica del slug al escribir el nombre del negocio
    await businessNameInput(page).fill('ByteFix Repairs');
    await expect(page.getByText('yourdomain.com/book/bytefix-repairs')).toBeVisible();
  });

  test('deshabilita el botón de registro si los campos obligatorios están vacíos', async ({ page }) => {
    // Rellenar parcialmente para validar que sigue deshabilitado sin todos los datos
    await emailInput(page).fill('nuevo-usuario@ejemplo.com');
    await passwordInput(page).fill('Password123!');

    // El botón de registro sin pago debe estar deshabilitado hasta llenar Name y Business
    const submitBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('completa el registro de un nuevo usuario exitosamente (Skip Payment)', async ({ page }) => {
    // Generar un correo único para evitar colisiones en Supabase Auth
    const timestamp = Date.now();
    const testEmail = `test.user.${timestamp}@ejemplo.com`;

    // Llenar todos los campos obligatorios
    await fullNameInput(page).fill('Jane Doe');
    await businessNameInput(page).fill('ByteFix Repairs');
    await emailInput(page).fill(testEmail);
    await passwordInput(page).fill('Password123!');

    // Escuchar la alerta nativa del navegador (alert('Account created successfully! Redirecting...'))
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Account created successfully');
      await dialog.dismiss();
    });

    // Enviar el formulario haciendo clic en el botón de registro sin pago
    const submitBtn = page.getByRole('button', { name: /Create .* Account \(Skip Payment\)/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verificar que tras el registro exitoso redirige al panel de administración (/admin)
    await expect(page).toHaveURL(/\/login/);
  });
});