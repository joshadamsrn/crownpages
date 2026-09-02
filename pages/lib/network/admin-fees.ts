import "server-only";

import type { NetworkAdminFee } from "@/lib/network/admin-fee-types";
import type { NetworkReferralFeeStatus } from "@/lib/network/admin-types";
import { createAdminClient } from "@/lib/supabase/admin";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function getNetworkAdminFees(): Promise<NetworkAdminFee[]> {
  const admin = createAdminClient();
  const { data: feeRows, error: feeError } = await admin
    .from("network_referral_fees")
    .select("id,placement_id,referral_facility_id,status,fee_type,amount,currency,calculation_basis,invoice_reference,invoiced_at,due_at,paid_at,disputed_at,waived_at,notes,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (feeError) throw new Error(feeError.message);
  if (!feeRows?.length) return [];

  const recipientIds = feeRows.map((fee) => fee.referral_facility_id);
  const placementIds = feeRows.map((fee) => fee.placement_id);
  const [placementsResult, recipientsResult] = await Promise.all([
    admin
      .from("network_placements")
      .select("id,move_in_date,placement_value")
      .in("id", placementIds),
    admin
      .from("network_referral_facilities")
      .select("id,referral_id,facility_id,protection_expires_at")
      .in("id", recipientIds),
  ]);
  if (placementsResult.error) throw new Error(placementsResult.error.message);
  if (recipientsResult.error) throw new Error(recipientsResult.error.message);

  const recipients = recipientsResult.data ?? [];
  const referralIds = Array.from(new Set(recipients.map((recipient) => recipient.referral_id)));
  const facilityIds = Array.from(new Set(recipients.map((recipient) => recipient.facility_id)));
  const [referralsResult, facilitiesResult] = await Promise.all([
    admin
      .from("network_referrals")
      .select("id,care_search_id,attribution_code")
      .in("id", referralIds),
    admin.from("network_facilities").select("id,page_id").in("id", facilityIds),
  ]);
  if (referralsResult.error) throw new Error(referralsResult.error.message);
  if (facilitiesResult.error) throw new Error(facilitiesResult.error.message);

  const referrals = referralsResult.data ?? [];
  const careSearchIds = Array.from(new Set(referrals.map((referral) => referral.care_search_id)));
  const pageIds = Array.from(new Set((facilitiesResult.data ?? []).map((facility) => facility.page_id)));
  const [searchesResult, pagesResult] = await Promise.all([
    admin
      .from("network_care_searches")
      .select("id,contact_first_name,contact_last_name")
      .in("id", careSearchIds),
    admin.from("pages").select("id,title").in("id", pageIds),
  ]);
  if (searchesResult.error) throw new Error(searchesResult.error.message);
  if (pagesResult.error) throw new Error(pagesResult.error.message);

  const placementById = new Map((placementsResult.data ?? []).map((row) => [row.id, row]));
  const recipientById = new Map(recipients.map((row) => [row.id, row]));
  const referralById = new Map(referrals.map((row) => [row.id, row]));
  const facilityById = new Map((facilitiesResult.data ?? []).map((row) => [row.id, row]));
  const searchById = new Map((searchesResult.data ?? []).map((row) => [row.id, row]));
  const pageById = new Map((pagesResult.data ?? []).map((row) => [row.id, row]));

  return feeRows.flatMap((fee) => {
    const placement = placementById.get(fee.placement_id);
    const recipient = recipientById.get(fee.referral_facility_id);
    const referral = recipient ? referralById.get(recipient.referral_id) : null;
    const facility = recipient ? facilityById.get(recipient.facility_id) : null;
    const search = referral ? searchById.get(referral.care_search_id) : null;
    const page = facility ? pageById.get(facility.page_id) : null;
    if (!placement || !recipient || !referral || !facility || !search || !page) return [];
    const basis = asRecord(fee.calculation_basis);

    return [{
      id: fee.id,
      status: fee.status as NetworkReferralFeeStatus,
      feeType: fee.fee_type as "flat" | "percentage" | "custom",
      amount: asNumber(fee.amount) ?? 0,
      currency: fee.currency,
      facilityName: page.title,
      familyName: `${search.contact_first_name} ${search.contact_last_name}`.trim(),
      attributionCode: referral.attribution_code,
      moveInDate: placement.move_in_date,
      placementValue: asNumber(placement.placement_value),
      protectionExpiresAt: recipient.protection_expires_at,
      outsideProtectionWindow: basis.outsideProtectionWindow === true,
      invoiceReference: fee.invoice_reference,
      invoicedAt: fee.invoiced_at,
      dueAt: fee.due_at,
      paidAt: fee.paid_at,
      disputedAt: fee.disputed_at,
      waivedAt: fee.waived_at,
      notes: fee.notes,
      createdAt: fee.created_at,
      updatedAt: fee.updated_at,
    } satisfies NetworkAdminFee];
  });
}

