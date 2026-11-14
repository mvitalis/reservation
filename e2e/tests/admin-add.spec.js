const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Gestión del Negocio - Solo Entrada de Datos (Add)', () => {
  
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('https://reservation-q0wit7o5p-mark-fada.vercel.app/');
    await page.locator('input[type="email"]').fill('you@example.com');
    await page.locator('input[type="password"]').fill('123456');
    
    // Esperar a que la petición de inicio de sesión y la carga de datos del negocio terminen por completo
    await Promise.all([
      page.waitForResponse(response => response.url().includes('supabase.co') && response.status() === 200, { timeout: 20000 }).catch(() => {}),
      page.locator('button[type="submit"]').click()
    ]);

    await page.waitForURL(/\/admin/, { timeout: 20000 });
    // Margen de seguridad para que el estado de React asigne el businessId a los componentes
    await page.waitForTimeout(2000);
  });

  test('Services: Ingresar nuevo servicio', async ({ page }) => {
    const testService = `Servicio E2E ${Date.now()}`;
    await page.getByRole('button', { name: 'Manage Services' }).click();

    await page.getByPlaceholder('e.g. Haircut & Style').fill(testService);
    await page.locator('input[placeholder="0.00"], input[type="number"]').first().fill('50');
    await page.locator('input[placeholder="30"], input[type="number"]').last().fill('45');
    
    const descInput = page.getByPlaceholder('Short description...');
    if (await descInput.count() > 0) {
      await descInput.fill('Descripción de prueba automatizada');
    }

    await page.getByRole('button', { name: 'Create Service' }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-service-added.png', fullPage: true });
  });

  test('Locations: Ingresar nueva ubicación', async ({ page }) => {
    const testLocation = `Sucursal E2E ${Date.now()}`;
    await page.getByRole('button', { name: 'Manage Locations' }).click();

    await page.getByPlaceholder('e.g. Main Branch, Couva Office').fill(testLocation);
    await page.getByPlaceholder('e.g. (868) 555-0199').fill('8685551234');
    await page.getByPlaceholder('e.g. 123 Main Street, Port of Spain').fill('123 Main Street, Trinidad');

    await page.getByRole('button', { name: 'Add Location', exact: true }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-location-added.png', fullPage: true });
  });

  test('Staff: Ingresar nuevo empleado', async ({ page }) => {
    const timestamp = Date.now();
    const testStaff = `Empleado E2E ${timestamp}`;
    await page.getByRole('button', { name: 'Manage Staff' }).click();

    await page.getByPlaceholder('e.g. Alex Morgan').fill(testStaff);
    await page.getByPlaceholder('alex@example.com').fill(`staff.${timestamp}@test.com`);

    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption({ index: 1 });

    await page.getByRole('button', { name: 'Add Staff Member', exact: true }).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-staff-added.png', fullPage: true });
  });

});