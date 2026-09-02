"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

interface AnalyticsRealtimeRefreshProps {
  pageId: string;
}

export function AnalyticsRealtimeRefresh({ pageId }: AnalyticsRealtimeRefreshProps) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    if (!pageId) {
      return;
    }

    const supabase = createClient();
    const refresh = () => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      const now = Date.now();
      if (now - lastRefreshAt.current < 1000) {
        return;
      }

      lastRefreshAt.current = now;
      router.refresh();
    };

    const channel = supabase
      .channel(`analytics-events-${pageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics_events",
          filter: `page_id=eq.${pageId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kiosk_visitor_logs",
          filter: `page_id=eq.${pageId}`,
        },
        refresh,
      )
      .subscribe();

    const intervalId = window.setInterval(refresh, 10000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [pageId, router]);

  return null;
}
