"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type BusinessOption = {
  id: string;
  name: string;
  slug: string;
};

export function KioskOverviewPasswordSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [password, setPassword] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null;

  const loadPasswordStatus = useCallback(async (businessId: string) => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/kiosk/overview-password?businessId=${businessId}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load kiosk overview password status.");
      }

      setIsConfigured(Boolean(payload?.isConfigured));
      setUpdatedAt(payload?.updatedAt || null);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to load password status.");
    }
  }, []);

  useEffect(() => {
    const loadBusinesses = async () => {
      setLoading(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) throw new Error("Not authenticated");

        const { data: kioskAdminRows, error: kioskAdminError } = await supabase
          .from("kiosk_admins")
          .select("business_id")
          .eq("user_id", user.id);

        if (kioskAdminError) throw kioskAdminError;

        const kioskAdminBusinessIds = (kioskAdminRows || []).map((row) => row.business_id);
        let businessesQuery = supabase
          .from("businesses")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name", { ascending: true });

        businessesQuery = kioskAdminBusinessIds.length > 0
          ? businessesQuery.or(`owner_id.eq.${user.id},id.in.(${kioskAdminBusinessIds.join(",")})`)
          : businessesQuery.eq("owner_id", user.id);

        const { data, error: businessesError } = await businessesQuery;

        if (businessesError) throw businessesError;

        const nextBusinesses = (data || []) as BusinessOption[];
        setBusinesses(nextBusinesses);
        const firstBusinessId = nextBusinesses[0]?.id || "";
        setSelectedBusinessId(firstBusinessId);

        if (firstBusinessId) {
          await loadPasswordStatus(firstBusinessId);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load businesses.");
      } finally {
        setLoading(false);
      }
    };

    void loadBusinesses();
  }, [loadPasswordStatus, supabase]);

  const handleBusinessChange = async (businessId: string) => {
    setSelectedBusinessId(businessId);
    setPassword("");
    if (businessId) {
      await loadPasswordStatus(businessId);
    }
  };

  const handleSave = async () => {
    if (!selectedBusinessId) return;
    if (password.trim().length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/kiosk/overview-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selectedBusinessId, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save kiosk overview password.");
      }

      setPassword("");
      setIsConfigured(true);
      setUpdatedAt(payload?.updatedAt || new Date().toISOString());
      setMessage("Kiosk overview password updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save password.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedBusinessId || !window.confirm("Remove kiosk overview password access for this business?")) {
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/kiosk/overview-password?businessId=${selectedBusinessId}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to remove kiosk overview password.");
      }

      setPassword("");
      setIsConfigured(false);
      setUpdatedAt(null);
      setMessage("Kiosk overview password removed.");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to remove password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Kiosk Overview Access
        </CardTitle>
        <CardDescription>
          Set the admin password used by the Overview of Kiosk button on kiosk screens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-muted-foreground">
            Loading kiosk access settings...
          </div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-muted-foreground">
            No businesses found for this account.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-sm font-medium">Business</span>
                <select
                  value={selectedBusinessId}
                  onChange={(event) => void handleBusinessChange(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">New Password</span>
                <Input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                    setMessage(null);
                  }}
                  type="password"
                  autoComplete="new-password"
                  placeholder={isConfigured ? "Enter a new password" : "Create a password"}
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {selectedBusiness?.name || "This business"} is{" "}
              <span className="font-semibold text-slate-900">
                {isConfigured ? "configured" : "not configured"}
              </span>
              {updatedAt ? ` for kiosk overview access. Last updated ${new Date(updatedAt).toLocaleString()}.` : "."}
            </div>

            {message ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || password.trim().length < 4}
              >
                {saving ? "Saving..." : isConfigured ? "Update Password" : "Create Password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleClear()}
                disabled={saving || !isConfigured}
              >
                <Trash2 className="h-4 w-4" />
                Remove Password
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
