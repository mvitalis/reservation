import { Resend } from 'resend';
import { supabase } from '/client/reservation-frontend/src/supabaseClient.ts'; // Asegúrate de que la ruta a tu cliente de Supabase sea correcta

// 1. Cargar la API Key desde las variables de entorno del servidor
const resend = new Resend(process.env.RESEND_API_KEY1);

export async function handleNewBooking(req, res) {
  try {
    const { clientName, clientEmail, serviceName, businessName, bookingDate, bookingTime } = req.body;

    // Validación básica
    if (!clientEmail || !serviceName) {
      return res.status(400).json({ success: false, error: 'Faltan datos obligatorios para el correo.' });
    }

    // 2. Enviar el correo electrónico con Resend
    // Nota: Si estás en fase de pruebas, 'onboarding@resend.dev' es el único remitente permitido por defecto.
    const emailResponse = await resend.emails.send({
      from: 'Reservations <onboarding@resend.dev>', 
      to: [clientEmail],
      subject: `¡Reserva Confirmada: ${serviceName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce; margin-top: 0;">¡Hola ${clientName}, tu cita en ${businessName || 'el negocio'} está confirmada!</h2>
          <p>Gracias por agendar con nosotros. Aquí tienes los detalles de tu cita:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Servicio:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Hora:</strong> ${bookingTime}</p>
          </div>

          <p style="font-size: 12px; color: #64748b;">Si necesitas reprogramar o cancelar, por favor contáctanos con anticipación.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, emailResponse });
  } catch (error) {
    console.error('Error detallado en sendEmail.js:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error interno al enviar el correo' });
  }
}