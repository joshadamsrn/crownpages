import "server-only";

import zipcodesUs from "zipcodes-us";
import { resolveGooglePlacesCity } from "@/lib/network/google-places";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type FacilityLocation = {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

export type ResolvedNetworkLocation = Coordinates & {
  label: string;
  kind: "city" | "zip";
  city: string;
  stateCode: string;
  zipCode: string | null;
};

const states = zipcodesUs.getStates();

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function getStateCode(value: string | null | undefined) {
  const candidate = normalize(value);
  if (!candidate) return null;
  return (
    states.find(
      (state) => normalize(state.code) === candidate || normalize(state.name) === candidate,
    )?.code ?? null
  );
}

function averageCoordinates(locations: Coordinates[]): Coordinates | null {
  if (!locations.length) return null;
  return {
    latitude:
      locations.reduce((total, location) => total + location.latitude, 0) / locations.length,
    longitude:
      locations.reduce((total, location) => total + location.longitude, 0) / locations.length,
  };
}

function resolveCity(city: string, state: string): ResolvedNetworkLocation | null {
  const stateCode = getStateCode(state);
  if (!stateCode) return null;
  const matches = zipcodesUs.findByCity(city.trim(), stateCode);
  const coordinates = averageCoordinates(matches);
  if (!coordinates) return null;
  return {
    ...coordinates,
    label: `${city.trim()}, ${stateCode}`,
    kind: "city",
    city: city.trim(),
    stateCode,
    zipCode: null,
  };
}

function resolveFacilityBackedCity(
  city: string,
  state: string,
  facilities: FacilityLocation[],
): ResolvedNetworkLocation | null {
  const stateCode = getStateCode(state);
  if (!stateCode) return null;

  const matchingFacilities = facilities.filter(
    (facility) =>
      normalize(facility.city) === normalize(city) &&
      getStateCode(facility.state) === stateCode,
  );
  const coordinates = averageCoordinates(
    matchingFacilities
      .map((facility) => resolveFacilityCoordinates(facility))
      .filter((location): location is Coordinates => Boolean(location)),
  );
  if (!coordinates) return null;

  const canonicalCity = matchingFacilities.find((facility) => facility.city)?.city || city.trim();
  return {
    ...coordinates,
    label: `${canonicalCity}, ${stateCode}`,
    kind: "city",
    city: canonicalCity,
    stateCode,
    zipCode: null,
  };
}

export async function resolveNetworkSearchLocation(
  query: string,
  selectedState: string,
  facilities: FacilityLocation[],
): Promise<ResolvedNetworkLocation | null> {
  const trimmedQuery = query.trim();
  const zipMatch = trimmedQuery.match(/^([0-9]{5})(?:-[0-9]{4})?$/);
  if (zipMatch) {
    const result = zipcodesUs.find(zipMatch[1]);
    if (!result.isValid) return null;
    return {
      latitude: result.latitude,
      longitude: result.longitude,
      label: `${zipMatch[1]} (${result.city}, ${result.stateCode})`,
      kind: "zip",
      city: result.city,
      stateCode: result.stateCode,
      zipCode: zipMatch[1],
    };
  }

  const [cityPart, queryStatePart] = trimmedQuery.split(",", 2).map((part) => part.trim());
  if (!cityPart) return null;

  let state = selectedState || queryStatePart || "";
  if (!state) {
    const matchingStates = new Set(
      facilities
        .filter((facility) => normalize(facility.city) === normalize(cityPart))
        .map((facility) => facility.state)
        .filter((value): value is string => Boolean(value)),
    );
    if (matchingStates.size === 1) state = Array.from(matchingStates)[0];
  }

  if (state) {
    const localLocation =
      resolveCity(cityPart, state) || resolveFacilityBackedCity(cityPart, state, facilities);
    if (localLocation) return localLocation;
  }

  const googleLocation = await resolveGooglePlacesCity(cityPart, state);
  if (!googleLocation) return null;

  const selectedStateCode = getStateCode(state);
  if (selectedStateCode && googleLocation.stateCode !== selectedStateCode) return null;

  return {
    latitude: googleLocation.latitude,
    longitude: googleLocation.longitude,
    label: `${googleLocation.city}, ${googleLocation.stateCode}`,
    kind: "city",
    city: googleLocation.city,
    stateCode: googleLocation.stateCode,
    zipCode: null,
  };
}

export function matchesResolvedNetworkLocation(
  facility: FacilityLocation,
  location: ResolvedNetworkLocation,
) {
  if (location.kind === "zip") {
    return facility.zipCode?.match(/[0-9]{5}/)?.[0] === location.zipCode;
  }

  return (
    normalize(facility.city) === normalize(location.city) &&
    getStateCode(facility.state) === location.stateCode
  );
}

export function resolveFacilityCoordinates(facility: FacilityLocation): Coordinates | null {
  if (
    typeof facility.latitude === "number" &&
    Number.isFinite(facility.latitude) &&
    typeof facility.longitude === "number" &&
    Number.isFinite(facility.longitude)
  ) {
    return { latitude: facility.latitude, longitude: facility.longitude };
  }

  const zipCode = facility.zipCode?.match(/[0-9]{5}/)?.[0];
  if (zipCode) {
    const result = zipcodesUs.findCoordinates(zipCode);
    if (result.isValid) return { latitude: result.latitude, longitude: result.longitude };
  }

  if (facility.city && facility.state) {
    return resolveCity(facility.city, facility.state);
  }
  return null;
}

export function distanceInMiles(origin: Coordinates, destination: Coordinates) {
  const earthRadiusMiles = 3958.8;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(destination.latitude - origin.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const originLatitude = radians(origin.latitude);
  const destinationLatitude = radians(destination.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
