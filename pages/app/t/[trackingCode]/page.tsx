import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

interface TrackingPageProps {
  params: Promise<{ trackingCode: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TrackingPage({ params, searchParams }: TrackingPageProps) {
  const { trackingCode } = await params;
  const query = await searchParams;
  
  const supabase = await createClient();

  // Get the trackable link data
  const { data: trackableLink, error } = await supabase
    .from('trackable_links')
    .select(`
      *,
      page:pages(
        *,
        business:businesses(*)
      ),
      business_page:business_pages(
        *,
        business:businesses(*)
      )
    `)
    .eq('tracking_code', trackingCode)
    .eq('is_active', true)
    .single();

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
  
  // Extract IP address (prioritize CF if available, then x-forwarded-for)
  const ipAddress = cfConnectingIp || xRealIp || xForwardedFor?.split(',')[0]?.trim() || '';
  
  // Parse user agent for device/browser info
  const deviceInfo = parseUserAgent(userAgent);
  
  // Generate unique visitor ID based on IP + User Agent for session tracking
  const visitorFingerprint = `${ipAddress}-${userAgent}`.replace(/[^\w-]/g, '');
  const visitorId = `web_${btoa(visitorFingerprint).substring(0, 12)}_${Date.now().toString().slice(-6)}`;
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Track the view with enhanced data
  await supabase.from('trackable_link_events').insert({
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
    timezone: headersList.get('cf-timezone') || null,
    event_data: { 
      access_method: 'short_url',
      query_params: query,
      headers: {
        'x-forwarded-for': xForwardedFor,
        'cf-ray': headersList.get('cf-ray'),
        'accept-language': headersList.get('accept-language'),
      }
    }
  });

  // Check if this is a unique visitor for this link
  const { data: existingEvents } = await supabase
    .from('trackable_link_events')
    .select('id')
    .eq('trackable_link_id', trackableLink.id)
    .eq('visitor_id', visitorId)
    .limit(1);

  const isUniqueVisitor = !existingEvents || existingEvents.length === 0;

  // Update view counts on the trackable link
  await supabase
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

  // Determine the destination URL
  let destinationUrl = '';
  
  if (trackableLink.page) {
    // Regular page URL
    const businessSlug = trackableLink.page.business?.slug;
    const pageSlug = trackableLink.page.slug;
    destinationUrl = businessSlug && pageSlug 
      ? `/${businessSlug}/${pageSlug}` 
      : '/';
  } else if (trackableLink.business_page) {
    // Business page URL
    const businessSlug = trackableLink.business_page.business?.slug;
    destinationUrl = businessSlug ? `/${businessSlug}` : '/';
  }

  // Add UTM parameters + tracking code for named-lead attribution
  const utmParams = new URLSearchParams();
  if (trackableLink.utm_source) utmParams.set('utm_source', trackableLink.utm_source);
  if (trackableLink.utm_medium) utmParams.set('utm_medium', trackableLink.utm_medium);
  if (trackableLink.utm_campaign) utmParams.set('utm_campaign', trackableLink.utm_campaign);
  if (trackableLink.utm_term) utmParams.set('utm_term', trackableLink.utm_term);
  if (trackableLink.utm_content) utmParams.set('utm_content', trackableLink.utm_content);
  // Always pass tracking code so Analytics component can attribute events to this named link
  utmParams.set('tl', trackingCode);

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
