import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createCrmContact, logCrmActivity } from "@/lib/crm";
import {
  formatMeetingDateTime,
  formatUsPhone,
  normalizeUsPhone,
  sendSmsMessage,
} from "@/lib/page-engagement-server";
import { createSmsShortLink } from "@/lib/sms-short-links";

type PublicPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: { slug: string; name?: string | null } | null;
};

type KioskLeadBody = {
  pageId?: string;
  requestType?: "connect" | "schedule_tour" | "info_packet";
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  comments?: string;
  requestedAtIso?: string | null;
  timezone?: string;
  visitorId?: string | null;
  sessionId?: string | null;
};

type NormalizedKioskLeadBody = KioskLeadBody & {
  requestType: NonNullable<KioskLeadBody["requestType"]>;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

async function loadPublicPage(pageId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .select(
      `
        id,
        title,
        slug,
        business_id,
        content,
        businesses!inner (
          slug,
          name
        )
      `,
    )
    .eq("id", pageId)
    .eq("is_active", true)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as PublicPageRecord;
}

function getSectionData(page: PublicPageRecord, sectionType: string) {
  return (
    page.content?.sections?.find((section) => section.type === sectionType)?.data ||
    {}
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getPublicSiteUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return request.nextUrl.origin.replace(/\/$/, "");
}

async function createInfoPacketLink(args: {
  publicSiteUrl: string;
  pagePath: string;
}) {
  const longLink = `${args.publicSiteUrl}${args.pagePath}`;

  try {
    return await createSmsShortLink({
      baseUrl: args.publicSiteUrl,
      targetPath: args.pagePath,
      linkType: "info_packet",
    });
  } catch (error) {
    console.error("Failed to create kiosk info packet short link:", error);
    return longLink;
  }
}

function buildOwnerMessage(args: {
  body: NormalizedKioskLeadBody;
  pageTitle: string;
  formattedDateTime: string | null;
}) {
  const requestLabel =
    args.body.requestType === "info_packet"
      ? "information packet request"
      : args.body.requestType === "schedule_tour"
        ? "tour request"
        : "kiosk inquiry";

  return [
    `New ${requestLabel} from Crown Pages Kiosk!`,
    `Page: ${args.pageTitle}`,
    `Name: ${args.body.firstName} ${args.body.lastName}`,
    `Phone: ${formatUsPhone(args.body.phone)}`,
    args.body.email ? `Email: ${args.body.email}` : "",
    args.formattedDateTime ? `Requested visit: ${args.formattedDateTime}` : "",
    args.body.comments?.trim() ? `Notes: ${args.body.comments.trim()}` : "",
    "Contact ASAP!",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildInfoPacketMessage(args: {
  firstName: string;
  pageTitle: string;
  pageUrl: string;
}) {
  return [
    `Hi ${args.firstName}!`,
    `Your digital information packet for ${args.pageTitle} is ready:`,
    args.pageUrl,
    "It includes the virtual tour, pricing, brochure, photos, and available resources.",
    "Message & data rates may apply. Reply STOP to opt out. Reply HELP for help.",
  ].join("\n");
}

async function createKioskLeadContact(args: {
  page: PublicPageRecord;
  body: NormalizedKioskLeadBody;
  formattedDateTime: string | null;
}) {
  const crmSupabase = createAdminClient();
  const crmMessage = [
    "Submitted from kiosk.",
    args.formattedDateTime ? `Requested visit: ${args.formattedDateTime}` : "",
    args.body.comments?.trim() ? `Notes: ${args.body.comments.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const contactId = await createCrmContact(crmSupabase, {
    businessId: args.page.business_id,
    pageId: args.page.id,
    firstName: args.body.firstName,
    lastName: args.body.lastName,
    email: args.body.email,
    phone: args.body.phone,
    message: crmMessage,
    source: args.body.requestType === "schedule_tour" ? "Schedule Tour" : "Connect Form",
    sourcePageName: args.page.title,
    visitorId: args.body.visitorId || null,
    sessionId: args.body.sessionId || null,
    metadata: {
      channel: "kiosk",
      requestType: args.body.requestType,
      requestedAtIso: args.body.requestedAtIso || null,
      businessSlug: args.page.businesses?.slug || null,
    },
  });

  await logCrmActivity(crmSupabase, {
    contactId,
    activityType: "contact_created",
    title: "Contact created",
    details: "Submitted via Kiosk",
    metadata: {
      channel: "kiosk",
      requestType: args.body.requestType,
    },
  });
}

async function trackKioskLeadSubmission(args: {
  request: NextRequest;
  page: PublicPageRecord;
  body: KioskLeadBody;
  formattedDateTime: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("analytics_events").insert({
    page_id: args.page.id,
    event_type: "form_submit",
    visitor_id: args.body.visitorId || null,
    session_id: args.body.sessionId || null,
    user_agent: args.request.headers.get("user-agent"),
    referrer: args.request.headers.get("referer"),
    platform: "kiosk",
    event_data: {
      form_type: args.body.requestType,
      source: "Kiosk",
      page_title: args.page.title,
      first_name: args.body.firstName,
      last_name: args.body.lastName,
      email: args.body.email,
      phone: args.body.phone,
      comments: args.body.comments || null,
      requested_at_iso: args.body.requestedAtIso || null,
      requested_at_label: args.formattedDateTime,
    },
  });

  if (error) {
    console.error("Failed to track kiosk lead analytics event:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KioskLeadBody;
    const firstName = body.firstName?.trim() || "";
    const lastName = body.lastName?.trim() || "";
    const phone = body.phone?.trim() || "";
    const email = body.email?.trim() || "";
    const requestType = body.requestType || "connect";

    if (!body.pageId || !firstName || !lastName || !phone) {
      return NextResponse.json({ error: "Missing required kiosk lead details." }, { status: 400 });
    }

    if (!normalizeUsPhone(phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!["connect", "schedule_tour", "info_packet"].includes(requestType)) {
      return NextResponse.json({ error: "Invalid kiosk request type." }, { status: 400 });
    }

    const page = await loadPublicPage(body.pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const timezone = body.timezone || "America/Denver";
    const formattedDateTime =
      body.requestedAtIso && requestType === "schedule_tour"
        ? formatMeetingDateTime(body.requestedAtIso, timezone, true)
        : null;

    const normalizedBody = {
      ...body,
      requestType,
      firstName,
      lastName,
      phone,
      email,
    };

    await createKioskLeadContact({
      page,
      body: normalizedBody,
      formattedDateTime,
    });

    const warnings: string[] = [];
    const contactCardData = getSectionData(page, "contactCard");
    const ownerPhone =
      typeof contactCardData.phone === "string" ? normalizeUsPhone(contactCardData.phone) : null;

    if (ownerPhone) {
      try {
        await sendSmsMessage(
          ownerPhone,
          buildOwnerMessage({
            body: normalizedBody,
            pageTitle: page.title,
            formattedDateTime,
          }),
        );
      } catch (error) {
        warnings.push("owner_sms_failed");
        console.error("Kiosk owner SMS failed after CRM contact creation:", error);
      }
    } else {
      warnings.push("owner_sms_unconfigured");
      console.error("Kiosk owner SMS skipped: no valid contact-card phone number configured.");
    }

    if (requestType === "info_packet") {
      const publicSiteUrl = getPublicSiteUrl(request);
      const pagePath = `/${page.businesses?.slug || ""}/${page.slug}`;
      const infoPacketLink = await createInfoPacketLink({ publicSiteUrl, pagePath });

      try {
        await sendSmsMessage(
          phone,
          buildInfoPacketMessage({
            firstName,
            pageTitle: page.title,
            pageUrl: infoPacketLink,
          }),
        );
      } catch (error) {
        warnings.push("visitor_sms_failed");
        console.error("Kiosk info packet SMS failed after CRM contact creation:", error);
      }
    }

    try {
      await trackKioskLeadSubmission({
        request,
        page,
        body: {
          ...normalizedBody,
        },
        formattedDateTime,
      });
    } catch (error) {
      warnings.push("analytics_tracking_failed");
      console.error("Kiosk analytics follow-up failed after CRM contact creation:", error);
    }

    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("Kiosk lead error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit kiosk request." },
      { status: 500 },
    );
  }
}
