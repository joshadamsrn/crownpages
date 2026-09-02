import type { NetworkCareType, NetworkPricePeriod } from "@/lib/network/types";

export type NetworkFacilityListingStatus = "listed" | "verified" | "partner" | "hidden";
export type NetworkFacilityReferralStatus = "disabled" | "eligible" | "paused";
export type NetworkFacilityAgreementStatus = "not_contacted" | "pending" | "active" | "inactive";
export type NetworkFacilityFeeType = "flat" | "percentage" | "custom";

export type NetworkAdminFacility = {
  id: string;
  pageId: string;
  businessId: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  businessEmail: string | null;
  sourceSystem: string;
  sourceFacilityId: string | null;
  listingStatus: NetworkFacilityListingStatus;
  referralStatus: NetworkFacilityReferralStatus;
  isAcceptingReferrals: boolean;
  careTypes: NetworkCareType[];
  latitude: number | null;
  longitude: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  pricePeriod: NetworkPricePeriod | null;
  notificationEmail: string | null;
  agreementStatus: NetworkFacilityAgreementStatus;
  referralFeeType: NetworkFacilityFeeType | null;
  referralFeeAmount: number | null;
  referralFeePercentage: number | null;
  referralProtectionDays: number;
  agreementEffectiveAt: string | null;
  agreementExpiresAt: string | null;
  referralTermsVersion: string | null;
  agreementNotes: string | null;
  updatedAt: string;
  isReferralEligible: boolean;
};

export type NetworkAdminFacilitySettings = Pick<
  NetworkAdminFacility,
  | "listingStatus"
  | "referralStatus"
  | "isAcceptingReferrals"
  | "careTypes"
  | "latitude"
  | "longitude"
  | "priceLow"
  | "priceHigh"
  | "pricePeriod"
  | "notificationEmail"
  | "agreementStatus"
  | "referralFeeType"
  | "referralFeeAmount"
  | "referralFeePercentage"
  | "referralProtectionDays"
  | "agreementEffectiveAt"
  | "agreementExpiresAt"
  | "referralTermsVersion"
  | "agreementNotes"
>;
