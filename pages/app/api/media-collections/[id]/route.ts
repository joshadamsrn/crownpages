import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import {
  DEFAULT_MEDIA_COLLECTION_OPTIONS,
  type MediaCollectionJobSummary,
  type MediaCollectionOptions,
} from "@/lib/media-collections/types";

function buildJobSummary(row: Record<string, unknown>): MediaCollectionJobSummary {
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

    const { data, error } = await supabase
      .from("media_collection_jobs")
      .select("*")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    return NextResponse.json({
      job: buildJobSummary(data as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load media collection job." },
      { status: 500 },
    );
  }
}
