import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function resolveFinalRedirect(req: any, requestedRedirect?: string): string | undefined {
  const protocolHeader = req.headers?.['x-forwarded-proto'];
  const hostHeader = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : (protocolHeader || 'https').split(',')[0].trim();
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

  const headerOrigin = host ? `${protocol}://${host}`.replace(/\/+$/, '') : undefined;
  const envBase = (process.env.BASE_URL || process.env.VITE_BASE_URL || '').trim().replace(/\/+$/, '');

  const isLocalHost = (url?: string) => !!url && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);

  if (requestedRedirect && !isLocalHost(requestedRedirect)) {
    return requestedRedirect;
  }

  if (headerOrigin && !isLocalHost(headerOrigin)) {
    return `${headerOrigin}/admin`;
  }

  if (envBase) {
    return `${envBase}/admin`;
  }

  if (requestedRedirect) {
    return requestedRedirect;
  }

  if (headerOrigin) {
    return `${headerOrigin}/admin`;
  }

  return undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, userMetadata, redirectTo } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  try {
    const finalRedirectTo = resolveFinalRedirect(req, redirectTo);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: userMetadata,
        ...(finalRedirectTo ? { redirectTo: finalRedirectTo } : {}),
      },
    });

    if (error) throw error;

    const confirmationUrl = data.properties?.action_link;

    if (!confirmationUrl) {
      throw new Error('Could not generate confirmation link.');
    }

    await transporter.sendMail({
      from: `"Booking Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Confirm your email address to activate your account',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce;">Hi ${userMetadata?.full_name || 'there'}!</h2>
          <p style="color: #334155;">Thank you for registering your business. Click the button below to verify your email address and activate your dashboard:</p>
          <a href="${confirmationUrl}" style="display: inline-block; background-color: #7e22ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 16px 0;">
            Confirm Email Address
          </a>
          <p style="font-size: 12px; color: #64748b;">If you did not create this account, you can safely ignore this email.</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Error sending verification email:', err);
    return res.status(500).json({ error: err.message || 'Failed to send verification email' });
  }
}