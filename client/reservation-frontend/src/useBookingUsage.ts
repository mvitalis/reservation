// useBookingUsage.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { getTierLimit } from './subscriptionLimits';

export interface UsageData {
  tier: string;
  monthlyLimit: number;
  currentCount: number;
  isLimitReached: boolean;
  loading: boolean;
  error: string | null;
}

export const useBookingUsage = (businessId: string): UsageData => {
  const [usage, setUsage] = useState<UsageData>({
    tier: 'free',
    monthlyLimit: 30,
    currentCount: 0,
    isLimitReached: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!businessId) return;

    const fetchUsage = async () => {
      try {
        // 1. Fetch business subscription tier
        const { data: business, error: bError } = await supabase
          .from('businesses')
          .select('subscription_tier')
          .eq('id', businessId)
          .single();

        if (bError) throw bError;

        const tier = business?.subscription_tier || 'free';
        const limit = getTierLimit(tier);

        // 2. Compute first and last day of current month in ISO format
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        // 3. Get total count of bookings created this month
        const { count, error: cError } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('created_at', startOfMonth)
          .lte('created_at', endOfMonth);

        if (cError) throw cError;

        const currentCount = count || 0;

        setUsage({
          tier,
          monthlyLimit: limit,
          currentCount,
          isLimitReached: currentCount >= limit,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setUsage((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'Failed to load subscription usage.',
        }));
      }
    };

    fetchUsage();
  }, [businessId]);

  return usage;
};