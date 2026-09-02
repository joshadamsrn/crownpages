import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCrmContact, logCrmActivity } from "@/lib/crm";
import { getPageEngagementSettings } from "@/lib/page-engagement";
import {
  ConnectLead,
  formatUsPhone,
  normalizeUsPhone,
  sendSmsMessage,
} from "@/lib/page-engagement-server";

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

type FormAnalyticsBody = {
  pageId?: string;
  leads?: ConnectLead[];
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

function getContactCardData(page: PublicPageRecord) {
  return (
    page.content?.sections?.find((section) => section.type === "contactCard")
      ?.data || {}
  );
}

function buildOwnerLeadMessage(leads: ConnectLead[]) {
  const blocks = leads.map((lead) => {
    const lines = [
      `${lead.firstName} ${lead.lastName} just connected.`.trim(),
      `Phone: ${formatUsPhone(lead.phone)}`,
      lead.email?.trim() ? `Email: ${lead.email.trim()}` : "",
      lead.note?.trim() ? `Notes: ${lead.note.trim()}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  });

  return `New lead from Crown Pages!\n${blocks.join("\n\n")}`;
}

async function trackConnectFormSubmission(args: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  request: NextRequest;
  pageId: string;
  pageTitle: string;
  leadCount: number;
  firstLead: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    note?: string;
  };
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
      form_type: "connect_form",
      source: "Connect Form",
      page_title: args.pageTitle,
      lead_count: args.leadCount,
      first_name: args.firstLead.firstName,
      last_name: args.firstLead.lastName,
      email: args.firstLead.email || null,
      phone: args.firstLead.phone || null,
      note: args.firstLead.note || null,
      tracking_code: args.trackingCode || null,
      sms_consent: args.smsConsent ?? null,
    },
  });

  if (error) {
    console.error("Failed to track Connect Form analytics event:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = (await request.json()) as FormAnalyticsBody;

    if (!body.pageId || !Array.isArray(body.leads) || body.leads.length === 0) {
      return NextResponse.json({ error: "Missing lead submission details." }, { status: 400 });
    }

    const normalizedLeads = body.leads.map((lead) => ({
      firstName: lead.firstName?.trim(),
      lastName: lead.lastName?.trim(),
      email: lead.email?.trim(),
      phone: lead.phone?.trim(),
      note: lead.note?.trim(),
    }));

    if (
      normalizedLeads.some(
        (lead) =>
          !lead.firstName ||
          !lead.lastName ||
          !lead.phone ||
          !normalizeUsPhone(lead.phone)
      )
    ) {
      return NextResponse.json(
        { error: "Each person must include first name, last name, and a valid phone number." },
        { status: 400 }
      );
    }

    const page = await loadPublicPage(body.pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const featureSettings = getPageEngagementSettings(page.publish_settings);
    if (!featureSettings.includeInstaConnect) {
      return NextResponse.json({ error: "InstaConnect is not enabled for this page." }, { status: 400 });
    }

    const contactCardData = getContactCardData(page);
    const ownerPhone =
      typeof contactCardData.phone === "string" ? normalizeUsPhone(contactCardData.phone) : null;

    if (!ownerPhone) {
      return NextResponse.json(
        { error: "This page does not have a valid contact-card phone number configured." },
        { status: 400 }
      );
    }

    await sendSmsMessage(ownerPhone, buildOwnerLeadMessage(normalizedLeads as ConnectLead[]));

    const warnings: string[] = [];

    try {
      const crmSupabase = createAdminClient();

      for (const lead of normalizedLeads) {
        const contactId = await createCrmContact(crmSupabase, {
          businessId: page.business_id,
          pageId: page.id,
          firstName: lead.firstName!,
          lastName: lead.lastName!,
          email: lead.email || null,
          phone: lead.phone || null,
          message: lead.note || null,
          source: "Connect Form",
          sourcePageName: page.title,
          visitorId: body.visitorId || null,
          sessionId: body.sessionId || null,
          metadata: {
            businessSlug: page.businesses?.slug || null,
            smsConsent: body.smsConsent ?? false,
          },
        });

        await logCrmActivity(crmSupabase, {
          contactId,
          activityType: "contact_created",
          title: "Contact created",
          details: "Submitted via Connect Form",
        });
      }
    } catch (error) {
      warnings.push("crm_logging_failed");
      console.error("Connect Form CRM follow-up failed after SMS send:", error);
    }

    try {
      await trackConnectFormSubmission({
        supabase,
        request,
        pageId: page.id,
        pageTitle: page.title,
        leadCount: normalizedLeads.length,
        firstLead: {
          firstName: normalizedLeads[0].firstName!,
          lastName: normalizedLeads[0].lastName!,
          email: normalizedLeads[0].email || undefined,
          phone: normalizedLeads[0].phone || undefined,
          note: normalizedLeads[0].note || undefined,
        },
        visitorId: body.visitorId || null,
        sessionId: body.sessionId || null,
        trackingCode: body.trackingCode || null,
        smsConsent: body.smsConsent ?? false,
      });
    } catch (error) {
      warnings.push("analytics_tracking_failed");
      console.error("Connect Form analytics follow-up failed after SMS send:", error);
    }

    return NextResponse.json({ success: true, warnings });
  } catch (error) {
    console.error("InstaConnect error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit InstaConnect request.",
      },
      { status: 500 }
    );
  }
}
