import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Generate or retrieve session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export function usePageTracking() {
  const location = useLocation();
  const { user } = useAuth();
  const pageEntryTime = useRef<number>(Date.now());
  const currentPath = useRef<string>(location.pathname);

  useEffect(() => {
    // Only track authenticated users to prevent anonymous session correlation
    if (!user?.id) return;

    const sessionId = getSessionId();
    
    // Track page view
    const trackPageView = async () => {
      try {
        await supabase.from('page_views').insert({
          user_id: user.id,
          page_path: location.pathname,
          session_id: sessionId,
          duration_seconds: 0,
        });
      } catch (err) {
        // Silent fail for analytics
        console.debug('Analytics tracking failed:', err);
      }
    };

    // Update duration when leaving page
    const updateDuration = async () => {
      const duration = Math.floor((Date.now() - pageEntryTime.current) / 1000);
      if (duration > 0 && currentPath.current) {
        try {
          // We'll update the most recent page view for this session/path
          await supabase
            .from('page_views')
            .update({ duration_seconds: duration })
            .eq('session_id', sessionId)
            .eq('page_path', currentPath.current)
            .order('created_at', { ascending: false })
            .limit(1);
        } catch (err) {
          console.debug('Analytics duration update failed:', err);
        }
      }
    };

    // Track new page
    trackPageView();
    pageEntryTime.current = Date.now();
    currentPath.current = location.pathname;

    // Update duration on unmount or route change
    return () => {
      updateDuration();
    };
  }, [location.pathname, user?.id]);
}
