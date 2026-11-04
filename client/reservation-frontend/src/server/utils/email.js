// server/utils/email.js
const { Resend } = require('resend');
const ics = require('ics');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendBookingConfirmation({ customerEmail, customerName, serviceName, startTime, endTime }) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // 1. Generate .ics string
  const event = {
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    end: [
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate(),
      end.getUTCHours(),
      end.getUTCMinutes(),
    ],
    title: `${serviceName} Appointment`,
    description: `Your appointment for ${serviceName} is confirmed!`,
    location: 'Our Store Location',
    status: 'CONFIRMED',
    organizer: { name: 'My Business', email: 'no-reply@yourdomain.com' },
  };

  const icsContent = await new Promise((resolve, reject) => {
    ics.createEvent(event, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });

  // 2. Send Email via Resend with Attachment
  const response = await resend.emails.send({
    from: 'Booking App <no-reply@yourdomain.com>',
    to: [customerEmail],
    subject: `Booking Confirmed: ${serviceName}`,
    html: `
      <h2>Hi ${customerName},</h2>
      <p>Your appointment for <strong>${serviceName}</strong> has been booked!</p>
      <p><strong>Date & Time:</strong> ${start.toLocaleString()}</p>
      <p>We've attached a calendar invite so you can add this directly to your Google Calendar or Apple Calendar.</p>
    `,
    attachments: [
      {
        filename: 'invite.ics',
        content: Buffer.from(icsContent).toString('base64'),
      },
    ],
  });

  return response;
}

module.exports = { sendBookingConfirmation };