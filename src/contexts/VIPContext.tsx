import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface VIPStatus {
  isVIP: boolean;
  noAds: boolean;
  noIpBan: boolean;
  allowDevtools: boolean;
  isLoading: boolean;
}

const VIPContext = createContext<VIPStatus>({
  isVIP: false,
  noAds: false,
  noIpBan: false,
  allowDevtools: false,
  isLoading: true,
});

export function VIPProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<VIPStatus>({
    isVIP: false,
    noAds: false,
    noIpBan: false,
    allowDevtools: false,
    isLoading: true,
  });

  useEffect(() => {
    if (user) {
      checkVIPStatus();
    } else {
      setStatus({
        isVIP: false,
        noAds: false,
        noIpBan: false,
        allowDevtools: false,
        isLoading: false,
      });
    }
  }, [user]);

  const checkVIPStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vip_users')
        .select('no_ads, no_ip_ban, allow_devtools')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking VIP status:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (data) {
        setStatus({
          isVIP: true,
          noAds: data.no_ads ?? false,
          noIpBan: data.no_ip_ban ?? false,
          allowDevtools: data.allow_devtools ?? false,
          isLoading: false,
        });
      } else {
        setStatus({
          isVIP: false,
          noAds: false,
          noIpBan: false,
          allowDevtools: false,
          isLoading: false,
        });
      }
    } catch (err) {
      console.error('VIP check failed:', err);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <VIPContext.Provider value={status}>
      {children}
    </VIPContext.Provider>
  );
}

export function useVIP() {
  return useContext(VIPContext);
}
