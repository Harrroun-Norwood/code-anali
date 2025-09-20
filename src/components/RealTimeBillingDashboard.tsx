import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BillingDashboard from '@/pages/BillingDashboard';

const RealTimeBillingDashboard = () => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for billing updates
    const billingChannel = supabase
      .channel('billing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing',
          filter: `student_id=eq.${user.id}`
        },
        () => {
          // Force refresh of billing data
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    // Set up real-time subscription for profile status changes
    const profileChannel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Force refresh when profile status changes
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      billingChannel.unsubscribe();
      profileChannel.unsubscribe();
    };
  }, [user]);

  return <BillingDashboard key={refreshKey} />;
};

export default RealTimeBillingDashboard;