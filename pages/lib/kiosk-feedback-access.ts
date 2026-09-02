import { createHmac, timingSafeEqual } from "crypto";

const FEEDBACK_TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getFeedbackAccessSecret() {
  const secret =
    process.env.KIOSK_FEEDBACK_ACCESS_SECRET ||
    process.env.PAGE_CALENDAR_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing kiosk feedback access secret");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getFeedbackAccessSecret()).update(payload).digest("base64url");
}

export function createKioskFeedbackAccessToken(feedbackId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      feedbackId,
      exp: Math.floor(Date.now() / 1000) + FEEDBACK_TOKEN_TTL_SECONDS,
    }),
    "utf8",
  ).toString("base64url");

  return `${payload}.${signPayload(payload)}`;
}

export function verifyKioskFeedbackAccessToken(token: string | null | undefined, feedbackId: string) {
  if (!token || !feedbackId) {
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
      feedbackId?: string;
      exp?: number;
    };

    return (
      parsed.feedbackId === feedbackId &&
      typeof parsed.exp === "number" &&
      parsed.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
