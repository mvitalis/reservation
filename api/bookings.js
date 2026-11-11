const supabase = require('../db');
const { z } = require('zod');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const bookingSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  customerName: z.string().min(1, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(1, 'Phone is required'),
  bookingStart: z.string().datetime({ message: 'Valid start time required' })
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const result = bookingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
    });
  }

  const { businessId, serviceId, customerName, customerEmail, customerPhone, bookingStart } = result.data;

  try {
    const { data: service, error: serviceErr } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    if (serviceErr || !service) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const start = new Date(bookingStart);
    const end = new Date(start.getTime() + service.duration_minutes * 60000);

    const { data: booking, error: insertErr } = await supabase
      .from('bookings')
      .insert([
        {
          business_id: businessId,
          service_id: serviceId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          booking_start: start.toISOString(),
          booking_end: end.toISOString()
        }
      ])
      .select('*, services(name, duration_minutes, price)')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ success: false, error: 'This time slot is already booked.' });
      }
      return res.status(500).json({ success: false, error: insertErr.message });
    }

    const appointmentDate = new Date(booking.booking_start).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    try {
      if (process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: 'Reservations <onboarding@resend.dev>',
          to: [customerEmail],
          subject: `Booking Confirmed: ${booking.services.name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6b21a8;">Appointment Confirmed!</h2>
              <p>Hi <strong>${customerName}</strong>,</p>
              <p>Your reservation has been successfully booked.</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.services.name}</p>
                <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${appointmentDate}</p>
                <p style="margin: 5px 0;"><strong>Duration:</strong> ${booking.services.duration_minutes} minutes</p>
                <p style="margin: 5px 0;"><strong>Total Price:</strong> $${booking.services.price}</p>
              </div>
              <p style="color: #6b6b6b; font-size: 14px;">If you need to cancel or reschedule, please contact the business directly.</p>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error('Server Booking Error:', err);
    return res.status(500).json({ success: false, error: 'Server error processing booking.' });
  }
};