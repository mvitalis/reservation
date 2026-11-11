const supabase = require('../../../db');
const { z } = require('zod');

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'completed', 'cancelled', 'no-show'])
});

module.exports = async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query; // Vercel asigna los parámetros dinámicos a req.query
  const result = updateStatusSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
    });
  }

  const { status } = result.data;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};