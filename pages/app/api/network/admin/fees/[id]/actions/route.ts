import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { NetworkAdminFeeAction } from "@/lib/network/admin-fee-types";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasValidRequestOrigin } from "@/lib/network/request-origin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set<NetworkAdminFeeAction>([
  "mark_invoiced",
  "mark_paid",
  "mark_disputed",
  "resolve_confirmed",
  "waive",
]);
const NOTE_REQUIRED = new Set<NetworkAdminFeeAction>([
  "mark_disputed",
  "resolve_confirmed",
  "waive",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Fee operations are still in preview mode." }, { status: 503 });
  }
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 15_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid referral fee." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await hasCrownAdminAccess(user.id, supabase))) {
    return NextResponse.json({ error: "Crown Network staff access is required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" ? (body.action as NetworkAdminFeeAction) : null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : null;
  const invoiceReference =
    typeof body?.invoiceReference === "string"
      ? body.invoiceReference.trim().slice(0, 200)
      : null;
  const dueAt = typeof body?.dueAt === "string" ? body.dueAt.slice(0, 100) : null;
  const paidAt = typeof body?.paidAt === "string" ? body.paidAt.slice(0, 100) : null;

  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "Choose a valid fee action." }, { status: 400 });
  }
  if (NOTE_REQUIRED.has(action) && !note) {
    return NextResponse.json({ error: "Add a note explaining this fee decision." }, { status: 400 });
  }
  if (action === "mark_invoiced" && !invoiceReference) {
    return NextResponse.json({ error: "Enter the invoice reference." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("update_network_referral_fee" as never, {
    p_fee_id: id,
    p_action: action,
    p_details: { note, invoiceReference, dueAt, paidAt },
    p_actor_user_id: user.id,
  } as never);
  if (error || typeof data !== "string") {
    console.error("Unable to update Crown Network referral fee", error);
    return NextResponse.json(
      { error: "The referral fee could not be updated from its current status." },
      { status: 409 },
    );
  }

  revalidatePath("/protected/network-fees");
  revalidatePath("/protected/network-referrals");
  return NextResponse.json({ success: true, status: data });
}
