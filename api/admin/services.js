const supabase = require('../../db');
const { z } = require('zod');

const createServiceSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]),
  price: z.union([z.number(), z.string()])
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const result = createServiceSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      error: 'Validation failed', 
      errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
    });
  }

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
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Create service error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};