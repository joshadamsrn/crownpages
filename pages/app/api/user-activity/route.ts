import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("users")
      .update({ last_activity_at: now })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, lastActivityAt: now });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
