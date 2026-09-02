import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { FeedbackDetailsForm } from "./feedback-details-form";
import { verifyKioskFeedbackAccessToken } from "@/lib/kiosk-feedback-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePublicUrl } from "@/lib/supabase/client";

type FeedbackPageProps = {
  params: Promise<{ feedbackId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

type FeedbackRecord = {
  id: string;
  page_id: string;
  rating: number;
  positive_feedback: string | null;
  improvement_feedback: string | null;
  details_submitted_at: string | null;
  details_email_sent_at: string | null;
};

type PublicPageRecord = {
  id: string;
  title: string;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: {
    name: string | null;
    logo_url: string | null;
  } | null;
};

export const metadata: Metadata = {
  title: "Share Feedback | Crown Pages",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

function getSectionData(page: PublicPageRecord, sectionType: string) {
  return page.content?.sections?.find((section) => section.type === sectionType)?.data || {};
}

function getRawLogoPath(page: PublicPageRecord, kioskLogoPath: string | null) {
  const heroData = getSectionData(page, "hero");
  const contactCardData = getSectionData(page, "contactCard");
  const candidates = [
    kioskLogoPath,
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

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { feedbackId } = await params;
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  if (!verifyKioskFeedbackAccessToken(token, feedbackId)) {
    notFound();
  }

  const admin = createAdminClient();
  const { data: feedbackData, error: feedbackError } = await admin
    .from("kiosk_feedback")
    .select(
      "id, page_id, rating, positive_feedback, improvement_feedback, details_submitted_at, details_email_sent_at",
    )
    .eq("id", feedbackId)
    .maybeSingle();

  if (feedbackError || !feedbackData) {
    notFound();
  }

  const feedback = feedbackData as FeedbackRecord;
  if (feedback.rating < 1 || feedback.rating > 4) {
    notFound();
  }

  const [{ data: pageData, error: pageError }, { data: kioskLogoData }] = await Promise.all([
    admin
      .from("pages")
      .select(
        `
          id,
          title,
          content,
          businesses!inner (
            name,
            logo_url
          )
        `,
      )
      .eq("id", feedback.page_id)
      .eq("is_active", true)
      .eq("is_published", true)
      .maybeSingle(),
    admin
      .from("kiosk_template_settings")
      .select("kiosk_logo_url")
      .eq("page_id", feedback.page_id)
      .not("kiosk_logo_url", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (pageError || !pageData) {
    notFound();
  }

  const page = pageData as unknown as PublicPageRecord;
  const logoPath = getRawLogoPath(page, kioskLogoData?.kiosk_logo_url || null);
  const logoUrl = logoPath ? await generatePublicUrl(logoPath) : null;

  return (
    <FeedbackDetailsForm
      feedbackId={feedback.id}
      token={token || ""}
      rating={feedback.rating}
      businessName={page.businesses?.name || page.title}
      logoUrl={logoUrl}
      initialPositiveFeedback={feedback.positive_feedback || ""}
      initialImprovementFeedback={feedback.improvement_feedback || ""}
      initiallySubmitted={Boolean(feedback.details_submitted_at && feedback.details_email_sent_at)}
    />
  );
}
