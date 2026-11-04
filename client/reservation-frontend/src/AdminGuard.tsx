import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'super_admin');
    };

    checkAdminStatus();
  }, []);

  if (isAdmin === null) return <div className="p-6">Verifying platform access...</div>;
  if (!isAdmin) return <div className="p-6 text-red-600">Access Denied: Super Admin privileges required.</div>;

  return <>{children}</>;
};