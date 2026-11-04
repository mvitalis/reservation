import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PLANS, type PlanId } from './plans';

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

export const ServiceManager: React.FC = () => {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Package Restriction States
  const [maxServices, setMaxServices] = useState<number>(3); // Default fallback
  const [currentPlanName, setCurrentPlanName] = useState<string>('Starter');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: '30',
    price: '0.00',
  });

  // 1. Fetch current logged-in user's business ID & resolve package limits from businesses table
  useEffect(() => {
    const fetchUserBusinessAndLimits = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error('User not authenticated:', authError);
          setLoading(false);
          return;
        }

        // Query the businesses table for the business owned by the user (including package_tier)
        let { data: business, error: bizError } = await supabase
          .from('businesses')
          .select('id, package_tier')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (bizError) throw bizError;

        // Optionally create a default business record if one does not exist yet
        if (!business) {
          const { data: newBiz, error: createError } = await supabase
            .from('businesses')
            .insert({
              owner_id: user.id,
              name: 'My Business',
              package_tier: user.user_metadata?.package_tier || user.user_metadata?.selected_package || 'starter',
            })
            .select('id, package_tier')
            .single();

          if (createError) throw createError;
          business = newBiz;
        }

        // Resolve package tier from database column or metadata fallback
        const resolvedTier = (
          business?.package_tier ||
          user.user_metadata?.package_tier ||
          user.user_metadata?.selected_package ||
          'starter'
        ).toLowerCase() as PlanId;

        const planConfig = PLANS[resolvedTier] || PLANS['starter'];
        const allowedMax = planConfig.limits.maxServices ?? 3;

        setMaxServices(allowedMax);
        setCurrentPlanName(planConfig.name);
        setBusinessId(business.id);
      } catch (err) {
        console.error('Error fetching business ID & limits:', err);
        setLoading(false);
      }
    };

    fetchUserBusinessAndLimits();
  }, []);

  // 2. Fetch services once businessId is resolved
  const fetchServices = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/services?businessId=${businessId}`);
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      fetchServices();
    }
  }, [businessId, fetchServices]);

  const isLimitReached = services.length >= maxServices;

  const handleEditClick = (s: Service) => {
    setEditingId(s.id);
    setErrorMessage(null);
    setFormData({
      name: s.name,
      description: s.description || '',
      durationMinutes: s.duration_minutes.toString(),
      price: s.price.toString(),
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setErrorMessage(null);
    setFormData({ name: '', description: '', durationMinutes: '30', price: '0.00' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!businessId) {
      alert('Unable to submit: Business ID missing.');
      return;
    }

    // Check package limit if creating a NEW service
    if (!editingId && isLimitReached) {
      setErrorMessage(
        `Service limit reached (${services.length}/${maxServices}) for the ${currentPlanName} plan. Upgrade your plan to add more services.`
      );
      return;
    }

    const url = editingId ? `/api/admin/services/${editingId}` : '/api/admin/services';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          ...formData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchServices();
        handleCancel();
      } else {
        setErrorMessage(data.error || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving service:', err);
      setErrorMessage('Failed to connect to the server.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        setErrorMessage(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {editingId ? 'Edit Service' : 'Add New Service'}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
            {currentPlanName} Plan: {services.length} / {maxServices >= 999 ? '∞' : maxServices} Services
          </span>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Service Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. Haircut & Style"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Duration (Minutes)</label>
            <input
              type="number"
              required
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="Short description..."
            />
          </div>

          <div className="md:col-span-2 flex gap-3 mt-2">
            <button
              type="submit"
              disabled={!businessId || (!editingId && isLimitReached)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
            >
              {editingId ? 'Save Changes' : 'Create Service'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium text-sm rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 p-6 border-b border-gray-100">Active Services</h3>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No services configured yet.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                <th className="p-4">Name</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.description || 'No description'}</div>
                  </td>
                  <td className="p-4 text-gray-700">{s.duration_minutes} mins</td>
                  <td className="p-4 font-medium text-gray-900">${s.price}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleEditClick(s)}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};