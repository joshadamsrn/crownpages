import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NetworkAdminReferral,
  NetworkAdminReferralEvent,
  NetworkAdminReferralFacility,
  NetworkPlacementStatus,
  NetworkReferralFeeStatus,
  NetworkReferralFacilityStatus,
  NetworkReferralStatus,
} from "@/lib/network/admin-types";

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
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getNetworkAdminReferrals(): Promise<NetworkAdminReferral[]> {
  const admin = createAdminClient();
  const { data: referralRows, error: referralError } = await admin
    .from("network_referrals")
    .select("id,care_search_id,status,attribution_code,submitted_at,protection_expires_at")
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (referralError) throw new Error(referralError.message);
  if (!referralRows?.length) return [];

  const referralIds = referralRows.map((referral) => referral.id);
  const careSearchIds = referralRows.map((referral) => referral.care_search_id);
  const [searchesResult, recipientsResult, consentsResult, eventsResult] = await Promise.all([
    admin
      .from("network_care_searches")
      .select("id,contact_first_name,contact_last_name,contact_email,contact_phone,preferred_contact_method,relationship_to_recipient,desired_city,desired_state,desired_zip_code,search_radius_miles,care_types,move_timeframe,budget_low,budget_high,preferences")
      .in("id", careSearchIds),
    admin
      .from("network_referral_facilities")
      .select("id,referral_id,facility_id,status,delivered_at,tour_scheduled_at,referral_fee_type_snapshot,referral_fee_amount_snapshot,referral_fee_percentage_snapshot,referral_terms_version_snapshot,referral_protection_days_snapshot,protection_expires_at")
      .in("referral_id", referralIds),
    admin
      .from("network_referral_consents")
      .select("id,referral_id,disclosure_version,disclosure_text,allow_email,allow_phone,allow_sms,granted_at")
      .in("referral_id", referralIds)
      .order("granted_at", { ascending: false }),
    admin
      .from("network_referral_events")
      .select("id,referral_id,referral_facility_id,actor_type,event_type,details,created_at")
      .in("referral_id", referralIds)
      .order("created_at", { ascending: true }),
  ]);

  for (const result of [searchesResult, recipientsResult, consentsResult, eventsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const recipientRows = recipientsResult.data ?? [];
  const facilityIds = Array.from(new Set(recipientRows.map((recipient) => recipient.facility_id)));
  const recipientIds = recipientRows.map((recipient) => recipient.id);
  const [facilityResult, notificationsResult, placementsResult, feesResult] = await Promise.all([
    facilityIds.length
      ? admin
          .from("network_facilities")
          .select("id,page_id,business_id,notification_email")
          .in("id", facilityIds)
      : Promise.resolve({ data: [], error: null }),
    recipientIds.length
      ? admin
          .from("network_referral_notifications")
          .select("referral_facility_id,recipient_email,status,error_message,created_at")
          .in("referral_facility_id", recipientIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    recipientIds.length
      ? admin
          .from("network_placements")
          .select("id,referral_facility_id,status,move_in_date,placement_value,currency,care_level,notes,reported_at,confirmed_at")
          .in("referral_facility_id", recipientIds)
      : Promise.resolve({ data: [], error: null }),
    recipientIds.length
      ? admin
          .from("network_referral_fees")
          .select("id,referral_facility_id,status,fee_type,amount,currency,invoice_reference,invoiced_at,due_at,paid_at,disputed_at,waived_at,notes")
          .in("referral_facility_id", recipientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (facilityResult.error) throw new Error(facilityResult.error.message);
  if (notificationsResult.error) throw new Error(notificationsResult.error.message);
  if (placementsResult.error) throw new Error(placementsResult.error.message);
  if (feesResult.error) throw new Error(feesResult.error.message);
  const facilityRows = facilityResult.data ?? [];

  const pageIds = (facilityRows ?? []).map((facility) => facility.page_id);
  const businessIds = (facilityRows ?? []).map((facility) => facility.business_id);
  const [pagesResult, businessesResult] = await Promise.all([
    pageIds.length
      ? admin.from("pages").select("id,title").in("id", pageIds)
      : Promise.resolve({ data: [], error: null }),
    businessIds.length
      ? admin.from("businesses").select("id,city,state").in("id", businessIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (pagesResult.error) throw new Error(pagesResult.error.message);
  if (businessesResult.error) throw new Error(businessesResult.error.message);

  const searchById = new Map((searchesResult.data ?? []).map((search) => [search.id, search]));
  const facilityById = new Map((facilityRows ?? []).map((facility) => [facility.id, facility]));
  const pageById = new Map((pagesResult.data ?? []).map((page) => [page.id, page]));
  const businessById = new Map((businessesResult.data ?? []).map((business) => [business.id, business]));
  type ConsentRow = NonNullable<typeof consentsResult.data>[number];
  const consentByReferralId = new Map<string, ConsentRow>();
  type NotificationRow = NonNullable<typeof notificationsResult.data>[number];
  const notificationByRecipientId = new Map<string, NotificationRow>();
  const placementByRecipientId = new Map(
    (placementsResult.data ?? []).map((placement) => [placement.referral_facility_id, placement]),
  );
  const feeByRecipientId = new Map(
    (feesResult.data ?? []).map((fee) => [fee.referral_facility_id, fee]),
  );

  for (const consent of consentsResult.data ?? []) {
    if (!consentByReferralId.has(consent.referral_id)) {
      consentByReferralId.set(consent.referral_id, consent);
    }
  }
  for (const notification of notificationsResult.data ?? []) {
    if (!notificationByRecipientId.has(notification.referral_facility_id)) {
      notificationByRecipientId.set(notification.referral_facility_id, notification);
    }
  }

  const recipientsByReferralId = new Map<string, NetworkAdminReferralFacility[]>();
  const recipientNameById = new Map<string, string>();

  for (const recipient of recipientRows) {
    const facility = facilityById.get(recipient.facility_id);
    if (!facility) continue;
    const page = pageById.get(facility.page_id);
    const business = businessById.get(facility.business_id);
    const search = searchById.get(
      referralRows.find((referral) => referral.id === recipient.referral_id)?.care_search_id,
    );
    const preferences = asRecord(search?.preferences);
    const previouslyContactedPageIds = asStringArray(preferences.previouslyContactedFacilityIds);
    const name = page?.title || "Unknown provider";
    const notification = notificationByRecipientId.get(recipient.id);
    const placement = placementByRecipientId.get(recipient.id);
    const fee = feeByRecipientId.get(recipient.id);
    const mapped: NetworkAdminReferralFacility = {
      recipientId: recipient.id,
      facilityId: recipient.facility_id,
      pageId: facility.page_id,
      name,
      city: business?.city || null,
      state: business?.state || null,
      status: recipient.status as NetworkReferralFacilityStatus,
      deliveredAt: recipient.delivered_at,
      previouslyContacted: previouslyContactedPageIds.includes(facility.page_id),
      notificationEmail: facility.notification_email || null,
      notificationStatus:
        notification?.status === "queued" ||
        notification?.status === "sent" ||
        notification?.status === "failed"
          ? notification.status
          : null,
      notificationError: notification?.error_message || null,
      protectionExpiresAt: recipient.protection_expires_at,
      feeTerms: {
        feeType:
          recipient.referral_fee_type_snapshot === "none" ||
          recipient.referral_fee_type_snapshot === "flat" ||
          recipient.referral_fee_type_snapshot === "percentage" ||
          recipient.referral_fee_type_snapshot === "custom"
            ? recipient.referral_fee_type_snapshot
            : null,
        flatAmount: asNumber(recipient.referral_fee_amount_snapshot),
        percentage: asNumber(recipient.referral_fee_percentage_snapshot),
        termsVersion: recipient.referral_terms_version_snapshot,
        protectionDays: asNumber(recipient.referral_protection_days_snapshot),
      },
      placement: placement
        ? {
            id: placement.id,
            status: placement.status as NetworkPlacementStatus,
            moveInDate: placement.move_in_date,
            placementValue: asNumber(placement.placement_value),
            currency: placement.currency,
            careLevel: placement.care_level,
            notes: placement.notes,
            reportedAt: placement.reported_at,
            confirmedAt: placement.confirmed_at,
          }
        : null,
      fee: fee
        ? {
            id: fee.id,
            status: fee.status as NetworkReferralFeeStatus,
            feeType: fee.fee_type as "none" | "flat" | "percentage" | "custom",
            amount: asNumber(fee.amount) ?? 0,
            currency: fee.currency,
            invoiceReference: fee.invoice_reference,
            invoicedAt: fee.invoiced_at,
            dueAt: fee.due_at,
            paidAt: fee.paid_at,
            disputedAt: fee.disputed_at,
            waivedAt: fee.waived_at,
            notes: fee.notes,
          }
        : null,
    };
    recipientsByReferralId.set(recipient.referral_id, [
      ...(recipientsByReferralId.get(recipient.referral_id) ?? []),
      mapped,
    ]);
    recipientNameById.set(recipient.id, name);
  }

  const eventsByReferralId = new Map<string, NetworkAdminReferralEvent[]>();
  for (const event of eventsResult.data ?? []) {
    const details = asRecord(event.details);
    const mapped: NetworkAdminReferralEvent = {
      id: event.id,
      eventType: event.event_type,
      actorType: event.actor_type,
      createdAt: event.created_at,
      note: asString(details.note),
      facilityName: event.referral_facility_id
        ? recipientNameById.get(event.referral_facility_id) || null
        : null,
    };
    eventsByReferralId.set(event.referral_id, [
      ...(eventsByReferralId.get(event.referral_id) ?? []),
      mapped,
    ]);
  }

  return referralRows.map((referral) => {
    const search = searchById.get(referral.care_search_id);
    if (!search) throw new Error(`Missing care search for referral ${referral.id}`);
    const preferences = asRecord(search.preferences);
    const consent = consentByReferralId.get(referral.id);
    const preferredContactMethod = ["email", "phone", "sms"].includes(
      search.preferred_contact_method,
    )
      ? (search.preferred_contact_method as "email" | "phone" | "sms")
      : null;

    return {
      id: referral.id,
      attributionCode: referral.attribution_code,
      status: referral.status as NetworkReferralStatus,
      submittedAt: referral.submitted_at,
      protectionExpiresAt: referral.protection_expires_at,
      contact: {
        firstName: search.contact_first_name,
        lastName: search.contact_last_name,
        email: search.contact_email,
        phone: search.contact_phone,
        preferredContactMethod,
      },
      search: {
        relationship: search.relationship_to_recipient,
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
      facilities: recipientsByReferralId.get(referral.id) ?? [],
      consent: consent
        ? {
            version: consent.disclosure_version,
            disclosureText: consent.disclosure_text,
            grantedAt: consent.granted_at,
            allowEmail: consent.allow_email,
            allowPhone: consent.allow_phone,
            allowSms: consent.allow_sms,
          }
        : null,
      events: eventsByReferralId.get(referral.id) ?? [],
    };
  });
}
