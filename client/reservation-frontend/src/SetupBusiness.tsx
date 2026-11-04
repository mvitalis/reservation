import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const SetupBusiness = () => {
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const navigate = useNavigate();

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you will save the business & service records to Supabase tied to user.id
    
    // Redirect to their brand new empty admin dashboard
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Set Up Your Business</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure your business profile and add your first service to start accepting bookings.
        </p>

        <form onSubmit={handleSaveBusiness} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Business Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Barber Shop or Luxe Beauty Bar"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Public Booking URL Slug
            </label>
            <div className="flex items-center text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg overflow-hidden px-3 py-2">
              <span>yourdomain.com/book/</span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-transparent font-medium text-purple-800 focus:outline-none flex-1 ml-1"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Add Your First Service</h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Service Name (e.g. Haircut)"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                required
                placeholder="Price ($)"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                className="p-3 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg shadow-md transition-colors"
          >
            Complete Setup & Launch Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};