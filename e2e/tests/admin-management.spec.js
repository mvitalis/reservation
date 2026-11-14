const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Gestión del Negocio (CRUD Individual)', () => {
  
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('https://reservation-e0n8eqmpj-mark-fada.vercel.app/login');
    await page.locator('input[type="email"]').fill('you@example.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  });

  test('Manage Services: crea, verifica y elimina un servicio', async ({ page }) => {
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
    
    // Recargar para asegurar sincronización con la base de datos
    await page.reload();
    await page.getByRole('button', { name: 'Manage Services' }).click();

    await expect(page.getByText(testService)).toBeVisible({ timeout: 15000 });

    // Encontrar el elemento de texto y hacer clic en el botón de eliminar asociado en su misma tarjeta/fila
    const serviceContainer = page.locator('div, tr, li').filter({ hasText: testService }).last();
    await serviceContainer.locator('button').last().click();
    
    await expect(page.getByText(testService)).not.toBeVisible({ timeout: 15000 });
  });

  test('Manage Locations: crea, verifica y elimina una ubicación', async ({ page }) => {
    const testLocation = `Sucursal E2E ${Date.now()}`;
    await page.getByRole('button', { name: 'Manage Locations' }).click();

    await page.getByPlaceholder('e.g. Main Branch, Couva Office').fill(testLocation);
    await page.getByPlaceholder('e.g. (868) 555-0199').fill('8685551234');
    await page.getByPlaceholder('e.g. 123 Main Street, Port of Spain').fill('123 Main Street, Trinidad');

    await page.getByRole('button', { name: 'Add Location', exact: true }).click();
    
    // Recargar página para forzar la lectura fresca de Supabase
    await page.reload();
    await page.getByRole('button', { name: 'Manage Locations' }).click();

    await expect(page.getByText(testLocation)).toBeVisible({ timeout: 20000 });

    const locationContainer = page.locator('div, tr, li').filter({ hasText: testLocation }).last();
    await locationContainer.locator('button').last().click();
    
    await expect(page.getByText(testLocation)).not.toBeVisible({ timeout: 15000 });
  });

  test('Manage Staff: crea, verifica y elimina personal', async ({ page }) => {
    const timestamp = Date.now();
    const testStaff = `Empleado E2E ${timestamp}`;
    await page.getByRole('button', { name: 'Manage Staff' }).click();

    await page.getByPlaceholder('e.g. Alex Morgan').fill(testStaff);
    await page.getByPlaceholder('alex@example.com').fill(`staff.${timestamp}@test.com`);

    const staffSelect = page.locator('select').first();
    if (await staffSelect.count() > 0 && (await staffSelect.locator('option').count()) > 0) {
      await staffSelect.selectOption({ index: 0 });
    }

    await page.getByRole('button', { name: 'Add Staff Member', exact: true }).click();
    
    // Recargar página para forzar la lectura fresca de Supabase
    await page.reload();
    await page.getByRole('button', { name: 'Manage Staff' }).click();

    await expect(page.getByText(testStaff)).toBeVisible({ timeout: 20000 });

    const staffContainer = page.locator('div, tr, li').filter({ hasText: testStaff }).last();
    await staffContainer.locator('button').last().click();

    await expect(page.getByText(testStaff)).not.toBeVisible({ timeout: 15000 });
  });

});