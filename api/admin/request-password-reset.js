import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, redirectTo } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const safeRedirect =
      redirectTo && /^https?:\/\//i.test(redirectTo)
        ? redirectTo
        : `${process.env.APP_URL || 'http://localhost:5173'}/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo: safeRedirect },
    });

    // Si el usuario no existe o falla generar link, respondemos igual sin filtrar información
    if (!error && data?.properties?.action_link) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: cleanEmail,
        subject: 'Reset your password',
        html: `
          <p>We received a request to reset your password.</p>
          <p><a href="${data.properties.action_link}">Click here to set a new password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('Password reset email error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
}