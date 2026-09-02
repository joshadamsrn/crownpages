import { Suspense, cache } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  EnhancedPageRenderer,
  PageContent,
} from "@/components/enhanced-page-renderer";
import { Analytics } from "@/components/analytics";

import type { Database } from "@/database.types";
import { SectionStyles } from "@/types";
import { getCurrentWhiteLabelTenant } from "@/lib/white-label-tenants";
import { getUploadPublicUrl } from "@/lib/upload-public-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageAIAssistant } from "@/components/page-ai-assistant";

type PageData = Database["public"]["Tables"]["pages"]["Row"] & {
  business: Database["public"]["Tables"]["businesses"]["Row"] | null;
};

interface PageProps {
  params: Promise<{ slug: string; business_slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const REFERRAL_SAFE_SUFFIX = "1";
const REFERRAL_SAFE_HIDDEN_SECTIONS = new Set([
  "contact",
  "contactCard",
  "cta",
  "links",
  "medicalProvider",
  "multiContact",
  "pages",
  "personalContact",
  "socialLinks",
]);

function getRequestedPageRoute(slug: string) {
  const referralSafeMode = slug.length > 1 && slug.endsWith(REFERRAL_SAFE_SUFFIX);
  return {
    referralSafeMode,
    pageSlug: referralSafeMode ? slug.slice(0, -REFERRAL_SAFE_SUFFIX.length) : slug,
  };
}

function getCanonicalPageUrl(businessSlug: string, pageSlug: string) {
  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.CONTEXT === "production";
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "";

  try {
    if (!siteUrl || (isProduction && new URL(siteUrl).hostname === "localhost")) {
      siteUrl = isProduction ? "https://crownpages.com" : "http://localhost:3000";
    }
  } catch {
    siteUrl = isProduction ? "https://crownpages.com" : "http://localhost:3000";
  }

  return `${siteUrl}/${encodeURIComponent(businessSlug)}/${encodeURIComponent(pageSlug)}`;
}

function isReferralSafeAssetUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return true;
  if (!/^https?:/i.test(value)) return !/^(?:mailto|tel):/i.test(value);

  try {
    const url = new URL(value);
    return url.pathname.includes("/storage/v1/object/");
  } catch {
    return false;
  }
}

function getReferralSafeContent(content: unknown): PageContent {
  const sections =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as { sections?: unknown }).sections
      : null;
  if (!Array.isArray(sections)) return { sections: [] };

  return {
    sections: sections.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
      const section = candidate as PageContent["sections"][number];
      if (REFERRAL_SAFE_HIDDEN_SECTIONS.has(section.type)) return [];

      const data = section.data && typeof section.data === "object" ? { ...section.data } : {};
      if (section.type === "hero") delete data.ctaButton;
      if (section.type === "companyHeader") {
        delete data.ctaText;
        delete data.ctaLink;
      }
      if (section.type === "linksWithContact") {
        for (const key of [
          "contactButton",
          "contactName",
          "contactRole",
          "contactPhone",
          "contactPhone2",
          "contactEmail",
          "contactFax",
          "contactWebsite",
          "contactImageUrl",
        ]) {
          delete data[key];
        }
        if (Array.isArray(data.links)) {
          data.links = data.links.filter((link) => {
            if (!link || typeof link !== "object" || Array.isArray(link)) return false;
            const value = link as { url?: unknown; mediaItems?: unknown };
            return Array.isArray(value.mediaItems) && value.mediaItems.length > 0
              ? true
              : isReferralSafeAssetUrl(value.url);
          });
        }
      }

      return [{ ...section, data }];
    }),
  };
}

const getPageData = cache(async function getPageData(
  slug: string,
  business_slug: string,
  isPreview: boolean = false
): Promise<PageData | null> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("slug", business_slug)
    .single();

  let query = supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("business_id", business?.id);

  // Only apply published/active filters if not in preview mode
  if (!isPreview) {
    query = query.eq("is_published", true).eq("is_active", true);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    console.error("Error fetching page:", error);
    return null;
  }

  if (data?.favicon_image_url) {
    data.favicon_image_url = getUploadPublicUrl(data.favicon_image_url);
  }

  data.og_image_url = getUploadPublicUrl(data.og_image_url);

  const { data: fullBusiness } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", data.business_id)
    .maybeSingle();

  return { ...data, business: fullBusiness || null } as PageData;
});

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug, business_slug } = await params;
  const { pageSlug, referralSafeMode } = getRequestedPageRoute(slug);
  const searchParamsData = await searchParams;
  const isPreview = searchParamsData.preview === "true";
  const tenant = await getCurrentWhiteLabelTenant();

  const pageData = await getPageData(pageSlug, business_slug, isPreview);

  if (!pageData) {
    return {
      title: `Page Not Found | ${tenant.publicName}`,
      description: "The page you are looking for does not exist.",
    };
  }

  const businessName = pageData.business?.name || tenant.publicName;
  const title = pageData.meta_title || pageData.title;

  // Extract hero subtitle for use as OG description fallback
  // This is what appears as the second line when the page is shared via SMS/iMessage/social
  const heroSubtitle = (() => {
    try {
      const content = pageData.content as { sections?: Array<{ type: string; data: Record<string, string> }> } | null;
      const hero = content?.sections?.find((s) => s.type === 'hero');
      return hero?.data?.subtitle || null;
    } catch {
      return null;
    }
  })();

  const description =
    (pageData as any).og_description ||  // explicit share/OG override
    pageData.meta_description ||          // SEO meta override
    heroSubtitle ||                       // hero section subtitle (normal user path)
    pageData.description ||              // legacy page description field
    `${pageData.title} - ${businessName}`;
  const ogImage =
    pageData.og_image_url ||
    `/api/og?title=${encodeURIComponent(
      pageData.title
    )}&business=${encodeURIComponent(businessName)}`;

  // og_description is the dedicated share-preview field — use it specifically for OG/Twitter
  // while keeping the SEO <meta name="description"> as the broader description fallback
  const ogDescription = (pageData as any).og_description || description;

  return {
    title: `${title} | ${tenant.publicName}`,
    description,
    openGraph: {
      title,
      description: ogDescription,
      images: [{ url: ogImage }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: ogDescription,
      images: [ogImage],
    },
    robots: referralSafeMode ? { index: false, follow: false } : undefined,
    alternates: referralSafeMode
      ? { canonical: getCanonicalPageUrl(business_slug, pageSlug) }
      : undefined,
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug, business_slug } = await params;
  const { pageSlug, referralSafeMode } = getRequestedPageRoute(slug);
  const searchParamsData = await searchParams;
  const isPreview = searchParamsData.preview === "true";

  const pageData = await getPageData(pageSlug, business_slug, isPreview);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!pageData) {
    notFound();
  }

  // Create a default business object if none exists
  const business = pageData.business || {
    id: "",
    name: "Unknown Business",
    logo_url: null,
    primary_color: "#000000",
    secondary_color: "#ffffff",
    font_family: "Inter",
    email: null,
    phone: null,
    website: null,
    street_address: null,
    city: null,
    state: null,
    zip_code: null,
    country: null,
  };
  const renderedBusiness = referralSafeMode
    ? { ...business, email: null, phone: null, website: null }
    : business;
  const renderedContent = referralSafeMode
    ? getReferralSafeContent(pageData.content)
    : (pageData.content as unknown as PageContent);
  const renderedPageData = referralSafeMode
    ? {
        ...pageData,
        business: renderedBusiness,
        content: renderedContent as unknown as PageData["content"],
      }
    : pageData;
  const referralHref = `/network/get-help?facility=${encodeURIComponent(business_slug)}&source=network-profile`;
  const admin = createAdminClient();
  const { data: assistantSetting } = await admin
    .from("business_ai_assistant_settings")
    .select("enabled, welcome_message")
    .eq("business_id", pageData.business_id)
    .maybeSingle();

  return (
    <>
      <Analytics pageId={pageData.id} userId={user?.id} />
        <div className="fixed top-4 right-4 z-50">
          {/* <SavePageButton pageId={pageData.id} /> */}
        </div>
        <div>
          <Suspense
            fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}
          >
            <EnhancedPageRenderer
              content={renderedContent}
              styles={pageData.styles as unknown as SectionStyles}
              business={renderedBusiness}
              pageData={renderedPageData}
              isPreview={isPreview}
              referralSafeMode={referralSafeMode}
              referralHref={referralHref}
            />
            {!isPreview && !referralSafeMode && assistantSetting?.enabled ? (
              <PageAIAssistant
                pageId={pageData.id}
                businessName={business.name || pageData.title}
                welcomeMessage={assistantSetting.welcome_message || "Hi! What would you like to know about this community?"}
                primaryColor={business.primary_color || "#2563eb"}
              />
            ) : null}
          </Suspense>
        </div>
    </>
  );
}
