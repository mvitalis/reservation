import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

function getSlaHoursByTier(packageTier = 'starter') {
  const tier = String(packageTier).toLowerCase();
  if (tier === 'business') return 12;
  if (tier === 'pro') return 24;
  return 48; // starter por defecto
}

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
    const {
      subject,
      category = 'Bug / Technical Issue',
      message,
      attachments = [],
      userEmail,
      businessName,
      businessId,
      packageTier = 'starter',
      currentRoute,
      userAgent,
    } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Please describe the issue.' });
    }

    const supportInbox = process.env.SUPPORT_EMAIL || process.env.GMAIL_USER;
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD || !supportInbox) {
      return res.status(500).json({ success: false, error: 'Support email is not configured.' });
    }

    const safeAttachments = Array.isArray(attachments)
      ? attachments.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url)).slice(0, 3)
      : [];

    const now = new Date();
    const slaHours = getSlaHoursByTier(packageTier);
    const slaDueDate = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    let ticketId = null;
    let ticketNumber = null;

    if (supabaseAdmin) {
      const { data: inserted, error: dbError } = await supabaseAdmin
        .from('support_tickets')
        .insert([
          {
            business_id: businessId || null,
            user_email: userEmail ? String(userEmail).trim() : null,
            business_name: businessName ? String(businessName).trim() : null,
            package_tier: String(packageTier || 'starter').toLowerCase(),
            category: String(category || 'Bug / Technical Issue'),
            subject: String(subject || '').trim() || `${category} — ${businessName || 'Account'}`,
            message: String(message).trim(),
            attachments: safeAttachments,
            current_route: currentRoute || null,
            user_agent: userAgent || null,
            status: 'open',
            sla_hours: slaHours,
            sla_due_at: slaDueDate.toISOString(),
          },
        ])
        .select('id, ticket_number')
        .single();

      if (dbError) {
        console.error('Error inserting support ticket:', dbError);
        throw new Error('Failed to save support ticket.');
      }

      ticketId = inserted?.id || null;
      ticketNumber = inserted?.ticket_number || null;
    }

    const ticketLabel = ticketNumber ? `#${ticketNumber}` : ticketId ? `#${String(ticketId).slice(0, 8)}` : 'NEW';
    const slaDueFormatted = slaDueDate.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const attachmentsHtml =
      safeAttachments.length > 0
        ? `
          <div style="margin: 16px 0;">
            <p style="margin: 0 0 8px 0; font-weight: bold;">Attached Photos (${safeAttachments.length}):</p>
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
              ${safeAttachments
                .map(
                  (url, i) => `
                  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display: block; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; text-decoration: none; color: #7e22ce; font-size: 12px;">
                    <img src="${escapeHtml(url)}" alt="Attachment ${i + 1}" style="width: 140px; height: 95px; object-fit: cover; border-radius: 4px; display: block; margin-bottom: 4px;" />
                    View Photo ${i + 1}
                  </a>
                `
                )
                .join('')}
            </div>
          </div>
        `
        : '';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const ticketTitle = String(subject || '').trim() || `${category} from ${businessName || userEmail || 'User'}`;

    // 1. Correo interno para soporte con contexto y SLA
    await transporter.sendMail({
      from: `"Support System" <${process.env.GMAIL_USER}>`,
      to: supportInbox,
      replyTo: userEmail || process.env.GMAIL_USER,
      subject: `[Ticket ${ticketLabel}] [${String(packageTier).toUpperCase()}] ${ticketTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 640px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce; margin-top: 0;">Support Ticket ${escapeHtml(ticketLabel)}</h2>
          <p><strong>SLA Target:</strong> Within ${slaHours} hours (Due by: <strong>${escapeHtml(slaDueFormatted)}</strong>)</p>
          <p><strong>Category:</strong> ${escapeHtml(category)}</p>
          <p><strong>User Email:</strong> ${escapeHtml(userEmail || 'Not provided')}</p>
          <p><strong>Business:</strong> ${escapeHtml(businessName || 'N/A')} (${escapeHtml(businessId || 'no-id')})</p>
          <p><strong>Plan:</strong> ${escapeHtml(String(packageTier || 'starter').toUpperCase())}</p>
          <p><strong>Route:</strong> ${escapeHtml(currentRoute || 'N/A')}</p>

          <div style="margin: 16px 0; padding: 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 6px 0; font-weight: bold;">Message:</p>
            <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(String(message).trim())}</p>
          </div>

          ${attachmentsHtml}

          <p style="font-size: 11px; color: #64748b;">Browser/Device: ${escapeHtml(userAgent || 'N/A')}</p>
        </div>
      `,
    });

    // 2. Correo de confirmación para el usuario
    if (userEmail) {
      await transporter.sendMail({
        from: `"${businessName ? 'Support' : 'Booking Platform Support'}" <${process.env.GMAIL_USER}>`,
        to: String(userEmail).trim(),
        subject: `Support Ticket Received (${ticketLabel}): ${ticketTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #7e22ce; margin-top: 0;">We received your support ticket</h2>
            <p>Hi${businessName ? ` ${escapeHtml(businessName)}` : ''},</p>
            <p>Thank you for reaching out. We do not offer live chat, so our support team handles requests via tickets and will reply to your email within <strong>${slaHours} hours</strong> (target response by <strong>${escapeHtml(slaDueFormatted)}</strong>).</p>

            <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 18px 0;">
              <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${escapeHtml(ticketLabel)}</p>
              <p style="margin: 4px 0;"><strong>Category:</strong> ${escapeHtml(category)}</p>
              <p style="margin: 4px 0;"><strong>Subject:</strong> ${escapeHtml(ticketTitle)}</p>
              <p style="margin: 4px 0;"><strong>Attached Photos:</strong> ${safeAttachments.length}</p>
            </div>

            <p style="font-size: 12px; color: #64748b;">You can reply directly to this email if you need to add more details to your ticket.</p>
          </div>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      ticketId,
      ticketNumber,
      ticketLabel,
      slaHours,
      slaDueAt: slaDueDate.toISOString(),
    });
  } catch (error) {
    console.error('Support endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to submit support ticket.',
    });
  }
}