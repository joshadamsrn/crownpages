import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUploadPublicUrl } from "@/lib/upload-public-url";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import {
  distanceInMiles,
  matchesResolvedNetworkLocation,
  resolveFacilityCoordinates,
  resolveNetworkSearchLocation,
} from "@/lib/network/location";
import {
  NETWORK_CARE_TYPES,
  type NetworkCareType,
  type NetworkFacility,
  type NetworkFacilityFilters,
  type NetworkPricePeriod,
} from "@/lib/network/types";

type JsonObject = Record<string, unknown>;

type RawBusiness = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  street_address: string | null;
};

type RawPage = {
  id: string;
  business_id: string;
  title: string;
  slug: string;
  description: string | null;
  og_image_url: string | null;
  content: unknown;
  businesses: RawBusiness | RawBusiness[] | null;
};

type RawNetworkFacility = {
  id: string;
  page_id: string;
  source_facility_id: string | null;
  listing_status: string;
  referral_status: string;
  is_accepting_referrals: boolean;
  care_types: string[] | null;
  amenities: string[] | null;
  agreement_status: string;
  referral_fee_type: string | null;
  notification_email: string | null;
  agreement_effective_at: string | null;
  agreement_expires_at: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  price_low: number | string | null;
  price_high: number | string | null;
  price_period: string | null;
  accepted_insurances: string[] | null;
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asPricePeriod(value: string | null | undefined): NetworkPricePeriod | null {
  return value === "hour" || value === "day" || value === "week" || value === "month"
    ? value
    : null;
}

function getSections(content: unknown): JsonObject[] {
  const sections = asObject(content)?.sections;
  return Array.isArray(sections)
    ? sections.map(asObject).filter((section): section is JsonObject => Boolean(section))
    : [];
}

function getSectionData(content: unknown, type: string): JsonObject | null {
  const section = getSections(content).find((candidate) => candidate.type === type);
  return asObject(section?.data);
}

function getAmenities(content: unknown): string[] {
  const amenities = getSectionData(content, "amenities")?.amenities;
  if (!Array.isArray(amenities)) return [];

  return amenities
    .map((item) => asString(asObject(item)?.name))
    .filter((item): item is string => Boolean(item));
}

function getNetworkImageUrl(path: string | null) {
  if (!path) return null;

  const publicUrl = getUploadPublicUrl(path);
  const crownSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!publicUrl || !crownSupabaseUrl) return null;

  try {
    return new URL(publicUrl).hostname === new URL(crownSupabaseUrl).hostname ? publicUrl : null;
  } catch {
    return null;
  }
}

function inferCareTypes(description: string | null, about: string | null, amenities: string[]) {
  const searchable = [description, about, ...amenities]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return NETWORK_CARE_TYPES.filter((careType) => {
    const aliases: Record<NetworkCareType, string[]> = {
      "Assisted Living": ["assisted living"],
      "Independent Living": ["independent living"],
      "Memory Care": ["memory care"],
      "Skilled Nursing": ["skilled nursing", "nursing facility"],
      "Home Health": ["home health"],
      Hospice: ["hospice"],
      "In-Home Care": ["in-home care", "in home care", "personal care support"],
      "Durable Medical Equipment": ["durable medical equipment", "medical equipment", "dme"],
      Transportation: ["medical transportation", "senior transportation"],
    };

    return aliases[careType].some((alias) => searchable.includes(alias));
  });
}

function getCareTypes(value: string[] | null | undefined) {
  const allowed = new Set<string>(NETWORK_CARE_TYPES);
  return (value ?? []).filter((careType): careType is NetworkCareType => allowed.has(careType));
}

function mapPageToFacility(
  page: RawPage,
  networkFacility: RawNetworkFacility | null = null,
): NetworkFacility | null {
  const business = Array.isArray(page.businesses) ? page.businesses[0] : page.businesses;
  if (!business) return null;

  const hero = getSectionData(page.content, "hero");
  const about = asString(getSectionData(page.content, "about")?.content);
  const amenities = getAmenities(page.content);
  const importSource = asObject(asObject(page.content)?.importSource);
  const imagePath = page.og_image_url || asString(hero?.backgroundImage);
  const logoPath = asString(hero?.logoUrl);
  const declaredCareTypes = inferCareTypes(page.description, null, []);
  const importedCareTypes = getCareTypes(networkFacility?.care_types);
  const careTypes = declaredCareTypes.length
    ? declaredCareTypes
    : importedCareTypes.length
      ? importedCareTypes
      : inferCareTypes(page.description, about, amenities);

  return {
    id: page.id,
    networkFacilityId: networkFacility?.id ?? null,
    pageId: page.id,
    businessId: page.business_id,
    slug: business.slug,
    pageSlug: page.slug,
    businessSlug: business.slug,
    name: page.title || business.name,
    shortDescription: page.description,
    about,
    city: business.city,
    state: business.state,
    zipCode: business.zip_code,
    streetAddress: business.street_address,
    phone: business.phone,
    imageUrl: getNetworkImageUrl(imagePath),
    logoUrl: getNetworkImageUrl(logoPath),
    careTypes,
    amenities: networkFacility?.amenities?.length ? networkFacility.amenities : amenities,
    latitude: asNumber(networkFacility?.latitude),
    longitude: asNumber(networkFacility?.longitude),
    priceLow: asNumber(networkFacility?.price_low),
    priceHigh: asNumber(networkFacility?.price_high),
    pricePeriod: asPricePeriod(networkFacility?.price_period),
    acceptedInsurances: (networkFacility?.accepted_insurances ?? [])
      .map(asString)
      .filter((insurance): insurance is string => Boolean(insurance)),
    distanceMiles: null,
    legacyFacilityId: networkFacility?.source_facility_id || asString(importSource?.facilityId),
    isReferralEligible: networkFacility
      ? isNetworkFacilityReferralEligible(networkFacility)
      : false,
  };
}

async function getPagesByIds(pageIds: string[]) {
  const supabase = createAdminClient();
  if (!pageIds.length) return [];

  const pages: RawPage[] = [];
  const batchSize = 75;
  for (let index = 0; index < pageIds.length; index += batchSize) {
    const { data, error } = await supabase
      .from("pages")
      .select(
        "id,business_id,title,slug,description,og_image_url,businesses!inner(id,slug,name,phone,city,state,zip_code,street_address)",
      )
      .in("id", pageIds.slice(index, index + batchSize))
      .eq("is_active", true)
      .eq("is_published", true)
      .limit(batchSize);

    if (error) {
      console.error("Unable to load Crown Network facility profiles", error);
      return [];
    }

    pages.push(...(data as unknown as RawPage[]));
  }

  return pages.sort((left, right) => left.title.localeCompare(right.title));
}

async function getFullPageById(pageId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select(
      "id,business_id,title,slug,description,og_image_url,content,businesses!inner(id,slug,name,phone,city,state,zip_code,street_address)",
    )
    .eq("id", pageId)
    .eq("is_active", true)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Crown Network facility profile", error);
    return null;
  }

  return data as unknown as RawPage | null;
}

const getAllImportedFacilities = cache(async (): Promise<NetworkFacility[]> => {
  const supabase = createAdminClient();

  if (isNetworkReferralsEnabled()) {
    const { data: facilityData, error: facilityError } = await supabase
      .from("network_facilities")
      .select(
        "id,page_id,source_facility_id,listing_status,referral_status,is_accepting_referrals,care_types,amenities,agreement_status,referral_fee_type,notification_email,agreement_effective_at,agreement_expires_at,latitude,longitude,price_low,price_high,price_period,accepted_insurances",
      )
      .in("listing_status", ["listed", "verified", "partner"])
      .limit(1000);

    if (facilityError) {
      console.error("Unable to load Crown Network facility records", facilityError);
      return [];
    }

    const networkFacilities = (facilityData ?? []) as unknown as RawNetworkFacility[];
    const networkByPageId = new Map(
      networkFacilities.map((facility) => [facility.page_id, facility]),
    );
    const pages = await getPagesByIds(networkFacilities.map((facility) => facility.page_id));
    return pages
      .map((page) => mapPageToFacility(page, networkByPageId.get(page.id) ?? null))
      .filter((facility): facility is NetworkFacility => Boolean(facility));
  }

  // Keep the family-facing preview usable before the Network schema is
  // deployed. Live environments use the canonical records above.
  const { data, error } = await supabase
    .from("pages")
    .select(
      "id,business_id,title,slug,description,og_image_url,businesses!inner(id,slug,name,phone,city,state,zip_code,street_address)",
    )
    .eq("content->importSource->>source", "phn")
    .eq("is_active", true)
    .eq("is_published", true)
    .order("title", { ascending: true })
    .limit(1000);

  if (error) {
    console.error("Unable to load preview Crown Network facilities", error);
    return [];
  }

  return (data as unknown as RawPage[])
    .map((page) => mapPageToFacility(page))
    .filter((facility): facility is NetworkFacility => Boolean(facility));
});

export async function searchNetworkFacilities(filters: NetworkFacilityFilters = {}) {
  const facilities = await getAllImportedFacilities();
  const queryText = filters.query?.trim() || "";
  const query = queryText.toLowerCase();
  const careType = filters.careType?.trim().toLowerCase();
  const state = filters.state?.trim().toLowerCase();
  const radiusMiles =
    typeof filters.radiusMiles === "number" && filters.radiusMiles > 0
      ? filters.radiusMiles
      : null;
  const priceMax =
    typeof filters.priceMax === "number" && filters.priceMax >= 0 ? filters.priceMax : null;
  const insurance = filters.insurance?.trim().toLowerCase() || "";
  const resolvedQueryLocation = queryText
    ? await resolveNetworkSearchLocation(queryText, filters.state?.trim() || "", facilities)
    : null;
  const searchLocation = radiusMiles ? resolvedQueryLocation : null;
  const locationStatus = radiusMiles
    ? !queryText
      ? "missing"
      : resolvedQueryLocation
        ? "resolved"
        : "unresolved"
    : resolvedQueryLocation
      ? "exact"
      : "not_requested";

  const matches = facilities
    .map((facility) => {
      const coordinates = searchLocation ? resolveFacilityCoordinates(facility) : null;
      const distanceMiles =
        searchLocation && coordinates ? distanceInMiles(searchLocation, coordinates) : null;
      return { ...facility, distanceMiles };
    })
    .filter((facility) => {
      if (careType && !facility.careTypes.some((item) => item.toLowerCase() === careType)) {
        return false;
      }

      if (state && facility.state?.toLowerCase() !== state) {
        return false;
      }

      if (searchLocation && radiusMiles) {
        if (facility.distanceMiles === null || facility.distanceMiles > radiusMiles) return false;
      }

      if (
        !radiusMiles &&
        resolvedQueryLocation &&
        !matchesResolvedNetworkLocation(facility, resolvedQueryLocation)
      ) {
        return false;
      }

      if (priceMax !== null) {
        const facilityLow = facility.priceLow ?? facility.priceHigh;
        // Keep providers without a published price discoverable. Their cards
        // are clearly labeled "Contact for pricing" and sort after providers
        // whose advertised starting price is within the family's budget.
        if (facilityLow !== null && facilityLow > priceMax) return false;
      }

      if (
        insurance &&
        !facility.acceptedInsurances.some((plan) => plan.toLowerCase().includes(insurance))
      ) {
        return false;
      }

      if (!query || resolvedQueryLocation) return true;

      const searchable = [
        facility.name,
        facility.shortDescription,
        facility.about,
        facility.city,
        facility.state,
        facility.zipCode,
        ...facility.careTypes,
        ...facility.amenities,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    })
    .sort((left, right) => {
      if (priceMax !== null) {
        const leftHasPrice = left.priceLow !== null || left.priceHigh !== null;
        const rightHasPrice = right.priceLow !== null || right.priceHigh !== null;
        if (leftHasPrice !== rightHasPrice) return leftHasPrice ? -1 : 1;
      }

      if (searchLocation) {
        if (left.distanceMiles === null) return 1;
        if (right.distanceMiles === null) return -1;
        if (left.distanceMiles !== right.distanceMiles) {
          return left.distanceMiles - right.distanceMiles;
        }
      }
      return left.name.localeCompare(right.name);
    });

  return {
    facilities: matches.slice(0, filters.limit ?? 24),
    total: matches.length,
    location: {
      status: locationStatus,
      label: resolvedQueryLocation?.label ?? null,
    },
  };
}

export async function getNetworkFacilities(filters: NetworkFacilityFilters = {}) {
  return (await searchNetworkFacilities(filters)).facilities;
}

export async function getNetworkFacility(slug: string) {
  const facilities = await getAllImportedFacilities();
  const facility = facilities.find((candidate) => candidate.slug === slug) ?? null;
  if (!facility) return null;

  const page = await getFullPageById(facility.pageId);
  const fullProfile = page ? mapPageToFacility(page) : null;
  if (!fullProfile) return facility;

  return {
    ...facility,
    about: fullProfile.about,
    amenities: facility.amenities.length ? facility.amenities : fullProfile.amenities,
    imageUrl: fullProfile.imageUrl || facility.imageUrl,
    logoUrl: fullProfile.logoUrl || facility.logoUrl,
  };
}

export async function getNetworkStates() {
  const facilities = await getAllImportedFacilities();
  return Array.from(
    new Set(facilities.map((facility) => facility.state).filter((state): state is string => Boolean(state))),
  ).sort((a, b) => a.localeCompare(b));
}

export async function getNetworkLocationOptions() {
  const facilities = await getAllImportedFacilities();
  const options = new Map<string, string>();

  for (const facility of facilities) {
    const city = facility.city?.trim();
    const state = facility.state?.trim();
    if (!city || !state) continue;
    options.set(`${city.toLowerCase()}|${state.toLowerCase()}`, `${city}, ${state}`);
  }

  return Array.from(options.values()).sort((a, b) => a.localeCompare(b));
}

export async function getNetworkInsuranceOptions() {
  const facilities = await getAllImportedFacilities();
  const options = new Map<string, string>();

  for (const facility of facilities) {
    for (const insurance of facility.acceptedInsurances) {
      const normalized = insurance.trim();
      if (normalized) options.set(normalized.toLowerCase(), normalized);
    }
  }

  return Array.from(options.values()).sort((a, b) => a.localeCompare(b));
}

export async function getReferralEligiblePageIds() {
  const facilities = await getAllImportedFacilities();
  return new Set(
    facilities
      .filter((facility) => facility.isReferralEligible)
      .map((facility) => facility.pageId),
  );
}
