import "server-only";

export function isNetworkReferralsEnabled() {
  const configured = process.env.NETWORK_REFERRALS_ENABLED?.trim().toLowerCase();
  if (configured) return configured === "true";

  // Vercel provides this automatically. The live deployment defaults on,
  // while previews and local development stay opt-in.
  return process.env.VERCEL_ENV === "production";
}
