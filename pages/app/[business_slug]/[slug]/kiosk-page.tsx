import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { KioskScreen } from "@/components/kiosk-screen";
import {
  KIOSK_ROUTE_TO_TEMPLATE_KEY,
  normalizeKioskTemplateSettings,
  type KioskTemplateSettingsRow,
} from "@/lib/kiosk-template-settings";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePublicUrl } from "@/lib/supabase/client";

export type KioskRouteProps = {
  params: Promise<{ business_slug: string; slug: string }>;
};

type KioskVariant = "connectFirst" | "checkInFirst" | "intakeForm" | "legacyIntakeForm";

type KioskPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
  businesses: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
};

type KioskProfilePageRecord = {
  id: string;
  title: string;
  slug: string;
};

type KioskProfileDefinition = {
  label: string;
  patterns: RegExp[];
};

const KIOSK_PROFILE_DEFINITIONS: KioskProfileDefinition[] = [
  { label: "Assisted Living", patterns: [/\bassisted\s+living\b/i] },
  { label: "Independent Living", patterns: [/\bindependent\s+living\b/i] },
  { label: "Memory Care", patterns: [/\bmemory\s+care\b/i] },
  {
    label: "Skilled Nursing Facility",
    patterns: [/\bskilled\s+nursing\s+facility\b/i, /\bskilled\s+nursing\b/i, /\bsnf\b/i],
  },
  { label: "Long-Term Care", patterns: [/\blong[-\s]+term\s+care\b/i, /\bltc\b/i] },
];

export const kioskMetadata: Metadata = {
  title: "Kiosk | Crown Pages",
  appleWebApp: {
    capable: true,
    title: "CrownPages Kiosk",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/kiosk-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/kiosk-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const kioskViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050505",
};

function getSectionData(page: KioskPageRecord, sectionType: string) {
  return (
    page.content?.sections?.find((section) => section.type === sectionType)?.data ||
    {}
  );
}

function getRawLogoPath(page: KioskPageRecord) {
  const heroData = getSectionData(page, "hero");
  const contactCardData = getSectionData(page, "contactCard");

  const candidates = [
    heroData.logoUrl,
    heroData.logo,
    contactCardData.logo,
    contactCardData.imageUrl,
    page.businesses?.logo_url,
  ];

  return candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) || null;
}

async function getKioskPageData(businessSlug: string, pageSlug: string) {
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
          id,
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

  return data as unknown as KioskPageRecord;
}

function getKioskProfileLabel(pageTitle: string) {
  const match = KIOSK_PROFILE_DEFINITIONS.find((definition) =>
    definition.patterns.some((pattern) => pattern.test(pageTitle)),
  );

  return match?.label || null;
}

function getKioskProfileSortIndex(label: string) {
  const index = KIOSK_PROFILE_DEFINITIONS.findIndex((definition) => definition.label === label);
  return index === -1 ? KIOSK_PROFILE_DEFINITIONS.length : index;
}

async function getKioskProfileOptions(args: {
  businessId: string;
  businessSlug: string;
  publicSiteUrl: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pages")
    .select("id, title, slug")
    .eq("business_id", args.businessId)
    .eq("is_active", true)
    .eq("is_published", true)
    .order("title", { ascending: true });

  const recognizedProfiles = ((data || []) as KioskProfilePageRecord[])
    .map((profile) => ({
      ...profile,
      label: getKioskProfileLabel(profile.title),
    }))
    .filter((profile): profile is KioskProfilePageRecord & { label: string } => Boolean(profile.label));

  const profilesByLabel = new Map<string, KioskProfilePageRecord & { label: string }>();
  for (const profile of recognizedProfiles) {
    if (!profilesByLabel.has(profile.label)) {
      profilesByLabel.set(profile.label, profile);
    }
  }

  const profileOptions = Array.from(profilesByLabel.values())
    .sort((left, right) => getKioskProfileSortIndex(left.label) - getKioskProfileSortIndex(right.label))
    .map((profile) => ({
      id: profile.id,
      title: profile.title,
      slug: profile.slug,
      label: profile.label,
      pageUrl: `${args.publicSiteUrl}/${args.businessSlug}/${profile.slug}`,
    }));

  return profileOptions.length >= 2 ? profileOptions : [];
}

function getTemplateKeyForVariant(variant: KioskVariant) {
  if (variant === "checkInFirst") return KIOSK_ROUTE_TO_TEMPLATE_KEY.kiosk2;
  if (variant === "intakeForm") return KIOSK_ROUTE_TO_TEMPLATE_KEY.kiosk3;
  if (variant === "legacyIntakeForm") return KIOSK_ROUTE_TO_TEMPLATE_KEY.kiosk4;
  return KIOSK_ROUTE_TO_TEMPLATE_KEY.kiosk;
}

async function getKioskTemplateSettings(pageId: string, templateKey: ReturnType<typeof getTemplateKeyForVariant>) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kiosk_template_settings")
    .select("page_id, business_id, template_key, display_page_name, welcome_title, welcome_subtitle, scan_title, scan_description, scan_items, kiosk_logo_url, hide_intake_form_button, hide_check_in_out_button, hide_review_button")
    .eq("page_id", pageId)
    .order("updated_at", { ascending: false });

  const rows = (data || []) as Partial<KioskTemplateSettingsRow>[];
  const templateRow = rows.find((row) => row.template_key === templateKey) || null;
  const logoRow = templateRow?.kiosk_logo_url ? templateRow : rows.find((row) => row.kiosk_logo_url);

  return {
    text: normalizeKioskTemplateSettings(templateKey, templateRow),
    logoPath: logoRow?.kiosk_logo_url || null,
  };
}

async function getKioskFeedbackReviewUrl(businessId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("kiosk_feedback_settings")
    .select("review_url")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !data?.review_url) return null;

  try {
    const url = new URL(data.review_url);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function KioskRoute({
  params,
  variant = "connectFirst",
}: KioskRouteProps & { variant?: KioskVariant }) {
  const { business_slug: businessSlug, slug } = await params;
  const page = await getKioskPageData(businessSlug, slug);

  if (!page) {
    notFound();
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host") || "";
  const protocol = headerStore.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const requestOrigin = host ? `${protocol}://${host}` : "";
  const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).replace(/\/$/, "");
  const pageUrl = `${publicSiteUrl}/${businessSlug}/${slug}`;
  const profileOptions = await getKioskProfileOptions({
    businessId: page.business_id,
    businessSlug,
    publicSiteUrl,
  });
  const templateKey = getTemplateKeyForVariant(variant);
  const kioskSettings = await getKioskTemplateSettings(page.id, templateKey);
  const feedbackReviewUrl = await getKioskFeedbackReviewUrl(page.business_id);
  const logoPath = kioskSettings.logoPath || getRawLogoPath(page);
  const logoUrl = logoPath ? await generatePublicUrl(logoPath) : null;

  return (
    <KioskScreen
      pageId={page.id}
      pageTitle={page.title}
      businessName={page.businesses?.name || page.title}
      pageUrl={pageUrl}
      logoUrl={logoUrl}
      profileOptions={profileOptions}
      variant={variant}
      kioskText={kioskSettings.text}
      feedbackReviewUrl={feedbackReviewUrl}
    />
  );
}
