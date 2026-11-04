// useBusinessContext.ts
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export interface BusinessContextType {
  businessId: string | null;
  userTier: 'free' | 'pro' | 'business';
  isLoading: boolean;
}

export const useBusinessContext = (): BusinessContextType => {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'business'>('free');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBusinessDetails = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: business } = await supabase
          .from('businesses')
          .select('id, subscription_tier')
          .eq('owner_id', user.id)
          .single();

        if (business) {
          setBusinessId(business.id);
          setUserTier(business.subscription_tier?.toLowerCase() || 'free');
        }
      } catch (err) {
        console.error('Error fetching business context:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessDetails();
  }, []);

  return { businessId, userTier, isLoading };
};