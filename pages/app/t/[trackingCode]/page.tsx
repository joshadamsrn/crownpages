import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { after } from 'next/server';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getUploadPublicUrl } from '@/lib/upload-public-url';
import { getCurrentWhiteLabelTenant } from '@/lib/white-label-tenants';
import { headers } from 'next/headers';

interface TrackingPageProps {
  params: Promise<{ trackingCode: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getTrackableLinkData = cache(async (trackingCode: string) => {
  const supabase = await createClient();
  return supabase
    .from('trackable_links')
    .select(`
      id,
      name,
      description,
      expires_at,
      max_clicks,
      click_count,
      unique_click_count,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      redirect_delay,
      show_preview,
      page:pages(
        title,
        description,
        meta_title,
        meta_description,
        og_description,
        og_image_url,
        content,
        slug,
        business:businesses(name, slug)
      ),
      business_page:business_pages(
        title,
        description,
        logo_url,
        business:businesses(name, slug, logo_url)
      )
    `)
    .eq('tracking_code', trackingCode)
    .eq('is_active', true)
    .single();
});

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? relation[0] : relation;
}

export async function generateMetadata({ params }: TrackingPageProps): Promise<Metadata> {
  const { trackingCode } = await params;
  const [{ data: trackableLink }, tenant] = await Promise.all([
    getTrackableLinkData(trackingCode),
    getCurrentWhiteLabelTenant(),
  ]);

  if (!trackableLink) {
    return {
      title: `Page Not Found | ${tenant.publicName}`,
      description: 'The page you are looking for does not exist.',
    };
  }

  const linkedPage = firstRelation(trackableLink.page);
  if (linkedPage) {
    const business = firstRelation(linkedPage.business);
    const businessName = business?.name || tenant.publicName;
    const title = linkedPage.meta_title || linkedPage.title;
    const heroSubtitle = (() => {
      try {
        const content = linkedPage.content as {
          sections?: Array<{ type: string; data: Record<string, string> }>;
        } | null;
        const hero = content?.sections?.find((section) => section.type === 'hero');
        return hero?.data?.subtitle || null;
      } catch {
        return null;
      }
    })();
    const description =
      linkedPage.og_description ||
      linkedPage.meta_description ||
      heroSubtitle ||
      linkedPage.description ||
      `${linkedPage.title} - ${businessName}`;
    const image =
      getUploadPublicUrl(linkedPage.og_image_url) ||
      `/api/og?title=${encodeURIComponent(linkedPage.title)}&business=${encodeURIComponent(businessName)}`;

    return {
      title: `${title} | ${tenant.publicName}`,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: image }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  }

  const linkedBusinessPage = firstRelation(trackableLink.business_page);
  if (linkedBusinessPage) {
    const business = firstRelation(linkedBusinessPage.business);
    const businessName = business?.name || tenant.publicName;
    const title = linkedBusinessPage.title || `Welcome to ${businessName}`;
    const description = linkedBusinessPage.description || `${businessName} - Connect with us`;
    const image = getUploadPublicUrl(linkedBusinessPage.logo_url || business?.logo_url);

    return {
      title: `${title} | ${tenant.publicName}`,
      description,
      openGraph: {
        title,
        description,
        ...(image ? { images: [{ url: image }] } : {}),
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
  }

  return {
    title: tenant.publicName,
    description: `View this page on ${tenant.publicName}.`,
  };
}

export default async function TrackingPage({ params, searchParams }: TrackingPageProps) {
  const { trackingCode } = await params;
  const query = await searchParams;
  const [{ data: trackableLink, error }, supabase] = await Promise.all([
    getTrackableLinkData(trackingCode),
    createClient(),
  ]);

  if (error || !trackableLink) {
    notFound();
  }

  // Check if link has expired
  if (trackableLink.expires_at && new Date(trackableLink.expires_at) < new Date()) {
    notFound();
  }

  // Check if max clicks exceeded
  if (trackableLink.max_clicks && trackableLink.click_count && trackableLink.click_count >= trackableLink.max_clicks) {
    notFound();
  }

  // Enhanced tracking with detailed browser/device info
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';
  const referer = headersList.get('referer') || '';
  const xForwardedFor = headersList.get('x-forwarded-for') || '';
  const xRealIp = headersList.get('x-real-ip') || '';
  const cfConnectingIp = headersList.get('cf-connecting-ip') || '';
  const cfIpCountry = headersList.get('cf-ipcountry') || '';
  const purpose = headersList.get('purpose') || '';
  const secPurpose = headersList.get('sec-purpose') || '';
  const xPurpose = headersList.get('x-purpose') || '';
  const cfTimezone = headersList.get('cf-timezone') || null;
  const cfRay = headersList.get('cf-ray');
  const acceptLanguage = headersList.get('accept-language');
  
  // Extract IP address (prioritize CF if available, then x-forwarded-for)
  const ipAddress = cfConnectingIp || xRealIp || xForwardedFor?.split(',')[0]?.trim() || '';
  
  // Parse user agent for device/browser info
  const deviceInfo = parseUserAgent(userAgent);
  const visitorId = generateStableVisitorId(ipAddress, userAgent);
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const isBotRequest = isLikelyBotRequest({
    userAgent,
    purpose,
    secPurpose,
    xPurpose,
  });

  if (!isBotRequest) {
    // QR scans should never wait for analytics. Next.js keeps this callback alive
    // after the redirect response has been sent, so the destination can start
    // rendering immediately while scan counts are recorded in the background.
    after(async () => {
      try {
        const { data: existingEvents, error: existingEventsError } = await supabase
          .from('trackable_link_events')
          .select('id')
          .eq('trackable_link_id', trackableLink.id)
          .eq('visitor_id', visitorId)
          .limit(1);

        if (existingEventsError) {
          console.error('Unable to check trackable-link uniqueness:', existingEventsError);
        }

        const isUniqueVisitor = !existingEvents || existingEvents.length === 0;
        const { error: eventInsertError } = await supabase.from('trackable_link_events').insert({
          trackable_link_id: trackableLink.id,
          event_type: 'view',
          visitor_id: visitorId,
          session_id: sessionId,
          device_type: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          user_agent: userAgent,
          referrer: referer || null,
          ip_address: ipAddress || null,
          country: cfIpCountry || null,
          timezone: cfTimezone,
          event_data: {
            access_method: 'short_url',
            query_params: query,
            headers: {
              'x-forwarded-for': xForwardedFor,
              'cf-ray': cfRay,
              'accept-language': acceptLanguage,
              purpose,
              'sec-purpose': secPurpose,
              'x-purpose': xPurpose,
            }
          }
        });

        if (eventInsertError) {
          console.error('Unable to record trackable-link view:', eventInsertError);
          return;
        }

        const { error: counterUpdateError } = await supabase
          .from('trackable_links')
          .update({
            click_count: (trackableLink.click_count || 0) + 1,
            unique_click_count: isUniqueVisitor
              ? (trackableLink.unique_click_count || 0) + 1
              : (trackableLink.unique_click_count || 0),
            last_clicked_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', trackableLink.id);

        if (counterUpdateError) {
          console.error('Unable to update trackable-link counters:', counterUpdateError);
        }
      } catch (analyticsError) {
        console.error('Trackable-link analytics failed after redirect:', analyticsError);
      }
    });
  }

  // Determine the destination URL
  let destinationUrl = '';
  const linkedPage = firstRelation(trackableLink.page);
  const linkedBusinessPage = firstRelation(trackableLink.business_page);
  
  if (linkedPage) {
    // Regular page URL
    const pageBusiness = firstRelation(linkedPage.business);
    const businessSlug = pageBusiness?.slug;
    const pageSlug = linkedPage.slug;
    destinationUrl = businessSlug && pageSlug 
      ? `/${businessSlug}/${pageSlug}` 
      : '/';
  } else if (linkedBusinessPage) {
    // Business page URL
    const pageBusiness = firstRelation(linkedBusinessPage.business);
    const businessSlug = pageBusiness?.slug;
    destinationUrl = businessSlug ? `/${businessSlug}` : '/';
  }

  // Add UTM parameters + tracking code for named-lead attribution.
  // Anonymous tracker links, such as QR/Quick Share links, still keep the tracking
  // code for scan/click totals but must not inherit a named-contact identity.
  const utmParams = new URLSearchParams();
  if (trackableLink.utm_source) utmParams.set('utm_source', trackableLink.utm_source);
  if (trackableLink.utm_medium) utmParams.set('utm_medium', trackableLink.utm_medium);
  if (trackableLink.utm_campaign) utmParams.set('utm_campaign', trackableLink.utm_campaign);
  if (trackableLink.utm_term) utmParams.set('utm_term', trackableLink.utm_term);
  if (trackableLink.utm_content) utmParams.set('utm_content', trackableLink.utm_content);
  // Always pass tracking code so Analytics component can attribute events to this named link
  utmParams.set('tl', trackingCode);
  utmParams.set('cp_track', isNamedContactTrackableLink(trackableLink) ? 'contact' : 'anonymous');

  destinationUrl += `?${utmParams.toString()}`;

  // Handle redirect delay or preview
  if (trackableLink.show_preview || trackableLink.redirect_delay! > 0) {
    // Return a preview/redirect page with client-side redirect
    return (
      <TrackingRedirectPage 
        trackableLink={trackableLink}
        destinationUrl={destinationUrl}
      />
    );
  }

  // Immediate redirect
  redirect(destinationUrl);
}

function isNamedContactTrackableLink(trackableLink: {
  name?: string | null;
  utm_source?: string | null;
}) {
  const name = trackableLink.name?.trim() || '';
  const normalizedName = name.toLowerCase();
  const normalizedSource = trackableLink.utm_source?.trim().toLowerCase() || '';

  if (!name) {
    return false;
  }

  return !(
    normalizedSource === 'qr_code' ||
    normalizedSource.includes('quick') ||
    normalizedSource.includes('share') ||
    normalizedName === 'quick share' ||
    normalizedName.startsWith('quick share')
  );
}

// Enhanced user agent parsing function
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Device type detection
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/.test(ua)) {
    deviceType = 'tablet';
  }
  
  // Browser detection
  let browser = 'unknown';
  let browserVersion = '';
  
  if (ua.includes('edg/')) {
    browser = 'edge';
    browserVersion = ua.match(/edg\/(\d+\.\d+)/)?.[1] || '';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'chrome';
    browserVersion = ua.match(/chrome\/(\d+\.\d+)/)?.[1] || '';
  } else if (ua.includes('firefox/')) {
    browser = 'firefox';
    browserVersion = ua.match(/firefox\/(\d+\.\d+)/)?.[1] || '';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'safari';
    browserVersion = ua.match(/version\/(\d+\.\d+)/)?.[1] || '';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'opera';
    browserVersion = ua.match(/(opera|opr)\/(\d+\.\d+)/)?.[2] || '';
  }
  
  // OS detection
  let os = 'unknown';
  let osVersion = '';
  
  if (ua.includes('windows')) {
    os = 'windows';
    if (ua.includes('windows nt 10.0')) osVersion = '10';
    else if (ua.includes('windows nt 6.3')) osVersion = '8.1';
    else if (ua.includes('windows nt 6.2')) osVersion = '8';
    else if (ua.includes('windows nt 6.1')) osVersion = '7';
  } else if (ua.includes('mac os x')) {
    os = 'macos';
    osVersion = ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
  } else if (ua.includes('linux')) {
    os = 'linux';
  } else if (ua.includes('android')) {
    os = 'android';
    osVersion = ua.match(/android (\d+\.\d+)/)?.[1] || '';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'ios';
    osVersion = ua.match(/os (\d+[._]\d+)/)?.[1]?.replace('_', '.') || '';
  }
  
  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion
  };
}

function generateStableVisitorId(ipAddress: string, userAgent: string) {
  const fingerprint = `${ipAddress}|${userAgent}`.trim();
  const encoded = Buffer.from(fingerprint || 'unknown-visitor', 'utf8')
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 24);

  return `web_${encoded}`;
}

function isLikelyBotRequest({
  userAgent,
  purpose,
  secPurpose,
  xPurpose,
}: {
  userAgent: string;
  purpose: string;
  secPurpose: string;
  xPurpose: string;
}) {
  const ua = userAgent.toLowerCase();
  const joinedPurpose = `${purpose} ${secPurpose} ${xPurpose}`.toLowerCase();

  if (joinedPurpose.includes('prefetch') || joinedPurpose.includes('preview')) {
    return true;
  }

  return [
    'bot',
    'crawler',
    'spider',
    'preview',
    'slackbot',
    'facebookexternalhit',
    'whatsapp',
    'discordbot',
    'telegrambot',
    'linkedinbot',
    'twitterbot',
    'googlebot',
    'bingbot',
    'headless',
    'python-requests',
    'curl/',
  ].some((token) => ua.includes(token));
}

// Component for handling delayed redirects or previews
function TrackingRedirectPage({ 
  trackableLink, 
  destinationUrl 
}: { 
  trackableLink: any; 
  destinationUrl: string; 
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {trackableLink.show_preview && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-4">
              {trackableLink.page?.title || trackableLink.business_page?.title || 'Crown Page'}
            </h1>
            <p className="text-gray-600 mb-6">
              {trackableLink.page?.description || trackableLink.business_page?.description || 'You are being redirected to a Crown Page.'}
            </p>
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">You will be redirected to:</p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded break-all">
                {destinationUrl}
              </p>
            </div>
          </>
        )}
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-sm text-gray-500">
            Redirecting {trackableLink.redirect_delay! > 0 ? `in ${Math.ceil(trackableLink.redirect_delay! / 1000)} seconds` : 'now'}...
          </p>
          <a 
            href={destinationUrl}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Continue Now
          </a>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(function() {
              window.location.href = '${destinationUrl}';
            }, ${trackableLink.redirect_delay || 0});
          `,
        }}
      />
    </div>
  );
}
