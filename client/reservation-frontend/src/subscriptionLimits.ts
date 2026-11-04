// subscriptionLimits.ts

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface TierConfig {
  name: string;
  monthlyBookingLimit: number;
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'Free',
    monthlyBookingLimit: 30,
  },
  pro: {
    name: 'Pro',
    monthlyBookingLimit: 300,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyBookingLimit: Infinity,
  },
};

export const getTierLimit = (tier?: string): number => {
  const normalizedTier = (tier?.toLowerCase() as SubscriptionTier) || 'free';
  return TIER_CONFIGS[normalizedTier]?.monthlyBookingLimit ?? TIER_CONFIGS.free.monthlyBookingLimit;
};