const { test, expect } = require('@playwright/test');

test.describe('Flujo de Agendamiento de Citas del Cliente', () => {
  test('permite a un cliente seleccionar servicio, horario y confirmar una cita', async ({ page }) => {
    // 1. Navegar a la página pública de reservas del negocio (reemplaza 'bytefix-repairs' por tu slug de prueba)
    await page.goto('/book/bytefix-repairs');

    // Verificar que la página de reservas cargó correctamente
    await expect(page.getByRole('heading', { name: /Book an Appointment|Agendar Cita|Reservar/i })).toBeVisible();

    // 2. Seleccionar el primer servicio disponible de la lista
    // (Ajusta el selector si tus tarjetas de servicios usan una clase o atributo específico)
    const firstServiceButton = page.getByRole('button', { name: /Select|Reservar|Choose/i }).first();
    await firstServiceButton.click();

    // 3. Seleccionar un horario disponible (por ejemplo, el primer slot de hora que aparezca)
    // Buscamos botones o elementos que representen las horas (ej: "10:00 AM")
    const timeSlot = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}/ }).first();
    await timeSlot.click();

    // 4. Llenar los datos de contacto del cliente que realiza la reserva
    const clientNameInput = page.locator('input[placeholder*="Name"], input[name="clientName"]').first();
    const clientEmailInput = page.locator('input[type="email"]').first();

    await clientNameInput.fill('Carlos Cliente');
    await clientEmailInput.fill('carlos.cliente@ejemplo.com');

    // 5. Confirmar la reserva
    const confirmButton = page.getByRole('button', { name: /Confirm Booking|Confirmar Cita|Reservar ahora/i });
    await confirmButton.click();

    // 6. Validar que aparezca el mensaje de éxito o la pantalla de confirmación
    await expect(page.getByText(/confirmed|éxito|confirmada|¡Listo!/i)).toBeVisible();
  });
});