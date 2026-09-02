import "server-only";

import { randomUUID } from "node:crypto";

type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlaceDetails = {
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: GoogleAddressComponent[];
};

export type GooglePlacesCity = {
  city: string;
  stateCode: string;
  latitude: number;
  longitude: number;
};

function component(
  components: GoogleAddressComponent[] | undefined,
  type: string,
) {
  return components?.find((candidate) => candidate.types?.includes(type));
}

export async function resolveGooglePlacesCity(
  query: string,
  selectedState: string,
): Promise<GooglePlacesCity | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) return null;

  const sessionToken = randomUUID();
  const input = [query.trim(), selectedState.trim()].filter(Boolean).join(", ");
  if (!input) return null;

  try {
    const autocompleteResponse = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ["(cities)"],
          includedRegionCodes: ["us"],
          languageCode: "en",
          sessionToken,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(3500),
      },
    );
    if (!autocompleteResponse.ok) return null;

    const autocomplete = (await autocompleteResponse.json()) as {
      suggestions?: Array<{ placePrediction?: { placeId?: string } }>;
    };
    const placeId = autocomplete.suggestions?.find(
      (suggestion) => suggestion.placePrediction?.placeId,
    )?.placePrediction?.placeId;
    if (!placeId) return null;

    const detailsUrl = new URL(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    );
    detailsUrl.searchParams.set("sessionToken", sessionToken);
    detailsUrl.searchParams.set("languageCode", "en");
    detailsUrl.searchParams.set("regionCode", "US");

    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "displayName,location,addressComponents",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!detailsResponse.ok) return null;

    const details = (await detailsResponse.json()) as GooglePlaceDetails;
    const country = component(details.addressComponents, "country")?.shortText;
    const stateCode = component(
      details.addressComponents,
      "administrative_area_level_1",
    )?.shortText;
    const city =
      component(details.addressComponents, "locality")?.longText ||
      component(details.addressComponents, "postal_town")?.longText ||
      details.displayName?.text;
    const latitude = details.location?.latitude;
    const longitude = details.location?.longitude;

    if (
      country !== "US" ||
      !city ||
      !stateCode ||
      typeof latitude !== "number" ||
      !Number.isFinite(latitude) ||
      typeof longitude !== "number" ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return { city, stateCode, latitude, longitude };
  } catch {
    return null;
  }
}
