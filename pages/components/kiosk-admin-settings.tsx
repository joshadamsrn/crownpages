"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type BusinessOption = { id: string; name: string; slug: string };
type KioskAdmin = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
};

const MAX_ADMINS = 2;

export function KioskAdminSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [admins, setAdmins] = useState<KioskAdmin[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAdmins = useCallback(async (businessId: string) => {
    setError(null);
    const response = await fetch(`/api/kiosk/admins?businessId=${encodeURIComponent(businessId)}`);
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Failed to load kiosk administrators.");
    setAdmins((payload?.admins || []) as KioskAdmin[]);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Not authenticated");

        const { data, error: businessError } = await supabase
          .from("businesses")
          .select("id, name, slug")
          .eq("owner_id", authData.user.id)
          .eq("is_active", true)
          .order("name", { ascending: true });
        if (businessError) throw businessError;

        const nextBusinesses = (data || []) as BusinessOption[];
        const firstBusinessId = nextBusinesses[0]?.id || "";
        setBusinesses(nextBusinesses);
        setSelectedBusinessId(firstBusinessId);
        if (firstBusinessId) await loadAdmins(firstBusinessId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load kiosk administrators.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [loadAdmins, supabase]);

  const addAdmin = async () => {
    if (!selectedBusinessId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/kiosk/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selectedBusinessId, firstName, lastName, email }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to add kiosk administrator.");

      setFirstName("");
      setLastName("");
      setEmail("");
      await loadAdmins(selectedBusinessId);
      setMessage("Kiosk administrator added.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to add kiosk administrator.");
    } finally {
      setSaving(false);
    }
  };

  const removeAdmin = async (admin: KioskAdmin) => {
    if (!selectedBusinessId || !window.confirm(`Remove kiosk access for ${admin.first_name} ${admin.last_name}?`)) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const params = new URLSearchParams({ businessId: selectedBusinessId, adminId: admin.id });
      const response = await fetch(`/api/kiosk/admins?${params.toString()}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to remove kiosk administrator.");
      await loadAdmins(selectedBusinessId);
      setMessage("Kiosk administrator removed.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove kiosk administrator.");
    } finally {
      setSaving(false);
    }
  };

  if (!loading && businesses.length === 0) return null;

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Kiosk Administrators
        </CardTitle>
        <CardDescription>
          Grant up to two additional people full access to kiosk settings, templates, visitor reports, and kiosk leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {businesses.length > 1 ? (
          <label className="grid gap-2 text-sm font-medium">
            Business
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={selectedBusinessId}
              onChange={async (event) => {
                setSelectedBusinessId(event.target.value);
                setAdmins([]);
                await loadAdmins(event.target.value);
              }}
            >
              {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
            </select>
          </label>
        ) : null}

        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="font-medium">{admin.first_name} {admin.last_name}</p>
                <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">Access connected</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void removeAdmin(admin)}>
                <Trash2 className="mr-2 h-4 w-4" /> Remove
              </Button>
            </div>
          ))}
          {admins.length === 0 && !loading ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No additional kiosk administrators.</p> : null}
        </div>

        {admins.length < MAX_ADMINS ? (
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-3">
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" maxLength={80} />
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" maxLength={80} />
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" maxLength={254} />
            <div className="md:col-span-3">
              <Button type="button" disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()} onClick={() => void addAdmin()}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Kiosk Administrator
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Both additional kiosk administrator seats are in use.</p>
        )}

        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
