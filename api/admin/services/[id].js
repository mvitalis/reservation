const supabase = require('../../../db');
const { z } = require('zod');

const updateServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.union([z.number(), z.string()]),
  price: z.union([z.number(), z.string()])
});

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const result = updateServiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        errors: result.error.errors.map(e => ({ path: e.path.join('.'), msg: e.message })) 
      });
    }

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
      return res.json({ success: true, data });
    } catch (err) {
      console.error('Update service error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  } 
  
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return res.json({ success: true, message: 'Service deleted successfully' });
    } catch (err) {
      console.error('Delete service error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};