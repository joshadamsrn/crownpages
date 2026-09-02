"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient, generatePublicUrl, generateSignedUrl } from "@/lib/supabase/client";
import { uploadImageFile } from "@/lib/heic-upload-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PageOgImageFormProps = {
  pageId: string;
  pageTitle: string;
  currentOgImageUrl: string | null;
};

function sanitizeStorageFileName(fileName: string) {
  const trimmed = fileName.trim().replace(/\s+/g, "-");
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

export function PageOgImageForm({
  pageId,
  pageTitle,
  currentOgImageUrl,
}: PageOgImageFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [ogImagePath, setOgImagePath] = useState<string | null>(currentOgImageUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolvePreview() {
      if (!ogImagePath) {
        if (!cancelled) setPreviewUrl(null);
        return;
      }

      const resolved =
        (await generateSignedUrl(ogImagePath, 60 * 60 * 24)) ||
        (await generatePublicUrl(ogImagePath));

      if (!cancelled) {
        setPreviewUrl(resolved || null);
      }
    }

    void resolvePreview();

    return () => {
      cancelled = true;
    };
  }, [ogImagePath]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const sanitizedName = sanitizeStorageFileName(file.name.replace(/\.[^.]+$/, ""));
      const storagePath = `pages/${pageId}/og/${Date.now()}-${sanitizedName}.${extension}`;

      const uploadResult = await uploadImageFile({
        cacheControl: "3600",
        file,
        storagePath,
        supabase,
        upsert: true,
      });

      const { error: updateError } = await supabase
        .from("pages")
        .update({
          og_image_url: uploadResult.storagePath,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (updateError) throw updateError;

      setOgImagePath(uploadResult.storagePath);
      setMessage("Open Graph image updated.");
      router.refresh();
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError instanceof Error ? uploadError.message : "Failed to update the OG image.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase
        .from("pages")
        .update({
          og_image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pageId);

      if (updateError) throw updateError;

      setOgImagePath(null);
      setMessage("Open Graph image removed.");
      router.refresh();
    } catch (removeError) {
      console.error(removeError);
      setError(removeError instanceof Error ? removeError.message : "Failed to remove the OG image.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/protected/pages">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pages
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Update OG Image</h1>
            <p className="text-muted-foreground">{pageTitle}</p>
          </div>
        </div>

        <Button asChild variant="outline">
          <Link href={`/protected/pages/${pageId}/edit`}>Back to Editor</Link>
        </Button>
      </div>

      {message ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-slate-50 dark:bg-slate-950">
              {previewUrl ? (
                <div className="relative aspect-[1200/630] w-full">
                  <Image
                    src={previewUrl}
                    alt={`${pageTitle} OG image`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 40vw, 100vw"
                  />
                </div>
              ) : (
                <div className="flex aspect-[1200/630] w-full items-center justify-center text-sm text-muted-foreground">
                  No OG image assigned yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Replace Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="og-image-upload">Open Graph Image</Label>
              <p className="text-sm text-muted-foreground">
                Upload a 1200 x 630 image for link previews, page thumbnails, and social sharing.
              </p>
            </div>

            <label
              htmlFor="og-image-upload"
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-primary/50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mb-3 h-6 w-6 animate-spin" />
                  <span className="text-sm font-medium">Uploading image...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">Upload a new OG image</span>
                  <span className="mt-1 text-xs text-muted-foreground">PNG, JPG, or WEBP</span>
                </>
              )}
            </label>
            <input
              id="og-image-upload"
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />

            {ogImagePath ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void handleRemove()}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove OG Image
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
