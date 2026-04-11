// hooks/useBusinessCheck.ts
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../utils/supabase";

interface UseBusinessCheckOptions {
  redirectOnNoBusinesses?: boolean;
  checkOnMount?: boolean;
}

export function useBusinessCheck(options: UseBusinessCheckOptions = {}) {
  const { redirectOnNoBusinesses = false, checkOnMount = true } = options;
  const { session } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(checkOnMount);
  const [hasBusinesses, setHasBusinesses] = useState<boolean | null>(null);
  const [businessCount, setBusinessCount] = useState(0);

  const checkBusinesses = useCallback(async () => {
    if (!session?.user?.id) {
      setIsChecking(false);
      setHasBusinesses(false);
      return false;
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", session.user.id);

      if (error && error.code !== "PGRST116") {
        console.error("Error checking businesses:", error);
        setIsChecking(false);
        return false;
      }

      const count = data?.length || 0;
      const hasBiz = count > 0;
      
      setBusinessCount(count);
      setHasBusinesses(hasBiz);
      setIsChecking(false);

      // Redirect if no businesses and option is enabled
      if (!hasBiz && redirectOnNoBusinesses) {
        router.push("/(app)/business-setup");
      }

      return hasBiz;
    } catch (error) {
      console.error("Error checking businesses:", error);
      setIsChecking(false);
      return false;
    }
  }, [session?.user?.id, redirectOnNoBusinesses, router]);

  // Check on mount if enabled
  useEffect(() => {
    if (checkOnMount) {
      checkBusinesses();
    }
  }, [checkOnMount]); // Only run once on mount

  return {
    isChecking,
    hasBusinesses,
    businessCount,
    checkBusinesses, // Manual check function
  };
}


