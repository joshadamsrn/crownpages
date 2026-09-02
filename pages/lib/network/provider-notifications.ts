import "server-only";

import { sendEmailMessage } from "@/lib/page-engagement-server";

function getProviderAccessBaseUrl() {
  let configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";
  if (process.env.VERCEL_ENV === "production") {
    const configuredHost = configuredUrl ? new URL(configuredUrl).hostname : "";
    if (!configuredUrl || configuredHost === "localhost") configuredUrl = "https://crownpages.com";
  }
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for secure provider referral links.");
  }
  const parsed = new URL(configuredUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("Secure provider referral links require an HTTPS site URL.");
  }
  return configuredUrl;
}

export function buildNetworkProviderAccessUrl(token: string) {
  return `${getProviderAccessBaseUrl()}/network-referrals/${encodeURIComponent(token)}`;
}

export async function sendNetworkProviderReferralNotification({
  to,
  facilityName,
  accessUrl,
  expiresAt,
}: {
  to: string;
  facilityName: string;
  accessUrl: string;
  expiresAt: string;
}) {
  const expiration = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  }).format(new Date(expiresAt));

  return sendEmailMessage({
    to,
    subject: "A Crown Network referral is ready for secure review",
    text: [
      `A new Crown Network referral is available for ${facilityName}.`,
      "",
      "For privacy, this email does not contain the family’s name, contact information, or care details.",
      "Use the secure link below to review and respond:",
      accessUrl,
      "",
      `This private link expires on ${expiration}. Do not forward it or copy referral details into unsecured email or text messages.`,
      "",
      "If you were not expecting this referral, do not open the link and contact Crown Network through your Crown Pages account.",
    ].join("\n"),
  });
}
