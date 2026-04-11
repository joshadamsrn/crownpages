import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Metadata, Viewport } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageContent, SectionData } from '@/components/page-renderer';
import { Analytics } from '@/components/analytics';
import type { Database } from '@/database.types';

type PageData = Database['public']['Tables']['pages']['Row'] & {
  business: Database['public']['Tables']['businesses']['Row'] | null;
};

async function getPageData(
  pageId: string,
  opts: { preview?: boolean } = {}
): Promise<PageData | null> {
  try {
    const supabase = await createClient();
    let q = supabase
      .from('pages')
      .select(`*, business:businesses(*)`)
      .eq('id', pageId);

    // only enforce is_published for real views
    if (!opts.preview) {
      q = q.eq('is_published', true);
    }

    const { data, error } = await q.single();

    if (error || !data) {
      console.error('Error fetching page for mobile preview:', error);
      return null;
    }

    return data as PageData;
  } catch (error) {
    console.error('Exception fetching page for mobile preview:', error);
    return null;
  }
}

function getSectionFromPage(
  content: PageContent,
  sectionId: string
): SectionData | null {
  if (!content?.sections || !Array.isArray(content.sections)) {
    return null;
  }
  // console.log("sectionId",sectionId)
  // console.log("content.sections",content.sections)
  return content.sections.find((section) => section.id === sectionId) || null;
}

// Import the client component that will handle the context
import { MobileSectionRenderer } from './mobile-section-renderer';

export async function generateMetadata(props: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  // If we needed to use params in the future, we would await them here:
  // const params = await props.params;
  // const { pageId, sectionId } = params;

  return {
    title: 'Section Preview | CrownPages',
    description: 'Mobile preview of page section',
    robots: 'noindex, nofollow', // Prevent indexing of preview pages
    other: {
      // WebView-friendly headers
      'X-Frame-Options': 'ALLOWALL',
      'X-Content-Type-Options': 'nosniff',
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
};

type Params = Promise<{ pageId: string; sectionId: string }>;
type SearchParams = Promise<{ preview?: string }>;

export default async function MobilePreviewPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  try {
    const params = await props.params;
    const searchParams = await props.searchParams;

    const { pageId, sectionId } = params;
    // detect ?preview=true
    const isPreview = searchParams.preview === 'true';

    // pass preview flag into your data fetch
    const pageData = await getPageData(pageId, { preview: isPreview });

    if (!pageData) {
      notFound();
    }

    const content = pageData.content as unknown as PageContent;
    const section = getSectionFromPage(content, sectionId);

    if (!section) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-2 text-gray-900">
              Section Not Found
            </h1>
            <p className="text-gray-600">
              The requested section could not be found on this page.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Page ID: {pageId}</p>
              <p>Section ID: {sectionId}</p>
            </div>
          </div>
        </div>
      );
    }

    // Create a default business object if none exists
    const business = pageData.business || {
      id: '',
      name: 'Unknown Business',
      logo_url: null,
      primary_color: '#000000',
      secondary_color: '#ffffff',
      font_family: 'Inter',
      email: null,
      phone: null,
      website: null,
      street_address: null,
      city: null,
      state: null,
      zip_code: null,
      country: null,
    };

    return (
      <>
        {/* only track real page views, not previews */}
        {!isPreview && <Analytics pageId={pageData.id} />}

        <div className="min-h-screen">
          {/* Mobile preview header */}
          <div className="bg-blue-600 text-white px-4 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Mobile Preview</span>
              <span className="font-mono text-xs opacity-75">
                {section.type} • {pageData.title}
              </span>
            </div>
          </div>

          <Suspense
            fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}
          >
            <MobileSectionRenderer
              section={section}
              business={business}
              pageData={pageData}
              styles={pageData.styles as unknown as Record<string, string>}
            />
          </Suspense>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error in MobilePreviewPage:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2 text-gray-900">
            Preview Error
          </h1>
          <p className="text-gray-600">
            An error occurred while loading the preview.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }
}
