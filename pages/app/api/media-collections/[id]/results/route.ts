import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import type {
  MediaCollectionAsset,
  MediaCollectionResults,
  MediaCollectionSocialLink,
} from "@/lib/media-collections/types";

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
    confidenceScore:
      typeof row.confidence_score === "number" ? row.confidence_score : null,
    discoveredFrom:
      typeof row.discovered_from === "string" ? row.discovered_from : null,
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

    const { data: job, error: jobError } = await supabase
      .from("media_collection_jobs")
      .select("id")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const [{ data: assets, error: assetsError }, { data: socialLinks, error: socialError }] =
      await Promise.all([
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

    if (assetsError) {
      return NextResponse.json({ error: assetsError.message }, { status: 500 });
    }

    if (socialError) {
      return NextResponse.json({ error: socialError.message }, { status: 500 });
    }

    const mappedAssets = (assets ?? []).map((row) => mapAsset(row as Record<string, unknown>));
    const results: MediaCollectionResults = {
      images: mappedAssets.filter((asset) => asset.assetType === "image"),
      pdfs: mappedAssets.filter((asset) => asset.assetType === "pdf"),
      videos: mappedAssets.filter((asset) => asset.assetType === "video"),
      documents: mappedAssets.filter((asset) => asset.assetType === "document"),
      socialLinks: (socialLinks ?? []).map((row) =>
        mapSocialLink(row as Record<string, unknown>),
      ),
    };

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media collection results." },
      { status: 500 },
    );
  }
}
