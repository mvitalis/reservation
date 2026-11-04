import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Assumes React Router is used for dynamic /book/:slug routes
import { supabase } from './supabaseClient'; // Adjust path if necessary

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
}

interface BusinessInfo {
  id: string;
  name: string;
  phone?: string;
}

interface PublicBookingViewProps {
  businessId?: string;
  businessName?: string;
  businessPhone?: string;
}

export const PublicBookingView: React.FC<PublicBookingViewProps> = ({
  businessId: propBusinessId,
  businessName: propBusinessName,
  businessPhone: propBusinessPhone,
}) => {
  const { slug } = useParams<{ slug: string }>();

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    id: propBusinessId || '',
    name: propBusinessName || 'Loading Business...',
    phone: propBusinessPhone || '',
  });

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingBusiness, setFetchingBusiness] = useState<boolean>(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // 1. Fetch Business Details by Slug or User Session
  useEffect(() => {
    const fetchBusinessDetails = async () => {
      setFetchingBusiness(true);
      try {
        let query = supabase.from('businesses').select('id, name, phone');

        if (slug) {
          // If public customer opens /book/:slug
          query = query.eq('slug', slug);
        } else if (propBusinessId) {
          // If businessId passed via props
          query = query.eq('id', propBusinessId);
        } else {
          // Fallback to currently logged-in owner's business
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            query = query.eq('owner_id', user.id);
          }
        }

        const { data, error } = await query.single();

        if (data && !error) {
          setBusinessInfo({
            id: data.id,
            name: data.name,
            phone: data.phone || '(868) 555-0199', // Default phone fallback if missing in DB
          });
        } else if (propBusinessName) {
          setBusinessInfo({
            id: propBusinessId || '',
            name: propBusinessName,
            phone: propBusinessPhone || '(868) 555-0199',
          });
        } else {
          setMessage({ type: 'error', text: 'Business profile not found.' });
        }
      } catch (err) {
        console.error('Error loading business metadata:', err);
      } finally {
        setFetchingBusiness(false);
      }
    };

    fetchBusinessDetails();
  }, [slug, propBusinessId, propBusinessName, propBusinessPhone]);

  // 2. Fetch Services for the resolved Business ID
  useEffect(() => {
    if (!businessInfo.id) return;

    fetch(`/api/services?businessId=${businessInfo.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setServices(data.data);
        else setMessage({ type: 'error', text: 'Failed to load services.' });
      })
      .catch(() =>
        setMessage({ type: 'error', text: 'Could not connect to backend server.' })
      );
  }, [businessInfo.id]);

  // Generate available time slots for selected date
  useEffect(() => {
    if (!selectedService || !selectedDate) return;

    const slots: string[] = [];
    const baseDate = new Date(selectedDate);

    for (let hour = 9; hour < 17; hour++) {
      const slotTime = new Date(baseDate);
      slotTime.setHours(hour, 0, 0, 0);
      slots.push(slotTime.toISOString());
    }

    setAvailableSlots(slots);
    setSelectedSlot('');
  }, [selectedService, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      setMessage({ type: 'error', text: 'Please select a time slot.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: businessInfo.id,
          serviceId: selectedService,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          bookingStart: selectedSlot,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: 'Reservation successfully confirmed!',
        });
        setFormData({ name: '', email: '', phone: '' });
        setSelectedSlot('');
      } else {
        const errorMsg = data.errors
          ? data.errors.map((e: any) => `${e.path}: ${e.msg}`).join(', ')
          : data.error || 'Reservation failed.';
        setMessage({ type: 'error', text: errorMsg });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md font-sans">
        {/* Prominent Header Section */}
        <div className="border-b pb-5 mb-6 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            {businessInfo.name}
          </h1>
          <div className="w-12 h-1 bg-purple-600 rounded mt-2 mb-3"></div>
          <p className="text-lg font-medium text-gray-600">
            Book an Appointment
          </p>
          <p className="text-sm font-semibold text-purple-700 mt-1">
            {businessInfo.phone}
          </p>
        </div>

        {message && (
          <div
            className={`p-4 mb-6 text-sm rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {fetchingBusiness ? (
          <div className="space-y-6 animate-pulse py-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Service */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1. Select Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                required
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-gray-800 transition-all duration-200 hover:shadow-md hover:border-purple-300 cursor-pointer"
              >
                <option value="">-- Select Service --</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} mins) - ${s.price}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Date */}
            {selectedService && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2. Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 transition-all duration-200 hover:shadow-md hover:border-purple-300 cursor-pointer"
                />
              </div>
            )}

            {/* Step 3: Time Slot */}
            {selectedService && selectedDate && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  3. Available Time Slots
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableSlots.map((slot) => {
                    const timeString = new Date(slot).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3 text-sm rounded-lg border font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50'
                        }`}
                      >
                        {timeString}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Contact Info */}
            {selectedSlot && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  4. Your Details
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 transition-all duration-200 hover:shadow-md hover:border-purple-300"
                    placeholder="Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 transition-all duration-200 hover:shadow-md hover:border-purple-300"
                    placeholder="jane@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800 transition-all duration-200 hover:shadow-md hover:border-purple-300"
                    placeholder="(868) 555-0199"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg transition-colors shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};