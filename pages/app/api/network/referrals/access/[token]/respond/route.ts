import { NextRequest, NextResponse } from "next/server";
import {
  hashNetworkProviderAccessToken,
  isValidNetworkProviderAccessToken,
} from "@/lib/network/provider-referral-access";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasValidRequestOrigin } from "@/lib/network/request-origin";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_REQUEST_BYTES = 10_000;
const ACTIONS = new Set([
  "accept",
  "decline",
  "schedule_tour",
  "report_placement",
  "report_lost",
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Provider responses are still in preview mode." }, { status: 503 });
  }
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const { token } = await params;
  if (!isValidNetworkProviderAccessToken(token)) {
    return NextResponse.json({ error: "This referral link is invalid or expired." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = typeof body?.action === "string" && ACTIONS.has(body.action) ? body.action : null;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : null;
  if (!action) {
    return NextResponse.json({ error: "Choose a valid referral outcome." }, { status: 400 });
  }
  if ((action === "decline" || action === "report_lost") && !reason) {
    return NextResponse.json({ error: "Provide a brief outcome reason." }, { status: 400 });
  }

  const admin = createAdminClient();
  const tokenHash = hashNetworkProviderAccessToken(token);
  const isInitialResponse = action === "accept" || action === "decline";
  const placementValue =
    typeof body?.placementValue === "number" && Number.isFinite(body.placementValue)
      ? body.placementValue
      : null;
  const details = {
    tourScheduledAt:
      typeof body?.tourScheduledAt === "string" ? body.tourScheduledAt.slice(0, 100) : null,
    moveInDate: typeof body?.moveInDate === "string" ? body.moveInDate.slice(0, 20) : null,
    placementValue,
    careLevel: typeof body?.careLevel === "string" ? body.careLevel.trim().slice(0, 200) : null,
    notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 2000) : null,
    reason,
  };
  if (action === "schedule_tour" && !details.tourScheduledAt) {
    return NextResponse.json({ error: "Choose a tour date and time." }, { status: 400 });
  }
  if (action === "report_placement" && !details.moveInDate) {
    return NextResponse.json({ error: "Enter the resident's move-in date." }, { status: 400 });
  }
  if (placementValue !== null && placementValue < 0) {
    return NextResponse.json({ error: "Placement value cannot be negative." }, { status: 400 });
  }

  const { data, error } = isInitialResponse
    ? await admin.rpc("respond_network_referral_access" as never, {
        p_token_hash: tokenHash,
        p_action: action,
        p_reason: reason,
      } as never)
    : await admin.rpc("report_network_referral_progress" as never, {
        p_token_hash: tokenHash,
        p_action: action,
        p_details: details,
      } as never);

  if (
    error ||
    !["accepted", "declined", "tour_scheduled", "lost"].includes(String(data))
  ) {
    console.error("Unable to record provider referral response", error);
    return NextResponse.json(
      { error: "This referral may have expired or cannot receive that outcome yet." },
      { status: 409 },
    );
  }

  return NextResponse.json(
    { status: data, outcome: action },
    { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
  );
}
