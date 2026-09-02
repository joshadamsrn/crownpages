import { NextResponse } from "next/server";

import { buildDesktopMediaManifest } from "@/lib/media-collections/manifest";
import { DEFAULT_MEDIA_COLLECTION_OPTIONS, type MediaCollectionAsset, type MediaCollectionJobSummary, type MediaCollectionOptions, type MediaCollectionSocialLink } from "@/lib/media-collections/types";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";

function mapJob(row: Record<string, unknown>): MediaCollectionJobSummary {
  const status = String(row.status ?? "queued") as MediaCollectionJobSummary["status"];
  return {
    id: String(row.id),
    pageId: typeof row.page_id === "string" ? row.page_id : null,
    businessId: typeof row.business_id === "string" ? row.business_id : null,
    companyName: String(row.company_name ?? ""),
    sourceUrl: String(row.source_url ?? ""),
    status,
    currentStage: String(row.current_stage ?? "queued") as MediaCollectionJobSummary["currentStage"],
    options: (row.options as MediaCollectionOptions | null) ?? DEFAULT_MEDIA_COLLECTION_OPTIONS,
    pagesScanned: Number(row.pages_scanned ?? 0),
    assetsFound: Number(row.assets_found ?? 0),
    assetsDownloaded: Number(row.assets_downloaded ?? 0),
    duplicatesSkipped: Number(row.duplicates_skipped ?? 0),
    failuresCount: Number(row.failures_count ?? 0),
    report: (row.report as Record<string, unknown> | null) ?? {},
    desktopManifestReady: status === "completed",
    deliveryMode: "desktop-worker",
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function mapAsset(row: Record<string, unknown>): MediaCollectionAsset {
  return {
    id: String(row.id),
    assetType: String(row.asset_type) as MediaCollectionAsset["assetType"],
    sourcePageUrl: typeof row.source_page_url === "string" ? row.source_page_url : null,
    assetUrl: String(row.asset_url ?? ""),
    normalizedAssetUrl: String(row.normalized_asset_url ?? ""),
    filename: typeof row.filename === "string" ? row.filename : null,
    cleanFilename: typeof row.clean_filename === "string" ? row.clean_filename : null,
    mimeType: typeof row.mime_type === "string" ? row.mime_type : null,
    width: typeof row.width === "number" ? row.width : null,
    height: typeof row.height === "number" ? row.height : null,
    byteSize: typeof row.byte_size === "number" ? row.byte_size : null,
    storagePath: null,
    contentHash: typeof row.content_hash === "string" ? row.content_hash : null,
    qualityScore: typeof row.quality_score === "number" ? row.quality_score : null,
    isDuplicate: Boolean(row.is_duplicate),
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  };
}

function mapSocialLink(row: Record<string, unknown>): MediaCollectionSocialLink {
  return {
    id: String(row.id),
    platform: String(row.platform ?? ""),
    url: String(row.url ?? ""),
    confidenceScore: typeof row.confidence_score === "number" ? row.confidence_score : null,
    discoveredFrom: typeof row.discovered_from === "string" ? row.discovered_from : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  };
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

    const [{ data: job, error: jobError }, { data: assets, error: assetsError }, { data: socialLinks, error: socialError }] =
      await Promise.all([
        supabase
          .from("media_collection_jobs")
          .select("*")
          .eq("id", id)
          .eq("created_by", user.id)
          .single(),
        supabase
          .from("media_collection_assets")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("media_collection_social_links")
          .select("*")
          .eq("job_id", id)
          .order("created_at", { ascending: true }),
      ]);

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (assetsError) {
      return NextResponse.json({ error: assetsError.message }, { status: 500 });
    }

    if (socialError) {
      return NextResponse.json({ error: socialError.message }, { status: 500 });
    }

    const mappedJob = mapJob(job as Record<string, unknown>);
    if (mappedJob.status !== "completed") {
      return NextResponse.json(
        { error: "The desktop manifest is not ready yet. Let the crawl finish first." },
        { status: 409 },
      );
    }

    const manifest = buildDesktopMediaManifest({
      job: mappedJob,
      assets: (assets ?? []).map((row) => mapAsset(row as Record<string, unknown>)),
      socialLinks: (socialLinks ?? []).map((row) =>
        mapSocialLink(row as Record<string, unknown>),
      ),
    });

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${manifest.job.companyName
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "obtain-media"}-desktop-manifest.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to prepare desktop manifest.",
      },
      { status: 500 },
    );
  }
}
