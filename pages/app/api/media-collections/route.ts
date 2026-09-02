import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import {
  DEFAULT_MEDIA_COLLECTION_OPTIONS,
  type MediaCollectionJobSummary,
  type MediaCollectionOptions,
} from "@/lib/media-collections/types";

type CreateMediaCollectionBody = {
  pageId?: string | null;
  businessId?: string | null;
  companyName?: string;
  sourceUrl?: string;
  options?: Partial<MediaCollectionOptions>;
};

function normalizeSourceUrl(rawUrl: string) {
  const parsed = new URL(rawUrl.trim());
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Source URL must use http or https.");
  }

  return parsed.toString();
}

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

function normalizeMediaCollectionError(errorMessage: string) {
  const lower = errorMessage.toLowerCase();

  if (
    lower.includes("relation") && lower.includes("media_collection_jobs") && lower.includes("does not exist")
  ) {
    return "Obtain Media is not fully enabled in production yet. The media collection database tables still need to be applied.";
  }

  if (lower.includes("permission denied") || lower.includes("row-level security")) {
    return "Your account does not currently have permission to create an Obtain Media job.";
  }

  return errorMessage;
}

function getSupabaseErrorMessage(error: {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
} | null) {
  if (!error) {
    return null;
  }

  return [error.message, error.details, error.hint, error.code]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export async function POST(request: NextRequest) {
  try {
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

    const body = (await request.json()) as CreateMediaCollectionBody;
    const companyName = body.companyName?.trim();
    const sourceUrl = body.sourceUrl?.trim();

    if (!companyName || !sourceUrl) {
      return NextResponse.json(
        { error: "Company name and source URL are required." },
        { status: 400 },
      );
    }

    let normalizedSourceUrl: string;
    try {
      normalizedSourceUrl = normalizeSourceUrl(sourceUrl);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid source URL." },
        { status: 400 },
      );
    }

    const options: MediaCollectionOptions = {
      ...DEFAULT_MEDIA_COLLECTION_OPTIONS,
      ...(body.options || {}),
    };

    const adminSupabase = createAdminClient();
    const jobId = crypto.randomUUID();
    const { error: insertError } = await adminSupabase
      .from("media_collection_jobs")
      .insert({
        id: jobId,
        created_by: user.id,
        page_id: body.pageId || null,
        business_id: body.businessId || null,
        company_name: companyName,
        source_url: normalizedSourceUrl,
        status: "queued",
        current_stage: "queued",
        options,
        report: {
          note: "Job created. Crown Pages will discover assets and prepare a desktop worker manifest.",
        },
      });

    if (insertError) {
      const errorMessage = getSupabaseErrorMessage(insertError) || "Failed to create media collection job.";
      console.error("Failed to create media collection job", insertError);
      return NextResponse.json(
        {
          error: normalizeMediaCollectionError(errorMessage),
        },
        { status: 500 },
      );
    }

    const { data, error: selectError } = await adminSupabase
      .from("media_collection_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (selectError || !data) {
      const errorMessage =
        getSupabaseErrorMessage(selectError) || "Media collection job was created but could not be loaded.";
      console.error("Failed to load created media collection job", selectError);
      return NextResponse.json(
        {
          error: normalizeMediaCollectionError(errorMessage),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      job: buildJobSummary(data as Record<string, unknown>),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? normalizeMediaCollectionError(error.message)
            : "Failed to create media collection job.",
      },
      { status: 500 },
    );
  }
}
