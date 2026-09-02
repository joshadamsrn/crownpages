import crypto from "crypto";

const CALENDAR_TOKEN_VERSION = 1;

export interface ConnectLead {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  note?: string;
}

export interface MeetingAttendee {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface CalendarPayload {
  title: string;
  description: string;
  startsAtIso: string;
  endsAtIso: string;
  location?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

function getCalendarSecret() {
  return (
    process.env.PAGE_CALENDAR_SIGNING_SECRET ||
    process.env.TWILIO_AUTH_TOKEN ||
    ""
  );
}

export function normalizeUsPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}

export function formatUsPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const normalized =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (normalized.length !== 10) {
    return phone;
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(
    3,
    6
  )}-${normalized.slice(6)}`;
}

export function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName.trim();
}

export function formatMeetingDateTime(
  startsAtIso: string,
  timezone: string,
  includeTimezone = false
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(includeTimezone ? { timeZoneName: "short" } : {}),
  });

  return formatter.format(new Date(startsAtIso));
}

function foldIcsLine(line: string) {
  if (line.length <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = ` ${remaining.slice(75)}`;
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcsFile(payload: CalendarPayload) {
  const startUtc = new Date(payload.startsAtIso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const endUtc = new Date(payload.endsAtIso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Crown Pages//Meeting Request//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@crownpages.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcsText(payload.title)}`,
    payload.description
      ? `DESCRIPTION:${escapeIcsText(payload.description)}`
      : "",
    payload.location ? `LOCATION:${escapeIcsText(payload.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function createCalendarToken(payload: CalendarPayload) {
  const secret = getCalendarSecret();
  if (!secret) {
    return null;
  }

  const encodedPayload = Buffer.from(
    JSON.stringify({ v: CALENDAR_TOKEN_VERSION, payload }),
    "utf8"
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyCalendarToken(token: string) {
  const secret = getCalendarSecret();
  if (!secret) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    return null;
  }

  const decoded = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf8")
  ) as { v: number; payload: CalendarPayload };

  if (decoded.v !== CALENDAR_TOKEN_VERSION) {
    return null;
  }

  return decoded.payload;
}

export async function sendSmsMessage(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER."
    );
  }

  const normalizedTo = normalizeUsPhone(to);
  const normalizedFrom = normalizeUsPhone(fromNumber);

  if (!normalizedTo || !normalizedFrom) {
    throw new Error("Invalid Twilio phone number configuration.");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${accountSid}:${authToken}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizedTo,
        From: normalizedFrom,
        Body: body,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio SMS failed: ${errorBody}`);
  }

  return response.json();
}

export async function sendEmailMessage(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Resend email failed: ${errorBody}`);
  }

  return response.json();
}

export function buildCalendarLink(baseUrl: string, payload: CalendarPayload) {
  const token = createCalendarToken(payload);
  if (!token) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}/calendar/${encodeURIComponent(token)}`;
}
