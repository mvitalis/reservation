// server/routes/slots.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Your PostgreSQL pool connection

// GET /api/availability?businessId=...&date=YYYY-MM-DD&serviceDuration=30
router.get('/', async (req, res) => {
  const { businessId, date, serviceDuration = 30 } = req.query;

  if (!businessId || !date) {
    return res.status(400).json({ success: false, error: 'businessId and date are required' });
  }

  try {
    // 1. Fetch existing non-cancelled bookings for this business on the selected date
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const bookingsQuery = `
      SELECT booking_start, booking_end 
      FROM bookings 
      WHERE business_id = $1 
        AND status != 'cancelled'
        AND booking_start >= $2 
        AND booking_start <= $3
    `;
    const bookingsResult = await pool.query(bookingsQuery, [businessId, startOfDay, endOfDay]);
    const existingBookings = bookingsResult.rows;

    // 2. Define operating hours (e.g., 9:00 AM to 5:00 PM)
    // Tip: In production, fetch these working hours per business from your database!
    const openHour = 9;  // 09:00
    const closeHour = 17; // 17:00
    const slotDuration = parseInt(serviceDuration, 10);

    const availableSlots = [];

    // Loop through operating hours in increments (e.g., every 30 mins)
    for (let hour = openHour; hour < closeHour; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`);
        const slotEnd = new Date(slotStart.getTime() + slotDuration * 60000);

        // Stop if the slot extends beyond closing time
        if (slotEnd.getHours() > closeHour || (slotEnd.getHours() === closeHour && slotEnd.getMinutes() > 0)) {
          break;
        }

        // 3. Check if slot overlaps with any existing booking
        const isConflict = existingBookings.some((b) => {
          const bStart = new Date(b.booking_start);
          const bEnd = new Date(b.booking_end);
          // Overlap condition
          return slotStart < bEnd && slotEnd > bStart;
        });

        availableSlots.push({
          time: slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          isoStart: slotStart.toISOString(),
          isoEnd: slotEnd.toISOString(),
          available: !isConflict,
        });
      }
    }

    res.json({ success: true, date, slots: availableSlots });
  } catch (err) {
    console.error('Error generating availability slots:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;