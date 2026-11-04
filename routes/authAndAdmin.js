// server/routes/authAndAdmin.js
import express from 'express';
import { supabaseAdmin } from '../supabaseClient.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * PUBLIC ROUTE: Client Login
 * Authenticates user with email and password via Supabase Auth
 */
router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ success: false, message: error.message });
  }

  // Retrieve client business details associated with this owner_id
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id, name, slug')
    .eq('owner_id', data.user.id)
    .single();

  return res.json({
    success: true,
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      business: business || null,
    },
  });
});

/**
 * PROTECTED ROUTE: Fetch Admin Bookings
 * Uses requireAuth middleware to restrict access
 */
router.get('/api/admin/bookings', requireAuth, async (req, res) => {
  const ownerId = req.user.id;

  // 1. Fetch business owned by authenticated user
  const { data: business, error: busErr } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('owner_id', ownerId)
    .single();

  if (busErr || !business) {
    return res.status(404).json({ success: false, message: 'Business record not found.' });
  }

  // 2. Fetch bookings for this business
  const { data: bookings, error: bookErr } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      customer_name,
      customer_email,
      customer_phone,
      booking_start,
      booking_end,
      status,
      services ( name, duration_minutes, price )
    `)
    .eq('business_id', business.id)
    .order('booking_start', { ascending: true });

  if (bookErr) {
    return res.status(500).json({ success: false, message: bookErr.message });
  }

  return res.json({ success: true, data: bookings });
});

export default router;