import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { AdminDashboard } from './AdminDashboard';
import { PublicBookingView } from './PublicBookingView';
import { ClientLogin } from './ClientLogin';
import { SetupBusiness } from './SetupBusiness';
import { ProfilePage } from './ProfilePage';
import AnalyticsPage from './analytics';
import { supabase } from './supabaseClient';
import { MasterAdminDashboard } from './MasterAdminDashboard';
import { AdminGuard } from './AdminGuard';
import { ThemeToggle } from './ThemeToggle';
import { useInactivityTimeout } from './useInactivityTimeout';
import { InactivityModal } from './InactivityModal';

const PAYPAL_CLIENT_ID = 'BAA1egOcwl_6giFBDt96jkkPIHeork6b_VIxvdibRlLEiuLwwaWz5Q4C-qmadXpgrYLhnHX3_hsdp8EN6w';

// Wrapper interno para la vista previa desde el panel de administración
function CustomerPreviewWrapper() {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const resolveBusinessForPreview = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // 1. Buscar negocio donde id coincida con user.id
          const { data: directBusiness } = await supabase
            .from('businesses')
            .select('id, slug')
            .eq('id', user.id)
            .maybeSingle();

          if (directBusiness) {
            if (isMounted) {
              setPreviewSlug(directBusiness.slug || null);
              setPreviewId(directBusiness.id);
              setResolved(true);
            }
            return;
          }

          // 2. Respaldo desde profiles o user_metadata usando slug
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, slug')
            .eq('id', user.id)
            .maybeSingle();

          const candidateSlug =
            profile?.slug ||
            (typeof user.user_metadata?.slug === 'string' ? user.user_metadata.slug : null);

          if (candidateSlug) {
            const { data: businessBySlug } = await supabase
              .from('businesses')
              .select('id, slug')
              .eq('slug', candidateSlug)
              .maybeSingle();

            if (businessBySlug) {
              if (isMounted) {
                setPreviewSlug(businessBySlug.slug || candidateSlug);
                setPreviewId(businessBySlug.id);
                setResolved(true);
              }
              return;
            }
          }

          // 3. Respaldo con el id del perfil/usuario si no se encontró por slug directo
          if (profile) {
            if (isMounted) {
              setPreviewSlug(profile.slug || null);
              setPreviewId(profile.id || user.id);
              setResolved(true);
            }
            return;
          }
        }

        // 4. Respaldo general: primer negocio disponible en la tabla businesses
        const { data: fallbackBusiness } = await supabase
          .from('businesses')
          .select('id, slug')
          .limit(1)
          .maybeSingle();

        if (isMounted && fallbackBusiness) {
          setPreviewSlug(fallbackBusiness.slug || null);
          setPreviewId(fallbackBusiness.id || null);
        }
      } catch (err) {
        console.error('Error resolving customer preview business:', err);
      } finally {
        if (isMounted) {
          setResolved(true);
        }
      }
    };

    resolveBusinessForPreview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!resolved) {
    return (
      <div className="w-full p-8 text-center text-sm text-gray-500 dark:text-slate-400">
        Loading customer preview...
      </div>
    );
  }

  return (
    <PublicBookingView
      key={`${previewSlug || ''}-${previewId || ''}`}
      fallbackSlug={previewSlug}
      fallbackId={previewId}
    />
  );
}

// Internal admin navigation wrapper with mobile hamburger menu & inactivity protection
function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Protección por inactividad: 15 minutos totales, alerta los últimos 2 minutos
  const { showWarning, remainingSeconds, resetTimer } = useInactivityTimeout(15, 2);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Error logging out:', err.message);
    }
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <nav className="w-full bg-purple-900 text-white p-3 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <span className="font-bold tracking-wide">Reservation Manager Pro</span>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              to="/demo-booking"
              className="px-3 py-1 rounded transition-colors hover:bg-purple-800"
            >
              Customer Preview
            </Link>
            <Link
              to="/admin"
              className="px-3 py-1 rounded transition-colors hover:bg-purple-800"
            >
              Admin Dashboard
            </Link>
            <Link
              to="/admin/analytics"
              className="px-3 py-1 rounded transition-colors hover:bg-purple-800 flex items-center gap-1"
            >
              Analytics
            </Link>
            <Link
              to="/profile"
              className="px-3 py-1 rounded transition-colors hover:bg-purple-800"
            >
              Profile
            </Link>

            <ThemeToggle />

            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 px-3 py-1 rounded bg-purple-950 text-purple-200 hover:text-white hover:bg-red-700 transition-colors font-medium focus:outline-none cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Hamburger & Theme Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded bg-purple-800 text-white focus:outline-none cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Links */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-purple-800 flex flex-col space-y-2">
            <Link
              to="/demo-booking"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded hover:bg-purple-800 transition-colors"
            >
              Customer Preview
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded hover:bg-purple-800 transition-colors"
            >
              Admin Dashboard
            </Link>
            <Link
              to="/admin/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded hover:bg-purple-800 transition-colors"
            >
              Analytics
            </Link>
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded hover:bg-purple-800 transition-colors"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-left px-3 py-2 rounded bg-red-700/60 hover:bg-red-700 text-white font-medium transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>

      <main className="w-full">{children}</main>

      {/* Modal flotante de advertencia por inactividad */}
      <InactivityModal
        show={showWarning}
        remainingSeconds={remainingSeconds}
        onStayConnected={resetTimer}
      />
    </div>
  );
}

function App() {
  return (
    <PayPalScriptProvider options={{ 'clientId': PAYPAL_CLIENT_ID, vault: true, intent: 'subscription' }}>
      <BrowserRouter>
        <Routes>
          {/* AUTHENTICATION & ONBOARDING */}
          <Route path="/login" element={<ClientLogin />} />
          <Route path="/setup-business" element={<SetupBusiness />} />

          {/* PUBLIC CUSTOMER ROUTES */}
          <Route path="/book/:slug" element={<PublicBookingView />} />
          <Route path="/book-id/:id" element={<PublicBookingView />} />

          {/* MASTER ADMIN ROUTE */}
          <Route
            path="/super-admin"
            element={
              <AdminGuard>
                <MasterAdminDashboard />
              </AdminGuard>
            }
          />

          {/* INTERNAL ADMIN ROUTES */}
          <Route
            path="/admin"
            element={
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            }
          />

          <Route
            path="/admin/analytics"
            element={
              <AdminLayout>
                <AnalyticsPage />
              </AdminLayout>
            }
          />

          <Route
            path="/demo-booking"
            element={
              <AdminLayout>
                <CustomerPreviewWrapper />
              </AdminLayout>
            }
          />

          <Route
            path="/profile"
            element={
              <AdminLayout>
                <ProfilePage />
              </AdminLayout>
            }
          />

          {/* FALLBACK REDIRECTS */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </PayPalScriptProvider>
  );
}

export default App;