import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SubtitleStyles {
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  fontWeight: string;
  textShadow: boolean;
}

const defaultStyles: SubtitleStyles = {
  fontSize: 20,
  fontColor: '#ffffff',
  backgroundColor: '#000000',
  backgroundOpacity: 0.75,
  fontWeight: 'normal',
  textShadow: true,
};

// Cache for subtitle styles to avoid repeated fetches
let cachedStyles: SubtitleStyles | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useSubtitleStyles() {
  const [styles, setStyles] = useState<SubtitleStyles>(cachedStyles || defaultStyles);
  const [isLoading, setIsLoading] = useState(!cachedStyles);

  useEffect(() => {
    const now = Date.now();
    
    // Use cached styles if available and fresh
    if (cachedStyles && (now - cacheTimestamp) < CACHE_DURATION) {
      setStyles(cachedStyles);
      setIsLoading(false);
      return;
    }

    const fetchStyles = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'subtitle_styles')
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          cachedStyles = parsed;
          cacheTimestamp = Date.now();
          setStyles(parsed);
        }
      } catch (error) {
        console.error('Error fetching subtitle styles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStyles();
  }, []);

  // Generate CSS for video::cue selector
  const getSubtitleCSS = (): string => {
    const bgColor = styles.backgroundColor === 'transparent'
      ? 'transparent'
      : `${styles.backgroundColor}${Math.round(styles.backgroundOpacity * 255).toString(16).padStart(2, '0')}`;

    return `
      video::cue {
        font-size: ${styles.fontSize}px;
        color: ${styles.fontColor};
        background-color: ${bgColor};
        font-weight: ${styles.fontWeight === 'bold' ? '700' : '400'};
        ${styles.textShadow ? 'text-shadow: 2px 2px 4px rgba(0,0,0,0.8);' : ''}
        padding: 4px 8px;
        border-radius: 4px;
      }
    `;
  };

  return { styles, isLoading, getSubtitleCSS };
}
