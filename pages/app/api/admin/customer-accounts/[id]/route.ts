import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { deleteUserAccountData } from "@/lib/user-account-admin";

export async function DELETE(
  _request: Request,
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
        { error: "You cannot delete your own account here." },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    await deleteUserAccountData(adminSupabase, id);

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id);
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete account" },
      { status: 500 },
    );
  }
}
