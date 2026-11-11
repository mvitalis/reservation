const supabase = require('../../db');
const { z } = require('zod');

const adminBookingsSchema = z.object({
  businessId: z.string().min(1, 'businessId is required'),
  date: z.string().optional(),
  status: z.string().optional()
});

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const result = adminBookingsSchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
    });
  }

  const { businessId, date, status } = result.data;

  try {
    let query = supabase
      .from('bookings')
      .select('*, services(name, duration_minutes, price)')
      .eq('business_id', businessId)
      .order('booking_start', { ascending: true });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

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
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};