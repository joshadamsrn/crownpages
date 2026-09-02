export type ReferralEligibilityFields = {
  listing_status: string;
  referral_status: string;
  is_accepting_referrals: boolean;
  agreement_status: string;
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

  return (
    ["listed", "verified", "partner"].includes(facility.listing_status) &&
    facility.referral_status === "eligible" &&
    facility.is_accepting_referrals &&
    facility.agreement_status === "active" &&
    Boolean(facility.notification_email && EMAIL_PATTERN.test(facility.notification_email)) &&
    (!effectiveAt || (!Number.isNaN(effectiveAt.valueOf()) && effectiveAt <= now)) &&
    (!expiresAt || (!Number.isNaN(expiresAt.valueOf()) && expiresAt > now))
  );
}

