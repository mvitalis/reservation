import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId as PackageTier } from './plans';

export function buildSlugWithRandom(businessName?: string | null, nameChars = 16): string {
  const cleaned = (businessName ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const basePart = (cleaned || 'biz').slice(0, nameChars).replace(/-+$/g, '') || 'biz';
  const randomPart = Math.random().toString(36).substring(2, 8);

  return `${basePart}-${randomPart}`;
}

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Capturar errores o cancelaciones devueltos por OAuth (Google / Facebook) en la URL
  useEffect(() => {
    const oauthError = searchParams.get('error');
    const oauthErrorDesc = searchParams.get('error_description');

    if (oauthError || oauthErrorDesc) {
      if (oauthError === 'access_denied') {
        setErrorMsg('Inicio de sesión cancelado. Puedes intentarlo de nuevo cuando quieras.');
      } else {
        setErrorMsg(
          decodeURIComponent((oauthErrorDesc || oauthError || '').replace(/\+/g, ' '))
        );
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('error');
      nextParams.delete('error_code');
      nextParams.delete('error_description');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Detectar sesión activa (incluido el retorno desde Google / Facebook) y redirigir al panel
  useEffect(() => {
    let isMounted = true;

    const redirectAuthenticatedUser = async (userId: string) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile role:', profileError);
        }

        if (!isMounted) return;

        if (profile?.role === 'super_admin') {
          navigate('/super-admin', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      } catch {
        if (isMounted) {
          navigate('/admin', { replace: true });
        }
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        redirectAuthenticatedUser(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        redirectAuthenticatedUser(session.user.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const activePkg = PLANS[selectedPackage] || PLANS['pro'];
  const packageList = Object.values(PLANS);

  // Slug estable para el nombre de negocio actual (no cambia en cada render)
  const generatedSlug = useMemo(() => buildSlugWithRandom(businessName), [businessName]);

  const getOriginUrl = () => {
    const envUrl = import.meta.env.VITE_BASE_URL;
    if (envUrl && /^https?:\/\//i.test(envUrl)) {
      return envUrl.replace(/\/+$/, '');
    }
    return window.location.origin.replace(/\/+$/, '');
  };

  const registerUserViaApi = async () => {
    const { maxServices, allowCustomSlug, allowSmsReminders, allowMultipleLocations } = activePkg.limits;
    const originUrl = getOriginUrl();

    const response = await fetch('/api/sendVerification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        redirectTo: `${originUrl}/admin`,
        userMetadata: {
          full_name: fullName,
          package_tier: selectedPackage,
          business_name: businessName,
          slug: allowCustomSlug ? generatedSlug : null,
          max_services: maxServices,
          allow_custom_slug: allowCustomSlug,
          allow_sms_reminders: allowSmsReminders,
          allow_multiple_locations: allowMultipleLocations,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'No se pudo completar el registro.');
    }

    return result;
  };

  const handleSignInOrFreeSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await registerUserViaApi();

        setSuccessMsg(
          `¡Cuenta creada! Hemos enviado un correo de verificación a ${email}. Por favor, revisa tu bandeja de entrada (o spam) y haz clic en el enlace para activar tu cuenta.`
        );
        setIsSignUp(false);
        setPassword('');
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
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile role:', profileError);
          }

          if (profile?.role === 'super_admin') {
            navigate('/super-admin', { replace: true });
          } else {
            navigate('/admin', { replace: true });
          }
        }
      }
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada y haz clic en el enlace de verificación.');
      } else {
        setErrorMsg(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para autenticación con Google o Facebook
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const originUrl = getOriginUrl();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${originUrl}/admin`,
          ...(provider === 'facebook' ? { scopes: 'email,public_profile' } : {}),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `Error connecting with ${provider}`);
    }
  };

  return (
    <div className="light-theme w-full min-h-screen overflow-x-hidden bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-900">
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
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-800 text-sm rounded font-medium">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {errorMsg}
            </div>
          )}

          {/* Botones de Redes Sociales (Google & Facebook) */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-md bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continuar con Google
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-transparent rounded-md bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166fe5] transition-colors cursor-pointer shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
            </button>
          </div>

          <div className="flex items-center my-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase font-semibold">O con correo electrónico</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

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
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 !bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
                placeholder="you@example.com"
                style={{ 
                  WebkitBoxShadow: '0 0 0 30px white inset',
                  WebkitTextFillColor: '#0f172a',
                  color: '#0f172a'
                }}
              />
              <style>{`
                #email::placeholder {
                  color: #94a3b8 !important;
                  -webkit-text-fill-color: #94a3b8 !important;
                  opacity: 1;
                }
              `}</style>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 !bg-white text-slate-900 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
                placeholder="••••••••"
                style={{ 
                  WebkitBoxShadow: '0 0 0 30px white inset',
                  WebkitTextFillColor: '#0f172a',
                  color: '#0f172a'
                }}
              />
              <style>{`
                #password::placeholder {
                  color: #94a3b8 !important;
                  -webkit-text-fill-color: #94a3b8 !important;
                  opacity: 1;
                }
              `}</style>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (isSignUp && (!email || !password || !fullName || !businessName))}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading
                  ? 'Processing...'
                  : !isSignUp
                  ? 'Sign In'
                  : `Create ${activePkg.name} Account`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;