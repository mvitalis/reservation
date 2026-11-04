import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export interface PopularService {
  id?: string | number;
  name: string;
  booking_count: number;
  revenue: number;
}

export interface DailyTrend {
  booking_date: string;
  count: number;
}

export interface AnalyticsData {
  total_bookings: number;
  completed_bookings: number;
  upcoming_bookings: number;
  total_revenue: number;
  popular_services: PopularService[];
  daily_trends: DailyTrend[];
  package_tier?: string;
}

export const useBusinessAnalytics = (
  businessId: string | null,
  daysRange: number = 30
) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setData(null);
      setPlan(null);
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      setIsRestricted(false);

      const fetchCurrentPlan = async (): Promise<string> => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          const { data: business, error: bizError } = await supabase
            .from('businesses')
            .select('package_tier')
            .eq('id', businessId)
            .maybeSingle();

          if (bizError) {
            console.error('Error fetching business plan:', bizError);
          }

          const userPackage = 
            business?.package_tier || 
            user?.user_metadata?.package_tier ||
            //user?.user_metadata?.selected_package ||
            user?.user_metadata?.plan_id ||
            'starter';

          return String(userPackage).toLowerCase();
        } catch (err) {
          console.error('Failed to resolve package tier:', err);
          return 'starter';
        }
      };

      try {
        const currentPlan = await fetchCurrentPlan();
        setPlan(currentPlan);

        const allowedPlans = ['pro', 'business'];
        const isPaidPlan = allowedPlans.includes(currentPlan);

        if (!isPaidPlan) {
          setIsRestricted(true);
          setLoading(false);
          return;
        }

        // 🚀 Consulta directa optimizada (sin llamadas RPC fallidas)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysRange);
        const startDateIso = startDate.toISOString();

        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, booking_start, service_id, services(id, name, price)')
          .eq('business_id', businessId)
          .gte('booking_start', startDateIso);

        if (bookingsError) throw bookingsError;

        const now = new Date();
        const totalBookings = bookings ? bookings.length : 0;
        let totalRevenue = 0;
        let completedCount = 0;
        let upcomingCount = 0;

        const serviceMap: { [key: string]: { name: string; count: number; revenue: number } } = {};
        const dailyMap: { [date: string]: number } = {};

        (bookings || []).forEach((b: any) => {
          const startTime = new Date(b.booking_start);
          const price = parseFloat(b.services?.price || '0');
          const serviceName = b.services?.name || 'Standard Service';

          totalRevenue += price;

          if (startTime < now) {
            completedCount++;
          } else {
            upcomingCount++;
          }

          // Popular services aggregation
          if (!serviceMap[serviceName]) {
            serviceMap[serviceName] = { name: serviceName, count: 0, revenue: 0 };
          }
          serviceMap[serviceName].count += 1;
          serviceMap[serviceName].revenue += price;

          // Daily trends aggregation
          const dateKey = b.booking_start.split('T')[0];
          dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
        });

        const popularServices: PopularService[] = Object.values(serviceMap)
          .sort((a, b) => b.count - a.count)
          .map((s) => ({
            name: s.name,
            booking_count: s.count,
            revenue: s.revenue,
          }));

        const dailyTrends: DailyTrend[] = Object.keys(dailyMap)
          .sort()
          .map((dateKey) => ({
            booking_date: dateKey,
            count: dailyMap[dateKey],
          }));

        setData({
          total_bookings: totalBookings,
          completed_bookings: completedCount,
          upcoming_bookings: upcomingCount,
          total_revenue: totalRevenue,
          popular_services: popularServices,
          daily_trends: dailyTrends,
          package_tier: currentPlan,
        });

      } catch (err: any) {
        console.error('Failed to load analytics:', err);
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [businessId, daysRange]);

  return { data, loading, isRestricted, plan, error };
};