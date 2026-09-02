import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

export async function POST(
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

    const adminSupabase = createAdminClient();
    const { data: job, error: jobError } = await adminSupabase
      .from("media_collection_jobs")
      .select("id, created_by, status, report")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ ok: true });
    }

    const [
      { count: assetCount, error: assetCountError },
      { count: duplicateCount, error: duplicateCountError },
      { count: downloadableCount, error: downloadableCountError },
    ] = await Promise.all([
      adminSupabase
        .from("media_collection_assets")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id),
      adminSupabase
        .from("media_collection_assets")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id)
        .eq("is_duplicate", true),
      adminSupabase
        .from("media_collection_assets")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id)
        .eq("is_duplicate", false)
        .in("asset_type", ["image", "pdf", "document", "video"]),
    ]);

    const countError = assetCountError || duplicateCountError || downloadableCountError;
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const existingReport =
      typeof job.report === "object" && job.report !== null && !Array.isArray(job.report)
        ? job.report
        : {};
    const { data: updatedJob, error: updateError } = await adminSupabase
      .from("media_collection_jobs")
      .update({
        status: "completed",
        current_stage: "completed",
        assets_found: assetCount ?? 0,
        assets_downloaded: downloadableCount ?? 0,
        duplicates_skipped: duplicateCount ?? 0,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        report: {
          ...existingReport,
          summary: "Media crawl stopped and organized from saved results.",
          stoppedByUser: true,
          desktopManifestReady: true,
          deliveryMode: "zip",
        },
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updatedJob) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to stop and organize media collection." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, job: updatedJob });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to stop and organize media collection.",
      },
      { status: 500 },
    );
  }
}
