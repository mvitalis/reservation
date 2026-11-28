import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, redirectTo } = req.body || {};

    if (!email || !String(email).trim()) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!supabaseAdmin) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return res.status(500).json({ success: false, error: 'Auth admin client is not configured.' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
      return res.status(500).json({ success: false, error: 'Email service is not configured.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const fallbackOrigin =
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');

    const safeRedirectTo =
      redirectTo && /^https?:\/\//i.test(String(redirectTo))
        ? String(redirectTo).trim()
        : `${fallbackOrigin.replace(/\/+$/, '')}/reset-password`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: {
        redirectTo: safeRedirectTo,
      },
    });

    const actionLink = data?.properties?.action_link;

    // Solo enviamos si el usuario existe y se generó el enlace, pero devolvemos 200 igual
    // para no revelar si un correo está registrado o no.
    if (!error && actionLink) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: `"Reservation Manager Pro" <${process.env.GMAIL_USER}>`,
        to: cleanEmail,
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #7e22ce; margin-top: 0;">Reset your password</h2>
            <p>We received a request to reset the password for your account (<strong>${escapeHtml(cleanEmail)}</strong>).</p>
            <p>Click the button below to choose a new password:</p>
            <div style="margin: 24px 0; text-align: center;">
              <a
                href="${escapeHtml(actionLink)}"
                target="_blank"
                rel="noopener noreferrer"
                style="display: inline-block; background-color: #7e22ce; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 12px 22px; border-radius: 6px;"
              >
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    } else if (error) {
      console.error('generateLink recovery error:', error.message);
    }

    return res.status(200).json({
      success: true,
      message:
        'If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.',
    });
  } catch (err) {
    console.error('Error in /api/auth/request-password-reset:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to send password reset email.',
    });
  }
}