const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Panel de Administración / AdminDashboard', () => {
  test('inicia sesión y verifica el contenido del dashboard', async ({ page }) => {
    // 1. Navegar al panel de administración
    await page.goto('https://reservation-e0n8eqmpj-mark-fada.vercel.app', {
      waitUntil: 'networkidle',
    });

    // 2. Si aparece el formulario de inicio de sesión, llenamos las credenciales
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // ⚠️ IMPORTANTE: Reemplaza con el correo y contraseña reales de tu administrador en Supabase
      await emailInput.fill('markvitalis@hotmail.com');
      await passwordInput.fill('123456');

      const submitButton = page.locator('button[type="submit"], button')
        .filter({ hasText: /Sign In|Log In|Iniciar Sesión|Entrar/i })
        .first();
      
      await submitButton.click();
      
      // Esperar a que la red procese la autenticación
      await page.waitForTimeout(4000);
    }

    // Tomar una captura para inspeccionar si el login tuvo éxito o se quedó atascado
    await page.screenshot({ path: 'test-results/admin-login-debug.png', fullPage: true });

    // 3. Validación flexible: comprobamos que la URL contenga '/admin' y que la página haya cargado
    await expect(page).toHaveURL(/\/admin/);
    
    // Verificar que al menos hay contenido renderizado en el dashboard
    await expect(page.locator('body')).not.toBeEmpty();
  });
});