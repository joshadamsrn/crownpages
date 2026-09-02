export const NETWORK_CARE_TYPES = [
  "Assisted Living",
  "Independent Living",
  "Memory Care",
  "Skilled Nursing",
  "Home Health",
  "Hospice",
  "In-Home Care",
  "Durable Medical Equipment",
  "Transportation",
] as const;

export const NETWORK_INSURANCE_CARE_TYPES = ["Skilled Nursing", "Home Health", "Hospice"] as const;

export type NetworkCareType = (typeof NETWORK_CARE_TYPES)[number];

export function isNetworkInsuranceCareType(value: string): boolean {
  return (NETWORK_INSURANCE_CARE_TYPES as readonly string[]).includes(value);
}

export function isNetworkInsuranceOnlyCareTypes(values: readonly string[]) {
  return values.length > 0 && values.every(isNetworkInsuranceCareType);
}

export type NetworkPricePeriod = "hour" | "day" | "week" | "month";

export type NetworkFacility = {
  id: string;
  networkFacilityId: string | null;
  pageId: string;
  businessId: string;
  slug: string;
  pageSlug: string;
  businessSlug: string;
  name: string;
  shortDescription: string | null;
  about: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  phone: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
  careTypes: NetworkCareType[];
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  pricePeriod: NetworkPricePeriod | null;
  acceptedInsurances: string[];
  distanceMiles: number | null;
  legacyFacilityId: string | null;
  isReferralEligible: boolean;
};

export type NetworkFacilityFilters = {
  query?: string;
  careType?: string;
  state?: string;
  radiusMiles?: number;
  priceMax?: number;
  insurance?: string;
  limit?: number;
};
