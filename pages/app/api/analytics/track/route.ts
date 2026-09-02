import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AttributionMode = "contact" | "anonymous" | "quick_share" | null;

type AnalyticsTrackBody = {
  page_id?: string;
  event_type?: string;
  event_data?: Record<string, unknown>;
  visitor_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  tracking_code?: string | null;
  attribution_mode?: AttributionMode;
  platform?: string | null;
  referrer?: string | null;
  client_event_id?: string | null;
};

type TrackableLink = {
  id: string;
  name: string | null;
  page_id: string | null;
  business_page_id: string | null;
  tracking_code: string;
  utm_source: string | null;
};

const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "link_click",
  "button_click",
  "form_submit",
  "share",
  "save",
  "print",
  "download",
  "phone_click",
  "email_click",
  "address_click",
  "social_click",
  "website_click",
  "contact_open",
  "page_exit",
  "photo_click",
  "video_click",
  "media_click",
  "save_contact",
]);

function textValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeAttributionMode(value: unknown): AttributionMode {
  const mode = textValue(value).toLowerCase();
  if (mode === "contact" || mode === "anonymous" || mode === "quick_share") {
    return mode;
  }

  return null;
}

function isNamedContactTrackableLink(trackableLink: Pick<TrackableLink, "name" | "utm_source">) {
  const name = trackableLink.name?.trim() || "";
  const normalizedName = name.toLowerCase();
  const normalizedSource = trackableLink.utm_source?.trim().toLowerCase() || "";

  if (!name) {
    return false;
  }

  return !(
    normalizedSource === "qr_code" ||
    normalizedSource.includes("quick") ||
    normalizedSource.includes("share") ||
    normalizedName === "quick share" ||
    normalizedName.startsWith("quick share")
  );
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();

  let deviceType = "desktop";
  if (/tablet|ipad/.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) {
    deviceType = "mobile";
  }

  let browser = "unknown";
  if (ua.includes("edg/")) {
    browser = "edge";
  } else if (ua.includes("chrome/") && !ua.includes("edg/")) {
    browser = "chrome";
  } else if (ua.includes("firefox/")) {
    browser = "firefox";
  } else if (ua.includes("safari/") && !ua.includes("chrome/")) {
    browser = "safari";
  } else if (ua.includes("opera/") || ua.includes("opr/")) {
    browser = "opera";
  }

  let os = "unknown";
  if (ua.includes("windows")) {
    os = "windows";
  } else if (ua.includes("mac os x")) {
    os = "macos";
  } else if (ua.includes("android")) {
    os = "android";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "ios";
  } else if (ua.includes("linux")) {
    os = "linux";
  }

  return { deviceType, browser, os };
}

async function getAnalyticsClient() {
  try {
    return createAdminClient();
  } catch {
    return createClient();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyticsTrackBody;
    const pageId = textValue(body.page_id);
    const eventType = textValue(body.event_type);
    const visitorId = textValue(body.visitor_id);
    const sessionId = textValue(body.session_id);

    if (!pageId || !eventType || !ALLOWED_EVENT_TYPES.has(eventType) || !visitorId || !sessionId) {
      return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    }

    const supabase = await getAnalyticsClient();
    const trackingCode = textValue(body.tracking_code);
    const requestedAttributionMode = normalizeAttributionMode(body.attribution_mode);
    let trackableLink: TrackableLink | null = null;

    if (trackingCode) {
      const { data, error } = await supabase
        .from("trackable_links")
        .select("id, name, page_id, business_page_id, tracking_code, utm_source")
        .eq("tracking_code", trackingCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        trackableLink = data as TrackableLink;
      }
    }

    const trackableLinkBelongsToPage = Boolean(trackableLink?.page_id && trackableLink.page_id === pageId);
    const isNamedContact =
      requestedAttributionMode === "contact" &&
      trackableLinkBelongsToPage &&
      trackableLink !== null &&
      isNamedContactTrackableLink(trackableLink);
    const attributionMode: AttributionMode =
      requestedAttributionMode || (trackableLink ? (isNamedContact ? "contact" : "anonymous") : null);
    const userAgent = request.headers.get("user-agent") || "";
    const deviceInfo = parseUserAgent(userAgent);
    const xForwardedFor = request.headers.get("x-forwarded-for") || "";
    const ipAddress =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      xForwardedFor.split(",")[0]?.trim() ||
      null;

    const eventData = {
      ...(body.event_data || {}),
      attribution_mode: attributionMode,
      client_event_id: textValue(body.client_event_id) || null,
      tracking_code: trackingCode || null,
      tracking_link_id: trackableLink?.id || null,
      tracking_link_name: trackableLink?.name || null,
      tracking_contact_name: isNamedContact ? trackableLink?.name || null : null,
      tracking_link_is_named: isNamedContact,
      tracking_source: trackableLink?.utm_source || null,
    };

    const { error } = await supabase.from("analytics_events").insert({
      page_id: pageId,
      event_type: eventType,
      event_data: eventData,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: textValue(body.user_id) || null,
      user_agent: userAgent || null,
      referrer: textValue(body.referrer) || request.headers.get("referer") || null,
      platform: textValue(body.platform) || (request.nextUrl.pathname.includes("/share/") ? "shared_link" : "web_app"),
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ip_address: ipAddress,
      country: request.headers.get("cf-ipcountry") || null,
      region: request.headers.get("cf-region") || null,
      city: request.headers.get("cf-ipcity") || null,
    });

    if (error) {
      console.error("Analytics event insert failed:", error);
      return NextResponse.json({ error: "Failed to track analytics event." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attribution: {
        mode: attributionMode,
        isNamed: isNamedContact,
        trackingCode: trackingCode || null,
        trackingLinkId: trackableLink?.id || null,
        contactName: isNamedContact ? trackableLink?.name || null : null,
      },
    });
  } catch (error) {
    console.error("Analytics tracking API error:", error);
    return NextResponse.json({ error: "Failed to track analytics event." }, { status: 500 });
  }
}
