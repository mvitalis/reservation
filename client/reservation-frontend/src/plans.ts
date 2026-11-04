export type PlanId = 'starter' | 'pro' | 'business';

// src/lib/plans.ts

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: string; // or price / priceString depending on your setup
  description: string;
  features: string[];
  paypalPlanId?: string; // <--- Add this optional property
  limits: {
    maxServices: number;
    allowCustomSlug: boolean;
    allowSmsReminders: boolean;
    allowMultipleLocations: boolean;
  };
}

export const PLANS: Record<PlanId, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    description: 'Essential booking features',
    features: ['Up to 3 Services', 'Standard URL'],
    limits: {
      maxServices: 3,
      allowCustomSlug: false,
      allowSmsReminders: false,
      allowMultipleLocations: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$9.99/mo',
    description: 'Advanced features for growing businesses',
    features: ['Unlimited Services', 'Custom Booking URL', 'SMS Reminders'],
    paypalPlanId: 'P-XXXXXXXXXXXXXXXXXXXX', // <--- Your PayPal Plan ID
    limits: {
      maxServices: 999,
      allowCustomSlug: true,
      allowSmsReminders: true,
      allowMultipleLocations: false,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: '$24.99/mo',
    description: 'Full suite for multi-location teams',
    features: ['Everything in Pro', 'Multiple Locations', 'Priority Support'],
    paypalPlanId: 'P-YYYYYYYYYYYYYYYYYYYY', // <--- Your PayPal Plan ID
    limits: {
      maxServices: 999,
      allowCustomSlug: true,
      allowSmsReminders: true,
      allowMultipleLocations: true,
    },
  },
};