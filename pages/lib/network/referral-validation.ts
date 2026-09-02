import "server-only";

import {
  NETWORK_CARE_TYPES,
  type NetworkCareType,
} from "@/lib/network/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_CARE_TYPES = new Set<string>(NETWORK_CARE_TYPES);

type UnknownRecord = Record<string, unknown>;

export type NetworkReferralSubmission = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContactMethod: "email" | "phone" | "sms";
  relationship: string;
  desiredCity: string;
  desiredState: string;
  desiredZipCode: string;
  searchRadiusMiles: number;
  careTypes: NetworkCareType[];
  moveTimeframe: string;
  budgetLow: number | null;
  budgetHigh: number | null;
  supportNeeds: string[];
  preferences: string[];
  additionalNotes: string;
  previouslyContactedFacilityIds: string[];
  facilityIds: string[];
  allowEmail: boolean;
  allowPhone: boolean;
  allowSms: boolean;
  disclosureVersion: string;
  disclosureText: string;
  privacyAccepted: boolean;
  compensationAcknowledged: boolean;
  sharingAccepted: boolean;
  company: string;
  referralSource: "network_profile" | null;
  sourceFacilityId: string | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => stringValue(item, maxLength))
        .filter(Boolean)
        .slice(0, maxItems),
    ),
  );
}

function numberValue(value: unknown) {
  if (value === null || value === "" || typeof value === "undefined") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateNetworkReferralSubmission(input: unknown):
  | { success: true; data: NetworkReferralSubmission }
  | { success: false; error: string } {
  const value = asRecord(input);
  if (!value) return { success: false, error: "Invalid request." };

  const careTypes = stringArray(value.careTypes, 4, 80).filter((item) =>
    ALLOWED_CARE_TYPES.has(item),
  ) as NetworkCareType[];
  const facilityIds = stringArray(value.facilityIds, 3, 40);
  const email = stringValue(value.email, 254).toLowerCase();
  const phone = stringValue(value.phone, 30);
  const preferredContactMethod = stringValue(value.preferredContactMethod, 12);
  const budgetLow = numberValue(value.budgetLow);
  const budgetHigh = numberValue(value.budgetHigh);

  const data: NetworkReferralSubmission = {
    firstName: stringValue(value.firstName, 80),
    lastName: stringValue(value.lastName, 80),
    email,
    phone,
    preferredContactMethod:
      preferredContactMethod === "phone" || preferredContactMethod === "sms"
        ? preferredContactMethod
        : "email",
    relationship: stringValue(value.relationship, 80),
    desiredCity: stringValue(value.desiredCity, 100),
    desiredState: stringValue(value.desiredState, 80),
    desiredZipCode: stringValue(value.desiredZipCode, 12),
    searchRadiusMiles: Math.min(500, Math.max(1, numberValue(value.searchRadiusMiles) ?? 25)),
    careTypes,
    moveTimeframe: stringValue(value.moveTimeframe, 80),
    budgetLow,
    budgetHigh,
    supportNeeds: stringArray(value.supportNeeds, 16, 100),
    preferences: stringArray(value.preferences, 16, 100),
    additionalNotes: stringValue(value.additionalNotes, 1200),
    previouslyContactedFacilityIds: stringArray(value.previouslyContactedFacilityIds, 3, 40).filter(
      (id) => UUID_PATTERN.test(id),
    ),
    facilityIds,
    allowEmail: value.allowEmail === true,
    allowPhone: value.allowPhone === true,
    allowSms: value.allowSms === true,
    disclosureVersion: stringValue(value.disclosureVersion, 50),
    disclosureText: stringValue(value.disclosureText, 4000),
    privacyAccepted: value.privacyAccepted === true,
    compensationAcknowledged: value.compensationAcknowledged === true,
    sharingAccepted: value.sharingAccepted === true,
    company: stringValue(value.company, 120),
    referralSource: value.referralSource === "network_profile" ? "network_profile" : null,
    sourceFacilityId: UUID_PATTERN.test(stringValue(value.sourceFacilityId, 40))
      ? stringValue(value.sourceFacilityId, 40)
      : null,
  };

  if (data.company) return { success: false, error: "Unable to submit this request." };
  if (!data.firstName || !data.lastName) return { success: false, error: "Enter your first and last name." };
  if (!email && !phone) return { success: false, error: "Enter an email address or phone number." };
  if (email && !EMAIL_PATTERN.test(email)) return { success: false, error: "Enter a valid email address." };
  if (data.allowEmail && !email) return { success: false, error: "Enter an email address or turn off email contact." };
  if ((data.allowPhone || data.allowSms) && !phone) {
    return { success: false, error: "Enter a phone number or turn off phone and text contact." };
  }
  if (!data.relationship) return { success: false, error: "Tell us who you are helping." };
  if (!data.desiredCity && !data.desiredZipCode) return { success: false, error: "Enter a city or ZIP code." };
  if (careTypes.length === 0) return { success: false, error: "Select at least one care type." };
  if (!data.moveTimeframe) return { success: false, error: "Select a move timeframe." };
  if (facilityIds.length < 1 || facilityIds.length > 3 || facilityIds.some((id) => !UUID_PATTERN.test(id))) {
    return { success: false, error: "Select between one and three valid facilities." };
  }
  if (
    data.referralSource === "network_profile" &&
    (!data.sourceFacilityId || !facilityIds.includes(data.sourceFacilityId))
  ) {
    return { success: false, error: "The originating Crown Network provider must remain selected." };
  }
  data.previouslyContactedFacilityIds = data.previouslyContactedFacilityIds.filter((id) =>
    facilityIds.includes(id),
  );
  if (!data.allowEmail && !data.allowPhone && !data.allowSms) {
    return { success: false, error: "Choose at least one contact method." };
  }
  data.preferredContactMethod = data.allowSms ? "sms" : data.allowPhone ? "phone" : "email";
  if (!data.sharingAccepted || !data.compensationAcknowledged || !data.privacyAccepted) {
    return { success: false, error: "Review and accept the required consent statements." };
  }
  if (!data.disclosureVersion || !data.disclosureText) {
    return { success: false, error: "The consent disclosure is incomplete." };
  }
  if (budgetLow !== null && (budgetLow < 0 || budgetLow > 1000000)) {
    return { success: false, error: "The budget range is invalid." };
  }
  if (budgetHigh !== null && (budgetHigh < 0 || budgetHigh > 1000000)) {
    return { success: false, error: "The budget range is invalid." };
  }
  if (budgetLow !== null && budgetHigh !== null && budgetHigh < budgetLow) {
    return { success: false, error: "The budget range is invalid." };
  }

  return { success: true, data };
}
