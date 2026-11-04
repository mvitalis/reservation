require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const supabase = require('./db');
const { z } = require('zod');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const app = express();

app.use(helmet());
// Configured CORS to accept React running on port 5173
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// 1. Fetch Services for a Business
app.get('/api/services', async (req, res) => {
  const schema = z.object({ businessId: z.string().min(1, 'businessId is required') });
  const result = schema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });
  
  const { businessId } = result.data;

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ success: false, error: error.message });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// 2. Create Booking with Double-Booking Prevention & Email Dispatch
const bookingSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  customerName: z.string().min(1, 'Name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(1, 'Phone is required'),
  bookingStart: z.string().datetime({ message: 'Valid start time required' })
});

app.post('/api/bookings', async (req, res) => {
  const result = bookingSchema.safeParse(req.body);
  if (!result.success) {
    console.log('Validation failure details:', result.error.errors);
    return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });
  }

  const { businessId, serviceId, customerName, customerEmail, customerPhone, bookingStart } = result.data;

  try {
    // Check service duration
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

    // Insert booking and join relational services data for email template
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
      .select('*, services(name, duration_minutes, price)') // Joined services details
      .single();

    if (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(409).json({ success: false, error: 'This time slot is already booked.' });
      }
      return res.status(500).json({ success: false, error: insertErr.message });
    }

    // Format appointment time for the email body
    const appointmentDate = new Date(booking.booking_start).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    // Send Confirmation Email asynchronously
    try {
      if (process.env.RESEND_API_KEY) {
        const emailResponse = await resend.emails.send({
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
        console.log('Resend Success Response:', emailResponse);
      }
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    console.error('Server Booking Error:', err);
    res.status(500).json({ success: false, error: 'Server error processing booking.' });
  }
});

// 3. Fetch all bookings for a business (Admin View)
const adminBookingsSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  date: z.string().optional(),
  status: z.string().optional()
});

app.get('/api/admin/bookings', async (req, res) => {
  const result = adminBookingsSchema.safeParse(req.query);
  if (!result.success) return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });

  const { businessId, date, status } = result.data;

  try {
    let query = supabase
      .from('bookings')
      .select('*, services(name, duration_minutes, price)')
      .eq('business_id', businessId)
      .order('booking_start', { ascending: true });

    // Filter by specific status if passed (e.g. 'confirmed', 'cancelled')
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filter by date if passed
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('booking_start', startOfDay.toISOString())
        .lte('booking_start', endOfDay.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update Booking Status (e.g., Cancel, Complete)
const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no-show'])
});

app.patch('/api/admin/bookings/:id', async (req, res) => {
  const { id } = req.params;
  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });

  const { status } = result.data;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST: Create a new service
const createServiceSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]),
  price: z.union([z.number(), z.string()])
});

app.post('/api/admin/services', async (req, res) => {
  const result = createServiceSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });

  const { businessId, name, description, durationMinutes, price } = result.data;

  try {
    const { data, error } = await supabase
      .from('services')
      .insert([{
        business_id: businessId,
        name,
        description,
        duration_minutes: parseInt(durationMinutes, 10),
        price: parseFloat(price)
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT: Update an existing service
const updateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]),
  price: z.union([z.number(), z.string()])
});

app.put('/api/admin/services/:id', async (req, res) => {
  const { id } = req.params;
  const result = updateServiceSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ success: false, error: 'Validation failed', errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) });

  const { name, description, durationMinutes, price } = result.data;

  try {
    const { data, error } = await supabase
      .from('services')
      .update({
        name,
        description,
        duration_minutes: parseInt(durationMinutes, 10),
        price: parseFloat(price)
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Update service error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE: Delete a service
app.delete('/api/admin/services/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
