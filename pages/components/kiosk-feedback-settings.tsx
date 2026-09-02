"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquareHeart, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type BusinessOption = { id: string; name: string; slug: string };

function normalizeUrl(value: string) {
  if (!value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function KioskFeedbackSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [reviewUrl, setReviewUrl] = useState("");
  const [savedReviewUrl, setSavedReviewUrl] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSetting, setLoadingSetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedReviewUrl = normalizeUrl(reviewUrl);
  const urlIsInvalid = reviewUrl.trim().length > 0 && !normalizedReviewUrl;

  const loadSetting = useCallback(async (businessId: string) => {
    setLoadingSetting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/kiosk/feedback-settings?businessId=${businessId}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load kiosk feedback settings.");
      setSavedReviewUrl(payload?.reviewUrl || null);
      setReviewUrl(payload?.reviewUrl || "");
      setUpdatedAt(payload?.updatedAt || null);
    } catch (loadError) {
      setSavedReviewUrl(null);
      setReviewUrl("");
      setUpdatedAt(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load kiosk feedback settings.");
    } finally {
      setLoadingSetting(false);
    }
  }, []);

  useEffect(() => {
    const loadBusinesses = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Not authenticated");

        const { data: adminRows, error: adminError } = await supabase
          .from("kiosk_admins")
          .select("business_id")
          .eq("user_id", user.id);
        if (adminError) throw adminError;

        const adminIds = (adminRows || []).map((row) => row.business_id);
        let query = supabase
          .from("businesses")
          .select("id, name, slug")
          .eq("is_active", true)
          .order("name", { ascending: true });
        query = adminIds.length > 0
          ? query.or(`owner_id.eq.${user.id},id.in.(${adminIds.join(",")})`)
          : query.eq("owner_id", user.id);

        const { data, error: businessesError } = await query;
        if (businessesError) throw businessesError;
        const nextBusinesses = (data || []) as BusinessOption[];
        setBusinesses(nextBusinesses);
        setSelectedBusinessId(nextBusinesses[0]?.id || "");
        if (nextBusinesses[0]) await loadSetting(nextBusinesses[0].id);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load businesses.");
      } finally {
        setLoading(false);
      }
    };
    void loadBusinesses();
  }, [loadSetting, supabase]);

  const handleBusinessChange = async (businessId: string) => {
    setSelectedBusinessId(businessId);
    setReviewUrl("");
    setSavedReviewUrl(null);
    setUpdatedAt(null);
    if (businessId) await loadSetting(businessId);
  };

  const handleSave = async () => {
    if (!selectedBusinessId) return;
    if (urlIsInvalid) {
      setError("Enter a complete http or https URL.");
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/kiosk/feedback-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selectedBusinessId, reviewUrl: normalizedReviewUrl || "" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to save kiosk feedback settings.");
      setSavedReviewUrl(payload?.reviewUrl || null);
      setReviewUrl(payload?.reviewUrl || "");
      setUpdatedAt(payload?.updatedAt || null);
      setMessage(payload?.reviewUrl ? "Kiosk feedback review link updated." : "Kiosk feedback review link cleared.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save kiosk feedback settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareHeart className="h-5 w-5" />
          Kiosk Feedback Review Link
        </CardTitle>
        <CardDescription>
          Enter your URL for feedback submissions. A five-star kiosk response will display a QR code for this destination.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Loading kiosk feedback settings...</div>
        ) : businesses.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No businesses found for this account.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">Business</span>
                <select value={selectedBusinessId} onChange={(event) => void handleBusinessChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Feedback / Review URL</span>
                <Input
                  value={reviewUrl}
                  onChange={(event) => { setReviewUrl(event.target.value); setMessage(null); setError(null); }}
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://yourcompany.com/compliments-and-concerns"
                />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Current destination: <span className="font-semibold text-slate-900">{loadingSetting ? "loading..." : savedReviewUrl || "not configured"}</span>
              {updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleString()}.` : "."}
            </div>
            {message ? <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <Button type="button" onClick={() => void handleSave()} disabled={saving || loadingSetting || urlIsInvalid}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Feedback Link"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
