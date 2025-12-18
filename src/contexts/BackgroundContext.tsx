import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BackgroundSettings {
  imageUrl: string | null;
  opacity: number;
}

interface BackgroundContextType {
  settings: BackgroundSettings;
  refreshSettings: () => Promise<void>;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BackgroundSettings>({
    imageUrl: null,
    opacity: 0.1,
  });

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['background_image', 'background_opacity']);

      if (data) {
        const bgImage = data.find((s) => s.key === 'background_image')?.value || null;
        const bgOpacity = data.find((s) => s.key === 'background_opacity')?.value;
        
        setSettings({
          imageUrl: bgImage,
          opacity: bgOpacity ? parseFloat(bgOpacity) : 0.1,
        });
      }
    } catch (error) {
      console.error('Error fetching background settings:', error);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BackgroundContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
}

export function BackgroundImage() {
  const { settings } = useBackground();

  if (!settings.imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${settings.imageUrl})`,
        opacity: settings.opacity,
      }}
    />
  );
}
