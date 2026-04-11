import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PageContent, SectionData } from '@/components/enhanced-page-renderer';
import { getSectionDefinition } from '@crown-pages/types';
import type { Database } from '@/database.types';

type PageData = Database['public']['Tables']['pages']['Row'] & {
  business: Database['public']['Tables']['businesses']['Row'] | null;
};

interface SectionSummary {
  id: string;
  type: string;
  preview: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
}

interface MobileSectionsApiResponse {
  success: boolean;
  data?: {
    pageId: string;
    pageTitle: string;
    sections: SectionSummary[];
    business: {
      id: string;
      name: string;
      primary_color: string | null;
      secondary_color: string | null;
    } | null;
  };
  error?: string;
}

async function getPageData(
  pageId: string,
  opts: { preview?: boolean } = {}
): Promise<PageData | null> {
  const supabase = await createClient();

  let q = supabase
    .from('pages')
    .select(
      `
      *,
      business:businesses(*)
    `
    )
    .eq('id', pageId)
    .eq('is_active', true);

  // only show published pages in “live” mode
  if (!opts.preview) {
    q = q.eq('is_published', true);
  }

  const { data, error } = await q.single();

  if (error || !data) {
    console.error('Error fetching page for mobile sections API:', error);
    return null;
  }

  return data as PageData;
}

function getSectionSummary(section: SectionData): SectionSummary {
  const data = section.data as Record<string, unknown>;

  return {
    id: section.id,
    type: section.type,
    preview: {
      title:
        (data.title as string) ||
        (data.name as string) ||
        `${section.type} section`,
      subtitle:
        (data.subtitle as string) ||
        (data.description as string)?.substring(0, 100),
      description:
        (data.content as string)?.substring(0, 150) ||
        (data.description as string)?.substring(0, 150),
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    // detect ?preview=true
    const isPreview = request.nextUrl.searchParams.get('preview') === 'true';

    // Validate input
    if (!pageId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing pageId',
        } as MobileSectionsApiResponse,
        { status: 400 }
      );
    }

    // Get page data
    const pageData = await getPageData(pageId, { preview: isPreview });
    if (!pageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Page not found',
        } as MobileSectionsApiResponse,
        { status: 404 }
      );
    }

    // Get all sections
    const content = pageData.content as unknown as PageContent;

    if (!content?.sections || !Array.isArray(content.sections)) {
      return NextResponse.json({
        success: true,
        data: {
          pageId: pageData.id,
          pageTitle: pageData.title,
          sections: [],
          business: pageData.business
            ? {
                id: pageData.business.id,
                name: pageData.business.name,
                primary_color: pageData.business.primary_color,
                secondary_color: pageData.business.secondary_color,
              }
            : null,
        },
      } as MobileSectionsApiResponse);
    }

    // Create section summaries
    const sections = content.sections.map(getSectionSummary);

    return NextResponse.json({
      success: true,
      data: {
        pageId: pageData.id,
        pageTitle: pageData.title,
        sections,
        business: pageData.business
          ? {
              id: pageData.business.id,
              name: pageData.business.name,
              primary_color: pageData.business.primary_color,
              secondary_color: pageData.business.secondary_color,
            }
          : null,
      },
    } as MobileSectionsApiResponse);
  } catch (error) {
    console.error('Mobile sections API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as MobileSectionsApiResponse,
      { status: 500 }
    );
  }
}
