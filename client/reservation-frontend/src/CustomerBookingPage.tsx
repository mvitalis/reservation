import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Slot {
  time: string;
  isoStart: string;
  isoEnd: string;
  available: boolean;
}

export const CustomerBookingPage: React.FC = () => {
  // Extract businessId dynamically from the URL path!
  const { businessId } = useParams<{ businessId: string }>();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Fetch live available slots whenever date changes
  useEffect(() => {
    if (!selectedDate || !businessId) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/availability?businessId=${businessId}&date=${selectedDate}&serviceDuration=30`
        );
        const data = await res.json();
        if (data.success) {
          setSlots(data.slots);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [businessId, selectedDate]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl my-8">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Book an Appointment</h1>
      <p className="text-xs text-gray-500 mb-6">Business ID: <code className="bg-gray-100 p-1 rounded">{businessId}</code></p>

      {/* Date Picker */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {/* Available Slots Grid */}
      {selectedDate && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Time</label>
          {loadingSlots ? (
            <p className="text-sm text-gray-500">Checking availability...</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  disabled={!slot.available}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-3 text-xs font-semibold rounded-lg border transition-all ${
                    !slot.available
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      : selectedSlot?.isoStart === slot.isoStart
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-purple-500 hover:text-purple-600'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};