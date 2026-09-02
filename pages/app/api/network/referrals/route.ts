import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import { hasValidRequestOrigin } from "@/lib/network/request-origin";
import { createNetworkProviderAccessToken } from "@/lib/network/provider-referral-access";
import {
  buildNetworkProviderAccessUrl,
  sendNetworkProviderReferralNotification,
} from "@/lib/network/provider-notifications";
import {
  buildNetworkSharingDisclosure,
  NETWORK_COMMUNICATION_DISCLOSURE,
  NETWORK_COMPENSATION_DISCLOSURE,
  NETWORK_REFERRAL_DISCLOSURE_VERSION,
} from "@/lib/network/consent";
import { validateNetworkReferralSubmission } from "@/lib/network/referral-validation";

const MAX_REQUEST_BYTES = 50_000;

export async function POST(request: NextRequest) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json(
      { error: "Crown Network referral submission is not enabled yet." },
      { status: 503 },
    );
  }

  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const validation = validateNetworkReferralSubmission(body);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (validation.data.disclosureVersion !== NETWORK_REFERRAL_DISCLOSURE_VERSION) {
    return NextResponse.json(
      { error: "The consent disclosure has changed. Review the form and submit again." },
      { status: 409 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = request.headers.get("user-agent");
  const admin = createAdminClient();
  const { data: eligibleFacilities, error: eligibleFacilitiesError } = await admin
    .from("network_facilities")
    .select(
      "id,page_id,listing_status,referral_status,is_accepting_referrals,care_types,agreement_status,referral_fee_type,notification_email,agreement_effective_at,agreement_expires_at",
    )
    .in("page_id", validation.data.facilityIds);

  if (
    eligibleFacilitiesError ||
    eligibleFacilities?.length !== validation.data.facilityIds.length ||
    !eligibleFacilities.every((facility) => isNetworkFacilityReferralEligible(facility))
  ) {
    return NextResponse.json(
      { error: "One or more selected providers are not accepting Crown Network referrals." },
      { status: 409 },
    );
  }

  const { data: selectedPages, error: selectedPagesError } = await admin
    .from("pages")
    .select("id,title")
    .in("id", validation.data.facilityIds)
    .eq("is_active", true)
    .eq("is_published", true);

  if (selectedPagesError || selectedPages?.length !== validation.data.facilityIds.length) {
    return NextResponse.json(
      { error: "One or more selected providers are no longer available." },
      { status: 409 },
    );
  }

  const pageNames = new Map(selectedPages.map((page) => [page.id, page.title]));
  const selectedFacilityNames = validation.data.facilityIds
    .map((id) => pageNames.get(id))
    .filter((name): name is string => Boolean(name));
  const canonicalPayload = {
    ...validation.data,
    disclosureText: [
      buildNetworkSharingDisclosure(selectedFacilityNames),
      NETWORK_COMPENSATION_DISCLOSURE,
      NETWORK_COMMUNICATION_DISCLOSURE,
    ].join("\n\n"),
  };
  const { data, error } = await admin.rpc("submit_network_referral" as never, {
    p_payload: canonicalPayload,
    p_ip_address: forwardedFor,
    p_user_agent: userAgent,
    p_consumer_user_id: user?.id || null,
  } as never);

  if (error || typeof data !== "string") {
    console.error("Unable to create Crown Network referral", error);
    return NextResponse.json(
      { error: "We could not submit the request. No referral was sent. Please try again." },
      { status: 500 },
    );
  }

  const automaticDelivery: Array<{
    facilityPageId: string;
    status: "sent" | "queued" | "pending_manual_delivery" | "failed";
  }> = [];

  if (validation.data.referralSource === "network_profile") {
    const { error: sourceEventError } = await admin.from("network_referral_events").insert({
      referral_id: data,
      actor_user_id: user?.id || null,
      actor_type: user ? "consumer" : "system",
      event_type: "network_profile_referral_submitted",
      details: {
        sourceFacilityPageId: validation.data.sourceFacilityId,
        selectedFacilityPageIds: validation.data.facilityIds,
      },
    });
    if (sourceEventError) {
      console.error("Unable to record Crown Network profile attribution", sourceEventError);
    }

    const { error: qualificationError } = await admin.rpc("operate_network_referral" as never, {
      p_referral_id: data,
      p_action: "qualify",
      p_facility_id: null,
      p_note: "Automatically qualified from a referral-safe Crown Network profile.",
      p_actor_user_id: null,
    } as never);

    if (qualificationError) {
      console.error("Unable to automatically qualify Crown Network profile referral", qualificationError);
      automaticDelivery.push(
        ...eligibleFacilities.map((facility) => ({
          facilityPageId: facility.page_id,
          status: "pending_manual_delivery" as const,
        })),
      );
    } else {
      for (const facility of eligibleFacilities) {
        const notificationEmail = facility.notification_email?.trim().toLowerCase() || "";
        let notificationId: string | null = null;

        try {
          const access = createNetworkProviderAccessToken();
          const accessUrl = buildNetworkProviderAccessUrl(access.token);
          const { data: issuedNotificationId, error: deliveryError } = await admin.rpc(
            "deliver_network_referral" as never,
            {
              p_referral_id: data,
              p_facility_id: facility.id,
              p_token_hash: access.tokenHash,
              p_expires_at: access.expiresAt,
              p_notification_email: notificationEmail,
              p_note: "Automatically delivered from a referral-safe Crown Network profile.",
              p_actor_user_id: null,
            } as never,
          );
          if (deliveryError || typeof issuedNotificationId !== "string") {
            throw new Error("Secure Crown Referral access could not be issued.");
          }
          notificationId = issuedNotificationId;

          if (process.env.NETWORK_REFERRALS_EMAIL_ENABLED !== "true") {
            automaticDelivery.push({ facilityPageId: facility.page_id, status: "queued" });
            continue;
          }

          const emailResult = await sendNetworkProviderReferralNotification({
            to: notificationEmail,
            facilityName: pageNames.get(facility.page_id) || "your community",
            accessUrl,
            expiresAt: access.expiresAt,
          });
          const providerMessageId =
            emailResult && typeof emailResult === "object" && "id" in emailResult
              ? String(emailResult.id)
              : null;
          const { error: notificationUpdateError } = await admin
            .from("network_referral_notifications")
            .update({
              status: "sent",
              provider_message_id: providerMessageId,
              attempted_at: new Date().toISOString(),
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", notificationId);
          if (notificationUpdateError) {
            console.error("Unable to mark automatic Crown Referral notification sent", notificationUpdateError);
          }
          automaticDelivery.push({ facilityPageId: facility.page_id, status: "sent" });
        } catch (automaticDeliveryError) {
          console.error("Automatic Crown Referral delivery failed", automaticDeliveryError);
          if (notificationId) {
            const { error: notificationUpdateError } = await admin
              .from("network_referral_notifications")
              .update({
                status: "failed",
                attempted_at: new Date().toISOString(),
                error_message: "The automatic Crown Referral email could not be sent.",
              })
              .eq("id", notificationId);
            if (notificationUpdateError) {
              console.error("Unable to record automatic Crown Referral notification failure", notificationUpdateError);
            }
          }
          automaticDelivery.push({ facilityPageId: facility.page_id, status: "failed" });
        }
      }
    }
  }

  return NextResponse.json({ referralId: data, automaticDelivery }, { status: 201 });
}
