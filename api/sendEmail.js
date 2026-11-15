// Ejemplo usando Resend (o puedes adaptarlo a Nodemailer / SendGrid)
import { Resend } from 'resend';
import { supabase } from './supabaseClient'; // Tu cliente de Supabase

const resend = new Resend('RESEND_API_KEY');

export async function handleNewBooking(req, res) {
  try {
    const { businessId, clientName, clientEmail, serviceName, bookingDate, bookingTime } = req.body;

    // 1. Guardar la reserva en la base de datos (Supabase)
    const { data: booking, error: insertError } = await supabase
      .from('bookings')
      .insert([
        {
          business_id: businessId,
          client_name: clientName,
          client_email: clientEmail,
          service_name: serviceName,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'confirmed'
        }
      ])
      .select()
      .single();

    if (insertError) throw insertError;

    // 2. Enviar el correo electrónico con los detalles de la reserva al cliente
    const emailResponse = await resend.emails.send({
      from: 'Reservations <no-reply@tu-dominio.com>',
      to: [clientEmail],
      subject: `¡Reserva Confirmada: ${serviceName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #7e22ce;">¡Hola ${clientName}, tu reserva está confirmada!</h2>
          <p>Gracias por agendar con nosotros. Aquí tienes los detalles de tu cita:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p><strong>Servicio:</strong> ${serviceName}</p>
            <p><strong>Fecha:</strong> ${bookingDate}</p>
            <p><strong>Hora:</strong> ${bookingTime}</p>
          </div>

          <p style="font-size: 12px; color: #64748b;">Si necesitas reprogramar o cancelar, por favor contáctanos con anticipación.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true, booking, emailResponse });
  } catch (error) {
    console.error('Error al procesar la reserva o enviar el correo:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}