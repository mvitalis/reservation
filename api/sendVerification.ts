import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Usar SUPABASE_URL o VITE_SUPABASE_URL indistintamente
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Faltan las credenciales de Supabase en las variables de entorno del servidor.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, userMetadata, redirectTo } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Crea el usuario en Supabase (sin confirmar aún) y genera el enlace oficial
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: userMetadata,
        redirectTo: redirectTo || `${req.headers.origin}/admin`,
      },
    });

    if (error) throw error;

    const confirmationUrl = data.properties?.action_link;

    if (!confirmationUrl) {
      throw new Error('No se pudo generar el enlace de confirmación.');
    }

    await transporter.sendMail({
      from: `"Booking Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Confirma tu correo electrónico para activar tu cuenta',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce;">¡Hola, ${userMetadata?.full_name || 'bienvenido'}!</h2>
          <p style="color: #334155;">Gracias por registrar tu negocio. Haz clic en el siguiente botón para verificar tu correo electrónico y activar tu panel:</p>
          <a href="${confirmationUrl}" style="display: inline-block; background-color: #7e22ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">
            Confirmar Correo Electrónico
          </a>
          <p style="font-size: 12px; color: #64748b;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error sending verification email:', err);
    return res.status(500).json({ error: err.message || 'Failed to send verification email' });
  }
}