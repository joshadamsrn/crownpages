export type NetworkReferralStatus =
  | "submitted"
  | "matching"
  | "delivered"
  | "touring"
  | "placed"
  | "closed"
  | "cancelled";

export type NetworkReferralFacilityStatus =
  | "pending"
  | "delivered"
  | "viewed"
  | "accepted"
  | "declined"
  | "duplicate"
  | "tour_scheduled"
  | "placed"
  | "lost";

export type NetworkPlacementStatus = "reported" | "confirmed" | "disputed" | "cancelled";
export type NetworkReferralFeeStatus = "confirmed" | "invoiced" | "paid" | "disputed" | "waived";

export type NetworkReferralPlacement = {
  id: string;
  status: NetworkPlacementStatus;
  moveInDate: string;
  placementValue: number | null;
  currency: string;
  careLevel: string | null;
  notes: string | null;
  reportedAt: string;
  confirmedAt: string | null;
};

export type NetworkReferralFee = {
  id: string;
  status: NetworkReferralFeeStatus;
  feeType: "flat" | "percentage" | "custom";
  amount: number;
  currency: string;
  invoiceReference: string | null;
  invoicedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  disputedAt: string | null;
  waivedAt: string | null;
  notes: string | null;
};

export type NetworkAdminReferralFacility = {
  recipientId: string;
  facilityId: string;
  pageId: string;
  name: string;
  city: string | null;
  state: string | null;
  status: NetworkReferralFacilityStatus;
  deliveredAt: string | null;
  previouslyContacted: boolean;
  notificationEmail: string | null;
  notificationStatus: "queued" | "sent" | "failed" | null;
  notificationError: string | null;
  protectionExpiresAt: string | null;
  feeTerms: {
    feeType: "flat" | "percentage" | "custom" | null;
    flatAmount: number | null;
    percentage: number | null;
    termsVersion: string | null;
    protectionDays: number | null;
  };
  placement: NetworkReferralPlacement | null;
  fee: NetworkReferralFee | null;
};

export type NetworkAdminReferralEvent = {
  id: string;
  eventType: string;
  actorType: string;
  createdAt: string;
  note: string | null;
  facilityName: string | null;
};

export type NetworkAdminReferral = {
  id: string;
  attributionCode: string;
  status: NetworkReferralStatus;
  submittedAt: string;
  protectionExpiresAt: string | null;
  contact: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    preferredContactMethod: "email" | "phone" | "sms" | null;
  };
  search: {
    relationship: string | null;
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
  facilities: NetworkAdminReferralFacility[];
  consent: {
    version: string;
    disclosureText: string;
    grantedAt: string;
    allowEmail: boolean;
    allowPhone: boolean;
    allowSms: boolean;
  } | null;
  events: NetworkAdminReferralEvent[];
};

export type NetworkAdminReferralAction =
  | "qualify"
  | "request_information"
  | "deliver"
  | "resend_access"
  | "mark_duplicate"
  | "mark_accepted"
  | "schedule_tour"
  | "mark_placed"
  | "mark_lost"
  | "close";
