import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  EnhancedPageRenderer,
  PageContent,
} from "@/components/enhanced-page-renderer";
import { Analytics } from "@/components/analytics";
import { SavePageButton } from "@/components/save-page-button";

import type { Database } from "@/database.types";
import { SectionStyles } from "@/types";
import { generatePublicUrl, generateSignedUrl } from "@/lib/supabase/client";

type PageData = Database["public"]["Tables"]["pages"]["Row"] & {
  business: Database["public"]["Tables"]["businesses"]["Row"] | null;
};

interface PageProps {
  params: Promise<{ slug: string; business_slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getPageData(
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
    // const { data: urlData, error } = await supabase.storage
    //   .from("uploads")
    //   .createSignedUrl(data.favicon_image_url, 60 * 60);

    data.favicon_image_url = await generatePublicUrl(
      data?.favicon_image_url || ""
    );
  }

  data.og_image_url = (await generateSignedUrl(data.og_image_url)) || "";

  return data as PageData;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { slug, business_slug } = await params;
  const searchParamsData = await searchParams;
  const isPreview = searchParamsData.preview === "true";

  const pageData = await getPageData(slug, business_slug, isPreview);

  if (!pageData) {
    return {
      title: "Page Not Found | CrownPages",
      description: "The page you are looking for does not exist.",
    };
  }

  const businessName = pageData.business?.name || "CrownPages";
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
    title: `${title} | CrownPages`,
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
  };
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug, business_slug } = await params;
  const searchParamsData = await searchParams;
  const isPreview = searchParamsData.preview === "true";

  const pageData = await getPageData(slug, business_slug, isPreview);

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

  const currentPath = `/${business_slug}/${slug}`;

  return (
    <>
      <Analytics pageId={pageData.id} />

        {isPreview && (
          <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white text-center py-2 z-50">
            <span className="font-medium">Preview Mode</span>
          </div>
        )}
        <div className={`fixed ${isPreview ? 'top-14' : 'top-4'} right-4 z-50`}>
          {/* <SavePageButton pageId={pageData.id} /> */}
        </div>
        <div className={isPreview ? 'pt-12' : ''}>
          <Suspense
            fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}
          >
            <EnhancedPageRenderer
              content={pageData.content as unknown as PageContent}
              styles={pageData.styles as unknown as SectionStyles}
              business={business}
              pageData={pageData}
              isPreview={isPreview}
            />
          </Suspense>
        </div>
    </>
  );
}
