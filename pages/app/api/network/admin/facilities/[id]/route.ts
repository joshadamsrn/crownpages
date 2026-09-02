import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import type { NetworkAdminFacilitySettings } from "@/lib/network/admin-facility-types";
import { getNetworkAdminFacilities } from "@/lib/network/admin-facilities";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasValidRequestOrigin } from "@/lib/network/request-origin";
import {
  NETWORK_CARE_TYPES,
  hasNetworkInsuranceCareType,
  type NetworkCareType,
} from "@/lib/network/types";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LISTING_STATUSES = new Set(["listed", "verified", "partner", "hidden"]);
const REFERRAL_STATUSES = new Set(["disabled", "eligible", "paused"]);
const AGREEMENT_STATUSES = new Set(["not_contacted", "pending", "active", "inactive"]);
const FEE_TYPES = new Set(["none", "flat", "percentage", "custom"]);
const PRICE_PERIODS = new Set(["hour", "day", "week", "month"]);
const CARE_TYPES = new Set<string>(NETWORK_CARE_TYPES);

function nullableString(value: unknown, maxLength = 1000) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim().slice(0, maxLength) || null : undefined;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nullableDate(value: unknown) {
  const stringValue = nullableString(value, 100);
  if (stringValue === undefined) return undefined;
  if (stringValue === null) return null;
  const date = new Date(stringValue);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function validateSettings(body: unknown):
  | { success: true; data: NetworkAdminFacilitySettings }
  | { success: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { success: false, error: "Invalid facility settings." };
  }
  const value = body as Record<string, unknown>;
  const listingStatus = typeof value.listingStatus === "string" ? value.listingStatus : "";
  const referralStatus = typeof value.referralStatus === "string" ? value.referralStatus : "";
  const agreementStatus = typeof value.agreementStatus === "string" ? value.agreementStatus : "";
  const referralFeeType = nullableString(value.referralFeeType, 30);
  const notificationEmail = nullableString(value.notificationEmail, 320)?.toLowerCase() ?? null;
  const referralFeeAmount = nullableNumber(value.referralFeeAmount);
  const referralFeePercentage = nullableNumber(value.referralFeePercentage);
  const agreementEffectiveAt = nullableDate(value.agreementEffectiveAt);
  const agreementExpiresAt = nullableDate(value.agreementExpiresAt);
  const referralTermsVersion = nullableString(value.referralTermsVersion, 100);
  const agreementNotes = nullableString(value.agreementNotes, 4000);
  const latitude = nullableNumber(value.latitude);
  const longitude = nullableNumber(value.longitude);
  const priceLow = nullableNumber(value.priceLow);
  const priceHigh = nullableNumber(value.priceHigh);
  const pricePeriod = nullableString(value.pricePeriod, 20);
  const protectionDays = value.referralProtectionDays;
  const careTypes = Array.isArray(value.careTypes)
    ? value.careTypes.filter(
        (careType): careType is NetworkCareType => typeof careType === "string" && CARE_TYPES.has(careType),
      )
    : null;
  const acceptedInsurances = Array.isArray(value.acceptedInsurances)
    ? value.acceptedInsurances
        .filter((insurance): insurance is string => typeof insurance === "string")
        .map((insurance) => insurance.trim())
        .filter(Boolean)
    : null;

  if (!LISTING_STATUSES.has(listingStatus)) return { success: false, error: "Choose a valid listing status." };
  if (!REFERRAL_STATUSES.has(referralStatus)) return { success: false, error: "Choose a valid referral status." };
  if (!AGREEMENT_STATUSES.has(agreementStatus)) return { success: false, error: "Choose a valid agreement status." };
  if (referralFeeType !== null && (referralFeeType === undefined || !FEE_TYPES.has(referralFeeType))) {
    return { success: false, error: "Choose a valid referral fee type." };
  }
  if (notificationEmail && !EMAIL_PATTERN.test(notificationEmail)) {
    return { success: false, error: "Enter a valid referral notification email." };
  }
  if (!careTypes || careTypes.length !== new Set(careTypes).size) {
    return { success: false, error: "Choose valid, non-duplicated care types." };
  }
  if (
    !acceptedInsurances ||
    acceptedInsurances.length > 100 ||
    acceptedInsurances.some((insurance) => insurance.length > 160) ||
    acceptedInsurances.length !== new Set(acceptedInsurances.map((insurance) => insurance.toLowerCase())).size
  ) {
    return { success: false, error: "Enter up to 100 unique insurance plans, one per line." };
  }
  const isNonCompensatedReferral = referralFeeType === "none";
  if (isNonCompensatedReferral && !hasNetworkInsuranceCareType(careTypes)) {
    return {
      success: false,
      error: "No-fee referrals require Skilled Nursing, Home Health, or Hospice as a care type.",
    };
  }
  const normalizedAgreementStatus = isNonCompensatedReferral ? "not_contacted" : agreementStatus;
  const normalizedReferralFeeAmount = isNonCompensatedReferral ? null : referralFeeAmount;
  const normalizedReferralFeePercentage = isNonCompensatedReferral ? null : referralFeePercentage;
  const normalizedAgreementEffectiveAt = isNonCompensatedReferral ? null : agreementEffectiveAt;
  const normalizedAgreementExpiresAt = isNonCompensatedReferral ? null : agreementExpiresAt;
  const normalizedReferralTermsVersion = isNonCompensatedReferral ? null : referralTermsVersion;
  if (typeof protectionDays !== "number" || !Number.isInteger(protectionDays) || protectionDays < 1 || protectionDays > 730) {
    return { success: false, error: "Referral protection must be between 1 and 730 days." };
  }
  if (normalizedReferralFeeAmount === undefined || normalizedReferralFeePercentage === undefined || normalizedAgreementEffectiveAt === undefined || normalizedAgreementExpiresAt === undefined || normalizedReferralTermsVersion === undefined || agreementNotes === undefined || latitude === undefined || longitude === undefined || priceLow === undefined || priceHigh === undefined || pricePeriod === undefined) {
    return { success: false, error: "One or more facility settings are invalid." };
  }
  if ((latitude === null) !== (longitude === null)) {
    return { success: false, error: "Enter both latitude and longitude, or leave both blank." };
  }
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    return { success: false, error: "Latitude must be between -90 and 90." };
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    return { success: false, error: "Longitude must be between -180 and 180." };
  }
  if ((priceLow !== null && priceLow < 0) || (priceHigh !== null && priceHigh < 0)) {
    return { success: false, error: "Public prices cannot be negative." };
  }
  if (priceLow !== null && priceHigh !== null && priceHigh < priceLow) {
    return { success: false, error: "The maximum public price must be at least the minimum price." };
  }
  if (pricePeriod !== null && !PRICE_PERIODS.has(pricePeriod)) {
    return { success: false, error: "Choose a valid public price period." };
  }
  if ((priceLow !== null || priceHigh !== null) && pricePeriod === null) {
    return { success: false, error: "Choose a billing period for the public price range." };
  }
  if (normalizedReferralFeeAmount !== null && normalizedReferralFeeAmount < 0) {
    return { success: false, error: "The flat referral fee cannot be negative." };
  }
  if (normalizedReferralFeePercentage !== null && (normalizedReferralFeePercentage <= 0 || normalizedReferralFeePercentage > 100)) {
    return { success: false, error: "The referral percentage must be greater than 0 and no more than 100." };
  }
  if (normalizedAgreementEffectiveAt && normalizedAgreementExpiresAt && new Date(normalizedAgreementExpiresAt) <= new Date(normalizedAgreementEffectiveAt)) {
    return { success: false, error: "The agreement expiration must be after its effective date." };
  }

  const accepting = value.isAcceptingReferrals === true;
  if (normalizedAgreementStatus === "active") {
    if (!referralFeeType || !normalizedAgreementEffectiveAt || !normalizedReferralTermsVersion) {
      return { success: false, error: "Active agreements require fee terms, an effective date, and a terms version." };
    }
    if (referralFeeType === "flat" && (!normalizedReferralFeeAmount || normalizedReferralFeeAmount <= 0)) {
      return { success: false, error: "Enter the active agreement's flat referral fee." };
    }
    if (referralFeeType === "percentage" && (!normalizedReferralFeePercentage || normalizedReferralFeePercentage <= 0)) {
      return { success: false, error: "Enter the active agreement's referral percentage." };
    }
    if (referralFeeType === "custom" && !agreementNotes) {
      return { success: false, error: "Describe the custom referral terms in the agreement notes." };
    }
  }
  if (referralStatus === "eligible" && !isNonCompensatedReferral && normalizedAgreementStatus !== "active") {
    return { success: false, error: "Only facilities with an active agreement can be referral eligible." };
  }
  if (referralStatus === "eligible" && (listingStatus === "hidden" || careTypes.length === 0)) {
    return { success: false, error: "Eligible facilities must be listed and have at least one care type." };
  }
  if (accepting && (referralStatus !== "eligible" || !notificationEmail)) {
    return { success: false, error: "Accepting facilities must be eligible and have a notification email." };
  }
  if (accepting && normalizedAgreementEffectiveAt && new Date(normalizedAgreementEffectiveAt) > new Date()) {
    return { success: false, error: "The agreement must be effective before referrals can be accepted." };
  }
  if (accepting && normalizedAgreementExpiresAt && new Date(normalizedAgreementExpiresAt) <= new Date()) {
    return { success: false, error: "Renew the expired agreement before accepting referrals." };
  }

  return {
    success: true,
    data: {
      listingStatus: listingStatus as NetworkAdminFacilitySettings["listingStatus"],
      referralStatus: referralStatus as NetworkAdminFacilitySettings["referralStatus"],
      isAcceptingReferrals: accepting,
      careTypes,
      acceptedInsurances,
      latitude,
      longitude,
      priceLow,
      priceHigh,
      pricePeriod: pricePeriod as NetworkAdminFacilitySettings["pricePeriod"],
      notificationEmail,
      agreementStatus: normalizedAgreementStatus as NetworkAdminFacilitySettings["agreementStatus"],
      referralFeeType: referralFeeType as NetworkAdminFacilitySettings["referralFeeType"],
      referralFeeAmount: normalizedReferralFeeAmount,
      referralFeePercentage: normalizedReferralFeePercentage,
      referralProtectionDays: protectionDays,
      agreementEffectiveAt: normalizedAgreementEffectiveAt,
      agreementExpiresAt: normalizedAgreementExpiresAt,
      referralTermsVersion: normalizedReferralTermsVersion,
      agreementNotes,
    },
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Facility operations are still in preview mode." }, { status: 503 });
  }
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 25_000) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid facility." }, { status: 400 });

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
  const validation = validateSettings(body);
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.rpc("update_network_facility_settings" as never, {
    p_facility_id: id,
    p_settings: validation.data,
    p_actor_user_id: user.id,
  } as never);
  if (error) {
    console.error("Unable to update Crown Network facility", error);
    return NextResponse.json({ error: "The facility settings could not be saved." }, { status: 409 });
  }

  revalidatePath("/network");
  revalidatePath("/network/get-help");
  revalidatePath("/protected/network-facilities");
  const facility = (await getNetworkAdminFacilities()).find((item) => item.id === id);
  if (!facility) return NextResponse.json({ error: "The updated facility could not be loaded." }, { status: 404 });
  return NextResponse.json({ facility });
}
