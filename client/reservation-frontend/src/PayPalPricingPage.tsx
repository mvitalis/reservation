import React, { useState } from 'react';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from './supabaseClient';
import { Check, Zap, Building2, AlertCircle } from 'lucide-react';

// Replace these with your actual PayPal Sandbox Plan IDs
const PAYPAL_PLAN_IDS = {
  pro: 'P-9SU20660W22176138NKULFCQ',
  business: 'P-81471399GF7898048NKULL2A',
};

export const PayPalPricingPage: React.FC = () => {
  const [selectedPlan] = useState<'pro' | 'business'>('pro');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubscriptionSuccess = async (subscriptionId: string, plan: 'pro' | 'business') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage({ type: 'error', text: 'You must be logged in to update your plan.' });
        return;
      }

      // Record active subscription in Supabase
      const { error } = await supabase
        .from('businesses')
        .update({
          subscription_plan: plan,
          paypal_subscription_id: subscriptionId,
        })
        .eq('owner_id', user.id);

      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: `Successfully subscribed to the ${plan.toUpperCase()} plan!`,
      });
    } catch (err: any) {
      console.error('Database update error:', err);
      setStatusMessage({ type: 'error', text: 'Payment processed, but failing to update local profile.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-sm sm:text-base">
            Select a package and complete setup securely with PayPal.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              statusMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PRO PLAN */}
          <div className={`bg-white rounded-2xl p-8 border flex flex-col justify-between transition-all ${
            selectedPlan === 'pro' ? 'border-purple-600 shadow-lg' : 'border-gray-200'
          }`}>
            <div>
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm uppercase tracking-wider mb-2">
                <Zap className="w-4 h-4" />
                <span>Pro Package</span>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-4">
                $19 <span className="text-base font-normal text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Up to 250 Bookings / mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Notification Email Updates</span>
                </li>
              </ul>
            </div>

            <div>
              <PayPalButtons
                style={{ shape: 'rect', color: 'blue', layout: 'vertical', label: 'subscribe' }}
                createSubscription={(_data, actions) => {
                  return actions.subscription.create({
                    plan_id: PAYPAL_PLAN_IDS.pro,
                  });
                }}
                onApprove={async (data) => {
                  if (data.subscriptionID) {
                    await handleSubscriptionSuccess(data.subscriptionID, 'pro');
                  }
                }}
                onError={(err) => {
                  console.error('PayPal Error:', err);
                  setStatusMessage({ type: 'error', text: 'PayPal transaction failed.' });
                }}
              />
            </div>
          </div>

          {/* BUSINESS PLAN */}
          <div className={`bg-white rounded-2xl p-8 border-2 flex flex-col justify-between relative transition-all ${
            selectedPlan === 'business' ? 'border-purple-600 shadow-xl' : 'border-purple-300'
          }`}>
            <div className="absolute -top-3.5 right-6 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Popular
            </div>

            <div>
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4" />
                <span>Business Package</span>
              </div>
              <div className="text-4xl font-black text-gray-900 mb-4">
                $49 <span className="text-base font-normal text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-6">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Unlimited Bookings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Priority Support</span>
                </li>
              </ul>
            </div>

            <div>
              <PayPalButtons
                style={{ shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' }}
                createSubscription={(_data, actions) => {
                  return actions.subscription.create({
                    plan_id: PAYPAL_PLAN_IDS.business,
                  });
                }}
                onApprove={async (data) => {
                  if (data.subscriptionID) {
                    await handleSubscriptionSuccess(data.subscriptionID, 'business');
                  }
                }}
                onError={(err) => {
                  console.error('PayPal Error:', err);
                  setStatusMessage({ type: 'error', text: 'PayPal transaction failed.' });
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};