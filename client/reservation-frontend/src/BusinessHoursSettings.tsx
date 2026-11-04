import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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

export const BusinessHoursSettings: React.FC = () => {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchHours = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) return;

        const { data: business, error } = await supabase
          .from('businesses')
          .select('id, business_hours')
          .eq('owner_id', authData.user.id)
          .single();

        if (error) throw error;

        if (business) {
          setBusinessId(business.id);
          if (business.business_hours) {
            setHours(business.business_hours);
          }
        }
      } catch (err: any) {
        console.error('Error fetching business hours:', err);
        setMessage({ type: 'error', text: 'Failed to load business hours.' });
      } finally {
        setLoading(false);
      }
    };

    fetchHours();
  }, []);

  const handleToggleClosed = (day: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed,
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ business_hours: hours })
        .eq('id', businessId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Operating hours updated successfully!' });
    } catch (err: any) {
      console.error('Error saving hours:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to update operating hours.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading business settings...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-1">Business Operating Hours</h2>
      <p className="text-sm text-gray-500 mb-6">
        Configure your opening hours. Time slots generated on the public booking page will automatically follow this schedule.
      </p>

      {message && (
        <div
          className={`p-3 mb-4 text-sm rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {DAYS.map((day) => {
          const config = hours[day] || { open: '09:00', close: '17:00', closed: false };

          return (
            <div
              key={day}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
            >
              <div className="w-28 capitalize font-semibold text-gray-700">{day}</div>

              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.closed}
                    onChange={() => handleToggleClosed(day)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Closed</span>
                </label>

                {!config.closed && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={config.open}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                      className="p-1.5 border border-gray-300 rounded text-sm text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                      type="time"
                      value={config.close}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                      className="p-1.5 border border-gray-300 rounded text-sm text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t pt-4 text-right">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-medium rounded-lg transition-colors shadow disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving...' : 'Save Operating Hours'}
        </button>
      </div>
    </div>
  );
};