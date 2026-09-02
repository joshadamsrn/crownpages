import { NextRequest, NextResponse } from "next/server";

import { formatResidentInitials } from "@/lib/kiosk-resident-initials";
import { sendEmailMessage } from "@/lib/page-engagement-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PublicPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: { slug: string; name?: string | null } | null;
};

type NurseAssessment = {
  residentInitials?: string;
  roomNumber?: string;
  agencyName?: string;
  providerName?: string;
  position?: string;
  visitDate?: string;
  visitingNotes?: string;
  bloodPressure?: string;
  pulse?: string;
  respiratoryRate?: string;
  oxygenSaturation?: string;
  temperature?: string;
  weightInLbs?: string;
  otherNotes?: string;
};

type NurseAssessmentBody = {
  pageId?: string;
  assessment?: NurseAssessment;
};

type AssessmentField = {
  key: keyof NurseAssessment;
  label: string;
  required?: boolean;
};

const ASSESSMENT_FIELDS: AssessmentField[] = [
  { key: "residentInitials", label: "Resident's Initials", required: true },
  { key: "roomNumber", label: "Room Number", required: true },
  { key: "agencyName", label: "Agency Name", required: true },
  { key: "providerName", label: "Provider Name", required: true },
  { key: "position", label: "Position", required: true },
  { key: "visitDate", label: "Date", required: true },
  { key: "visitingNotes", label: "Visiting Notes", required: true },
  { key: "bloodPressure", label: "Blood Pressure", required: true },
  { key: "pulse", label: "Pulse", required: true },
  { key: "respiratoryRate", label: "Respiratory Rate", required: true },
  { key: "oxygenSaturation", label: "Oxygen Saturation (SpO2)", required: true },
  { key: "temperature", label: "Temperature", required: true },
  { key: "weightInLbs", label: "Weight in lbs", required: true },
  { key: "otherNotes", label: "Other Notes" },
];

function getOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSectionData(page: PublicPageRecord, sectionType: string) {
  return (
    page.content?.sections?.find((section) => section.type === sectionType)?.data ||
    {}
  );
}

function getContactEmail(page: PublicPageRecord) {
  const contactCardData = getSectionData(page, "contactCard");
  const email = getOptionalText(contactCardData.email);
  return email && isValidEmail(email) ? email : null;
}

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

async function getConfiguredRecipientEmail(businessId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("nurse_assessment_settings")
    .select("recipient_email")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const email = getOptionalText(data?.recipient_email);
  return email && isValidEmail(email) ? email : null;
}

function normalizeAssessment(assessment: NurseAssessment | undefined) {
  const normalized: Required<NurseAssessment> = {
    residentInitials: formatResidentInitials(assessment?.residentInitials),
    roomNumber: getOptionalText(assessment?.roomNumber),
    agencyName: getOptionalText(assessment?.agencyName),
    providerName: getOptionalText(assessment?.providerName),
    position: getOptionalText(assessment?.position),
    visitDate: getOptionalText(assessment?.visitDate),
    visitingNotes: getOptionalText(assessment?.visitingNotes),
    bloodPressure: getOptionalText(assessment?.bloodPressure),
    pulse: getOptionalText(assessment?.pulse),
    respiratoryRate: getOptionalText(assessment?.respiratoryRate),
    oxygenSaturation: getOptionalText(assessment?.oxygenSaturation),
    temperature: getOptionalText(assessment?.temperature),
    weightInLbs: getOptionalText(assessment?.weightInLbs),
    otherNotes: getOptionalText(assessment?.otherNotes),
  };

  return normalized;
}

function getMissingFields(assessment: Required<NurseAssessment>) {
  return ASSESSMENT_FIELDS.filter((field) => field.required && !assessment[field.key]).map(
    (field) => field.label,
  );
}

function buildAssessmentText(args: {
  page: PublicPageRecord;
  assessment: Required<NurseAssessment>;
  submittedAt: string;
}) {
  const lines = [
    `New outside provider assessment for ${args.page.title}`,
    `Submitted: ${args.submittedAt}`,
    "",
    ...ASSESSMENT_FIELDS.map((field) => `${field.label}: ${args.assessment[field.key] || "Not provided"}`),
  ];

  return lines.join("\n");
}

function buildAssessmentHtml(args: {
  page: PublicPageRecord;
  assessment: Required<NurseAssessment>;
  submittedAt: string;
}) {
  const rows = ASSESSMENT_FIELDS.map((field) => {
    const value = args.assessment[field.key] || "Not provided";
    return `
      <tr>
        <th style="width: 34%; padding: 10px 12px; text-align: left; vertical-align: top; background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a;">${escapeHtml(field.label)}</th>
        <td style="padding: 10px 12px; vertical-align: top; border: 1px solid #e2e8f0; color: #334155; white-space: pre-wrap;">${escapeHtml(value)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h1 style="margin: 0 0 8px; font-size: 24px;">Outside Provider Assessment</h1>
      <p style="margin: 0 0 18px; color: #475569;">${escapeHtml(args.page.title)}<br />Submitted: ${escapeHtml(args.submittedAt)}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NurseAssessmentBody;
    const pageId = getOptionalText(body.pageId);

    if (!pageId) {
      return NextResponse.json({ error: "Missing page details." }, { status: 400 });
    }

    const page = await loadPublicPage(pageId);
    if (!page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const recipientEmail = (await getConfiguredRecipientEmail(page.business_id)) || getContactEmail(page);
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "This page does not have a valid nurse assessment recipient email configured." },
        { status: 400 },
      );
    }

    const assessment = normalizeAssessment(body.assessment);
    const missingFields = getMissingFields(assessment);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required assessment fields: ${missingFields.join(", ")}.` },
        { status: 400 },
      );
    }

    if (Array.from(assessment.residentInitials).length !== 2) {
      return NextResponse.json(
        { error: "Resident initials must include the first-name and last-name initials." },
        { status: 400 },
      );
    }

    const submittedAt = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Denver",
    }).format(new Date());

    await sendEmailMessage({
      to: recipientEmail,
      subject: `Outside Provider Assessment - ${page.title}`,
      text: buildAssessmentText({ page, assessment, submittedAt }),
      html: buildAssessmentHtml({ page, assessment, submittedAt }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Nurse assessment submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to submit nurse assessment." },
      { status: 500 },
    );
  }
}
