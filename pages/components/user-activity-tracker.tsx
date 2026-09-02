"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export function UserActivityTracker() {
  const lastTouchedAtRef = useRef(0);

  useEffect(() => {
    const touch = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastTouchedAtRef.current < ACTIVITY_TOUCH_INTERVAL_MS) {
        return;
      }

      lastTouchedAtRef.current = now;

      try {
        await fetch("/api/user-activity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          keepalive: true,
        });
      } catch {
        if (force) {
          lastTouchedAtRef.current = 0;
        }
      }
    };

    void touch(true);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void touch();
      }
    }, ACTIVITY_TOUCH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void touch();
      }
    };

    const handleFocus = () => {
      void touch();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return null;
}
