import React, { useState } from 'react';
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

const PAYPAL_CLIENT_ID = 'BAA1egOcwl_6giFBDt96jkkPIHeork6b_VIxvdibRlLEiuLwwaWz5Q4C-qmadXpgrYLhnHX3_hsdp8EN6w';

// Internal admin navigation wrapper with mobile hamburger menu
function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <nav className="bg-purple-900 text-white p-3 shadow-sm relative z-50">
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
      <main>{children}</main>
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
          
          {/* PUBLIC CUSTOMER ROUTE */}
          <Route path="/book/:slug" element={<PublicBookingView />} />

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
                <PublicBookingView />
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