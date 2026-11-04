// components/AdminSidebar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { ADMIN_MENU_ITEMS } from './navigation';

interface SidebarProps {
  userTier: 'free' | 'pro' | 'business';
}

export const AdminSidebar: React.FC<SidebarProps> = ({ userTier }) => {
  const location = useLocation();
  const isPaidUser = userTier === 'pro' || userTier === 'business';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen p-4 space-y-2">
      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Business Admin
      </div>
      <nav className="space-y-1">
        {ADMIN_MENU_ITEMS.map((item) => {
          const isActive = location.pathname === item.href;
          const isLocked = item.isPro && !isPaidUser;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>{item.label}</span>

              {/* Show Pro badge/Lock icon for free users */}
              {isLocked && (
                <span className="flex items-center gap-1 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  PRO
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};