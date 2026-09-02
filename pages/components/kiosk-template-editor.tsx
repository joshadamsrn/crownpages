"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Copy, ExternalLink, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";

import {
  KIOSK_TEMPLATE_DEFINITIONS,
  getKioskTemplateUrl,
  normalizeKioskTemplateSettings,
  type KioskTemplateKey,
  type KioskTemplateSettingValues,
  type KioskTemplateSettingsRow,
} from "@/lib/kiosk-template-settings";
import { uploadImageFile } from "@/lib/heic-upload-client";
import { createClient, generatePublicUrl } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { KioskLogoEditor } from "@/components/kiosk-logo-editor";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type EditablePage = {
  id: string;
  title: string;
  slug: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  canEdit: boolean;
};

type ApiPayload = {
  pages?: EditablePage[];
  settings?: KioskTemplateSettingsRow[];
  error?: string;
};

function getDefaultFormValues(templateKey: KioskTemplateKey, row?: KioskTemplateSettingsRow | null) {
  return normalizeKioskTemplateSettings(templateKey, row);
}

function settingsKey(pageId: string, templateKey: KioskTemplateKey) {
  return `${pageId}:${templateKey}`;
}

function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim().replace(/\s+/g, "-");
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

function isHeicFile(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
}

async function prepareLogoForEditing(file: File) {
  if (!isHeicFile(file)) return file;

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/uploads/prepare-heic", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Failed to prepare HEIC image.");
  }

  const blob = await response.blob();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "kiosk-logo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
    </Label>
  );
}

export function KioskTemplateEditor() {
  const supabase = useMemo(() => createClient(), []);
  const [pages, setPages] = useState<EditablePage[]>([]);
  const [settingsByKey, setSettingsByKey] = useState<Record<string, KioskTemplateSettingsRow>>({});
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<KioskTemplateKey>("template1");
  const [formValues, setFormValues] = useState<KioskTemplateSettingValues>(
    getDefaultFormValues("template1"),
  );
  const [kioskLogoPath, setKioskLogoPath] = useState<string | null>(null);
  const [kioskLogoPreviewUrl, setKioskLogoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparingLogo, setPreparingLogo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPage = pages.find((page) => page.id === selectedPageId) || null;
  const selectedTemplate = KIOSK_TEMPLATE_DEFINITIONS.find((template) => template.key === selectedTemplateKey) || KIOSK_TEMPLATE_DEFINITIONS[0];
  const baseUrl = useMemo(
    () => (typeof window === "undefined" ? "" : window.location.origin),
    [],
  );
  const kioskUrl = selectedPage
    ? getKioskTemplateUrl(baseUrl, selectedPage.businessSlug, selectedPage.slug, selectedTemplateKey)
    : "";

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kiosk/template-settings");
      const payload = (await response.json().catch(() => null)) as ApiPayload | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load kiosk templates.");
      }

      const nextPages = (payload?.pages || []).filter((page) => page.canEdit);
      const nextSettings = Object.fromEntries(
        (payload?.settings || []).map((setting) => [
          settingsKey(setting.page_id, setting.template_key),
          setting,
        ]),
      );

      setPages(nextPages);
      setSettingsByKey(nextSettings);
      const firstPageId = nextPages[0]?.id || "";
      setSelectedPageId((current) => current || firstPageId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load kiosk templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const row = selectedPageId ? settingsByKey[settingsKey(selectedPageId, selectedTemplateKey)] : null;
    setFormValues(getDefaultFormValues(selectedTemplateKey, row));
    const logoRow = selectedPageId
      ? Object.values(settingsByKey).find((setting) => setting.page_id === selectedPageId && setting.kiosk_logo_url)
      : null;
    setKioskLogoPath(logoRow?.kiosk_logo_url || null);
    setMessage(null);
    setError(null);
  }, [selectedPageId, selectedTemplateKey, settingsByKey]);

  useEffect(() => {
    let cancelled = false;

    async function resolveLogoPreview() {
      if (!kioskLogoPath) {
        if (!cancelled) setKioskLogoPreviewUrl(null);
        return;
      }

      const resolved = await generatePublicUrl(kioskLogoPath);
      if (!cancelled) {
        setKioskLogoPreviewUrl(resolved || kioskLogoPath);
      }
    }

    void resolveLogoPreview();

    return () => {
      cancelled = true;
    };
  }, [kioskLogoPath]);

  const setValue = (key: keyof KioskTemplateSettingValues, value: string) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const setBooleanValue = (key: keyof KioskTemplateSettingValues, value: boolean) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  };

  const setScanItem = (index: number, value: string) => {
    setFormValues((current) => {
      const nextItems = [...current.scanItems];
      nextItems[index] = value;
      return { ...current, scanItems: nextItems };
    });
    setMessage(null);
    setError(null);
  };

  const copyUrl = async () => {
    if (!kioskUrl) return;

    try {
      await navigator.clipboard.writeText(kioskUrl);
      setMessage("Kiosk URL copied.");
    } catch {
      setError("Could not copy the URL.");
    }
  };

  const handleLogoSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedPage) return;

    setPreparingLogo(true);
    setMessage(null);
    setError(null);

    try {
      setPendingLogoFile(await prepareLogoForEditing(file));
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "Failed to prepare kiosk logo.");
    } finally {
      setPreparingLogo(false);
      event.target.value = "";
    }
  };

  const uploadAdjustedLogo = async (file: File) => {
    if (!selectedPage) throw new Error("Select a page before uploading a kiosk logo.");

    setUploadingLogo(true);
    setMessage(null);
    setError(null);

    try {
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
      const sanitizedName = sanitizeStorageFileName(file.name.replace(/\.[^.]+$/, "")) || "kiosk-logo";
      const storagePath = `pages/${selectedPage.id}/kiosk-logo/${Date.now()}-${sanitizedName}.${extension}`;
      const uploadResult = await uploadImageFile({
        cacheControl: "3600",
        file,
        storagePath,
        supabase,
        upsert: true,
      });

      setKioskLogoPath(uploadResult.storagePath);
      setPendingLogoFile(null);
      setMessage("Kiosk logo uploaded. Save the template to apply it.");
    } catch (uploadError) {
      const uploadMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload kiosk logo.";
      setError(uploadMessage);
      throw new Error(uploadMessage);
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogoOverride = () => {
    setKioskLogoPath(null);
    setKioskLogoPreviewUrl(null);
    setMessage("Kiosk logo override removed. Save the template to use the default logo again.");
    setError(null);
  };

  const saveSettings = async () => {
    if (!selectedPage) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/kiosk/template-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selectedPage.id,
          templateKey: selectedTemplateKey,
          ...formValues,
          kioskLogoUrl: kioskLogoPath,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save kiosk template.");
      }

      const saved = payload?.setting as KioskTemplateSettingsRow | undefined;
      if (saved) {
        setSettingsByKey((current) => ({
          ...current,
          ...Object.fromEntries(
            Object.entries(current)
              .filter(([, setting]) => setting.page_id === saved.page_id)
              .map(([key, setting]) => [key, { ...setting, kiosk_logo_url: saved.kiosk_logo_url || null }]),
          ),
          [settingsKey(saved.page_id, saved.template_key)]: saved,
        }));
      }
      setMessage(`${selectedTemplate.label} saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save kiosk template.");
    } finally {
      setSaving(false);
    }
  };

  const showField = (field: keyof KioskTemplateSettingValues) =>
    selectedTemplate.editableFields.includes(field);

  const templateEditor = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Each template maps to its kiosk route.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {KIOSK_TEMPLATE_DEFINITIONS.map((template) => {
              const selected = template.key === selectedTemplateKey;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => setSelectedTemplateKey(template.key)}
                  className={cn(
                      "overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:border-slate-400",
                      selected ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200",
                    )}
                  >
                  <div className="relative aspect-[16/10] w-full bg-slate-100">
                    <Image
                      src={template.thumbnailSrc}
                      alt={`${template.label} preview`}
                      fill
                      sizes="(max-width: 1024px) 50vw, 420px"
                      className="object-cover"
                    />
                  </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <div className="font-semibold text-slate-950">{template.label}</div>
                      </div>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> : null}
                    </div>
                  </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedTemplate.label} Text</CardTitle>
          <CardDescription>Saved text applies to /{selectedTemplate.routeName} for the selected page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showField("displayPageName") ? (
            <TextField
              label="Header Page Name"
              value={formValues.displayPageName}
              placeholder={selectedPage?.businessName || selectedPage?.title || "Page name"}
              onChange={(value) => setValue("displayPageName", value)}
            />
          ) : null}

          {showField("welcomeTitle") ? (
            <TextField
              label="Welcome Title"
              value={formValues.welcomeTitle}
              onChange={(value) => setValue("welcomeTitle", value)}
            />
          ) : null}

          {showField("welcomeSubtitle") ? (
            <TextField
              label="Welcome Subtitle"
              value={formValues.welcomeSubtitle}
              onChange={(value) => setValue("welcomeSubtitle", value)}
            />
          ) : null}

          {showField("scanTitle") ? (
            <TextField
              label="Scan Heading"
              value={formValues.scanTitle}
              onChange={(value) => setValue("scanTitle", value)}
            />
          ) : null}

          {showField("scanDescription") ? (
            <TextField
              label="Scan Text"
              value={formValues.scanDescription}
              onChange={(value) => setValue("scanDescription", value)}
            />
          ) : null}

          {showField("scanItems") ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">Scan Bullet Text</div>
              {[0, 1, 2].map((index) => (
                <Input
                  key={index}
                  value={formValues.scanItems[index] || ""}
                  onChange={(event) => setScanItem(index, event.target.value)}
                  className="h-11"
                />
              ))}
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-700">Header Buttons</div>
            {["template2", "template3", "template4"].includes(selectedTemplateKey) ? (
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <Checkbox
                  checked={formValues.hideIntakeFormButton}
                  onCheckedChange={(checked) =>
                    setBooleanValue("hideIntakeFormButton", checked === true)
                  }
                />
                Remove Intake Form button
              </label>
            ) : null}
            {selectedTemplateKey === "template4" ? (
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <Checkbox
                  checked={formValues.hideCheckInOutButton}
                  onCheckedChange={(checked) =>
                    setBooleanValue("hideCheckInOutButton", checked === true)
                  }
                />
                Remove Check In / Check Out button
              </label>
            ) : null}
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Checkbox
                checked={!formValues.hideReviewButton}
                onCheckedChange={(checked) =>
                  setBooleanValue("hideReviewButton", checked !== true)
                }
              />
              Show Leave Review button
            </label>
          </div>

          {message ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={() => void saveSettings()}
            disabled={!selectedPage || saving}
            className="h-11 w-full gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-slate-950 dark:text-white">Edit Kiosk</h1>
        <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Choose a page, select a kiosk template, then save the copy shown on that template.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kiosk Page</CardTitle>
          <CardDescription>Select the page and copy the matching kiosk URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading kiosk pages...
            </div>
          ) : pages.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-slate-500">
              No editable pages were found for this account.
            </div>
          ) : (
            <>
              <Label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Page</span>
                <select
                  value={selectedPageId}
                  onChange={(event) => setSelectedPageId(event.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.businessName ? `${page.businessName} - ` : ""}{page.title}
                    </option>
                  ))}
                </select>
              </Label>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <Input value={kioskUrl} readOnly className="h-11 font-mono text-sm" />
                <Button type="button" variant="outline" onClick={() => void copyUrl()} className="h-11 gap-2">
                  <Copy className="h-4 w-4" />
                  Copy URL
                </Button>
                <Button type="button" variant="outline" asChild className="h-11 gap-2">
                  <a href={kioskUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {templateEditor}

      <Card>
        <CardHeader>
          <CardTitle>Kiosk Logo</CardTitle>
          <CardDescription>
            This optional logo override applies to all kiosk templates for the selected page. After choosing an image,
            adjust its position and zoom to fit the kiosk frame.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 md:w-64">
              {kioskLogoPreviewUrl ? (
                <Image
                  src={kioskLogoPreviewUrl}
                  alt="Kiosk logo preview"
                  width={260}
                  height={110}
                  className="max-h-24 max-w-[220px] object-contain"
                  unoptimized
                />
              ) : (
                <span className="px-4 text-center text-sm font-semibold text-slate-500">Upload Kiosk Logo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" disabled={!selectedPage || preparingLogo || uploadingLogo} asChild>
                <label className="cursor-pointer gap-2">
                  {preparingLogo || uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {preparingLogo ? "Preparing..." : uploadingLogo ? "Uploading..." : "Upload Logo"}
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="sr-only"
                    onChange={(event) => void handleLogoSelection(event)}
                    disabled={!selectedPage || preparingLogo || uploadingLogo}
                  />
                </label>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={removeLogoOverride}
                disabled={!kioskLogoPath || preparingLogo || uploadingLogo}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Use Default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {pendingLogoFile ? (
        <KioskLogoEditor
          file={pendingLogoFile}
          onCancel={() => setPendingLogoFile(null)}
          onConfirm={uploadAdjustedLogo}
        />
      ) : null}
    </div>
  );
}
