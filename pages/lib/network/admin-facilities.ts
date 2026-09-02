import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import { NETWORK_CARE_TYPES, type NetworkCareType } from "@/lib/network/types";
import type {
  NetworkAdminFacility,
  NetworkFacilityAgreementStatus,
  NetworkFacilityFeeType,
  NetworkFacilityListingStatus,
  NetworkFacilityReferralStatus,
} from "@/lib/network/admin-facility-types";

type FacilityRow = {
  id: string;
  page_id: string;
  business_id: string;
  source_system: string;
  source_facility_id: string | null;
  listing_status: string;
  referral_status: string;
  is_accepting_referrals: boolean;
  care_types: string[] | null;
  latitude: number | string | null;
  longitude: number | string | null;
  price_low: number | string | null;
  price_high: number | string | null;
  price_period: "hour" | "day" | "week" | "month" | null;
  accepted_insurances: string[] | null;
  notification_email: string | null;
  agreement_status: string;
  referral_fee_type: string | null;
  referral_fee_amount: number | string | null;
  referral_fee_percentage: number | string | null;
  referral_protection_days: number;
  agreement_effective_at: string | null;
  agreement_expires_at: string | null;
  referral_terms_version: string | null;
  agreement_notes: string | null;
  updated_at: string;
};

function asNumber(value: number | string | null) {
  if (value === null) return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asCareTypes(value: string[] | null): NetworkCareType[] {
  const allowed = new Set<string>(NETWORK_CARE_TYPES);
  return (value ?? []).filter((careType): careType is NetworkCareType => allowed.has(careType));
}

export async function getNetworkAdminFacilities(): Promise<NetworkAdminFacility[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("network_facilities")
    .select(
      "id,page_id,business_id,source_system,source_facility_id,listing_status,referral_status,is_accepting_referrals,care_types,latitude,longitude,price_low,price_high,price_period,accepted_insurances,notification_email,agreement_status,referral_fee_type,referral_fee_amount,referral_fee_percentage,referral_protection_days,agreement_effective_at,agreement_expires_at,referral_terms_version,agreement_notes,updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);
  const facilities = (data ?? []) as unknown as FacilityRow[];
  if (!facilities.length) return [];

  const [pagesResult, businessesResult] = await Promise.all([
    admin.from("pages").select("id,title,slug").in("id", facilities.map((facility) => facility.page_id)),
    admin
      .from("businesses")
      .select("id,name,slug,city,state,zip_code,email")
      .in("id", facilities.map((facility) => facility.business_id)),
  ]);

  if (pagesResult.error) throw new Error(pagesResult.error.message);
  if (businessesResult.error) throw new Error(businessesResult.error.message);

  const pageById = new Map((pagesResult.data ?? []).map((page) => [page.id, page]));
  const businessById = new Map(
    (businessesResult.data ?? []).map((business) => [business.id, business]),
  );

  return facilities
    .map((facility) => {
      const page = pageById.get(facility.page_id);
      const business = businessById.get(facility.business_id);
      if (!page || !business) return null;

      return {
        id: facility.id,
        pageId: facility.page_id,
        businessId: facility.business_id,
        name: page.title || business.name,
        slug: business.slug,
        city: business.city,
        state: business.state,
        zipCode: business.zip_code,
        businessEmail: business.email,
        sourceSystem: facility.source_system,
        sourceFacilityId: facility.source_facility_id,
        listingStatus: facility.listing_status as NetworkFacilityListingStatus,
        referralStatus: facility.referral_status as NetworkFacilityReferralStatus,
        isAcceptingReferrals: facility.is_accepting_referrals,
        careTypes: asCareTypes(facility.care_types),
        latitude: asNumber(facility.latitude),
        longitude: asNumber(facility.longitude),
        priceLow: asNumber(facility.price_low),
        priceHigh: asNumber(facility.price_high),
        pricePeriod: facility.price_period,
        acceptedInsurances: facility.accepted_insurances ?? [],
        notificationEmail: facility.notification_email,
        agreementStatus: facility.agreement_status as NetworkFacilityAgreementStatus,
        referralFeeType: facility.referral_fee_type as NetworkFacilityFeeType | null,
        referralFeeAmount: asNumber(facility.referral_fee_amount),
        referralFeePercentage: asNumber(facility.referral_fee_percentage),
        referralProtectionDays: facility.referral_protection_days,
        agreementEffectiveAt: facility.agreement_effective_at,
        agreementExpiresAt: facility.agreement_expires_at,
        referralTermsVersion: facility.referral_terms_version,
        agreementNotes: facility.agreement_notes,
        updatedAt: facility.updated_at,
        isReferralEligible: isNetworkFacilityReferralEligible(facility),
      } satisfies NetworkAdminFacility;
    })
    .filter((facility): facility is NetworkAdminFacility => Boolean(facility))
    .sort((a, b) => a.name.localeCompare(b.name));
}
