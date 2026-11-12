import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { ServiceManager } from './ServiceManager';
import { LocationManager } from './LocationManager';
import { StaffManager } from './StaffManager';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_start: string;
  booking_end: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  services: {
    name: string;
    duration_minutes: number;
    price: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const [businessId, setBusinessId] = useState<string>('');
  const [businessSlug, setBusinessSlug] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('Loading...');
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'locations' | 'staff'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // 👈 Estado para el tema del administrador (por defecto claro u oscuro según la BD)
  const [isAdminDark, setIsAdminDark] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const shareableUrl = businessSlug ? `${window.location.origin}/book/${businessSlug}` : '';

  // 1. Single initialization for Auth, Business Retrieval & Admin Theme
  useEffect(() => {
    const checkAuthAndFetchBusiness = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        navigate('/login');
        return;
      }

      // 👈 Incluimos admin_theme en la consulta a Supabase
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, admin_theme')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching business record:', error.message);
      }

      if (data) {
        setBusinessId(data.id);
        setBusinessName(data.name);
        setBusinessSlug(data.slug);

        // 👈 Aplicar el tema de administración guardado en la BD (por defecto 'light' si no existe)
        if (data.admin_theme === 'dark') {
          setIsAdminDark(true);
        } else {
          setIsAdminDark(false);
        }
      } else {
        setBusinessName('ByteFix');
      }
    };

    checkAuthAndFetchBusiness();
  }, [navigate]);

  // 👈 Función para cambiar y guardar el tema de administración al salir/hacer clic
  const handleAdminThemeChange = async (newTheme: 'light' | 'dark') => {
    const isDark = newTheme === 'dark';
    setIsAdminDark(isDark);

    if (!businessId) return;

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ admin_theme: newTheme })
        .eq('id', businessId);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving admin theme preference:', err);
    }
  };

  // 2. Fetch Bookings for Business
  const fetchBookings = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({ businessId });
      if (filterDate) params.append('date', filterDate);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`/api/admin/bookings?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, filterDate, filterStatus]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus as Booking['status'] } : b))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleCopy = () => {
    if (!shareableUrl) return;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredBookings = bookings.filter(
    (b) =>
      b.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: Booking['status']) => {
    const styles = isAdminDark
      ? {
          confirmed: 'bg-purple-950/60 text-purple-300 border-purple-800',
          completed: 'bg-green-950/60 text-green-300 border-green-800',
          cancelled: 'bg-red-950/60 text-red-300 border-red-800',
          'no-show': 'bg-slate-800 text-slate-300 border-slate-700',
        }
      : {
          confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
          completed: 'bg-green-100 text-green-800 border-green-200',
          cancelled: 'bg-red-100 text-red-800 border-red-200',
          'no-show': 'bg-gray-100 text-gray-800 border-gray-200',
        };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.confirmed}`}>
        {status ? status.toUpperCase() : 'CONFIRMED'}
      </span>
    );
  };

  return (
    <div className={`min-h-screen p-6 transition-colors ${isAdminDark ? 'bg-slate-950 text-slate-100' : 'bg-gray-100 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Business Branding & Theme Toggle */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-xl shadow-sm border transition-colors ${isAdminDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isAdminDark ? 'text-purple-300 bg-purple-950/70' : 'text-purple-600 bg-purple-50'}`}>
                Business
              </span>
              <h1 className={`text-2xl font-bold ${isAdminDark ? 'text-slate-100' : 'text-gray-900'}`}>{businessName}</h1>
            </div>
            <p className={`text-sm mt-1 ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>Manage appointments, locations, staff, and service offerings</p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* 👈 Selector de tema del administrador */}
            <div className={`flex items-center p-1 rounded-lg border ${isAdminDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
              <button
                onClick={() => handleAdminThemeChange('light')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  !isAdminDark ? 'bg-white text-gray-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => handleAdminThemeChange('dark')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  isAdminDark ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dark
              </button>
            </div>

            <button
              onClick={fetchBookings}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Shareable Link Bar */}
        <div className={`border p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${isAdminDark ? 'bg-purple-950/30 border-purple-800/60' : 'bg-purple-50 border-purple-200'}`}>
          <div>
            <h3 className={`text-sm font-semibold ${isAdminDark ? 'text-purple-200' : 'text-purple-900'}`}>Customer Shareable Booking Link</h3>
            <p className={`text-xs ${isAdminDark ? 'text-purple-300' : 'text-purple-700'}`}>{shareableUrl || 'Generating booking URL...'}</p>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`flex border-b space-x-6 px-6 pt-3 rounded-t-xl shadow-sm overflow-x-auto transition-colors ${isAdminDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'bookings'
                ? isAdminDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'
                : isAdminDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Appointments List
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'services'
                ? isAdminDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'
                : isAdminDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Services
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'locations'
                ? isAdminDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'
                : isAdminDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Locations
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'staff'
                ? isAdminDark ? 'border-purple-500 text-purple-400' : 'border-purple-600 text-purple-600'
                : isAdminDark ? 'border-transparent text-slate-400 hover:text-slate-200' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Staff
          </button>
        </div>

        {/* Dynamic Tab Content Views */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl shadow-sm border transition-colors ${isAdminDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${isAdminDark ? 'text-slate-400' : 'text-gray-600'}`}>Filter by Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className={`w-full p-2.5 border rounded-lg text-sm ${isAdminDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${isAdminDark ? 'text-slate-400' : 'text-gray-600'}`}>Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`w-full p-2.5 border rounded-lg text-sm ${isAdminDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-Show</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase mb-1 ${isAdminDark ? 'text-slate-400' : 'text-gray-600'}`}>Search Customer</label>
                <input
                  type="text"
                  placeholder="Name or Email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full p-2.5 border rounded-lg text-sm ${isAdminDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
            </div>

            {/* Bookings Table */}
            <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors ${isAdminDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
              {loading ? (
                <div className="p-8 space-y-4 animate-pulse">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`flex justify-between items-center py-4 border-b last:border-0 ${isAdminDark ? 'border-slate-800' : 'border-gray-100'}`}>
                      <div className="space-y-2 w-1/4">
                        <div className={`h-4 rounded w-3/4 ${isAdminDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
                        <div className={`h-3 rounded w-1/2 ${isAdminDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
                      </div>
                      <div className={`h-4 rounded w-1/5 ${isAdminDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
                      <div className={`h-4 rounded w-1/6 ${isAdminDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
                      <div className={`h-6 rounded-full w-16 ${isAdminDark ? 'bg-slate-800' : 'bg-gray-200'}`}></div>
                    </div>
                  ))}
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className={`p-8 text-center ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>No bookings found for the selected criteria.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isAdminDark ? 'bg-slate-800/60 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Service</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-sm ${isAdminDark ? 'divide-slate-800' : 'divide-gray-200'}`}>
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className={`transition-colors ${isAdminDark ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}`}>
                          <td className="p-4">
                            <div className={`font-semibold ${isAdminDark ? 'text-slate-100' : 'text-gray-900'}`}>{b.customer_name}</div>
                            <div className={`text-xs ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>{b.customer_email}</div>
                            <div className={`text-xs ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>{b.customer_phone}</div>
                          </td>
                          <td className="p-4">
                            <div className={`font-medium ${isAdminDark ? 'text-slate-200' : 'text-gray-800'}`}>{b.services?.name || 'Service'}</div>
                            <div className={`text-xs ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              ${b.services?.price} ({b.services?.duration_minutes} mins)
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`font-medium ${isAdminDark ? 'text-slate-100' : 'text-gray-900'}`}>
                              {new Date(b.booking_start).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className={`text-xs ${isAdminDark ? 'text-slate-400' : 'text-gray-500'}`}>
                              {new Date(b.booking_start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </td>
                          <td className="p-4">{getStatusBadge(b.status)}</td>
                          <td className="p-4 text-right">
                            <select
                              value={b.status || 'confirmed'}
                              onChange={(e) => handleStatusChange(b.id, e.target.value)}
                              className={`p-1.5 text-xs border rounded-md shadow-sm font-medium ${isAdminDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-gray-300 text-gray-800'}`}
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="no-show">No-Show</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'services' && <ServiceManager />}
        {activeTab === 'locations' && <LocationManager />}
        {activeTab === 'staff' && <StaffManager />}
      </div>
    </div>
  );
};