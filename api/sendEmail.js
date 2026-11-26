import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clientName, clientEmail, serviceName, businessName, bookingDate, bookingTime } = req.body;

    if (!clientEmail || !serviceName) {
      return res.status(400).json({ success: false, error: 'Missing required booking details.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${businessName || 'Reservations'}" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `Booking Confirmed: ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce; margin-top: 0;">Hi ${clientName}, your appointment at ${businessName || 'our business'} is confirmed!</h2>
          <p>Thank you for booking with us. Here are your appointment details:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingTime}</p>
          </div>

          <p style="font-size: 12px; color: #64748b;">If you need to reschedule or cancel, please contact us in advance.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email via Gmail:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error while sending email.',
    });
  }
}