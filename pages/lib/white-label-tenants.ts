import { headers } from "next/headers";

export type WhiteLabelTenantId = "crownpages" | "aspen-ridge-east";

export interface WhiteLabelTenant {
  id: WhiteLabelTenantId;
  brandName: string;
  shortName: string;
  publicName: string;
  supportEmail: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  domains: string[];
  defaultBusinessSlug?: string;
  hidePlatformBranding: boolean;
  iosBundleIdentifier: string;
  androidPackageName: string;
  urlScheme: string;
  appleTeamId: string;
  androidSha256CertFingerprints: string[];
}

export const WHITE_LABEL_TENANTS: WhiteLabelTenant[] = [
  {
    id: "crownpages",
    brandName: "CrownPages",
    shortName: "Crown Pages",
    publicName: "CrownPages",
    supportEmail: "support@crownpages.com",
    logoUrl: "/darklogo.png",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    accentColor: "#d4af37",
    domains: ["crownpages.com", "www.crownpages.com", "localhost:3000"],
    hidePlatformBranding: false,
    iosBundleIdentifier: "com.phnteam.pagesmobile",
    androidPackageName: "com.phnteam.pagesmobile",
    urlScheme: "pagesmobile",
    appleTeamId: "643BVN45VK",
    androidSha256CertFingerprints: [
      "09:53:E1:48:C5:9C:1C:D6:B3:03:40:09:17:14:51:66:71:DC:D7:F3:A8:FC:1C:31:E0:AE:15:76:E1:24:31:38",
    ],
  },
  {
    id: "aspen-ridge-east",
    brandName: "Aspen Ridge Transitional Rehab - East",
    shortName: "Aspen Ridge East",
    publicName: "Aspen Ridge Transitional Rehab - East",
    supportEmail: "info@lhm.com",
    logoUrl: "/white-label/aspen-ridge-east/advanced-logo-no-background.png",
    primaryColor: "#000000",
    secondaryColor: "#c0c0c0",
    accentColor: "#b08d57",
    domains: [
      "pages.aspenridgeeast.com",
      "app.aspenridgeeast.com",
      "aspenridgeeast.crownpages.com",
    ],
    defaultBusinessSlug: "aspen-ridge-east",
    hidePlatformBranding: true,
    iosBundleIdentifier: "com.phnteam.aspenridgeeast",
    androidPackageName: "com.phnteam.aspenridgeeast",
    urlScheme: "aspenridgeeast",
    appleTeamId: "643BVN45VK",
    androidSha256CertFingerprints: [
      "09:53:E1:48:C5:9C:1C:D6:B3:03:40:09:17:14:51:66:71:DC:D7:F3:A8:FC:1C:31:E0:AE:15:76:E1:24:31:38",
    ],
  },
];

export const DEFAULT_WHITE_LABEL_TENANT = WHITE_LABEL_TENANTS[0];

export function normalizeHost(host: string | null | undefined) {
  return (host || "")
    .split(",")[0]
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export function getWhiteLabelTenantByHost(host: string | null | undefined) {
  const normalizedHost = normalizeHost(host);
  return (
    WHITE_LABEL_TENANTS.find((tenant) =>
      tenant.domains.some((domain) => normalizeHost(domain) === normalizedHost)
    ) || DEFAULT_WHITE_LABEL_TENANT
  );
}

export async function getCurrentWhiteLabelTenant() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");
  return getWhiteLabelTenantByHost(host);
}
