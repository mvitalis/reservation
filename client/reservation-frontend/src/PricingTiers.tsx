import React from 'react';

interface Tier {
  id: string;
  name: string;
  price: string;
  maxServices: string;
  maxBookings: string;
  features: string[];
  recommended?: boolean;
}

const tiers: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    maxServices: '2 Services',
    maxBookings: '20 Bookings / mo',
    features: ['Basic Booking System', 'Standard Email Support']
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$19.99',
    maxServices: '10 Services',
    maxBookings: '150 Bookings / mo',
    features: ['Basic Booking System', 'Priority Email Support', 'Basic Analytics Dashboard'],
    recommended: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49.99',
    maxServices: 'Unlimited Services',
    maxBookings: 'Unlimited Bookings',
    features: ['Full Suite Access', '24/7 Priority Support', 'Advanced Analytics', 'Custom Branding & Domain']
  }
];

export const PricingTiers: React.FC<{ currentTier?: string; onSelectTier: (tierId: string) => void }> = ({
  currentTier = 'free',
  onSelectTier
}) => {
  return (
    <div className="py-8 max-w-5xl mx-auto px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Choose the Right Plan for Your Business</h2>
        <p className="text-gray-600 mt-2">Scale your local operations as your customer base grows.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;
          return (
            <div
              key={tier.id}
              className={`rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                tier.recommended
                  ? 'border-purple-600 shadow-xl relative bg-white'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              {tier.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-gray-800">{tier.name}</h3>
                <div className="my-4">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-gray-500 text-sm"> / month</span>
                </div>

                <ul className="space-y-3 mb-6 text-sm text-gray-600">
                  <li className="font-semibold text-gray-800">✓ {tier.maxServices}</li>
                  <li className="font-semibold text-gray-800">✓ {tier.maxBookings}</li>
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center">
                      <span className="mr-2 text-green-500">✓</span> {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onSelectTier(tier.id)}
                disabled={isCurrent}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : tier.recommended
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : `Upgrade to ${tier.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};