import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    const { clientName, clientEmail, serviceName, businessName, bookingDate, bookingTime } = req.body;

    if (!clientEmail || !serviceName) {
      return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });
    }

    // 1. Configurar el transportador SMTP de Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER, // Tu correo de Gmail (ej: tucorreo@gmail.com)
        pass: process.env.GMAIL_APP_PASSWORD, // Tu contraseña de aplicación de 16 letras
      },
    });

    // 2. Definir el contenido y destinatario del correo
    const mailOptions = {
      from: `"${businessName || 'Reservations'}" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
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
    };

    // 3. Enviar el correo
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error al enviar correo con Gmail:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error interno al enviar el correo' });
  }
}