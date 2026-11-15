const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Página de Perfil - Business Details & Security', () => {
  const APP_URL = 'https://reservation-9gymn6sb5-mark-fada.vercel.app';
  const TEST_EMAIL = 'you@example.com';
  const ORIGINAL_PASS = '123456';

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(ORIGINAL_PASS);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });

    // Navegar a la página de Perfil desde la barra superior
    await page.getByRole('button', { name: 'Profile' }).or(page.getByRole('link', { name: 'Profile' })).click();
    await expect(page.getByRole('heading', { name: 'Account & Settings' })).toBeVisible({ timeout: 15000 });
  });

  test('1. Business Details: Actualizar nombre, teléfono y correo de notificaciones', async ({ page }) => {
    const updatedName = `Sharp Barbershop ${Math.floor(Math.random() * 100)}`;

    // Localizar inputs por su placeholder exacto en ProfilePage.tsx
    const businessNameInput = page.getByPlaceholder('e.g. Kimba Imperial Barbershop');
    const phoneInput = page.getByPlaceholder('(868) 555-0199');
    const notifEmailInput = page.getByPlaceholder('alerts@yourdomain.com');

    await businessNameInput.fill(updatedName);
    await phoneInput.fill('(868) 555-0199');
    await notifEmailInput.fill(TEST_EMAIL);

    // Guardar cambios del perfil
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    // Verificar banner de éxito
    await expect(
      page.getByText('Profile settings, branding, operating hours, and public theme updated successfully!')
    ).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'screenshot-profile-business-updated.png', fullPage: true });
  });

  test('2. Security & Password: Cambiar contraseña y restaurar la original', async ({ page }) => {
    const tempPassword = 'NewPassword123!';
    const passwordInputs = page.locator('input[type="password"][placeholder="••••••••"]');

    // Paso A: Cambiar a una nueva contraseña temporal
    await passwordInputs.nth(0).fill(tempPassword);
    await passwordInputs.nth(1).fill(tempPassword);
    await page.getByRole('button', { name: 'Update Password' }).click();

    await expect(page.getByText('Password updated successfully!')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'screenshot-profile-password-updated.png', fullPage: true });

    // Paso B: Restaurar la contraseña original ('123456') para mantener la estabilidad de otras pruebas
    await passwordInputs.nth(0).fill(ORIGINAL_PASS);
    await passwordInputs.nth(1).fill(ORIGINAL_PASS);
    await page.getByRole('button', { name: 'Update Password' }).click();

    await expect(page.getByText('Password updated successfully!')).toBeVisible({ timeout: 15000 });
  });

});