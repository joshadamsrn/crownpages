import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { NurseAssessmentForm } from "./nurse-assessment-form";
import { createClient } from "@/lib/supabase/server";
import { generatePublicUrl } from "@/lib/supabase/client";

type NurseAssessmentPageProps = {
  params: Promise<{ business_slug: string; slug: string }>;
};

type PublicPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: {
    name: string | null;
    slug: string;
    logo_url: string | null;
  } | null;
};

export const metadata: Metadata = {
  title: "Nurse Assessment | Crown Pages",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

function getSectionData(page: PublicPageRecord, sectionType: string) {
  return (
    page.content?.sections?.find((section) => section.type === sectionType)?.data ||
    {}
  );
}

function getRawLogoPath(page: PublicPageRecord) {
  const heroData = getSectionData(page, "hero");
  const contactCardData = getSectionData(page, "contactCard");

  const candidates = [
    heroData.logoUrl,
    heroData.logo,
    contactCardData.logo,
    contactCardData.imageUrl,
    page.businesses?.logo_url,
  ];

  return (
    candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) ||
    null
  );
}

function getContactEmail(page: PublicPageRecord) {
  const contactCardData = getSectionData(page, "contactCard");
  return typeof contactCardData.email === "string" && contactCardData.email.trim().length > 0
    ? contactCardData.email.trim()
    : null;
}

async function loadPublicPage(businessSlug: string, pageSlug: string) {
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
          name,
          slug,
          logo_url
        )
      `,
    )
    .eq("slug", pageSlug)
    .eq("businesses.slug", businessSlug)
    .eq("is_active", true)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as PublicPageRecord;
}

export default async function NurseAssessmentPage({ params }: NurseAssessmentPageProps) {
  const { business_slug: businessSlug, slug } = await params;
  const page = await loadPublicPage(businessSlug, slug);

  if (!page) {
    notFound();
  }

  const logoPath = getRawLogoPath(page);
  const logoUrl = logoPath ? await generatePublicUrl(logoPath) : null;
  const contactEmail = getContactEmail(page);

  return (
    <NurseAssessmentForm
      pageId={page.id}
      pageTitle={page.title}
      businessName={page.businesses?.name || page.title}
      logoUrl={logoUrl}
      hasRecipientEmail={Boolean(contactEmail)}
    />
  );
}
