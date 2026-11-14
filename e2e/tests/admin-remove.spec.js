const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Gestión del Negocio - Eliminación Aleatoria de Datos (Delete Random)', () => {
  
  test.beforeEach(async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    await page.goto('https://reservation-5d3ai8yr4-mark-fada.vercel.app/');
    await page.locator('input[type="email"]').fill('you@example.com');
    await page.locator('input[type="password"]').fill('123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/admin/, { timeout: 20000 });
    await page.waitForTimeout(2000);
  });

  test('Services: Borrar un servicio aleatorio existente', async ({ page }) => {
    await page.getByRole('button', { name: 'Manage Services' }).click();
    await page.waitForTimeout(2000);

    // Obtenemos todos los botones de "Delete" disponibles en la sección de servicios
    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();

    if (count === 0) {
      console.log('No hay servicios disponibles para borrar aleatoriamente.');
      return;
    }

    // Elegimos un índice aleatorio entre 0 y count - 1
    const randomIndex = Math.floor(Math.random() * count);
    const targetButton = deleteButtons.nth(randomIndex);

    // Hacemos clic en el botón de borrar de ese elemento aleatorio
    await targetButton.click();
    await page.waitForTimeout(2000);

    // Captura de pantalla al finalizar
    await page.screenshot({ path: 'screenshot-service-deleted-random.png', fullPage: true });
  });

  test('Locations: Borrar una ubicación aleatoria existente', async ({ page }) => {
    await page.getByRole('button', { name: 'Manage Locations' }).click();
    await page.waitForTimeout(2000);

    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();

    if (count === 0) {
      console.log('No hay ubicaciones disponibles para borrar aleatoriamente.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const targetButton = deleteButtons.nth(randomIndex);

    await targetButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-location-deleted-random.png', fullPage: true });
  });

  test('Staff: Borrar un empleado aleatorio existente', async ({ page }) => {
    await page.getByRole('button', { name: 'Manage Staff' }).click();
    await page.waitForTimeout(2000);

    const deleteButtons = page.locator('button:has-text("Delete")');
    const count = await deleteButtons.count();

    if (count === 0) {
      console.log('No hay personal disponible para borrar aleatoriamente.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * count);
    const targetButton = deleteButtons.nth(randomIndex);

    await targetButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshot-staff-deleted-random.png', fullPage: true });
  });

});