import { createHmac, timingSafeEqual } from "crypto";

const ACCESS_TOKEN_TTL_SECONDS = 8 * 60 * 60;
export const KIOSK_OVERVIEW_COOKIE_NAME = "crownpages_kiosk_overview";

function getAccessSecret() {
  const secret =
    process.env.KIOSK_OVERVIEW_ACCESS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!secret) {
    throw new Error("Missing kiosk overview access secret");
  }

  return secret;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string) {
  return base64Url(createHmac("sha256", getAccessSecret()).update(payload).digest());
}

export function createKioskOverviewAccessToken(businessId: string) {
  const payload = base64Url(
    JSON.stringify({
      businessId,
      exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    }),
  );

  return `${payload}.${signPayload(payload)}`;
}

export function getKioskOverviewAccessMaxAge() {
  return ACCESS_TOKEN_TTL_SECONDS;
}

export function verifyKioskOverviewAccessToken(token: string | undefined, businessId: string) {
  if (!token || !businessId) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      businessId?: string;
      exp?: number;
    };

    return (
      parsed.businessId === businessId &&
      typeof parsed.exp === "number" &&
      parsed.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
