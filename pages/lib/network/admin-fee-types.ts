import type { NetworkReferralFeeStatus } from "@/lib/network/admin-types";

export type NetworkAdminFee = {
  id: string;
  status: NetworkReferralFeeStatus;
  feeType: "flat" | "percentage" | "custom";
  amount: number;
  currency: string;
  facilityName: string;
  familyName: string;
  attributionCode: string;
  moveInDate: string;
  placementValue: number | null;
  protectionExpiresAt: string | null;
  outsideProtectionWindow: boolean;
  invoiceReference: string | null;
  invoicedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  disputedAt: string | null;
  waivedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NetworkAdminFeeAction =
  | "mark_invoiced"
  | "mark_paid"
  | "mark_disputed"
  | "resolve_confirmed"
  | "waive";

