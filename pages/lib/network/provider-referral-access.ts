import "server-only";

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NetworkProviderReferral } from "@/lib/network/provider-referral-types";
import type { NetworkReferralFacilityStatus } from "@/lib/network/admin-types";

const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const NETWORK_PROVIDER_ACCESS_TTL_DAYS = 14;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map(asString).filter((item): item is string => Boolean(item))
    : [];
}

function asNumber(value: unknown) {
  if (value === null || value === "" || typeof value === "undefined") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isValidNetworkProviderAccessToken(token: string) {
  return ACCESS_TOKEN_PATTERN.test(token);
}

export function hashNetworkProviderAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createNetworkProviderAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashNetworkProviderAccessToken(token),
    expiresAt: new Date(
      Date.now() + NETWORK_PROVIDER_ACCESS_TTL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

export async function getNetworkProviderReferral(
  token: string,
  userAgent: string | null,
): Promise<NetworkProviderReferral | null> {
  if (!isValidNetworkProviderAccessToken(token)) return null;

  const tokenHash = hashNetworkProviderAccessToken(token);
  const admin = createAdminClient();
  const { data: referralFacilityId, error: openError } = await admin.rpc(
    "open_network_referral_access" as never,
    { p_token_hash: tokenHash, p_user_agent: userAgent } as never,
  );
  if (openError || typeof referralFacilityId !== "string") return null;

  const [{ data: recipient, error: recipientError }, { data: accessToken, error: tokenError }] =
    await Promise.all([
      admin
        .from("network_referral_facilities")
        .select("id,referral_id,facility_id,status,delivered_at,tour_scheduled_at")
        .eq("id", referralFacilityId)
        .maybeSingle(),
      admin
        .from("network_referral_access_tokens")
        .select("expires_at")
        .eq("token_hash", tokenHash)
        .is("revoked_at", null)
        .maybeSingle(),
    ]);
  if (recipientError || tokenError || !recipient || !accessToken) return null;

  const [{ data: referral }, { data: facility }, { data: consentRows }] = await Promise.all([
    admin
      .from("network_referrals")
      .select("id,care_search_id,attribution_code")
      .eq("id", recipient.referral_id)
      .maybeSingle(),
    admin
      .from("network_facilities")
      .select("id,page_id,business_id")
      .eq("id", recipient.facility_id)
      .maybeSingle(),
    admin
      .from("network_referral_consents")
      .select("disclosure_version,facility_ids,allow_email,allow_phone,allow_sms,granted_at,revoked_at")
      .eq("referral_id", recipient.referral_id)
      .is("revoked_at", null)
      .order("granted_at", { ascending: false }),
  ]);
  if (!referral || !facility) return null;

  const consent = (consentRows ?? []).find((row) =>
    Array.isArray(row.facility_ids) && row.facility_ids.includes(recipient.facility_id),
  );
  if (!consent) return null;

  const [{ data: search }, { data: page }, { data: business }, { data: placement }] = await Promise.all([
    admin
      .from("network_care_searches")
      .select("contact_first_name,contact_last_name,contact_email,contact_phone,preferred_contact_method,relationship_to_recipient,desired_city,desired_state,desired_zip_code,search_radius_miles,care_types,move_timeframe,budget_low,budget_high,preferences")
      .eq("id", referral.care_search_id)
      .maybeSingle(),
    admin.from("pages").select("title").eq("id", facility.page_id).maybeSingle(),
    admin.from("businesses").select("name").eq("id", facility.business_id).maybeSingle(),
    admin
      .from("network_placements")
      .select("status,move_in_date,placement_value,currency,care_level,notes")
      .eq("referral_facility_id", recipient.id)
      .maybeSingle(),
  ]);
  if (!search) return null;

  const preferences = asRecord(search.preferences);
  const allowPhoneContact = Boolean(consent.allow_phone || consent.allow_sms);
  const preferredContactMethod = ["email", "phone", "sms"].includes(
    search.preferred_contact_method,
  )
    ? (search.preferred_contact_method as "email" | "phone" | "sms")
    : null;

  return {
    referralId: referral.id,
    referralFacilityId: recipient.id,
    facilityId: recipient.facility_id,
    facilityName: page?.title || business?.name || "Your community",
    attributionCode: referral.attribution_code,
    status: recipient.status as NetworkReferralFacilityStatus,
    deliveredAt: recipient.delivered_at,
    accessExpiresAt: accessToken.expires_at,
    tourScheduledAt: recipient.tour_scheduled_at,
    placement: placement
      ? {
          status: placement.status as "reported" | "confirmed" | "disputed" | "cancelled",
          moveInDate: placement.move_in_date,
          placementValue: asNumber(placement.placement_value),
          currency: placement.currency,
          careLevel: placement.care_level,
          notes: placement.notes,
        }
      : null,
    family: {
      firstName: search.contact_first_name,
      lastName: search.contact_last_name,
      email: consent.allow_email ? search.contact_email : null,
      phone: allowPhoneContact ? search.contact_phone : null,
      preferredContactMethod,
      relationship: search.relationship_to_recipient,
    },
    search: {
      desiredCity: search.desired_city,
      desiredState: search.desired_state,
      desiredZipCode: search.desired_zip_code,
      radiusMiles: search.search_radius_miles,
      careTypes: search.care_types ?? [],
      moveTimeframe: search.move_timeframe,
      budgetLow: asNumber(search.budget_low),
      budgetHigh: asNumber(search.budget_high),
      supportNeeds: asStringArray(preferences.supportNeeds),
      preferences: asStringArray(preferences.preferences),
      additionalNotes: asString(preferences.additionalNotes),
    },
    consent: {
      version: consent.disclosure_version,
      grantedAt: consent.granted_at,
      allowEmail: consent.allow_email,
      allowPhone: consent.allow_phone,
      allowSms: consent.allow_sms,
    },
  };
}
