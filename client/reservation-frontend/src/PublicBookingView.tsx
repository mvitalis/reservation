import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { supabase } from './supabaseClient';
import { useBookingUsage } from './useBookingUsage';

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

interface Staff {
  id: string;
  name: string;
  location_id: string;
}

interface DaySchedule {
  open: string;  // e.g. "09:00"
  close: string; // e.g. "17:00"
  closed: boolean;
}

interface BusinessHours {
  [day: string]: DaySchedule;
}

interface BusinessInfo {
  id: string;
  name: string;
  logo_url?: string;
  header_image_url?: string;
  primary_color?: string;
  business_hours?: BusinessHours;
  public_theme?: 'light' | 'dark' | 'system';
}

interface ExistingBooking {
  booking_start: string;
  booking_end: string;
}

const DEFAULT_HOURS: BusinessHours = {
  sunday: { open: '00:00', close: '00:00', closed: true },
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '15:00', closed: false },
};

export const PublicBookingView: React.FC = () => {
  const params = useParams<{ slug?: string; id?: string }>();
  const [searchParams] = useSearchParams();

  const urlSlug = params.slug || searchParams.get('slug');
  const urlId = params.id || searchParams.get('id');

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    id: '',
    name: 'Loading Business...',
    primary_color: '#7e22ce',
    public_theme: 'light',
  });

  // Track subscription tier limits and current monthly usage
  const { isLimitReached, loading: usageLoading } = useBookingUsage(businessInfo.id);

  // Locations & Staff States
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>('');

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedTimestamps, setBookedTimestamps] = useState<number[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isClosedDay, setIsClosedDay] = useState<boolean>(false);

  // 👈 Estado local para aislar el tema oscuro/claro solo en esta vista pública
  const [isPublicDark, setIsPublicDark] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingBusiness, setFetchingBusiness] = useState<boolean>(true);
  const [fetchingSlots, setFetchingSlots] = useState<boolean>(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Turnstile Security Token & Instance Ref
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || import.meta.env.REACT_APP_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  // 👈 Manejo del tema público mediante estado local (sin tocar el documento global)
  useEffect(() => {
    const theme = businessInfo.public_theme || 'light';
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const evaluateTheme = () => {
      if (theme === 'dark') {
        setIsPublicDark(true);
      } else if (theme === 'system' && mediaQuery.matches) {
        setIsPublicDark(true);
      } else {
        setIsPublicDark(false);
      }
    };

    evaluateTheme();

    const handleSystemChange = () => {
      if (theme === 'system') {
        evaluateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [businessInfo.public_theme]);

  // Fetch Business, Custom Branding, Working Hours, and Public Theme
  useEffect(() => {
    const fetchBusiness = async () => {
      setFetchingBusiness(true);
      setMessage(null);

      try {
        let foundBusiness: BusinessInfo | null = null;

        if (urlSlug) {
          const { data: bSlug } = await supabase
            .from('businesses')
            .select('id, name, logo_url, header_image_url, primary_color, business_hours, public_theme')
            .eq('slug', urlSlug)
            .maybeSingle();

          if (bSlug) foundBusiness = bSlug;
        }

        if (!foundBusiness && urlId) {
          const { data: bId } = await supabase
            .from('businesses')
            .select('id, name, logo_url, header_image_url, primary_color, business_hours, public_theme')
            .eq('id', urlId)
            .maybeSingle();

          if (bId) foundBusiness = bId;
        }

        if (!foundBusiness && !urlSlug && !urlId) {
          const { data: authData } = await supabase.auth.getUser();

          if (authData?.user) {
            const { data: bOwner } = await supabase
              .from('businesses')
              .select('id, name, logo_url, header_image_url, primary_color, business_hours, public_theme')
              .eq('owner_id', authData.user.id)
              .maybeSingle();

            if (bOwner) foundBusiness = bOwner;
          }
        }

        if (foundBusiness) {
          setBusinessInfo({
            id: foundBusiness.id,
            name: foundBusiness.name || 'Business',
            logo_url: foundBusiness.logo_url,
            header_image_url: foundBusiness.header_image_url,
            primary_color: foundBusiness.primary_color || '#7e22ce',
            business_hours: foundBusiness.business_hours || DEFAULT_HOURS,
            public_theme: foundBusiness.public_theme || 'light',
          });
        } else {
          setMessage({
            type: 'error',
            text: 'Business not found. Please check your booking link.',
          });
        }
      } catch (err) {
        console.error('Error loading business details:', err);
      } finally {
        setFetchingBusiness(false);
      }
    };

    fetchBusiness();
  }, [urlSlug, urlId]);

  // Fetch Locations once Business is resolved
  useEffect(() => {
    if (!businessInfo.id) return;

    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, address, phone')
          .eq('business_id', businessInfo.id)
          .eq('is_active', true);

        if (error) throw error;
        setLocations(data || []);

        if (data && data.length === 1) {
          setSelectedLocation(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    fetchLocations();
  }, [businessInfo.id]);

  // Fetch Staff filtered by Selected Location
  useEffect(() => {
    if (!selectedLocation) {
      setStaffMembers([]);
      setSelectedStaff('');
      return;
    }

    const fetchStaffByLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('id, name, location_id')
          .eq('location_id', selectedLocation)
          .eq('is_active', true);

        if (error) throw error;
        setStaffMembers(data || []);

        if (data && data.length === 1) {
          setSelectedStaff(data[0].id);
        } else {
          setSelectedStaff('');
        }
      } catch (err) {
        console.error('Error fetching staff for location:', err);
      }
    };

    fetchStaffByLocation();
  }, [selectedLocation]);

  // Fetch Services
  useEffect(() => {
    if (!businessInfo.id) return;

    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, description, duration_minutes, price')
          .eq('business_id', businessInfo.id);

        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    };

    fetchServices();
  }, [businessInfo.id]);

  // Dynamically generate slots based on selected date's working hours & location/staff filters
  useEffect(() => {
    if (!selectedService || !selectedDate || !businessInfo.id) return;

    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[dateObj.getDay()];

    const hoursConfig = businessInfo.business_hours || DEFAULT_HOURS;
    const daySchedule = hoursConfig[dayName] || { open: '09:00', close: '17:00', closed: false };

    if (daySchedule.closed) {
      setIsClosedDay(true);
      setAvailableSlots([]);
      setSelectedSlot('');
      return;
    }

    setIsClosedDay(false);

    const [startHour] = daySchedule.open.split(':').map(Number);
    const [endHour] = daySchedule.close.split(':').map(Number);

    const fetchExistingBookings = async () => {
      setFetchingSlots(true);
      try {
        const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString();
        const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString();

        let query = supabase
          .from('bookings')
          .select('booking_start, booking_end, location_id, staff_id')
          .eq('business_id', businessInfo.id)
          .gte('booking_start', startOfDay)
          .lte('booking_start', endOfDay);

        if (selectedLocation) {
          query = query.eq('location_id', selectedLocation);
        }

        if (selectedStaff) {
          query = query.eq('staff_id', selectedStaff);
        }

        const { data, error } = await query;

        if (error) throw error;

        const takenTimestamps = ((data as ExistingBooking[]) || []).map((b) =>
          new Date(b.booking_start).getTime()
        );

        setBookedTimestamps(takenTimestamps);
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setFetchingSlots(false);
      }
    };

    const slots: string[] = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = new Date(year, month - 1, day, hour, 0, 0, 0);
      slots.push(slotTime.toISOString());
    }

    setAvailableSlots(slots);
    setSelectedSlot('');
    fetchExistingBookings();
  }, [
    selectedService,
    selectedDate,
    selectedLocation,
    selectedStaff,
    businessInfo.id,
    businessInfo.business_hours,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (locations.length > 0 && !selectedLocation) {
      setMessage({ type: 'error', text: 'Please select a location branch.' });
      return;
    }

    // 1. Turnstile CAPTCHA Check
    if (!turnstileToken) {
      setMessage({
        type: 'error',
        text: 'Please complete the security check before confirming.',
      });
      return;
    }

    // 2. Client-side guard check against monthly limits
    if (isLimitReached) {
      setMessage({
        type: 'error',
        text: 'This business has reached its booking limit for the current month.',
      });
      return;
    }

    // 3. Input Sanitation & Validation
    const sanitizedName = formData.name.trim();
    const sanitizedEmail = formData.email.trim().toLowerCase();
    const sanitizedPhone = formData.phone.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedName || sanitizedName.length < 2 || sanitizedName.length > 100) {
      setMessage({ type: 'error', text: 'Please enter a valid full name.' });
      return;
    }

    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const currentService = services.find((s) => s.id === selectedService);
      const durationMinutes = currentService?.duration_minutes || 30;

      const startDateTime = new Date(selectedSlot);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

      const { error } = await supabase.from('bookings').insert([
        {
          business_id: businessInfo.id,
          location_id: selectedLocation || null,
          staff_id: selectedStaff || null,
          service_id: selectedService,
          customer_name: sanitizedName,
          customer_email: sanitizedEmail,
          customer_phone: sanitizedPhone || null,
          booking_start: startDateTime.toISOString(),
          booking_end: endDateTime.toISOString(),
        },
      ]);

      if (error) {
        if (error.message?.includes('MONTHLY_BOOKING_LIMIT_REACHED')) {
          throw new Error('This business has reached its booking limit for the month.');
        }
        if (error.code === '23505' || error.message?.includes('prevent_double_booking')) {
          throw new Error('This time slot was just taken. Please select another time.');
        }
        throw error;
      }

      setMessage({ type: 'success', text: 'Booking confirmed successfully!' });
      setFormData({ name: '', email: '', phone: '' });
      setSelectedSlot('');
      setBookedTimestamps((prev) => [...prev, new Date(selectedSlot).getTime()]);

      // Reset Turnstile token on success
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to complete booking.' });
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const brandColor = businessInfo.primary_color || '#7e22ce';
  const now = new Date();

  return (
    <div className={`${isPublicDark ? 'dark' : ''} min-h-screen transition-colors`}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 pb-12 transition-colors">
        {/* Header / Cover Banner */}
        <div
          className="w-full h-48 sm:h-64 bg-cover bg-center relative transition-all"
          style={{
            backgroundImage: businessInfo.header_image_url ? `url(${businessInfo.header_image_url})` : 'none',
            backgroundColor: brandColor,
          }}
        />

        <div className="max-w-2xl mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-xl shadow-lg font-sans border border-gray-100 dark:border-slate-800 transition-colors">
            
            {/* Logo & Business Name directly underneath */}
            <div className="flex flex-col items-center text-center mb-6">
              {businessInfo.logo_url ? (
                <img
                  src={businessInfo.logo_url}
                  alt={businessInfo.name}
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-md object-cover bg-white dark:bg-slate-800"
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center font-bold text-white text-3xl select-none"
                  style={{ backgroundColor: brandColor }}
                >
                  {businessInfo.name.charAt(0) || 'B'}
                </div>
              )}

              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-slate-100 mt-3">{businessInfo.name}</h1>
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400 mt-1">Book an Appointment</p>
            </div>

            {/* Limit Reached Warning Banner */}
            {isLimitReached && (
              <div className="p-4 mb-6 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg text-center font-medium">
                This business is currently not accepting new online appointments for the remainder of this month as it has reached its monthly booking capacity.
              </div>
            )}

            {message && (
              <div className={`p-4 mb-6 text-sm rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            {fetchingBusiness || usageLoading ? (
              <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading booking options...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Step 1: Location Branch Selection */}
                {locations.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      1. Select Location Branch
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => {
                        setSelectedLocation(e.target.value);
                        setSelectedSlot('');
                      }}
                      disabled={isLimitReached}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Select Location --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.address ? `(${loc.address})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 2: Staff Member Selection */}
                {selectedLocation && staffMembers.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      2. Select Staff Member (Optional)
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => {
                        setSelectedStaff(e.target.value);
                        setSelectedSlot('');
                      }}
                      disabled={isLimitReached}
                      className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Any Available Staff Member --</option>
                      {staffMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 3: Service Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    {locations.length > 0 ? (staffMembers.length > 0 ? '3. Select Service' : '2. Select Service') : '1. Select Service'}
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    disabled={isLimitReached}
                    required
                    className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Select Service --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes} mins) - ${s.price}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 4: Date Selection */}
                {selectedService && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      {locations.length > 0 ? (staffMembers.length > 0 ? '4. Select Date' : '3. Select Date') : '2. Select Date'}
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled={isLimitReached}
                      required
                      className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Step 5: Time Slots Selection */}
                {selectedService && selectedDate && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                      {locations.length > 0 ? (staffMembers.length > 0 ? '5. Available Time Slots' : '4. Available Time Slots') : '3. Available Time Slots'}
                    </label>

                    {isClosedDay ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm rounded-lg text-center font-medium">
                        The business is closed on this day. Please select another date.
                      </div>
                    ) : fetchingSlots ? (
                      <div className="p-4 text-sm text-gray-500 dark:text-slate-400 text-center">Checking availability...</div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {availableSlots.map((slot) => {
                          const slotDate = new Date(slot);
                          const timeString = slotDate.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          const slotTimestamp = slotDate.getTime();
                          const isBooked = bookedTimestamps.includes(slotTimestamp);
                          const isPastSlot = slotDate < now;
                          const isDisabled = isBooked || isPastSlot || isLimitReached;
                          const isSelected = selectedSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => !isDisabled && setSelectedSlot(slot)}
                              className={`p-3 text-sm rounded-lg border font-medium transition-all ${
                                isDisabled
                                  ? 'bg-gray-100 dark:bg-slate-800/40 text-gray-400 dark:text-slate-600 border-gray-200 dark:border-slate-800 cursor-not-allowed line-through opacity-70'
                                  : isSelected
                                  ? 'text-white border-transparent shadow-md'
                                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer'
                              }`}
                              style={isSelected ? { backgroundColor: brandColor } : {}}
                            >
                              {timeString} {isBooked ? '(Booked)' : isPastSlot ? '(Passed)' : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 6: Customer Details & Verification */}
                {selectedSlot && (
                  <div className="space-y-4 border-t border-gray-200 dark:border-slate-800 pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200">Your Contact Details</h3>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        disabled={isLimitReached}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-lg disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                        placeholder="Jane Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        disabled={isLimitReached}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-lg disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                        placeholder="jane@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                      <input
                        type="tel"
                        required
                        disabled={isLimitReached}
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-3 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-lg disabled:bg-gray-100 dark:disabled:bg-slate-800/50"
                        placeholder="(868) 555-0199"
                      />
                    </div>

                    {/* Cloudflare Turnstile Verification Widget */}
                    <div className="flex justify-center my-4">
                      <Turnstile
                        ref={turnstileRef}
                        siteKey={TURNSTILE_SITE_KEY}
                        onSuccess={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken(null)}
                        onError={() => setTurnstileToken(null)}
                        options={{
                          theme: isPublicDark ? 'dark' : 'light',
                          size: 'normal',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || isLimitReached || !turnstileToken}
                      className="w-full py-3.5 text-white font-semibold rounded-lg shadow-lg cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: brandColor }}
                    >
                      {loading ? 'Processing...' : 'Confirm Appointment'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};