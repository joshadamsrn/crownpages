import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sms_short_links")
    .select("id, target_path, expires_at, click_count")
    .eq("code", code)
    .single();

  if (error || !data) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!data.target_path.startsWith("/")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  await supabase
    .from("sms_short_links")
    .update({
      click_count: (data.click_count ?? 0) + 1,
      last_clicked_at: new Date().toISOString(),
    })
    .eq("id", data.id);

  return NextResponse.redirect(new URL(data.target_path, request.url));
}
