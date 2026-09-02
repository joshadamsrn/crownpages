import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import { hasValidRequestOrigin } from "@/lib/network/request-origin";
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
      "page_id,listing_status,referral_status,is_accepting_referrals,care_types,agreement_status,referral_fee_type,notification_email,agreement_effective_at,agreement_expires_at",
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

  return NextResponse.json({ referralId: data }, { status: 201 });
}
