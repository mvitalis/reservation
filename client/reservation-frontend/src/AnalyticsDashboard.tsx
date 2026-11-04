// AnalyticsDashboard.tsx
import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useBusinessAnalytics } from './useBusinessAnalytics';

interface Props {
  businessId: string;
  onUpgradeClick?: () => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    name?: string;
    [key: string]: unknown;
  }>;
  label?: string | number;
}

const formatDate = (dateStr: string, options: Intl.DateTimeFormatOptions): string => {
  if (!dateStr) return '';
  const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const date = ISO_DATE_REGEX.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr);

  return isNaN(date.getTime())
    ? dateStr
    : date.toLocaleDateString('en-US', options);
};

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length || payload[0]?.value === undefined) {
    return null;
  }

  const dateFormatted = formatDate(String(label ?? ''), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const value = payload[0].value ?? 0;

  return (
    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-lg border border-slate-700 text-xs space-y-1">
      <p className="font-semibold text-slate-300">{dateFormatted}</p>
      <p className="text-purple-400 font-bold text-sm">
        {value} {value === 1 ? 'Booking' : 'Bookings'}
      </p>
    </div>
  );
};

export const AnalyticsDashboard: React.FC<Props> = ({ businessId, onUpgradeClick }) => {
  const [range, setRange] = useState<number>(30);
  const { data, loading, isRestricted, plan, error } = useBusinessAnalytics(businessId, range);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-slate-400 font-medium animate-pulse">
        Loading analytics data...
      </div>
    );
  }

  if (isRestricted) {
    return (
      <div className="max-w-4xl mx-auto my-8 p-8 bg-gradient-to-br from-slate-900 to-purple-950 text-white rounded-2xl shadow-xl text-center">
        <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          🔒
        </div>
        <h2 className="text-2xl font-extrabold mb-2">Appointment Analytics is a Pro Feature</h2>
        <p className="text-slate-300 max-w-md mx-auto mb-6 text-sm">
          Gain full visibility into your business revenue, peak booking periods, and top-performing services by upgrading to a paid tier.
        </p>
        <button
          onClick={onUpgradeClick}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg transition-colors cursor-pointer"
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm rounded-lg">
        {error || 'Unable to load analytics.'}
      </div>
    );
  }

  const revenueDisplay = Number(data.total_revenue || 0).toFixed(2);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 font-sans text-slate-900 dark:text-slate-100">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Appointment Analytics</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400">Performance overview for your business ({plan || 'Free'} Plan)</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="p-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Estimated Revenue</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">${revenueDisplay}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Total Bookings</p>
          <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400 mt-1">{data.total_bookings ?? 0}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Completed</p>
          <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-1">{data.completed_bookings ?? 0}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">Upcoming</p>
          <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{data.upcoming_bookings ?? 0}</p>
        </div>
      </div>

      {/* Daily Booking Trends Chart */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Daily Booking Trends</h3>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">Volume over time</span>
        </div>

        {!data.daily_trends || data.daily_trends.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400 dark:text-slate-500">
            No daily booking data available for this range.
          </div>
        ) : (
          <div className="h-72 w-full min-w-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data.daily_trends}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis
                  dataKey="booking_date"
                  tickFormatter={(tick) =>
                    formatDate(tick, { month: 'numeric', day: 'numeric' })
                  }
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="#E9D5FF"
                  radius={[4, 4, 0, 0]}
                  barSize={range === 90 ? 6 : 16}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#9333EA"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#9333EA' }}
                  activeDot={{ r: 6, fill: '#7E22CE' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Popular Services Table */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Top Performing Services</h3>
        {!data.popular_services || data.popular_services.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No bookings recorded during this date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-700 dark:text-slate-300">
              <thead className="border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.popular_services.map((service, idx) => (
                  <tr key={service.name || idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{service.name}</td>
                    <td className="py-3 px-4">{service.booking_count ?? 0}</td>
                    <td className="py-3 px-4 font-semibold text-green-700 dark:text-green-400">
                      ${Number(service.revenue || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};