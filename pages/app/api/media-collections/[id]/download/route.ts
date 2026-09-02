import JSZip from "jszip";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { normalizeFileExtensionFromMimeType } from "@/lib/media-collections/url-utils";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

type AssetRow = {
  asset_type: string;
  asset_url: string;
  filename: string | null;
  clean_filename: string | null;
  mime_type: string | null;
  is_duplicate: boolean;
};

type SocialLinkRow = {
  platform: string;
  url: string;
  discovered_from: string | null;
  confidence_score: number | null;
};

function sanitizeSegment(value: string, fallback: string) {
  return (value || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || fallback;
}

function sanitizeFilename(value: string, fallback: string) {
  return (value || fallback)
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "_")
    .replace(/\s+/g, "_")
    .trim() || fallback;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function isVideoLinkPlatform(platform: string) {
  return ["youtube", "vimeo", "wistia", "matterport", "kuula"].includes(platform.toLowerCase());
}

function folderForAsset(assetType: string, folders: { photos: string; pdfs: string; videos: string }) {
  if (assetType === "image") return folders.photos;
  if (assetType === "video") return folders.videos;
  return folders.pdfs;
}

function filenameForAsset(asset: AssetRow, fallbackIndex: number) {
  try {
    const fallbackFromUrl = new URL(asset.asset_url).pathname.split("/").filter(Boolean).at(-1);
    return sanitizeFilename(
      asset.clean_filename || asset.filename || fallbackFromUrl || `asset-${fallbackIndex}`,
      `asset-${fallbackIndex}`,
    );
  } catch {
    return sanitizeFilename(asset.clean_filename || asset.filename || `asset-${fallbackIndex}`, `asset-${fallbackIndex}`);
  }
}

function appendExtensionFromMimeType(filename: string, mimeType?: string | null) {
  if (/\.[a-z0-9]{2,5}$/i.test(filename)) {
    return filename;
  }

  const extension = normalizeFileExtensionFromMimeType(mimeType);
  return extension ? `${filename}${extension}` : filename;
}

function uniqueZipPath(path: string, usedPaths: Set<string>) {
  if (!usedPaths.has(path)) {
    usedPaths.add(path);
    return path;
  }

  const slashIndex = path.lastIndexOf("/");
  const folder = slashIndex >= 0 ? path.slice(0, slashIndex + 1) : "";
  const filename = slashIndex >= 0 ? path.slice(slashIndex + 1) : path;
  const dotIndex = filename.lastIndexOf(".");
  const stem = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const extension = dotIndex > 0 ? filename.slice(dotIndex) : "";

  let counter = 2;
  while (true) {
    const candidate = `${folder}${stem}-${counter}${extension}`;
    if (!usedPaths.has(candidate)) {
      usedPaths.add(candidate);
      return candidate;
    }
    counter += 1;
  }
}

async function fetchAssetBytes(assetUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(assetUrl, {
      headers: {
        "user-agent": "CrownPagesMediaZipExporter/1.0 (+https://crownpages.com)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canObtainMedia = await hasCrownAdminAccess(user.id, supabase);
    if (!canObtainMedia) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      { data: job, error: jobError },
      { data: assets, error: assetsError },
      { data: socialLinks, error: socialError },
    ] = await Promise.all([
      supabase
        .from("media_collection_jobs")
        .select("*")
        .eq("id", id)
        .eq("created_by", user.id)
        .single(),
      supabase
        .from("media_collection_assets")
        .select("asset_type, asset_url, filename, clean_filename, mime_type, is_duplicate")
        .eq("job_id", id)
        .eq("is_duplicate", false)
        .order("created_at", { ascending: true }),
      supabase
        .from("media_collection_social_links")
        .select("platform, url, discovered_from, confidence_score")
        .eq("job_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "The media ZIP is not ready yet. Let the crawl finish first." },
        { status: 409 },
      );
    }

    if (assetsError) {
      return NextResponse.json({ error: assetsError.message }, { status: 500 });
    }

    if (socialError) {
      return NextResponse.json({ error: socialError.message }, { status: 500 });
    }

    const companyName = sanitizeSegment(String(job.company_name ?? "Obtain Media"), "Obtain Media");
    const folders = {
      photos: `${companyName}/${companyName} Photos`,
      pdfs: `${companyName}/${companyName} PDFs`,
      videos: `${companyName}/${companyName} Videos`,
      reports: `${companyName}/${companyName} Reports`,
    };
    const zip = new JSZip();
    const usedPaths = new Set<string>();
    const failures: string[] = [];
    let downloaded = 0;

    for (const [index, asset] of ((assets ?? []) as AssetRow[]).entries()) {
      const folder = folderForAsset(asset.asset_type, folders);

      try {
        const { bytes, mimeType } = await fetchAssetBytes(asset.asset_url);
        const filename = appendExtensionFromMimeType(
          filenameForAsset(asset, index + 1),
          mimeType || asset.mime_type,
        );
        const zipPath = uniqueZipPath(`${folder}/${filename}`, usedPaths);
        zip.file(zipPath, bytes);
        downloaded += 1;
      } catch (error) {
        failures.push(
          `${asset.asset_url} -> ${error instanceof Error ? error.message : "Download failed"}`,
        );
      }
    }

    const typedSocialLinks = (socialLinks ?? []) as SocialLinkRow[];
    const videoLinks = typedSocialLinks.filter((link) => isVideoLinkPlatform(link.platform));
    const youtubeLinks = typedSocialLinks.filter((link) => link.platform.toLowerCase() === "youtube");

    const socialCsv = [
      ["platform", "url", "discovered_from", "confidence_score"].join(","),
      ...typedSocialLinks.map((link) =>
        [link.platform, link.url, link.discovered_from, link.confidence_score]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n");

    const videoLinksCsv = [
      ["platform", "video_or_tour_url", "discovered_from", "confidence_score"].join(","),
      ...videoLinks.map((link) =>
        [link.platform, link.url, link.discovered_from, link.confidence_score]
          .map(csvEscape)
          .join(","),
      ),
    ].join("\n");

    const youtubeLinksText = youtubeLinks.length
      ? [
          "YouTube URLs found during Obtain Media:",
          "",
          ...youtubeLinks.map((link, index) => `${index + 1}. ${link.url}`),
          "",
          "These are links only. Crown Pages does not download YouTube videos automatically.",
        ].join("\n")
      : "No YouTube URLs were found during this media collection.";

    const report = [
      `Company: ${companyName}`,
      `Source URL: ${String(job.source_url ?? "")}`,
      `Pages scanned: ${Number(job.pages_scanned ?? 0)}`,
      `Assets found: ${Number(job.assets_found ?? 0)}`,
      `Duplicates skipped: ${Number(job.duplicates_skipped ?? 0)}`,
      `Files downloaded into ZIP: ${downloaded}`,
      `YouTube URLs found: ${youtubeLinks.length}`,
      `Video / virtual tour links found: ${videoLinks.length}`,
      `Download failures: ${failures.length}`,
      "",
      ...(youtubeLinks.length ? ["YouTube URLs:", ...youtubeLinks.map((link) => `- ${link.url}`), ""] : []),
      ...(videoLinks.length ? ["Video / Virtual Tour Links:", ...videoLinks.map((link) => `- ${link.platform}: ${link.url}`), ""] : []),
      ...(failures.length ? ["Failures:", ...failures.map((failure) => `- ${failure}`)] : []),
    ].join("\n");

    zip.file(`${folders.reports}/social-links.csv`, socialCsv);
    zip.file(`${folders.reports}/video-and-tour-links.csv`, videoLinksCsv);
    zip.file(`${folders.reports}/youtube-urls.txt`, youtubeLinksText);
    zip.file(`${folders.reports}/discovery-report.txt`, report);

    const archive = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    const slug =
      companyName
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "obtain-media";

    return new NextResponse(archive, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}-media.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare media ZIP." },
      { status: 500 },
    );
  }
}
