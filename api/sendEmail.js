import nodemailer from 'nodemailer';

function toCalendarUtcString(dateObj) {
  return dateObj.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function resolveStartAndEndDates({
  bookingStartIso,
  bookingEndIso,
  bookingDate,
  bookingTime,
  durationMinutes = 60,
}) {
  let startDate = bookingStartIso ? new Date(bookingStartIso) : null;

  if (!startDate || Number.isNaN(startDate.getTime())) {
    if (bookingDate && bookingTime) {
      // Soporta formatos como "2026-11-28" + "14:30" o "2:30 PM"
      const combined = new Date(`${bookingDate} ${bookingTime}`);
      if (!Number.isNaN(combined.getTime())) {
        startDate = combined;
      } else {
        const isoAttempt = new Date(`${bookingDate}T${bookingTime}`);
        if (!Number.isNaN(isoAttempt.getTime())) {
          startDate = isoAttempt;
        }
      }
    }
  }

  if (!startDate || Number.isNaN(startDate.getTime())) {
    return null;
  }

  let endDate = bookingEndIso ? new Date(bookingEndIso) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) {
    const mins = Number(durationMinutes) > 0 ? Number(durationMinutes) : 60;
    endDate = new Date(startDate.getTime() + mins * 60 * 1000);
  }

  return { startDate, endDate };
}

function buildGoogleCalendarUrl({ title, details, location, startDate, endDate }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toCalendarUtcString(startDate)}/${toCalendarUtcString(endDate)}`,
    details,
  });

  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsContent({ title, description, location, organizerEmail, startDate, endDate }) {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@booking-platform`;
  const dtStamp = toCalendarUtcString(new Date());
  const dtStart = toCalendarUtcString(startDate);
  const dtEnd = toCalendarUtcString(endDate);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Booking Platform//Appointment Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    ...(organizerEmail ? [`ORGANIZER:mailto:${organizerEmail}`] : []),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Reminder: ${escapeIcsText(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      clientName,
      clientEmail,
      serviceName,
      businessName,
      bookingDate,
      bookingTime,
      bookingStartIso,
      bookingEndIso,
      durationMinutes,
      location,
    } = req.body;

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

    const businessLabel = businessName || 'our business';
    const eventTitle = `${serviceName} — ${businessName || 'Appointment'}`;
    const eventDescription = `Appointment for ${serviceName} with ${businessLabel}.\nClient: ${clientName || 'Customer'}\nDate: ${bookingDate || ''}\nTime: ${bookingTime || ''}`;

    const resolvedDates = resolveStartAndEndDates({
      bookingStartIso,
      bookingEndIso,
      bookingDate,
      bookingTime,
      durationMinutes,
    });

    let googleCalendarUrl = '';
    let icsContent = '';

    if (resolvedDates) {
      googleCalendarUrl = buildGoogleCalendarUrl({
        title: eventTitle,
        details: eventDescription,
        location: location || businessName || '',
        startDate: resolvedDates.startDate,
        endDate: resolvedDates.endDate,
      });

      icsContent = buildIcsContent({
        title: eventTitle,
        description: eventDescription,
        location: location || businessName || '',
        organizerEmail: process.env.GMAIL_USER,
        startDate: resolvedDates.startDate,
        endDate: resolvedDates.endDate,
      });
    }

    const calendarSectionHtml = resolvedDates
      ? `
        <div style="margin: 24px 0; padding: 16px; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: bold; color: #581c87;">
            Add a reminder to your calendar:
          </p>
          <a
            href="${googleCalendarUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="display: inline-block; background-color: #7e22ce; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: bold; padding: 10px 18px; border-radius: 6px; margin: 4px;"
          >
            + Add to Google Calendar
          </a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #6b21a8;">
            Using Apple Calendar, Outlook, or another calendar app? Open the attached <strong>appointment.ics</strong> file to save this event with a 30-minute reminder.
          </p>
        </div>
      `
      : '';

    const mailOptions = {
      from: `"${businessName || 'Reservations'}" <${process.env.GMAIL_USER}>`,
      to: clientEmail,
      subject: `Booking Confirmed: ${serviceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce; margin-top: 0;">Hi ${clientName}, your appointment at ${businessLabel} is confirmed!</h2>
          <p>Thank you for booking with us. Here are your appointment details:</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingTime}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ''}
          </div>

          ${calendarSectionHtml}

          <p style="font-size: 12px; color: #64748b;">If you need to reschedule or cancel, please contact us in advance.</p>
        </div>
      `,
      ...(icsContent
        ? {
            icalEvent: {
              filename: 'appointment.ics',
              method: 'PUBLISH',
              content: icsContent,
            },
            attachments: [
              {
                filename: 'appointment.ics',
                content: icsContent,
                contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
              },
            ],
          }
        : {}),
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