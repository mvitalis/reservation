import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId } from './plans';

interface Location {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  business_id: string;
  location_id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  locations?: {
    name: string;
  };
}

export const StaffManager: React.FC = () => {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tier Enforcement States
  const [currentPlan, setCurrentPlan] = useState<PlanId>('starter');
  const [allowMultipleLocations, setAllowMultipleLocations] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    locationId: '',
  });

  // 1. Resolve User Business, Package Tier & Fetch Active Locations
  useEffect(() => {
    const fetchBusinessAndTier = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('User not authenticated:', authError);
          setErrorMessage('User not authenticated. Please log in again.');
          setLoading(false);
          return;
        }

        const { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('id, package_tier')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (bizError) throw bizError;

        if (business) {
          setBusinessId(business.id);
          const resolvedTier = (
            business.package_tier ||
            user.user_metadata?.package_tier ||
            user.user_metadata?.selected_package ||
            'starter'
          ).toLowerCase() as PlanId;

          setCurrentPlan(resolvedTier);
          const planConfig = PLANS[resolvedTier] || PLANS['starter'];
          setAllowMultipleLocations(planConfig.limits.allowMultipleLocations ?? false);

          // Fetch active locations for branch assignment
          const { data: locData, error: locError } = await supabase
            .from('locations')
            .select('id, name')
            .eq('business_id', business.id)
            .eq('is_active', true);

          if (locError) throw locError;
          setLocations(locData || []);

          if (locData && locData.length > 0) {
            setFormData((prev) => ({ ...prev, locationId: locData[0].id }));
          }
        } else {
          setErrorMessage('No business profile found for this user.');
        }
      } catch (err: any) {
        console.error('Error loading business & location details:', err);
        setErrorMessage(err.message || 'Failed to load business details.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessAndTier();
  }, []);

  // 2. Fetch Staff Members once businessId is resolved
  const fetchStaff = useCallback(async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*, locations(name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStaff(data || []);
    } catch (err: any) {
      console.error('Failed to fetch staff members:', err);
      setErrorMessage(err.message || 'Failed to load staff members.');
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchStaff();
    }
  }, [businessId, fetchStaff]);

  const handleCancel = () => {
    setEditingId(null);
    setErrorMessage(null);
    setFormData({
      name: '',
      email: '',
      locationId: locations.length > 0 ? locations[0].id : '',
    });
  };

  const handleEditClick = (member: StaffMember) => {
    setEditingId(member.id);
    setErrorMessage(null);
    setFormData({
      name: member.name,
      email: member.email || '',
      locationId: member.location_id,
    });
  };

  // Create or Update Staff Member
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validación estricta para evitar inserciones con RLS violado por falta de ID
    if (!businessId) {
      setErrorMessage('Unable to save staff member: Business ID is still loading. Please wait.');
      return;
    }

    if (!formData.locationId) {
      setErrorMessage('Please select a branch location for this staff member.');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        // Update Existing Staff Member
        const { error } = await supabase
          .from('staff')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase() || null,
            location_id: formData.locationId,
          })
          .eq('id', editingId)
          .eq('business_id', businessId);

        if (error) throw error;
      } else {
        // Create New Staff Member asegurando el business_id
        const { error } = await supabase.from('staff').insert([
          {
            business_id: businessId,
            location_id: formData.locationId,
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase() || null,
            is_active: true,
          },
        ]);

        if (error) throw error;
      }

      await fetchStaff();
      handleCancel();
    } catch (err: any) {
      console.error('Error saving staff member:', err);
      setErrorMessage(err.message || 'Failed to save staff member.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    if (!businessId) return;
    try {
      const { error } = await supabase
        .from('staff')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !currentStatus } : s))
      );
    } catch (err: any) {
      console.error('Error toggling staff status:', err);
      setErrorMessage(err.message);
    }
  };

  // Delete Staff Member
  const handleDelete = async (id: string) => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      setStaff((prev) => prev.filter((s) => s.id !== id));
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Delete staff error:', err);
      setErrorMessage(err.message || 'Failed to delete staff member.');
    }
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assign team members to location branches for customer scheduling
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
          {PLANS[currentPlan]?.name || 'Starter'} Plan
        </span>
      </div>

      {/* Form Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">
          {editingId ? 'Edit Staff Member' : 'Add New Staff Member'}
        </h3>

        {errorMessage && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/60 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="p-4 text-sm text-slate-500 animate-pulse">Loading configuration...</div>
        ) : locations.length === 0 ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg">
            Please configure at least one active branch location in <strong>Location Management</strong> before adding staff members.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                disabled={!businessId || saving}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 disabled:opacity-50"
                placeholder="e.g. Alex Morgan"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled={!businessId || saving}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 disabled:opacity-50"
                placeholder="alex@example.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Assigned Branch Location
              </label>
              <select
                required
                disabled={!businessId || saving}
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              >
                <option value="">-- Select Branch --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3 mt-2">
              <button
                type="submit"
                disabled={!businessId || saving}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {saving ? 'Saving...' : editingId ? 'Update Staff Member' : 'Add Staff Member'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Staff List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold p-6 border-b border-slate-200 dark:border-slate-700">
          Active Team Members ({staff.length})
        </h3>

        {loading ? (
          <div className="p-6 text-center text-slate-500 animate-pulse">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No staff members added yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {staff.map((member) => (
              <div
                key={member.id}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {member.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        member.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    📍 {member.locations?.name || 'Unassigned Branch'}
                  </p>
                  {member.email && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">✉️ {member.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(member.id, member.is_active)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold cursor-pointer"
                  >
                    {member.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditClick(member)}
                    className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(member.id)}
                    className="px-3 py-1 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};