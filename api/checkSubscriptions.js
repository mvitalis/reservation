import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Clave de servicio para modificar sin sesión de usuario
);

export default async function handler(req, res) {
  // Seguridad básica para asegurar que solo Vercel Cron ejecute esto
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const now = new Date();
  const inSevenDays = new Date();
  inSevenDays.setDate(now.getDate() + 7);

  try {
    // 1. DEGRADAR AL PLAN GRATIS ('starter') A LOS QUE YA VENCIERON
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

    // 2. ENVIAR CORREO 1 SEMANA ANTES DE VENCER
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
        const expireDateStr = new Date(biz.subscription_expires_at).toLocaleDateString();

        await transporter.sendMail({
          from: `"Soporte" <${process.env.GMAIL_USER}>`,
          to: biz.owner_email,
          subject: `Tu plan ${biz.package_tier.toUpperCase()} vence en 7 días`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #7e22ce;">Hola ${biz.name},</h2>
              <p>Te recordamos que tu mes del plan <strong>${biz.package_tier.toUpperCase()}</strong> finalizará el <strong>${expireDateStr}</strong>.</p>
              <p>Para mantener tus beneficios activos sin interrupciones, ingresa a tu panel de administración y renueva por un mes más.</p>
              <p style="font-size: 13px; color: #64748b;">Si decides no renovar, tu cuenta pasará automáticamente al plan gratuito (Starter) al finalizar el período.</p>
            </div>
          `,
        });

        // Marcar como enviado para no repetir el correo mañana
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
    console.error('Error en cron de suscripciones:', error);
    return res.status(500).json({ error: error.message });
  }
}