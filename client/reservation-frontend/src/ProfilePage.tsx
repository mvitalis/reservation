import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId as PackageTier } from './plans';
import {
  Building,
  Lock,
  Phone,
  Bell,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Save,
  CreditCard,
  XCircle,
  KeyRound,
  Clock,
  Palette,
  Image,
  Sparkles,
} from 'lucide-react';

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessHours {
  [day: string]: DaySchedule;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '15:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};

interface UserProfileData {
  businessId: string | null;
  usernameEmail: string;
  businessName: string;
  phone: string;
  slug: string;
  notificationEmail: string;
  selectedPackage: PackageTier;
  subscriptionExpiresAt: string | null;
  businessHours: BusinessHours;
  logoUrl: string;
  headerImageUrl: string;
  primaryColor: string;
  publicTheme: 'light' | 'dark' | 'system';
}

function createInitialSlug(businessName?: string | null): string {
  const cleaned = (businessName ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const basePart = cleaned.slice(0, 16).replace(/-+$/g, '') || 'biz';
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${basePart}-${randomPart}`;
}

async function extractEdgeFunctionError(error: any, fallbackData: any): Promise<string> {
  if (fallbackData?.error) {
    return typeof fallbackData.details === 'string'
      ? `${fallbackData.error}: ${fallbackData.details}`
      : fallbackData.error;
  }

  if (error && 'context' in error && error.context && typeof error.context.json === 'function') {
    try {
      const errBody = await error.context.json();
      if (errBody?.error) {
        const extra = errBody?.details ? ` (${JSON.stringify(errBody.details)})` : '';
        return `${errBody.error}${extra}`;
      }
    } catch {
      // Ignorar si la respuesta no es JSON
    }
  }

  return error?.message || 'Error inesperado al comunicarse con el servidor.';
}

export const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);
  const [updatingPlan, setUpdatingPlan] = useState<boolean>(false);

  const [targetPlan, setTargetPlan] = useState<PackageTier>('pro');

  const [profile, setProfile] = useState<UserProfileData>({
    businessId: null,
    usernameEmail: '',
    businessName: '',
    phone: '',
    slug: '',
    notificationEmail: '',
    selectedPackage: 'starter',
    subscriptionExpiresAt: null,
    businessHours: DEFAULT_HOURS,
    logoUrl: '',
    headerImageUrl: '',
    primaryColor: '#7e22ce',
    publicTheme: 'light',
  });

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Preseleccionar plan si se navega con ?upgrade=pro o ?upgrade=business
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgradeParam = params.get('upgrade');
    if (upgradeParam === 'pro' || upgradeParam === 'business') {
      setTargetPlan(upgradeParam);
    }
  }, []);

  // Load User and Business Data
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            setMessage({ type: 'error', text: 'Failed to authenticate user.' });
            setLoading(false);
          }
          return;
        }

        // Buscar por owner_id; si no hay coincidencia, intentar por id = user.id
        let { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('id, name, phone, slug, notification_email, package_tier, subscription_expires_at, business_hours, logo_url, header_image_url, primary_color, public_theme')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (bizError) {
          console.error('Error fetching business info by owner_id:', bizError);
        }

        if (!business) {
          const { data: byIdBiz, error: byIdErr } = await supabase
            .from('businesses')
            .select('id, name, phone, slug, notification_email, package_tier, subscription_expires_at, business_hours, logo_url, header_image_url, primary_color, public_theme')
            .eq('id', user.id)
            .maybeSingle();

          if (byIdErr) {
            console.error('Error fetching business info by id:', byIdErr);
          }
          if (byIdBiz) {
            business = byIdBiz;
          }
        }

        if (!isMounted) return;

        const userPackage = (business?.package_tier || user.user_metadata?.selected_package || 'starter') as PackageTier;
        const resolvedName = business?.name || user.user_metadata?.business_name || '';
        const resolvedSlug = business?.slug || (typeof user.user_metadata?.slug === 'string' ? user.user_metadata.slug : '') || '';

        setProfile({
          businessId: business?.id || null,
          usernameEmail: user.email || '',
          businessName: resolvedName,
          phone: business?.phone || '',
          slug: resolvedSlug,
          notificationEmail: business?.notification_email || user.email || '',
          selectedPackage: userPackage,
          subscriptionExpiresAt: business?.subscription_expires_at || null,
          businessHours: business?.business_hours || DEFAULT_HOURS,
          logoUrl: business?.logo_url || '',
          headerImageUrl: business?.header_image_url || '',
          primaryColor: business?.primary_color || '#7e22ce',
          publicTheme: business?.public_theme || 'light',
        });

        const params = new URLSearchParams(window.location.search);
        const upgradeParam = params.get('upgrade');
        if (upgradeParam === 'pro' || upgradeParam === 'business') {
          setTargetPlan(upgradeParam);
        } else {
          setTargetPlan(userPackage === 'starter' ? 'pro' : userPackage);
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        if (isMounted) {
          setMessage({ type: 'error', text: 'Error loading profile settings.' });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Procesar retorno de WiPay desde la URL en Vercel
  const handleWiPayReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const transactionId = params.get('transaction_id');
    const orderId = params.get('order_id');
    const total = params.get('total');
    const hash = params.get('hash');
    const returnedPlan = params.get('plan') as PackageTier | null;

    if (!status && !transactionId && !orderId) return;

    // Limpia los query params de la URL para evitar reprocesar al recargar
    window.history.replaceState({}, '', window.location.pathname);

    if (!status || status.toLowerCase() !== 'success') {
      setMessage({
        type: 'error',
        text: 'El pago en WiPay no se completó o fue cancelado.',
      });
      return;
    }

    setUpdatingPlan(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sesión expirada. Inicia sesión nuevamente para confirmar el pago.');
      }

      const planToActivate =
        returnedPlan && (returnedPlan === 'pro' || returnedPlan === 'business')
          ? returnedPlan
          : targetPlan;

      const { data: result, error } = await supabase.functions.invoke('wipay-order', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'verify',
          status,
          transactionId,
          orderId,
          total,
          hash,
          planId: planToActivate,
          businessId: profile.businessId,
        },
      });

      if (error || !result?.success) {
        const detailMsg = await extractEdgeFunctionError(error, result);
        throw new Error(detailMsg);
      }

      const activatedTier = (result.packageTier || planToActivate) as PackageTier;
      const nextExpiresAt =
        result.subscriptionExpiresAt ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      setProfile((prev) => ({
        ...prev,
        selectedPackage: activatedTier,
        subscriptionExpiresAt: nextExpiresAt,
      }));

      setMessage({
        type: 'success',
        text: '¡Pago con WiPay confirmado! Tu plan ha sido activado/extendido por 30 días.',
      });
    } catch (err: any) {
      console.error('WiPay return verification error:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'El pago no pudo verificarse.',
      });
    } finally {
      setUpdatingPlan(false);
    }
  }, [profile.businessId, targetPlan]);

  useEffect(() => {
    if (!loading) {
      handleWiPayReturn();
    }
  }, [loading, handleWiPayReturn]);

  // Iniciar sesión de pago en WiPay
  const handleWiPayCheckout = async () => {
    if (targetPlan === 'starter') return;

    setUpdatingPlan(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay una sesión activa. Por favor vuelve a iniciar sesión.');
      }

      const returnUrl = `${window.location.origin}${window.location.pathname}?plan=${targetPlan}`;

      const { data, error } = await supabase.functions.invoke('wipay-order', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'create',
          planId: targetPlan,
          businessId: profile.businessId,
          returnUrl,
        },
      });

      if (error || !data?.url) {
        const detailMsg = await extractEdgeFunctionError(error, data);
        throw new Error(detailMsg);
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error('WiPay checkout error:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Error al redirigir a WiPay.',
      });
      setUpdatingPlan(false);
    }
  };

  const handleToggleClosed = (day: string) => {
    setProfile((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          closed: !prev.businessHours[day]?.closed,
        },
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setProfile((prev) => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session.');

      const stableSlug = profile.slug.trim() || createInitialSlug(profile.businessName);

      const payload = {
        name: profile.businessName.trim(),
        phone: profile.phone.trim() || null,
        slug: stableSlug,
        notification_email: profile.notificationEmail.trim(),
        business_hours: profile.businessHours,
        logo_url: profile.logoUrl.trim() || null,
        header_image_url: profile.headerImageUrl.trim() || null,
        primary_color: profile.primaryColor,
        public_theme: profile.publicTheme,
      };

      if (profile.businessId) {
        const { error: updateErr } = await supabase
          .from('businesses')
          .update(payload)
          .eq('id', profile.businessId);

        if (updateErr) throw updateErr;
      } else {
        const { data: existingByOwner } = await supabase
          .from('businesses')
          .select('id, slug')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (existingByOwner) {
          const { error: updateOwnerErr } = await supabase
            .from('businesses')
            .update({
              ...payload,
              slug: existingByOwner.slug || stableSlug,
            })
            .eq('id', existingByOwner.id);

          if (updateOwnerErr) throw updateOwnerErr;

          setProfile((prev) => ({
            ...prev,
            businessId: existingByOwner.id,
            slug: existingByOwner.slug || stableSlug,
          }));
        } else {
          const { data: insertedBiz, error: insertErr } = await supabase
            .from('businesses')
            .insert([
              {
                owner_id: user.id,
                package_tier: profile.selectedPackage || 'starter',
                ...payload,
              },
            ])
            .select('id, slug')
            .single();

          if (insertErr) throw insertErr;

          setProfile((prev) => ({
            ...prev,
            businessId: insertedBiz?.id || null,
            slug: insertedBiz?.slug || stableSlug,
          }));
        }
      }

      setProfile((prev) => ({
        ...prev,
        slug: prev.slug || stableSlug,
      }));

      setMessage({
        type: 'success',
        text: 'Profile settings, branding, operating hours, and public theme updated successfully!',
      });
    } catch (err: any) {
      console.error('Save profile error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save profile changes.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Revertir a Starter
  const handleDowngradeToStarter = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your paid plan and revert to the free Starter tier?'
    );
    if (!confirmed) return;

    setUpdatingPlan(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active user session.');

      const matchColumn = profile.businessId ? 'id' : 'owner_id';
      const matchValue = profile.businessId || user.id;

      const { error } = await supabase
        .from('businesses')
        .update({
          package_tier: 'starter',
          subscription_expires_at: null,
          renewal_reminder_sent: false,
        })
        .eq(matchColumn, matchValue);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, selectedPackage: 'starter', subscriptionExpiresAt: null }));
      setMessage({
        type: 'success',
        text: 'Subscription cancelled. Your account has been reverted to the Starter plan.',
      });
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to cancel subscription.' });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwords.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword,
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswords({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error('Password update error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-500 dark:text-slate-400 font-medium">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  const selectedPkgConfig = PLANS[targetPlan] || PLANS['pro'];
  const parsedAmount = parseFloat(selectedPkgConfig.price.replace(/[^0-9.]/g, ''));
  const numericPrice =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount.toFixed(2) : '19.00';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4 sm:px-6 text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                Account Management
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Account & Settings</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your business information, page customization, operating hours, and security.</p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* SECTION 1: Read-Only Account Identity */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-700">
            <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Login Identity</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
              Account Email / Username
            </label>
            <div className="relative">
              <input
                type="email"
                value={profile.usernameEmail}
                disabled
                className="w-full p-3 pl-10 border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-400 rounded-lg cursor-not-allowed select-none font-medium"
              />
              <Lock className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
            </div>
          </div>
        </div>

        {/* SECTION 2: Subscription & Plan Management with WiPay */}
        <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Subscription Plan (30 Days)</h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              Active: {profile.selectedPackage.toUpperCase()}
            </span>
          </div>

          {profile.subscriptionExpiresAt && (
            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-3 rounded-lg text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
              <span>Tu plan actual vence el: <strong>{new Date(profile.subscriptionExpiresAt).toLocaleDateString()}</strong></span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(PLANS).map((pkg) => {
              const isSelected = targetPlan === pkg.id;
              const isCurrentActive = profile.selectedPackage === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => pkg.id !== 'starter' && setTargetPlan(pkg.id as PackageTier)}
                  className={`p-4 rounded-xl border-2 transition-all relative ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/40 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  } ${pkg.id !== 'starter' ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-slate-100">{pkg.name}</h3>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{pkg.price}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">{pkg.description}</p>

                  {isCurrentActive && (
                    <span className="inline-flex items-center text-xs font-semibold text-green-700 dark:text-green-300">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" /> Plan Actual
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {targetPlan !== 'starter' && (
            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 uppercase">
                  Pagar / Renovar Plan {selectedPkgConfig.name} (${numericPrice} USD por 30 días)
                </span>
              </div>

              <button
                type="button"
                disabled={updatingPlan}
                onClick={handleWiPayCheckout}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {updatingPlan
                    ? 'Redirigiendo a WiPay...'
                    : `Pagar con WiPay — ${selectedPkgConfig.name} ($${numericPrice} USD)`}
                </span>
              </button>
            </div>
          )}

          {profile.selectedPackage !== 'starter' && (
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-slate-300">¿Deseas volver al plan gratuito?</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Esto cambiará tu cuenta al plan Starter de inmediato.
                </p>
              </div>
              <button
                type="button"
                disabled={updatingPlan}
                onClick={handleDowngradeToStarter}
                className="text-xs px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Downgrade to Starter</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Business Details, Branding & Operating Hours */}
        <form onSubmit={handleProfileSave} className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-700">
            <Building className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Business Details & Branding</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                Business Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                  placeholder="e.g. Kimba Imperial Barbershop"
                />
                <Building className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            {profile.slug && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                  Booking Slug (Permanent)
                </label>
                <input
                  type="text"
                  value={profile.slug}
                  disabled
                  className="w-full p-3 border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-400 rounded-lg cursor-not-allowed font-mono text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                Public Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                  placeholder="(868) 555-0199"
                />
                <Phone className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                Notification Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={profile.notificationEmail}
                  onChange={(e) => setProfile({ ...profile, notificationEmail: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                  placeholder="alerts@yourdomain.com"
                />
                <Bell className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* BRANDING */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
                  Public Page Custom Branding & Theme
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Public Booking Page Theme Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: '☀️ Light', desc: 'Light background' },
                    { id: 'dark', label: '🌙 Dark', desc: 'Dark background' },
                    { id: 'system', label: '💻 System', desc: 'Device preference' },
                  ].map((themeOpt) => (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => setProfile({ ...profile, publicTheme: themeOpt.id as any })}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        profile.publicTheme === themeOpt.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-semibold shadow-sm'
                          : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-xs font-bold">{themeOpt.label}</div>
                      <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">{themeOpt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Logo Image URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={profile.logoUrl}
                    onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                    placeholder="https://example.com/logo.png"
                  />
                  <Sparkles className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Header Cover Image URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={profile.headerImageUrl}
                    onChange={(e) => setProfile({ ...profile, headerImageUrl: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                    placeholder="https://example.com/banner.jpg"
                  />
                  <Image className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Primary Brand Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={profile.primaryColor}
                    onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
                    className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 p-1 bg-white dark:bg-slate-900"
                  />
                  <span className="text-gray-600 dark:text-slate-400 font-mono text-sm">{profile.primaryColor}</span>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide">
                  Business Operating Hours
                </label>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                {DAYS.map((day) => {
                  const dayConfig = profile.businessHours[day] || { open: '09:00', close: '17:00', closed: false };

                  return (
                    <div
                      key={day}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 gap-2 sm:gap-0"
                    >
                      <span className="capitalize font-semibold text-sm text-gray-700 dark:text-slate-300 w-28">
                        {day}
                      </span>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 dark:text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dayConfig.closed}
                            onChange={() => handleToggleClosed(day)}
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span>Closed</span>
                        </label>

                        {!dayConfig.closed && (
                          <div className="flex items-center space-x-2 text-xs">
                            <input
                              type="time"
                              value={dayConfig.open}
                              onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                              className="p-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900"
                            />
                            <span className="text-gray-400 font-medium">to</span>
                            <input
                              type="time"
                              value={dayConfig.close}
                              onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                              className="p-1.5 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </form>

        {/* SECTION 4: Change Password */}
        <form onSubmit={handlePasswordUpdate} className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-700">
            <KeyRound className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">Security & Password</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 font-medium placeholder-slate-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword || !passwords.newPassword}
            className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;