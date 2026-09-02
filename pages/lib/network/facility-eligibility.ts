import { hasNetworkInsuranceCareType } from "@/lib/network/types";

export type ReferralEligibilityFields = {
  listing_status: string;
  referral_status: string;
  is_accepting_referrals: boolean;
  care_types: string[] | null;
  agreement_status: string;
  referral_fee_type: string | null;
  notification_email: string | null;
  agreement_effective_at: string | null;
  agreement_expires_at: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isNetworkFacilityReferralEligible(
  facility: ReferralEligibilityFields,
  now = new Date(),
) {
  const effectiveAt = facility.agreement_effective_at
    ? new Date(facility.agreement_effective_at)
    : null;
  const expiresAt = facility.agreement_expires_at
    ? new Date(facility.agreement_expires_at)
    : null;
  const isNonCompensatedInsuranceReferral =
    facility.referral_fee_type === "none" &&
    hasNetworkInsuranceCareType(facility.care_types ?? []);
  const hasEligibleAgreement =
    facility.agreement_status === "active" &&
    (!effectiveAt || (!Number.isNaN(effectiveAt.valueOf()) && effectiveAt <= now)) &&
    (!expiresAt || (!Number.isNaN(expiresAt.valueOf()) && expiresAt > now));

  return (
    ["listed", "verified", "partner"].includes(facility.listing_status) &&
    facility.referral_status === "eligible" &&
    facility.is_accepting_referrals &&
    Boolean(facility.notification_email && EMAIL_PATTERN.test(facility.notification_email)) &&
    (isNonCompensatedInsuranceReferral || hasEligibleAgreement)
  );
}
