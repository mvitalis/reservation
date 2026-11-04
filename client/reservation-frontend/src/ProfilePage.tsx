import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
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
  ArrowUpRight,
  XCircle,
  KeyRound,
  Clock,
  Palette,
  Image,
  Sparkles,
  SunMoon
} from 'lucide-react';

type PackageTier = 'starter' | 'pro' | 'business';

const PAYPAL_URLS: Record<Exclude<PackageTier, 'starter'>, string> = {
  pro: 'https://sandbox.paypal.com/ncp/payment/V2Q6Q92AH7BEW',
  business: 'https://sandbox.paypal.com/ncp/payment/JLCBML8EB22TN',
};

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
  usernameEmail: string; // Read-only login email
  businessName: string;
  phone: string;
  slug: string;
  notificationEmail: string;
  selectedPackage: PackageTier;
  businessHours: BusinessHours;
  logoUrl: string;
  headerImageUrl: string;
  primaryColor: string;
  publicTheme: 'light' | 'dark' | 'system'; // 👈 Nuevo campo para el tema público
}

export const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [updatingPassword, setUpdatingPassword] = useState<boolean>(false);
  const [updatingPlan, setUpdatingPlan] = useState<boolean>(false);

  // Profile Form State
  const [profile, setProfile] = useState<UserProfileData>({
    usernameEmail: '',
    businessName: '',
    phone: '',
    slug: '', 
    notificationEmail: '',
    selectedPackage: 'starter',
    businessHours: DEFAULT_HOURS,
    logoUrl: '',
    headerImageUrl: '',
    primaryColor: '#7e22ce', // Default purple accent
    publicTheme: 'light', // 👈 Valor por defecto
  });

  // Password State
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Alert State
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load User and Business Data
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setMessage(null);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          setMessage({ type: 'error', text: 'Failed to authenticate user.' });
          setLoading(false);
          return;
        }

        // Fetch Business profile connected to this user
        const { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('name, phone, slug, notification_email, package_tier, business_hours, logo_url, header_image_url, primary_color, public_theme')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (bizError) {
          console.error('Error fetching business info:', bizError);
        }

        const userPackage = (business?.package_tier || user.user_metadata?.selected_package || 'starter') as PackageTier;

        setProfile({
          usernameEmail: user.email || '',
          businessName: business?.name || '',
          phone: business?.phone || '',
          slug: business?.slug || '',
          notificationEmail: business?.notification_email || user.email || '',
          selectedPackage: userPackage,
          businessHours: business?.business_hours || DEFAULT_HOURS,
          logoUrl: business?.logo_url || '',
          headerImageUrl: business?.header_image_url || '',
          primaryColor: business?.primary_color || '#7e22ce',
          publicTheme: business?.public_theme || 'light', // 👈 Cargar de la base de datos
        });
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        setMessage({ type: 'error', text: 'Error loading profile settings.' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handlers for Operating Hours
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

  // Update Business Details, Branding, Notification Email, Operating Hours & Public Theme
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No active session.');

      const currentSlug = profile.slug || profile.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const { error } = await supabase
        .from('businesses')
        .upsert({
          owner_id: user.id,
          name: profile.businessName,
          phone: profile.phone,
          slug: currentSlug,
          notification_email: profile.notificationEmail,
          package_tier: profile.selectedPackage,
          business_hours: profile.businessHours,
          logo_url: profile.logoUrl || null,
          header_image_url: profile.headerImageUrl || null,
          primary_color: profile.primaryColor,
          public_theme: profile.publicTheme, // 👈 Guardar el tema público
        }, { onConflict: 'owner_id' });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile settings, branding, operating hours, and public theme updated successfully!' });
    } catch (err: any) {
      console.error('Save profile error:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save profile changes.' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Plan Change or Upgrade
  const handlePlanSelect = async (targetPlan: PackageTier) => {
    if (targetPlan === profile.selectedPackage) return;

    if (targetPlan === 'starter') {
      const confirmed = window.confirm(
        'Are you sure you want to cancel your paid plan and revert to the free Starter tier?'
      );
      if (!confirmed) return;

      setUpdatingPlan(true);
      setMessage(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No active user session.');

        const { error } = await supabase
          .from('businesses')
          .update({ package_tier: 'starter' })
          .eq('owner_id', user.id);

        if (error) throw error;

        setProfile((prev) => ({ ...prev, selectedPackage: 'starter' }));
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
    } else {
      const paypalUrl = PAYPAL_URLS[targetPlan];
      window.location.href = paypalUrl;
    }
  };

  // Handle Password Update via Supabase Auth
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-gray-500 font-medium">
          <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8 font-sans">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                Account Management
              </span>
              <h1 className="text-2xl font-bold text-gray-900">Account & Settings</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">Manage your business information, page customization, operating hours, and security.</p>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* SECTION 1: Read-Only Account Identity */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <ShieldAlert className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">Login Identity</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Account Email / Username
            </label>
            <div className="relative">
              <input
                type="email"
                value={profile.usernameEmail}
                disabled
                className="w-full p-3 pl-10 border border-gray-200 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed select-none font-medium"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Your primary login email cannot be changed. To receive booking alerts at a different address, update your Notification Email below.
            </p>
          </div>
        </div>

        {/* SECTION 2: Subscription & Plan Management */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-gray-800">Subscription Plan</h2>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
              Current Plan: {profile.selectedPackage}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Starter Option */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                profile.selectedPackage === 'starter'
                  ? 'border-purple-600 bg-purple-50/40 shadow-sm'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-900">Starter</h3>
                <span className="text-xs font-semibold text-gray-500">$0/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Basic scheduling for 1 user.</p>
              
              {profile.selectedPackage === 'starter' ? (
                <span className="inline-flex items-center text-xs font-semibold text-purple-700">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-purple-600" /> Active Plan
                </span>
              ) : (
                <button
                  type="button"
                  disabled={updatingPlan}
                  onClick={() => handlePlanSelect('starter')}
                  className="w-full text-xs py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5 text-gray-500" />
                  <span>Downgrade</span>
                </button>
              )}
            </div>

            {/* Pro Option */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                profile.selectedPackage === 'pro'
                  ? 'border-purple-600 bg-purple-50/40 shadow-sm'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-900">Pro</h3>
                <span className="text-xs font-semibold text-purple-600">$9.99/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">5 users, custom branding, custom slug.</p>

              {profile.selectedPackage === 'pro' ? (
                <span className="inline-flex items-center text-xs font-semibold text-purple-700">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-purple-600" /> Active Plan
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanSelect('pro')}
                  className="w-full text-xs py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Switch to Pro</span>
                </button>
              )}
            </div>

            {/* Business Option */}
            <div
              className={`p-4 rounded-xl border-2 transition-all ${
                profile.selectedPackage === 'business'
                  ? 'border-purple-600 bg-purple-50/40 shadow-sm'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-gray-900">Business</h3>
                <span className="text-xs font-semibold text-purple-600">$24.99/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Unlimited users & locations.</p>

              {profile.selectedPackage === 'business' ? (
                <span className="inline-flex items-center text-xs font-semibold text-purple-700">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-purple-600" /> Active Plan
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePlanSelect('business')}
                  className="w-full text-xs py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Switch to Business</span>
                </button>
              )}
            </div>
          </div>

          {profile.selectedPackage !== 'starter' && (
            <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-gray-700">Need to stop your subscription?</p>
                <p className="text-xs text-gray-500">
                  Cancelling reverts your account to the free Starter tier immediately.
                </p>
              </div>
              <button
                type="button"
                disabled={updatingPlan}
                onClick={() => handlePlanSelect('starter')}
                className="text-xs px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel Subscription</span>
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Business Details, Branding & Operating Hours */}
        <form onSubmit={handleProfileSave} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Building className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">Business Details & Branding</h2>
          </div>

          <div className="space-y-4">
            {/* Business Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Business Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                  placeholder="e.g. Kimba Imperial Barbershop"
                />
                <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Business Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Public Phone Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                  placeholder="(868) 555-0199"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Notification Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Notification Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={profile.notificationEmail}
                  onChange={(e) => setProfile({ ...profile, notificationEmail: e.target.value })}
                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                  placeholder="alerts@yourdomain.com"
                />
                <Bell className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-xs text-gray-500 mt-1.5">
                New appointment notifications and system updates will be dispatched to this address.
              </p>
            </div>

            {/* BRANDING CUSTOMIZATION SUB-SECTION */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-purple-600" />
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Public Page Custom Branding & Theme
                </label>
              </div>

              {/* 👈 NUEVA OPCIÓN: Selector de Tema para la Página Pública */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
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
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold shadow-sm'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{themeOpt.label}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{themeOpt.desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  This sets the default theme appearance for your clients when they visit your public booking URL.
                </p>
              </div>

              {/* Logo URL */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Logo Image URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={profile.logoUrl}
                    onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                    placeholder="https://example.com/logo.png"
                  />
                  <Sparkles className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Header Image URL */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Header Cover Image URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={profile.headerImageUrl}
                    onChange={(e) => setProfile({ ...profile, headerImageUrl: e.target.value })}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                    placeholder="https://example.com/banner.jpg"
                  />
                  <Image className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                </div>
              </div>

              {/* Brand Primary Color */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Primary Brand Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={profile.primaryColor}
                    onChange={(e) => setProfile({ ...profile, primaryColor: e.target.value })}
                    className="h-10 w-20 cursor-pointer rounded-lg border border-gray-300 p-1 bg-white"
                  />
                  <span className="text-gray-600 font-mono text-sm">{profile.primaryColor}</span>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="border rounded-xl p-4 bg-gray-50 space-y-2 mt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Live Header Preview</span>
                <div className="rounded-xl overflow-hidden border bg-white shadow-sm">
                  <div
                    className="h-28 bg-cover bg-center transition-all"
                    style={{
                      backgroundImage: profile.headerImageUrl ? `url(${profile.headerImageUrl})` : 'none',
                      backgroundColor: profile.primaryColor,
                    }}
                  />
                  <div className="p-4 flex flex-col items-center text-center -mt-10">
                    {profile.logoUrl ? (
                      <img
                        src={profile.logoUrl}
                        alt={profile.businessName}
                        className="w-16 h-16 rounded-full border-4 border-white shadow-md object-cover bg-white"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-full border-4 border-white shadow-md flex items-center justify-center font-bold text-white text-xl"
                        style={{ backgroundColor: profile.primaryColor }}
                      >
                        {profile.businessName.charAt(0) || 'B'}
                      </div>
                    )}
                    <h1 className="text-lg font-extrabold text-gray-900 mt-2">{profile.businessName || 'Your Business Name'}</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Operating Hours Sub-Section */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Business Operating Hours
                </label>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Set standard operating hours for client booking slots. Days marked closed will block public appointments.
              </p>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                {DAYS.map((day) => {
                  const dayConfig = profile.businessHours[day] || { open: '09:00', close: '17:00', closed: false };

                  return (
                    <div
                      key={day}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white border border-gray-200 gap-2 sm:gap-0"
                    >
                      <span className="capitalize font-semibold text-sm text-gray-700 w-28">
                        {day}
                      </span>

                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 cursor-pointer">
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
                              className="p-1.5 border border-gray-300 rounded-lg text-gray-800 font-medium focus:ring-2 focus:ring-purple-500 bg-white"
                            />
                            <span className="text-gray-400 font-medium">to</span>
                            <input
                              type="time"
                              value={dayConfig.close}
                              onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                              className="p-1.5 border border-gray-300 rounded-lg text-gray-800 font-medium focus:ring-2 focus:ring-purple-500 bg-white"
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
            className="w-full sm:w-auto px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: profile.primaryColor }}
          >
            <Save className="w-4 h-4" />
            <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </form>

        {/* SECTION 4: Change Password */}
        <form onSubmit={handlePasswordUpdate} className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-gray-100 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <KeyRound className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-800">Security & Password</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updatingPassword || !passwords.newPassword}
            className="w-full sm:w-auto px-6 py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{updatingPassword ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>

      </div>
    </div>
  );
};