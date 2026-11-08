import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId as PackageTier } from './plans';

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageTier>('pro');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Force Light Theme Class on Document Element during mount
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.remove('dark');

    return () => {
      if (hadDark) root.classList.add('dark');
    };
  }, []);

  // Direct key lookup since PLANS is a Record<PlanId, PlanConfig>
  const activePkg = PLANS[selectedPackage] || PLANS['pro'];
  const packageList = Object.values(PLANS); // Convert object values to an array for rendering

  const generatedSlug = businessName
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const registerUserInSupabase = async (paidDetails?: any) => {
    const { maxServices, allowCustomSlug, allowSmsReminders, allowMultipleLocations } = activePkg.limits;

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          package_tier: selectedPackage,
          business_name: businessName,
          slug: allowCustomSlug ? generatedSlug : null,
          paypal_order_id: paidDetails?.id || null,
          max_services: maxServices,
          allow_custom_slug: allowCustomSlug,
          allow_sms_reminders: allowSmsReminders,
          allow_multiple_locations: allowMultipleLocations,
        },
      },
    });

    if (authError) {
      throw new Error(`Supabase Auth: ${authError.message}`);
    }

    return data;
  };

  const handleSignInOrFreeSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await registerUserInSupabase();
        alert('Account created successfully! Redirecting...');
        navigate('/login');
      } else {
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile role:', profileError);
          }

          if (profile?.role === 'super_admin') {
            navigate('/super-admin');
          } else {
            navigate('/admin');
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: 'BAA1egOcwl_6giFBDt96jkkPIHeork6b_VIxvdibRlLEiuLwwaWz5Q4C-qmadXpgrYLhnHX3_hsdp8EN6w',
        currency: 'USD',
        intent: 'subscription',
        vault: true,
        'data-namespace': 'paypal_checkout_sdk',
      }}
    >
      <div className="light-theme min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
          <h2 className="text-center text-3xl font-extrabold text-slate-900">
            {isSignUp ? 'Create your business account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {isSignUp ? 'Already have an account? ' : "Don't have an account yet? "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="font-medium text-purple-600 hover:text-purple-500 underline focus:outline-none cursor-pointer"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-3xl">
          <div className="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-10 border border-slate-200">
            {successMsg && (
              <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm rounded">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignInOrFreeSignUp} className="space-y-6">
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Select Your Plan
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {packageList.map((pkg) => {
                        const isSelected = selectedPackage === pkg.id;
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg.id as PackageTier)}
                            className={`cursor-pointer border-2 rounded-xl p-4 transition-all duration-150 relative ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-900">{pkg.name}</h3>
                              <span className="text-sm font-semibold text-purple-600">
                                {pkg.price}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{pkg.description}</p>
                            <ul className="mt-3 space-y-1">
                              {pkg.features.map((feat, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-slate-600 flex items-center gap-1"
                                >
                                  <span className="text-purple-600 font-bold">•</span> {feat}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm placeholder-slate-400"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">Business Name</label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm placeholder-slate-400"
                        placeholder="ByteFix Repairs"
                      />
                    </div>
                  </div>

                  {businessName && (
                    <div className="bg-slate-100 p-3 rounded-md text-xs text-slate-600 border border-slate-200">
                      <span className="font-semibold text-slate-700">Booking URL preview: </span>
                      {activePkg.limits.allowCustomSlug ? (
                        <span className="font-mono text-purple-700">
                          yourdomain.com/book/{generatedSlug || 'your-business'}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500 italic">
                          yourdomain.com/book/user-id (Custom URL requires Pro or Business)
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
                <input 
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm placeholder-slate-400"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>

              {isSignUp && selectedPackage !== 'starter' ? (
                <div className="mt-4 pt-2 space-y-4">
                  <p className="text-xs text-slate-500 text-center">
                    Pay via PayPal to complete subscription, or skip payment to test registration:
                  </p>

                  <PayPalButtons
                    key={`paypal-sub-${selectedPackage}`}
                    forceReRender={[activePkg.id]}
                    style={{ layout: 'vertical', color: 'gold', shape: 'rect' }}
                    disabled={!email || !password || !fullName || !businessName}
                    createSubscription={(_data, actions) => {
                      if (!activePkg.paypalPlanId) {
                        throw new Error('No PayPal Plan ID configured for this package.');
                      }
                      return actions.subscription.create({
                        plan_id: activePkg.paypalPlanId,
                      });
                    }}
                    onApprove={async (data) => {
                      try {
                        await registerUserInSupabase({ id: data.subscriptionID });
                        alert('Subscription active! Account created.');
                        navigate('/login');
                      } catch (err: any) {
                        console.error('Registration Error:', err);
                        setErrorMsg(`Registration failed: ${err.message || 'Payment processing error.'}`);
                      }
                    }}
                    onError={(err) => {
                      console.error('PayPal Error:', err);
                      setErrorMsg('PayPal Subscription checkout failed. Please try again.');
                    }}
                  />

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-semibold">Or</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email || !password || !fullName || !businessName}
                    className="w-full flex justify-center py-2.5 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {loading ? 'Creating Account...' : `Create ${activePkg.name} Account (Skip Payment)`}
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {loading
                      ? 'Processing...'
                      : !isSignUp
                      ? 'Sign In'
                      : 'Create Free Account'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default ClientLogin;