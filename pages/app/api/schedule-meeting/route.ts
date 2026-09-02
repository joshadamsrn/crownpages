import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCrmContact, logCrmActivity } from "@/lib/crm";
import { getPageEngagementSettings } from "@/lib/page-engagement";
import {
  buildCalendarLink,
  formatMeetingDateTime,
  formatUsPhone,
  getFirstName,
  MeetingAttendee,
  normalizeUsPhone,
  sendSmsMessage,
} from "@/lib/page-engagement-server";
import { createSmsShortLink } from "@/lib/sms-short-links";

type PublicPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  is_active: boolean | null;
  is_published: boolean | null;
  publish_settings: Record<string, unknown> | null;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: { slug: string; name?: string | null } | null;
};

type MeetingRequestBody = {
  pageId?: string;
  timezone?: string;
  requestedAtIso?: string;
  attendees?: MeetingAttendee[];
  visitorId?: string;
  sessionId?: string;
  trackingCode?: string | null;
  smsConsent?: boolean;
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
        is_active,
        is_published,
        publish_settings,
        content,
        businesses!inner (
          slug,
          name
        )
      `
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

function getZonedDateParts(dateIso: string, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.formatToParts(new Date(dateIso)).reduce<Record<string, string>>(
    (acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    },
    {}
  );
}

function isAllowedMeetingTime(dateIso: string, timezone: string) {
  const parts = getZonedDateParts(dateIso, timezone);
  const weekday = parts.weekday;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  if (weekday === "Sat" || weekday === "Sun") {
    return false;
  }

  if (hour < 9 || hour > 16) {
    return false;
  }

  return minute === 0 || minute === 30;
}

function buildViewerMessage(args: {
  firstName: string;
  pageTitle: string;
  formattedDateTime: string;
  pageUrl: string;
  calendarLink: string | null;
}) {
  const lines = [
    `Hi ${args.firstName}!`,
    `Your visit request with ${args.pageTitle} has been received.`,
    `Requested Time: ${args.formattedDateTime}.`,
    `Here’s more info before your visit: ${args.pageUrl}`,
  ];

  if (args.calendarLink) {
    lines.push("", args.calendarLink);
  }

  lines.push("Message & data rates may apply. Reply STOP to opt out. Reply HELP for help.");

  return lines.join("\n");
}

function buildOwnerMessage(args: {
  attendee: MeetingAttendee;
  pageTitle: string;
  formattedDateTime: string;
  calendarLink: string | null;
}) {
  const lines = [
    "New meeting request from Crown Pages!",
    `${args.attendee.fullName} has requested a visit with you at ${args.pageTitle}.`,
    `Preferred Time: ${args.formattedDateTime}`,
    args.attendee.phone ? `Contact Phone: ${formatUsPhone(args.attendee.phone)}` : "",
    args.attendee.email ? `Contact Email: ${args.attendee.email}` : "",
    "Contact ASAP!",
  ].filter(Boolean);

  if (args.calendarLink) {
    lines.push("", args.calendarLink);
  }

  return lines.join("\n");
}

function getPublicSiteUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  return request.nextUrl.origin.replace(/\/$/, "");
}

async function maybeCreateShortCalendarLink(args: {
  publicSiteUrl: string;
  longCalendarLink: string | null;
}) {
  if (!args.longCalendarLink) {
    return null;
  }

  try {
    const targetUrl = new URL(args.longCalendarLink);
    const targetPath = `${targetUrl.pathname}${targetUrl.search}`;
    return await createSmsShortLink({
      baseUrl: args.publicSiteUrl,
      targetPath,
      linkType: "calendar",
    });
  } catch (error) {
    console.error("Failed to create short calendar link:", error);
    return args.longCalendarLink;
  }
}

async function trackScheduleTourSubmission(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  request: NextRequest;
  pageId: string;
  pageTitle: string;
  attendee: {
    fullName: string;
    email?: string;
    phone?: string;
  };
  requestedAtIso: string;
  formattedDateTime: string;
  guestCount: number;
  visitorId?: string | null;
  sessionId?: string | null;
  trackingCode?: string | null;
  smsConsent?: boolean | null;
}) {
  const userAgent = args.request.headers.get("user-agent");
  const referrer = args.request.headers.get("referer");

  const { error } = await args.supabase.from("analytics_events").insert({
    page_id: args.pageId,
    event_type: "form_submit",
    visitor_id: args.visitorId || null,
    session_id: args.sessionId || null,
    user_agent: userAgent,
    referrer,
    platform: "shared_link",
    event_data: {
      form_type: "schedule_tour",
      source: "Visit Form",
      page_title: args.pageTitle,
      full_name: args.attendee.fullName,
      email: args.attendee.email || null,
      phone: args.attendee.phone || null,
      requested_at_iso: args.requestedAtIso,
      requested_at_label: args.formattedDateTime,
      guest_count: args.guestCount,
      tracking_code: args.trackingCode || null,
      sms_consent: args.smsConsent ?? null,
    },
  });

  if (error) {
    console.error("Failed to track Schedule Visit analytics event:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as MeetingRequestBody;

    if (
      !body.pageId ||
      !body.timezone ||
      !body.requestedAtIso ||
      !Array.isArray(body.attendees) ||
      body.attendees.length === 0
    ) {
      return NextResponse.json({ error: "Missing meeting request details." }, { status: 400 });
    }

    const [primaryAttendee, ...guestAttendees] = body.attendees.map((attendee) => ({
      fullName: attendee.fullName?.trim(),
      email: attendee.email?.trim(),
      phone: attendee.phone?.trim(),
    }));

    if (!primaryAttendee.fullName || !primaryAttendee.phone) {
      return NextResponse.json(
        { error: "Primary attendee name and phone number are required." },
        { status: 400 }
      );
    }

    if (!normalizeUsPhone(primaryAttendee.phone)) {
      return NextResponse.json(
        { error: "Please enter a valid phone number for the primary attendee." },
        { status: 400 }
      );
    }

    if (
      guestAttendees.some(
        (attendee) =>
          !attendee.fullName ||
          (attendee.phone && !normalizeUsPhone(attendee.phone))
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Each guest must include a name. Any guest phone numbers provided must be valid.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedMeetingTime(body.requestedAtIso, body.timezone)) {
      return NextResponse.json(
        { error: "Meeting requests must be on weekdays between 9:00 AM and 4:00 PM in the viewer’s timezone." },
        { status: 400 }
      );
    }

    const page = await loadPublicPage(body.pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const featureSettings = getPageEngagementSettings(page.publish_settings);
    if (!featureSettings.includeScheduleMeeting) {
      return NextResponse.json({ error: "Schedule Visit is not enabled for this page." }, { status: 400 });
    }

    const contactCardData = getSectionData(page, "contactCard");
    const ownerPhone =
      typeof contactCardData.phone === "string" ? normalizeUsPhone(contactCardData.phone) : null;

    if (!ownerPhone) {
      return NextResponse.json(
        { error: "This page does not have a valid contact-card phone number configured." },
        { status: 400 }
      );
    }

    const companyHeader = getSectionData(page, "companyHeader");
    const publicSiteUrl = getPublicSiteUrl(request);
    const pageUrl = `${publicSiteUrl}/${page.businesses?.slug}/${page.slug}`;
    const formattedDateTime = formatMeetingDateTime(body.requestedAtIso, body.timezone, true);
    const endsAtIso = new Date(
      new Date(body.requestedAtIso).getTime() + 30 * 60 * 1000
    ).toISOString();

    const attendeeCalendarLongLink = buildCalendarLink(publicSiteUrl, {
      title: `Meeting with ${page.title}`,
      description: `Requested meeting with ${page.title}.\nMore info: ${pageUrl}`,
      startsAtIso: body.requestedAtIso,
      endsAtIso,
      location:
        typeof companyHeader.address === "string" ? companyHeader.address : pageUrl,
    });
    const ownerCalendarLongLink = buildCalendarLink(publicSiteUrl, {
      title: `Meeting Request: ${page.title}`,
      description: `${primaryAttendee.fullName} requested a meeting.\nPage: ${pageUrl}`,
      startsAtIso: body.requestedAtIso,
      endsAtIso,
      location:
        typeof companyHeader.address === "string" ? companyHeader.address : pageUrl,
    });
    const [attendeeCalendarLink, ownerCalendarLink] = await Promise.all([
      maybeCreateShortCalendarLink({
        publicSiteUrl,
        longCalendarLink: attendeeCalendarLongLink,
      }),
      maybeCreateShortCalendarLink({
        publicSiteUrl,
        longCalendarLink: ownerCalendarLongLink,
      }),
    ]);

    await sendSmsMessage(
      ownerPhone,
      buildOwnerMessage({
        attendee: primaryAttendee as MeetingAttendee,
        pageTitle: page.title,
        formattedDateTime,
        calendarLink: ownerCalendarLink,
      })
    );

    const warnings: string[] = [];

    try {
      const crmSupabase = createAdminClient();
      const guestNames = guestAttendees
        .map((attendee) => attendee.fullName)
        .filter(Boolean)
        .join(", ");
      const meetingNote = [
        `Requested visit: ${formattedDateTime}`,
        guestNames ? `Guests: ${guestNames}` : "",
        primaryAttendee.email ? `Email: ${primaryAttendee.email}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const contactId = await createCrmContact(crmSupabase, {
        businessId: page.business_id,
        pageId: page.id,
        firstName: getFirstName(primaryAttendee.fullName),
        lastName: primaryAttendee.fullName.replace(`${getFirstName(primaryAttendee.fullName)} `, "") || "Guest",
        email: primaryAttendee.email || null,
        phone: primaryAttendee.phone || null,
        message: meetingNote,
        source: "Schedule Tour",
        sourcePageName: page.title,
        visitorId: body.visitorId || null,
        sessionId: body.sessionId || null,
        metadata: {
          requestedAtIso: body.requestedAtIso,
          guests: guestAttendees,
          businessSlug: page.businesses?.slug || null,
          smsConsent: body.smsConsent ?? false,
        },
      });

      await logCrmActivity(crmSupabase, {
        contactId,
        activityType: "contact_created",
        title: "Contact created",
        details: "Submitted via Visit Form",
        metadata: {
          requestedAtIso: body.requestedAtIso,
        },
      });
    } catch (error) {
      warnings.push("crm_logging_failed");
      console.error("Schedule Visit CRM follow-up failed after SMS send:", error);
    }

    try {
      await trackScheduleTourSubmission({
        supabase,
        request,
        pageId: page.id,
        pageTitle: page.title,
        attendee: {
          fullName: primaryAttendee.fullName!,
          email: primaryAttendee.email || undefined,
          phone: primaryAttendee.phone || undefined,
        },
        requestedAtIso: body.requestedAtIso,
        formattedDateTime,
        guestCount: guestAttendees.length,
        visitorId: body.visitorId || null,
        sessionId: body.sessionId || null,
        trackingCode: body.trackingCode || null,
        smsConsent: body.smsConsent ?? false,
      });
    } catch (error) {
      warnings.push("analytics_tracking_failed");
      console.error("Schedule Visit analytics follow-up failed after SMS send:", error);
    }

    if (body.smsConsent) {
      try {
        const attendeeMessages = [primaryAttendee, ...guestAttendees]
          .filter((attendee) => attendee.phone && normalizeUsPhone(attendee.phone))
          .map((attendee) =>
            sendSmsMessage(
              attendee.phone!,
              buildViewerMessage({
                firstName: getFirstName(attendee.fullName!),
                pageTitle: page.title,
                formattedDateTime,
                pageUrl,
                calendarLink: attendeeCalendarLink,
              })
            )
          );

        await Promise.all(attendeeMessages);
      } catch (error) {
        warnings.push("attendee_sms_failed");
        console.error("Schedule Visit attendee SMS follow-up failed after owner SMS send:", error);
      }
    }

    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("Schedule Meeting error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit meeting request.",
      },
      { status: 500 }
    );
  }
}
