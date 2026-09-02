import { NextRequest, NextResponse } from "next/server";
import type { NetworkAdminReferralAction } from "@/lib/network/admin-types";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createNetworkProviderAccessToken } from "@/lib/network/provider-referral-access";
import {
  buildNetworkProviderAccessUrl,
  sendNetworkProviderReferralNotification,
} from "@/lib/network/provider-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_REQUEST_BYTES = 25_000;
const ACTIONS = new Set<NetworkAdminReferralAction>([
  "qualify",
  "request_information",
  "deliver",
  "resend_access",
  "mark_duplicate",
  "mark_accepted",
  "schedule_tour",
  "mark_placed",
  "mark_lost",
  "close",
]);
const FACILITY_ACTIONS = new Set<NetworkAdminReferralAction>([
  "deliver",
  "resend_access",
  "mark_duplicate",
  "mark_accepted",
  "schedule_tour",
  "mark_placed",
  "mark_lost",
]);
const NOTE_REQUIRED_ACTIONS = new Set<NetworkAdminReferralAction>([
  "request_information",
  "mark_duplicate",
  "mark_lost",
  "close",
]);

function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Referral operations are still in preview mode." }, { status: 503 });
  }
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid referral." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await hasCrownAdminAccess(user.id, supabase))) {
    return NextResponse.json({ error: "Crown Network staff access is required." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const value = body as Record<string, unknown>;
  const action = typeof value.action === "string" ? (value.action as NetworkAdminReferralAction) : null;
  const facilityId = typeof value.facilityId === "string" ? value.facilityId : null;
  const note = typeof value.note === "string" ? value.note.trim().slice(0, 1000) : null;
  const placement =
    value.placement && typeof value.placement === "object" && !Array.isArray(value.placement)
      ? (value.placement as Record<string, unknown>)
      : null;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "Unsupported referral action." }, { status: 400 });
  }
  if (FACILITY_ACTIONS.has(action) && (!facilityId || !UUID_PATTERN.test(facilityId))) {
    return NextResponse.json({ error: "Select a valid provider." }, { status: 400 });
  }
  if (NOTE_REQUIRED_ACTIONS.has(action) && !note) {
    return NextResponse.json({ error: "Add a navigator note for this action." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (action === "mark_placed" && facilityId) {
    const moveInDate =
      typeof placement?.moveInDate === "string" ? placement.moveInDate.slice(0, 20) : null;
    const placementValue =
      typeof placement?.placementValue === "number" && Number.isFinite(placement.placementValue)
        ? placement.placementValue
        : null;
    const feeAmount =
      typeof placement?.feeAmount === "number" && Number.isFinite(placement.feeAmount)
        ? placement.feeAmount
        : null;
    if (placementValue !== null && placementValue < 0) {
      return NextResponse.json({ error: "Placement value cannot be negative." }, { status: 400 });
    }
    if (feeAmount !== null && feeAmount < 0) {
      return NextResponse.json({ error: "Referral fee cannot be negative." }, { status: 400 });
    }

    const { data: feeId, error: confirmationError } = await admin.rpc(
      "confirm_network_referral_placement" as never,
      {
        p_referral_id: id,
        p_facility_id: facilityId,
        p_details: {
          moveInDate,
          placementValue,
          feeAmount,
          note,
        },
        p_actor_user_id: user.id,
      } as never,
    );
    if (confirmationError || typeof feeId !== "string") {
      console.error("Unable to confirm Crown Network placement", confirmationError);
      return NextResponse.json(
        { error: "The placement could not be confirmed. Verify the move-in and fee details." },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true, feeId });
  }

  if ((action === "deliver" || action === "resend_access") && facilityId) {
    const { data: facility, error: facilityError } = await admin
      .from("network_facilities")
      .select(
        "business_id,page_id,notification_email,listing_status,referral_status,is_accepting_referrals,agreement_status,agreement_effective_at,agreement_expires_at",
      )
      .eq("id", facilityId)
      .maybeSingle();
    if (facilityError || !facility) {
      return NextResponse.json({ error: "The selected provider could not be found." }, { status: 404 });
    }

    if (action === "deliver" && !isNetworkFacilityReferralEligible(facility)) {
      return NextResponse.json(
        { error: "This provider does not have an active, currently eligible referral agreement." },
        { status: 409 },
      );
    }

    const [{ data: business }, { data: page }] = await Promise.all([
      admin.from("businesses").select("name").eq("id", facility.business_id).maybeSingle(),
      admin.from("pages").select("title").eq("id", facility.page_id).maybeSingle(),
    ]);
    const notificationEmail = facility.notification_email?.trim().toLowerCase() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      return NextResponse.json(
        { error: "Add a valid referral notification email before secure delivery." },
        { status: 409 },
      );
    }

    let access;
    let accessUrl;
    try {
      access = createNetworkProviderAccessToken();
      accessUrl = buildNetworkProviderAccessUrl(access.token);
    } catch (configurationError) {
      console.error("Unable to prepare secure provider access", configurationError);
      return NextResponse.json(
        { error: "Secure provider links are not configured for this environment." },
        { status: 503 },
      );
    }

    const rpcName = action === "deliver"
      ? "deliver_network_referral"
      : "reissue_network_referral_access";
    const { data: notificationId, error: deliveryError } = await admin.rpc(rpcName as never, {
      p_referral_id: id,
      p_facility_id: facilityId,
      p_token_hash: access.tokenHash,
      p_expires_at: access.expiresAt,
      p_notification_email: notificationEmail,
      p_note: note,
      p_actor_user_id: user.id,
    } as never);

    if (deliveryError || typeof notificationId !== "string") {
      console.error("Unable to issue secure Crown Network referral access", deliveryError);
      return NextResponse.json(
        { error: "Secure access could not be issued. Refresh and verify the referral status." },
        { status: 409 },
      );
    }

    // Preview and staging environments can exercise the complete referral
    // workflow without contacting a real provider. The notification remains
    // queued until email delivery is explicitly enabled for that environment.
    if (process.env.NETWORK_REFERRALS_EMAIL_ENABLED !== "true") {
      return NextResponse.json({
        success: true,
        notificationStatus: "queued",
      });
    }

    try {
      const emailResult = await sendNetworkProviderReferralNotification({
        to: notificationEmail,
        facilityName: page?.title || business?.name || "your community",
        accessUrl,
        expiresAt: access.expiresAt,
      });
      const providerMessageId =
        emailResult && typeof emailResult === "object" && "id" in emailResult
          ? String(emailResult.id)
          : null;
      const { error: updateError } = await admin
        .from("network_referral_notifications")
        .update({
          status: "sent",
          provider_message_id: providerMessageId,
          attempted_at: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", notificationId);
      if (updateError) console.error("Unable to mark referral notification sent", updateError);
    } catch (notificationError) {
      console.error("Secure Crown Network referral email failed", notificationError);
      await admin
        .from("network_referral_notifications")
        .update({
          status: "failed",
          attempted_at: new Date().toISOString(),
          error_message: "The secure provider email could not be sent.",
        })
        .eq("id", notificationId);
      return NextResponse.json(
        { error: "Secure access was created, but the email failed. Refresh and retry delivery." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, notificationStatus: "sent" });
  }

  const { error } = await admin.rpc("operate_network_referral" as never, {
    p_referral_id: id,
    p_action: action,
    p_facility_id: facilityId,
    p_note: note,
    p_actor_user_id: user.id,
  } as never);

  if (error) {
    console.error("Unable to update Crown Network referral", error);
    return NextResponse.json(
      { error: "The referral could not be updated. Refresh and verify its current status." },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
}
