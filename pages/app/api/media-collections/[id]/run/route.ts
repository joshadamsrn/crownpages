import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { runMediaCollectionJob } from "@/lib/media-collections/runner";

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

    const { data: job, error: jobError } = await supabase
      .from("media_collection_jobs")
      .select("id, created_by")
      .eq("id", id)
      .eq("created_by", user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    void runMediaCollectionJob(id).catch((runnerError) => {
      console.error("Media collection runner failed", runnerError);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start media collection." },
      { status: 500 },
    );
  }
}
