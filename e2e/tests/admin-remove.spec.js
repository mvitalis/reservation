const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Gestión del Negocio - Eliminación de Datos (Delete)', () => {
  
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('https://reservation-q0wit7o5p-mark-fada.vercel.app/');
    await page.locator('input[type="email"]').fill('you@example.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  });

  test('Services: Borrar un servicio existente', async ({ page }) => {
    const testService = `Servicio Borrar ${Date.now()}`;
    await page.getByRole('button', { name: 'Manage Services' }).click();

    // Creamos el registro primero para asegurarnos de que existe y poder borrarlo
   
    await expect(page.getByText('Servicio E2E 1794676608795')).toBeVisible({ timeout: 15000 });

    // Procedemos a borrarlo usando el botón Delete
    const serviceContainer = page.locator('div, tr, li').filter({ hasText: 'Servicio E2E 1794676608795' }).last();
    await serviceContainer.getByRole('button', { name: 'Delete' }).click();
    
    await expect(page.getByText(testService)).not.toBeVisible({ timeout: 15000 });
  });

  test('Locations: Borrar una ubicación existente', async ({ page }) => {
    const testLocation = `Sucursal Borrar ${Date.now()}`;
    await page.getByRole('button', { name: 'Manage Locations' }).click();

    // Creamos la ubicación primero
    await page.getByPlaceholder('e.g. Main Branch, Couva Office').fill(testLocation);
    await page.getByPlaceholder('e.g. (868) 555-0199').fill('8685559876');
    await page.getByPlaceholder('e.g. 123 Main Street, Port of Spain').fill('San Fernando, Trinidad');
    await page.getByRole('button', { name: 'Add Location', exact: true }).click();
    
    await page.getByRole('button', { name: 'Refresh Data' }).click();
    await expect(page.getByText(testLocation)).toBeVisible({ timeout: 20000 });

    // Borramos la ubicación
    const locationContainer = page.locator('div, tr, li').filter({ hasText: testLocation }).last();
    await locationContainer.getByRole('button', { name: 'Delete' }).click();
    
    await expect(page.getByText(testLocation)).not.toBeVisible({ timeout: 15000 });
  });

  test('Staff: Borrar un empleado existente', async ({ page }) => {
    const timestamp = Date.now();
    const testStaff = `Empleado Borrar ${timestamp}`;
    await page.getByRole('button', { name: 'Manage Staff' }).click();

    // Creamos el empleado primero
    await page.getByPlaceholder('e.g. Alex Morgan').fill(testStaff);
    await page.getByPlaceholder('alex@example.com').fill(`delete.${timestamp}@test.com`);

    const staffSelect = page.locator('select').first();
    if (await staffSelect.count() > 0 && (await staffSelect.locator('option').count()) > 0) {
      await staffSelect.selectOption({ index: 0 });
    }

    await page.getByRole('button', { name: 'Add Staff Member', exact: true }).click();
    
    await page.getByRole('button', { name: 'Refresh Data' }).click();
    await expect(page.getByText(testStaff)).toBeVisible({ timeout: 20000 });

    // Borramos el empleado
    const staffContainer = page.locator('div, tr, li').filter({ hasText: testStaff }).last();
    staffContainer.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(testStaff)).not.toBeVisible({ timeout: 15000 });
  });

});