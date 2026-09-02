'use client';

import { useEffect } from 'react';
import { trackPageView, trackPageExit } from '@/lib/analytics';

interface AnalyticsProps {
  pageId: string;
  userId?: string;
}

export function Analytics({ pageId, userId }: AnalyticsProps) {
  useEffect(() => {
    // Persist tracker link code/mode before page_view fires so the first event is attributed.
    // Quick Share stays anonymous, while named tracker links can be carried across sessions.
    try {
      const url = new URL(window.location.href);
      const tl = url.searchParams.get('tl');
      const mode = url.searchParams.get('cp_track');

      if (window.location.pathname.startsWith('/share/')) {
        sessionStorage.setItem('crownpages_attribution_mode', 'quick_share');
        sessionStorage.removeItem('crownpages_tl');
      } else if (tl) {
        sessionStorage.setItem('crownpages_tl', tl);
        sessionStorage.setItem(
          'crownpages_attribution_mode',
          mode === 'anonymous' || mode === 'quick_share' ? 'anonymous' : 'contact',
        );
      }
    } catch { /* ignore */ }

    trackPageView(pageId, userId);

    let startTime = Date.now();
    let exitTrackedForCurrentView = false;

    const trackExitOnce = () => {
      if (exitTrackedForCurrentView) return;
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds > 0) {
        exitTrackedForCurrentView = true;
        trackPageExit(pageId, seconds, userId);
      }
    };

    const handleBeforeUnload = () => {
      trackExitOnce();
    };

    // visibilitychange fires reliably on mobile browsers (iOS Safari, Android Chrome)
    // when the user backgrounds the app or switches tabs — unlike beforeunload which is
    // not guaranteed on mobile. We fire page_exit on hide and reset startTime on show
    // so that a visitor who returns is tracked as a fresh dwell period.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackExitOnce();
        startTime = Date.now();
        exitTrackedForCurrentView = false;
      } else if (document.visibilityState === 'visible') {
        startTime = Date.now();
        exitTrackedForCurrentView = false;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Also fire on React unmount (SPA navigation)
      trackExitOnce();
    };
  }, [pageId, userId]);

  return null;
}

// New component for business page analytics
import { trackBusinessPageView } from "@/lib/analytics";

interface BusinessPageAnalyticsProps {
  businessPageId: string;
  businessId: string;
  userId?: string;
}

export function BusinessPageAnalytics({ businessPageId, businessId, userId }: BusinessPageAnalyticsProps) {
  useEffect(() => {
    // Track business page view on component mount
    trackBusinessPageView(businessPageId, businessId, userId);
  }, [businessPageId, businessId, userId]);

  return null; // This component doesn't render anything
}
