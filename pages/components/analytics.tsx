'use client';

import { useEffect } from 'react';
import { trackPageView, trackPageExit } from '@/lib/analytics';

interface AnalyticsProps {
  pageId: string;
  userId?: string;
}

export function Analytics({ pageId, userId }: AnalyticsProps) {
  useEffect(() => {
    // Persist tracker link code for this session so all subsequent events carry it.
    // sessionStorage (not localStorage) is intentional — it clears when the tab closes,
    // preventing a visitor who returns organically later from being mis-attributed.
    try {
      const tl = new URL(window.location.href).searchParams.get('tl');
      if (tl) {
        sessionStorage.setItem('crownpages_tl', tl);

        // Also record the real client-side visitor_id in trackable_link_events so
        // the DB table stays accurate for direct lookups from the mobile app.
        // Uses a check-then-insert pattern since there's no unique constraint.
        const visitorId = localStorage.getItem('crownpages_visitor_id');
        if (visitorId) {
          import('@/lib/supabase/client').then(({ createClient }) => {
            const supabase = createClient();
            supabase
              .from('trackable_links')
              .select('id')
              .eq('tracking_code', tl)
              .maybeSingle()
              .then(({ data: link }) => {
                if (link?.id) {
                  // Only insert if this (link, visitor) pair isn't already recorded
                  supabase
                    .from('trackable_link_events')
                    .select('id', { count: 'exact', head: true })
                    .eq('trackable_link_id', link.id)
                    .eq('visitor_id', visitorId)
                    .then(({ count }) => {
                      if (!count) {
                        supabase.from('trackable_link_events').insert({
                          trackable_link_id: link.id,
                          visitor_id: visitorId,
                          event_type: 'view',
                        }).then(() => {});
                      }
                    });
                }
              });
          });
        }
      }
    } catch { /* ignore */ }

    trackPageView(pageId, userId);

    let startTime = Date.now();

    const handleBeforeUnload = () => {
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds > 0) {
        trackPageExit(pageId, seconds, userId);
      }
    };

    // visibilitychange fires reliably on mobile browsers (iOS Safari, Android Chrome)
    // when the user backgrounds the app or switches tabs — unlike beforeunload which is
    // not guaranteed on mobile. We fire page_exit on hide and reset startTime on show
    // so that a visitor who returns is tracked as a fresh dwell period.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const seconds = Math.round((Date.now() - startTime) / 1000);
        if (seconds > 0) {
          trackPageExit(pageId, seconds, userId);
        }
        startTime = Date.now();
      } else if (document.visibilityState === 'visible') {
        startTime = Date.now();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Also fire on React unmount (SPA navigation)
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds > 0) {
        trackPageExit(pageId, seconds, userId);
      }
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