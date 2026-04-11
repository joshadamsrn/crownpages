import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PageContent, SectionData } from '@/components/enhanced-page-renderer';
import { getSectionDefinition } from '@crown-pages/types';
import type { Database } from '@/database.types';

type PageData = Database['public']['Tables']['pages']['Row'] & {
  business: Database['public']['Tables']['businesses']['Row'] | null;
};

interface MobilePreviewApiResponse {
  success: boolean;
  data?: {
    section: SectionData;
    business: Database['public']['Tables']['businesses']['Row'] | null;
    pageData: {
      id: string;
      title: string;
      styles: Record<string, string>;
    };
  };
  error?: string;
}

async function getPageData(
  pageId: string,
  opts: { preview?: boolean } = {}
): Promise<PageData | null> {
  const supabase = await createClient();

  // If not in preview mode, enforce only published pages
  let query = supabase
    .from('pages')
    .select(
      `
      *,
      business:businesses(*)
    `
    )
    .eq('id', pageId);

  if (!opts.preview) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    console.error('Error fetching page for mobile preview API:', error);
    return null;
  }
  return data as PageData;
}

function getSectionFromPage(
  content: PageContent,
  sectionId: string
): SectionData | null {
  if (!content?.sections || !Array.isArray(content.sections)) {
    return null;
  }

  return content.sections.find((section) => section.id === sectionId) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string; sectionId: string }> }
) {
  try {
    const { pageId, sectionId } = await params;

    // detect preview mode via ?preview=true
    const url = new URL(request.url);
    const isPreview = url.searchParams.get('preview') === 'true';

    // Validate input
    if (!pageId || !sectionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing pageId or sectionId',
        } as MobilePreviewApiResponse,
        { status: 400 }
      );
    }

    // Get page data, allowing unpublished only in preview
    const pageData = await getPageData(pageId, { preview: isPreview });
    if (!pageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Page not found',
        } as MobilePreviewApiResponse,
        { status: 404 }
      );
    }

    // ←— if you ever want to log analytics here, you could do:
    // if (!isPreview) {
    //   await supabase.from('analytics_events').insert({ page_id: pageId, event_type: 'page_view', /* … */ })
    // }

    // Get specific section
    const content = pageData.content as unknown as PageContent;
    const section = getSectionFromPage(content, sectionId);

    if (!section) {
      return NextResponse.json(
        {
          success: false,
          error: 'Section not found',
        } as MobilePreviewApiResponse,
        { status: 404 }
      );
    }

    // Return section data with minimal page info
    return NextResponse.json({
      success: true,
      data: {
        section,
        business: pageData.business,
        pageData: {
          id: pageData.id,
          title: pageData.title,
          styles: (pageData.styles as unknown as Record<string, string>) || {},
        },
      },
    } as MobilePreviewApiResponse);
  } catch (error) {
    console.error('Mobile preview API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as MobilePreviewApiResponse,
      { status: 500 }
    );
  }
}
