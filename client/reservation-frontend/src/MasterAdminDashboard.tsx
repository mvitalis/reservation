import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { UserManagement } from './UserManagement';
import { GlobalSystemLogs } from './GlobalSystemLogs';
import { PlatformSettings } from './PlatformSettings';
import { ThemeToggle } from './ThemeToggle';

interface PlatformStats {
  totalBusinesses: number;
  totalServices: number;
  totalUsers: number;
  totalRevenue: number;
  activeBookings: number;
  dbRemainingMB: number | string;
}

interface BusinessRecord {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

type TabType = 'overview' | 'users' | 'logs' | 'settings';

export const MasterAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<PlatformStats>({
    totalBusinesses: 0,
    totalServices: 0,
    totalUsers: 0,
    totalRevenue: 0,
    activeBookings: 0,
    dbRemainingMB: 'Checking...',
  });
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Modal / Editing State
  const [editingBusiness, setEditingBusiness] = useState<BusinessRecord | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [
        bizRes,
        svcRes,
        userRes,
        activeBookingsRes,
        revenueRes,
        dbSizeRes,
        bizListRes
      ] = await Promise.all([
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'pending']),
        supabase.from('bookings').select('amount').eq('status', 'completed'),
        supabase.rpc('get_db_remaining_mb'),
        supabase.from('businesses').select('id, name, created_at, owner_id').order('created_at', { ascending: false }),
      ]);

      const calculatedRevenue = (revenueRes.data || []).reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      );

      setStats({
        totalBusinesses: bizRes.count || 0,
        totalServices: svcRes.count || 0,
        totalUsers: userRes.count || 0,
        activeBookings: activeBookingsRes.count || 0,
        totalRevenue: calculatedRevenue,
        dbRemainingMB: dbSizeRes.data !== null && dbSizeRes.data !== undefined ? `${dbSizeRes.data} MB` : 'N/A',
      });

      setBusinesses(bizListRes.data || []);
    } catch (err) {
      console.error('Error loading master dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login', { replace: true });
    } catch (err: any) {
      console.error('Error logging out:', err.message);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm('Are you sure you want to remove this tenant? This will delete all associated data.')) return;

    try {
      const { error } = await supabase.from('businesses').delete().eq('id', id);
      if (error) throw error;

      setBusinesses((prev) => prev.filter((b) => b.id !== id));
      setStats((prev) => ({ ...prev, totalBusinesses: Math.max(0, prev.totalBusinesses - 1) }));
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete business');
    }
  };

  const handleOpenEdit = (biz: BusinessRecord) => {
    setEditingBusiness(biz);
    setEditName(biz.name || '');
  };

  const handleSaveEdit = async () => {
    if (!editingBusiness) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ name: editName })
        .eq('id', editingBusiness.id);

      if (error) throw error;

      setBusinesses((prev) =>
        prev.map((b) => (b.id === editingBusiness.id ? { ...b, name: editName } : b))
      );
      setEditingBusiness(null);
    } catch (err: any) {
      console.error('Update error:', err);
      alert(err.message || 'Failed to update business');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter & Sort businesses
  const filteredBusinesses = businesses
    .filter((biz) => {
      const q = searchTerm.toLowerCase();
      return (
        biz.name?.toLowerCase().includes(q) ||
        biz.id?.toLowerCase().includes(q) ||
        biz.owner_id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header Navigation with Responsive Hamburger */}
      <nav className="bg-purple-900 dark:bg-purple-950 text-white p-3 shadow-sm relative z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center text-sm">
          <span className="font-bold tracking-wide">Reservation Manager Pro</span>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-800 text-white font-semibold'
                  : 'text-purple-100 hover:bg-purple-800'
              }`}
            >
              Overview & Business Directory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-purple-800 text-white font-semibold'
                  : 'text-purple-100 hover:bg-purple-800'
              }`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-purple-800 text-white font-semibold'
                  : 'text-purple-100 hover:bg-purple-800'
              }`}
            >
              System Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-purple-800 text-white font-semibold'
                  : 'text-purple-100 hover:bg-purple-800'
              }`}
            >
              Settings
            </button>

            <ThemeToggle />
           
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 px-3 py-1 rounded bg-purple-950 text-purple-200 hover:text-white hover:bg-red-700 transition-colors font-medium focus:outline-none cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Hamburger Button & Theme Toggle */}
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

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-purple-800 flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-purple-800 font-semibold' : 'hover:bg-purple-800'
              }`}
            >
              Overview & Business Directory
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded transition-colors cursor-pointer ${
                activeTab === 'users' ? 'bg-purple-800 font-semibold' : 'hover:bg-purple-800'
              }`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('logs'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded transition-colors cursor-pointer ${
                activeTab === 'logs' ? 'bg-purple-800 font-semibold' : 'hover:bg-purple-800'
              }`}
            >
              System Logs
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded transition-colors cursor-pointer ${
                activeTab === 'settings' ? 'bg-purple-800 font-semibold' : 'hover:bg-purple-800'
              }`}
            >
              Settings
            </button>
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

      {/* Main Content Area */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Dashboard Title & Refresh Action */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-full">
                  Super Admin
                </span>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">System Master Admin</h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Platform-wide overview and multi-tenant management</p>
            </div>
            <div>
              <button
                type="button"
                onClick={fetchMasterData}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Primary Dashboard View (Metrics + Directory Combined) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Businesses</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{stats.totalBusinesses}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Services</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{stats.totalServices}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered Users</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{stats.totalUsers}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                    ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Bookings</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{stats.activeBookings}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">DB Space Remaining</p>
                  <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{stats.dbRemainingMB}</p>
                </div>
              </div>

              {/* Business Directory */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Registered Businesses</h3>
                  
                  {/* Search and Sort Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Search by name, ID, or owner..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-slate-400"
                    />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="newest">Sort: Newest First</option>
                      <option value="oldest">Sort: Oldest First</option>
                      <option value="name">Sort: Business Name</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading master records...</div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400">No matching businesses found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                          <th className="p-4">Name</th>
                          <th className="p-4">Business ID</th>
                          <th className="p-4">Owner ID</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                        {filteredBusinesses.map((biz) => (
                          <tr key={biz.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="p-4 font-semibold text-slate-900 dark:text-slate-100">{biz.name || 'Unnamed Business'}</td>
                            <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{biz.id}</td>
                            <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{biz.owner_id}</td>
                            <td className="p-4 text-slate-600 dark:text-slate-300">
                              {biz.created_at ? new Date(biz.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(biz)}
                                className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBusiness(biz.id)}
                                className="px-3 py-1 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
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

          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'logs' && <GlobalSystemLogs />}
          {activeTab === 'settings' && <PlatformSettings />}
        </div>
      </div>

      {/* Edit Business Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Business Information</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBusiness(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminDashboard;