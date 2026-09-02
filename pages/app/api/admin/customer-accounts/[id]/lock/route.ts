import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const canManageCustomers = await hasCrownAdminAccess(user.id, supabase);
    if (!canManageCustomers) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (id === user.id) {
      return NextResponse.json(
        { error: "You cannot lock your own account." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const locked = Boolean(body.locked);

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.auth.admin.updateUserById(id, {
      ban_duration: locked ? "876000h" : "none",
      app_metadata: {
        customer_locked: locked,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, locked });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update account lock state" },
      { status: 500 },
    );
  }
}
