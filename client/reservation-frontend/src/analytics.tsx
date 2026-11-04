
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from './useBusinessContext';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { businessId, isLoading } = useBusinessContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 font-medium">
        Loading analytics context...
      </div>
    );
  }

  // Guard against null/missing business ID to satisfy TypeScript
  if (!businessId) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Business Found</h3>
        <p className="text-sm text-gray-500 mb-4">
          We couldn't locate a business profile associated with your account.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <AnalyticsDashboard
        businessId={businessId}
        onUpgradeClick={() => {
          // SPA navigation to billing page
          navigate('/admin/settings/billing');
        }}
      />
    </div>
  );
}