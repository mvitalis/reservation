const supabase = require('../db');
const { z } = require('zod');

const schema = z.object({ businessId: z.string().min(1, 'businessId is required') });

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const result = schema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
    });
  }
  
  const { businessId } = result.data;

  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};