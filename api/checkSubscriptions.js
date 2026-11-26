import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();
  const inSevenDays = new Date();
  inSevenDays.setDate(now.getDate() + 7);

  try {
    // 1. Downgrade expired subscriptions to the free 'starter' plan
    const { data: expiredBusinesses } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .neq('package_tier', 'starter')
      .lte('subscription_expires_at', now.toISOString());

    if (expiredBusinesses && expiredBusinesses.length > 0) {
      const expiredIds = expiredBusinesses.map((b) => b.id);
      await supabase
        .from('businesses')
        .update({
          package_tier: 'starter',
          subscription_expires_at: null,
          renewal_reminder_sent: false,
        })
        .in('id', expiredIds);
    }

    // 2. Send a reminder email 7 days before expiration
    const { data: expiringSoon } = await supabase
      .from('businesses')
      .select('id, name, package_tier, subscription_expires_at, owner_email')
      .neq('package_tier', 'starter')
      .eq('renewal_reminder_sent', false)
      .gt('subscription_expires_at', now.toISOString())
      .lte('subscription_expires_at', inSevenDays.toISOString());

    if (expiringSoon && expiringSoon.length > 0) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      for (const biz of expiringSoon) {
        const expireDateStr = new Date(biz.subscription_expires_at).toLocaleDateString('en-US');

        await transporter.sendMail({
          from: `"Support" <${process.env.GMAIL_USER}>`,
          to: biz.owner_email,
          subject: `Your ${biz.package_tier.toUpperCase()} plan expires in 7 days`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #7e22ce;">Hi ${biz.name},</h2>
              <p>This is a reminder that your current 30-day <strong>${biz.package_tier.toUpperCase()}</strong> plan will expire on <strong>${expireDateStr}</strong>.</p>
              <p>To keep your plan benefits active without interruption, log in to your admin dashboard and renew for another month.</p>
              <p style="font-size: 13px; color: #64748b;">If you choose not to renew, your account will automatically switch to the free Starter plan when the billing period ends.</p>
            </div>
          `,
        });

        await supabase
          .from('businesses')
          .update({ renewal_reminder_sent: true })
          .eq('id', biz.id);
      }
    }

    return res.status(200).json({
      success: true,
      downgraded: expiredBusinesses?.length || 0,
      reminded: expiringSoon?.length || 0,
    });
  } catch (error) {
    console.error('Subscription cron error:', error);
    return res.status(500).json({ error: error.message || 'Subscription cron failed.' });
  }
}