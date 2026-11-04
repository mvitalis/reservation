import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId } from './plans';

interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
}

export const LocationManager: React.FC = () => {
  const [businessId, setBusinessId] = useState<string | null>(null);
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
    address: '',
    phone: '',
  });

  // 1. Resolve User Business & Package Tier
  useEffect(() => {
    const fetchBusinessAndTier = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('User not authenticated:', authError);
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
        }
      } catch (err) {
        console.error('Error loading business location details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessAndTier();
  }, []);

  // 2. Fetch Locations once businessId is resolved
  const fetchLocations = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (err: any) {
      console.error('Failed to fetch locations:', err);
      setErrorMessage(err.message || 'Failed to load locations.');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchLocations();
    }
  }, [businessId, fetchLocations]);

  // Handle Form Input Reset
  const handleCancel = () => {
    setEditingId(null);
    setErrorMessage(null);
    setFormData({ name: '', address: '', phone: '' });
  };

  const handleEditClick = (loc: Location) => {
    setEditingId(loc.id);
    setErrorMessage(null);
    setFormData({
      name: loc.name,
      address: loc.address || '',
      phone: loc.phone || '',
    });
  };

  // Create or Update Location
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!businessId) {
      setErrorMessage('Unable to save location: Missing Business ID.');
      return;
    }

    // 🔒 Business Tier Guard Check
    if (!editingId && locations.length >= 1 && !allowMultipleLocations) {
      setErrorMessage(
        `Your current plan (${PLANS[currentPlan]?.name || 'Starter'}) is limited to 1 location. Upgrade to the Business Plan to manage multiple branches.`
      );
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        // Update Existing Location
        const { error } = await supabase
          .from('locations')
          .update({
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            phone: formData.phone.trim() || null,
          })
          .eq('id', editingId)
          .eq('business_id', businessId);

        if (error) throw error;
      } else {
        // Create New Location
        const { error } = await supabase.from('locations').insert([
          {
            business_id: businessId,
            name: formData.name.trim(),
            address: formData.address.trim() || null,
            phone: formData.phone.trim() || null,
            is_active: true,
          },
        ]);

        if (error) throw error;
      }

      fetchLocations();
      handleCancel();
    } catch (err: any) {
      console.error('Error saving location:', err);
      setErrorMessage(err.message || 'Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !currentStatus })
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, is_active: !currentStatus } : loc))
      );
    } catch (err: any) {
      console.error('Error toggling location status:', err);
    }
  };

  // Delete Location
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location? Associated bookings will unassign this branch.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id)
        .eq('business_id', businessId);

      if (error) throw error;

      setLocations((prev) => prev.filter((loc) => loc.id !== id));
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Delete location error:', err);
      setErrorMessage(err.message || 'Failed to delete location.');
    }
  };

  return (
    <div className="p-6 space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Location Management</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure physical or virtual branches for customer bookings
          </p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${
            allowMultipleLocations
              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
          }`}
        >
          {allowMultipleLocations ? 'Multi-Location Enabled (Business Plan)' : 'Single Location Limit'}
        </span>
      </div>

      {/* Upgrade Banner for Restricted Accounts */}
      {!allowMultipleLocations && locations.length >= 1 && (
        <div className="p-4 bg-gradient-to-r from-purple-900 to-slate-900 text-white rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-bold text-sm">Need more branches?</h4>
            <p className="text-xs text-purple-200 mt-0.5">
              Multi-location management is exclusive to the Business Plan tier.
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Form Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold mb-4">
          {editingId ? 'Edit Branch Location' : 'Add New Branch Location'}
        </h3>

        {errorMessage && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 dark:bg-red-950/60 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Location Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g. Main Branch, Couva Office"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g. (868) 555-0199"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Full Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g. 123 Main Street, Port of Spain"
            />
          </div>

          <div className="md:col-span-2 flex gap-3 mt-2">
            <button
              type="submit"
              disabled={saving || (!editingId && locations.length >= 1 && !allowMultipleLocations)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : editingId ? 'Update Location' : 'Add Location'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Locations List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-bold p-6 border-b border-slate-200 dark:border-slate-700">
          Active Branch Locations ({locations.length})
        </h3>

        {loading ? (
          <div className="p-6 text-center text-slate-500 animate-pulse">Loading locations...</div>
        ) : locations.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No locations configured yet.</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {locations.map((loc) => (
              <div
                key={loc.id}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {loc.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        loc.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {loc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {loc.address || 'No address provided'}
                  </p>
                  {loc.phone && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">📞 {loc.phone}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(loc.id, loc.is_active)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold cursor-pointer"
                  >
                    {loc.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditClick(loc)}
                    className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(loc.id)}
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