import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EnhancedPageRenderer, PageContent } from '@/components/enhanced-page-renderer';
import { Analytics } from '@/components/analytics';

import type { Database } from '@/database.types';
import { SectionStyles } from '@/types';

type ShareLinkData = Database['public']['Tables']['share_links']['Row'] & {
  page: Database['public']['Tables']['pages']['Row'] & {
    business: Database['public']['Tables']['businesses']['Row'];
  };
};

interface SharePageProps {
  params: Promise<{ shortCode: string }>;
}

async function getShareLinkData(shortCode: string): Promise<ShareLinkData | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('share_links')
    .select(`
      *,
      page:pages(
        *,
        business:businesses(*)
      )
    `)
    .eq('short_code', shortCode)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if share link has expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if max views exceeded
  if (data.max_views && data.view_count && data.view_count >= data.max_views) {
    return null;
  }

  return data as ShareLinkData;
}

async function incrementViewCount(shortCode: string) {
  const supabase = await createClient();

  // Get current view count first
  const { data: currentData } = await supabase
    .from('share_links')
    .select('view_count')
    .eq('short_code', shortCode)
    .single();

  // Increment view count and update last viewed time
  await supabase
    .from('share_links')
    .update({
      view_count: (currentData?.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('short_code', shortCode);
}

export default async function SharePage({ params }: SharePageProps) {
  const { shortCode } = await params;
  const shareData = await getShareLinkData(shortCode);

  if (!shareData || !shareData.page) {
    notFound();
  }

  // Check if page is published
  if (!shareData.page.is_published || !shareData.page.is_active) {
    notFound();
  }

  // Increment view count
  await incrementViewCount(shortCode);

  const currentPath = `/share/${shortCode}`;
  const businessSlug = shareData.page.business?.slug || 'unknown';

  return (
    <>
      <Analytics pageId={shareData.page.id} />



      <div className="min-h-screen">
        {shareData.custom_message && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-blue-700">{shareData.custom_message}</p>
            </div>
          </div>
        )}

        <Suspense fallback={<div className="min-h-screen bg-gray-50 animate-pulse" />}>
          <EnhancedPageRenderer
            content={shareData.page.content as unknown as PageContent}
            styles={shareData.page.styles as unknown as SectionStyles}
            business={shareData.page.business}
            pageData={shareData.page}
          />
        </Suspense>
      </div>


    </>
  );
} 