"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Bot, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type BusinessOption = { id: string; name: string };
type KnowledgeFile = { id: string; filename: string; byte_size: number; status: string; created_at: string };
const DEFAULT_WELCOME = "Hi! What would you like to know about this community?";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AIAssistantSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [serverReady, setServerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (id: string) => {
    setLoading(true); setMessage(null); setError(null);
    try {
      const response = await fetch(`/api/ai-assistant/settings?businessId=${encodeURIComponent(id)}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to load assistant settings.");
      setEnabled(Boolean(payload.enabled));
      setWelcomeMessage(payload.welcomeMessage || DEFAULT_WELCOME);
      setFiles(payload.files || []);
      setServerReady(Boolean(payload.serverReady));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load assistant settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: adminRows } = await supabase.from("kiosk_admins").select("business_id").eq("user_id", user.id);
        const adminIds = (adminRows || []).map((row) => row.business_id);
        let query = supabase.from("businesses").select("id, name").eq("is_active", true).order("name");
        query = adminIds.length ? query.or(`owner_id.eq.${user.id},id.in.(${adminIds.join(",")})`) : query.eq("owner_id", user.id);
        const { data, error: businessError } = await query;
        if (businessError) throw businessError;
        const options = (data || []) as BusinessOption[];
        setBusinesses(options);
        const firstId = options[0]?.id || "";
        setBusinessId(firstId);
        if (firstId) await loadSettings(firstId); else setLoading(false);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load businesses.");
        setLoading(false);
      }
    })();
  }, [loadSettings, supabase]);

  const save = async () => {
    if (!businessId) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/ai-assistant/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, enabled, welcomeMessage }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to save assistant settings.");
      setMessage(enabled ? "AI assistant enabled for this business's public pages." : "AI assistant settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save assistant settings.");
    } finally { setSaving(false); }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !businessId) return;
    setUploading(true); setMessage(null); setError(null);
    try {
      const form = new FormData(); form.append("businessId", businessId); form.append("file", file);
      const response = await fetch("/api/ai-assistant/documents", { method: "POST", body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to upload document.");
      setFiles((current) => [payload.file, ...current]);
      setMessage(`${file.name} is being indexed. It may take a minute before it can answer questions.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload document.");
    } finally { setUploading(false); }
  };

  const remove = async (file: KnowledgeFile) => {
    if (!businessId || !window.confirm(`Remove ${file.filename} from the assistant?`)) return;
    setRemoving(file.id); setMessage(null); setError(null);
    try {
      const response = await fetch("/api/ai-assistant/documents", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, documentId: file.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to remove document.");
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setMessage(`${file.filename} removed.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove document.");
    } finally { setRemoving(null); }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Public Page AI Assistant</CardTitle>
        <CardDescription>
          Let visitors ask questions using your page content, its public links and PDFs, and private business documents you provide.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading assistant settings…</div> : businesses.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No businesses found.</div> : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-medium">Business</span><select value={businessId} onChange={(event) => { setBusinessId(event.target.value); void loadSettings(event.target.value); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>
              <label className="flex items-center justify-between rounded-xl border p-4"><span><span className="block text-sm font-semibold">Show assistant on public pages</span><span className="text-xs text-muted-foreground">Visitors do not need an account.</span></span><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-blue-600" /></label>
            </div>
            {!serverReady ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Add <code>OPENAI_API_KEY</code> to the website server before enabling the assistant.</div> : null}
            <label className="space-y-2"><span className="text-sm font-medium">Welcome message</span><Input value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} maxLength={180} placeholder={DEFAULT_WELCOME} /></label>
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Business knowledge documents</h3><p className="text-sm text-muted-foreground">PDF, Word, PowerPoint, text, or Markdown · up to 20 MB each</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"><Upload className="h-4 w-4" />{uploading ? "Uploading…" : "Add document"}<input type="file" className="sr-only" accept=".pdf,.doc,.docx,.txt,.md,.ppt,.pptx" onChange={(event) => void upload(event)} disabled={uploading} /></label></div>
              <div className="mt-4 space-y-2">{files.length ? files.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3"><FileText className="h-5 w-5 text-slate-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.filename}</p><p className="text-xs text-slate-500">{formatBytes(Number(file.byte_size || 0))} · {file.status === "completed" ? "Ready" : file.status === "failed" ? "Indexing failed" : "Processing"}</p></div><button type="button" onClick={() => void remove(file)} disabled={removing === file.id} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${file.filename}`}>{removing === file.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div>) : <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No documents added. The assistant can still answer from the public page content.</p>}</div>
            </div>
            {message ? <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div> : null}
            {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <Button type="button" onClick={() => void save()} disabled={saving || !welcomeMessage.trim() || (enabled && !serverReady)}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save AI Assistant"}</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
