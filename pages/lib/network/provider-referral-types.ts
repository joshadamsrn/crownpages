import type { NetworkReferralFacilityStatus } from "@/lib/network/admin-types";

export type NetworkProviderReferral = {
  referralId: string;
  referralFacilityId: string;
  facilityId: string;
  facilityName: string;
  attributionCode: string;
  status: NetworkReferralFacilityStatus;
  deliveredAt: string | null;
  accessExpiresAt: string;
  tourScheduledAt: string | null;
  placement: {
    status: "reported" | "confirmed" | "disputed" | "cancelled";
    moveInDate: string;
    placementValue: number | null;
    currency: string;
    careLevel: string | null;
    notes: string | null;
  } | null;
  family: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    preferredContactMethod: "email" | "phone" | "sms" | null;
    relationship: string | null;
  };
  search: {
    desiredCity: string | null;
    desiredState: string | null;
    desiredZipCode: string | null;
    radiusMiles: number | null;
    careTypes: string[];
    moveTimeframe: string | null;
    budgetLow: number | null;
    budgetHigh: number | null;
    supportNeeds: string[];
    preferences: string[];
    additionalNotes: string | null;
  };
  consent: {
    version: string;
    grantedAt: string;
    allowEmail: boolean;
    allowPhone: boolean;
    allowSms: boolean;
  };
};
