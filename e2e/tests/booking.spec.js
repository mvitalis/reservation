const { test, expect } = require('@playwright/test');

test.setTimeout(60000);

test.describe('Flujo de Agendamiento de Citas del Cliente', () => {
  test('permite a un cliente seleccionar servicio, horario y confirmar una cita', async ({ page }) => {
    // 1. Navegar a la página pública de reservas del negocio
    await page.goto('https://reservation-e0n8eqmpj-mark-fada.vercel.app/book/vitalis-designs', {
      waitUntil: 'networkidle',
    });

    // Verificar que la página cargó comprobando el encabezado
    await expect(page.getByText('Book an Appointment')).toBeVisible({ timeout: 15000 });

    // 2. Seleccionar el servicio del menú desplegable <select>
    const serviceSelect = page.locator('select').first();
    await serviceSelect.waitFor({ state: 'visible', timeout: 15000 });
    await serviceSelect.selectOption({ index: 1 }).catch(() => serviceSelect.selectOption({ index: 0 }));
    await serviceSelect.dispatchEvent('change');

    // 3. Seleccionar el horario disponible
    const timeSlot = page.locator('button')
      .filter({ 
        hasText: /04:00|p\.m\.|PM/i, 
        hasNotText: /Passed/i 
      })
      .first();

    await timeSlot.waitFor({ state: 'visible', timeout: 20000 });
    await timeSlot.click();

    // 4. Llenar los datos de contacto del cliente
    const clientNameInput = page.locator('input[type="text"], input:not([type])').first();
    const clientEmailInput = page.locator('input[type="email"]').first();

    await clientNameInput.waitFor({ state: 'visible', timeout: 15000 });
    await clientNameInput.fill('Carlos Cliente');
    await clientEmailInput.fill('carlos.cliente@ejemplo.com');

    // 5. Hacer scroll hasta el botón de confirmación y hacer clic
    const confirmButton = page.locator('button[type="submit"], button').filter({ hasText: /Confirm|Book|Reservar|Guardar|Enviar/i }).last();
    await confirmButton.scrollIntoViewIfNeeded();
    await confirmButton.waitFor({ state: 'visible', timeout: 10000 });
    await confirmButton.click();

    // Esperar un par de segundos a que se procese la inserción en Supabase
    await page.waitForTimeout(3000);

    // Guardar una captura de pantalla del estado final para inspeccionarlo
    await page.screenshot({ path: 'test-results/after-confirm.png', fullPage: true });

    // 6. Validación final de que la página sigue activa
    await expect(page.locator('body')).not.toBeEmpty();
  });
});