import { createClient } from './supabase/client';

export interface TrackEventParams {
  pageId: string;
  eventType:
  | 'page_view'
  | 'link_click'
  | 'button_click'
  | 'form_submit'
  | 'share'
  | 'save'
  | 'print'
  | 'download'
  | 'phone_click'
  | 'email_click'
  | 'address_click'
  | 'social_click'
  | 'contact_open'
  | 'page_exit'
  | 'photo_click'
  | 'video_click'
  | 'media_click'
  | 'save_contact';
  eventData?: Record<string, unknown>;
  userId?: string;
}

// New interface for business page analytics
export interface TrackBusinessPageEventParams {
  businessPageId: string;
  businessId: string;
  eventType:
  | 'page_view'
  | 'link_click'
  | 'button_click'
  | 'form_submit'
  | 'share'
  | 'save'
  | 'print'
  | 'download'
  | 'phone_click'
  | 'email_click'
  | 'address_click'
  | 'social_click'
  | 'website_click';
  eventData?: Record<string, unknown>;
  userId?: string;
}

// Simple check for contexts where we should skip analytics
function shouldSkipAnalytics(): boolean {
  // Skip everywhere server‑side
  if (typeof window === 'undefined') return true;

  try {
    // Skip if preview mode via query param
    // (lets next.js preview routes and expo WebView previews bypass analytics)
    const href = window.location.href;
    const url = new URL(href);
    if (url.searchParams.get('preview') === 'true') {
      if (process.env.NODE_ENV === 'development') console.info('Analytics skipped: preview=true in query');
      return true;
    }

    // Check 1: Mobile preview URLs - these are for mobile app integration only
    const pathname = window.location.pathname;
    if (pathname.includes('/mobile/preview/')) {
      if (process.env.NODE_ENV === 'development') console.info('Analytics skipped: Mobile preview context');
      return true;
    }

    // Check 2: React Native WebView detection (more specific)
    const userAgent = navigator.userAgent;
    const isReactNativeWebView =
      (userAgent.includes('wv') && userAgent.includes('Version/')) || // Android WebView in React Native
      userAgent.includes('ReactNative'); // Direct React Native indicator

    if (isReactNativeWebView) {
      if (process.env.NODE_ENV === 'development') console.info('Analytics skipped: React Native WebView detected');
      return true;
    }

    // Check 3: Test storage access with a simple, safe test
    try {
      localStorage.setItem('crownpages_test', 'test');
      localStorage.removeItem('crownpages_test');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.info('Analytics skipped: Storage access restricted');
      return true;
    }

    return false;
  } catch (error) {
    // If any of the above checks fail, we're probably in a restricted context
    if (process.env.NODE_ENV === 'development') console.info('Analytics skipped: Context detection failed');
    return true;
  }
}

// Generate a temporary ID for this session
function generateTempId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function trackEvent({
  pageId,
  eventType,
  eventData = {},
  userId,
}: TrackEventParams) {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  // Skip analytics only in specific restricted contexts
  if (shouldSkipAnalytics()) {
    return;
  }

  if (process.env.NODE_ENV === 'development') console.log('🎯 TRACKING EVENT:', { eventType, pageId, eventData });

  try {
    const supabase = createClient();

    // Get visitor ID from localStorage, with fallback
    let visitorId: string;
    try {
      visitorId = localStorage.getItem('crownpages_visitor_id') || '';
      if (!visitorId) {
        visitorId = generateTempId('visitor');
        localStorage.setItem('crownpages_visitor_id', visitorId);
      }
    } catch (error) {
      // Fallback for storage issues
      visitorId = generateTempId('visitor');
    }

    // Get session ID from sessionStorage, with fallback
    let sessionId: string;
    try {
      sessionId = sessionStorage.getItem('crownpages_session_id') || '';
      if (!sessionId) {
        sessionId = generateTempId('session');
        sessionStorage.setItem('crownpages_session_id', sessionId);
      }
    } catch (error) {
      // Fallback for storage issues
      sessionId = generateTempId('session');
    }

    // Get basic browser info (these should work in normal browsers)
    const userAgent = navigator.userAgent || 'unknown';
    const referrer = document.referrer || null;

    // Platform detection
    const pathname = window.location.pathname;
    let platform = 'web_app';
    if (pathname.includes('/share/')) {
      platform = 'shared_link';
    } else if (pathname.includes('/mobile/preview/')) {
      platform = 'mobile_preview';
    }

    // Attach tracking code for named-lead attribution if visitor came via tracker link.
    // Read from sessionStorage (written when ?tl= param is present on page load).
    let trackingCode: string | null = null;
    try {
      trackingCode = sessionStorage.getItem('crownpages_tl') || null;
    } catch { /* ignore */ }

    const eventRecord = {
      page_id: pageId,
      event_type: eventType,
      event_data: trackingCode ? { ...eventData, tracking_code: trackingCode } : eventData,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: userId || null,
      user_agent: userAgent,
      referrer: referrer,
      platform: platform,
    };

    if (process.env.NODE_ENV === 'development') console.log('📤 SENDING TO SUPABASE:', eventRecord);

    const { error } = await supabase.from('analytics_events').insert(eventRecord);

    if (error) {
      console.error('❌ Analytics tracking failed:', error);
    } else {
      if (process.env.NODE_ENV === 'development') console.log('✅ Analytics event tracked successfully!', eventType);
    }
  } catch (error) {
    console.error('❌ Analytics error:', error);
    // Don't throw - fail silently
  }
}

export async function trackPageView(pageId: string, userId?: string) {
  await trackEvent({
    pageId,
    eventType: 'page_view',
    userId,
  });
}

export async function trackPageExit(pageId: string, timeOnPageSeconds: number, userId?: string) {
  await trackEvent({
    pageId,
    eventType: 'page_exit',
    eventData: { time_on_page: timeOnPageSeconds },
    userId,
  });
}

export async function trackShare(
  pageId: string,
  shareMethod: string,
  userId?: string
) {
  await trackEvent({
    pageId,
    eventType: 'share',
    eventData: { share_method: shareMethod },
    userId,
  });
}

export async function trackSave(pageId: string, userId?: string) {
  await trackEvent({
    pageId,
    eventType: 'save',
    userId,
  });
}

// Business Page Analytics Functions
export async function trackBusinessPageEvent({
  businessPageId,
  businessId,
  eventType,
  eventData = {},
  userId,
}: TrackBusinessPageEventParams) {
  // Only run on client side
  if (typeof window === 'undefined') {
    return;
  }

  // Skip analytics only in specific restricted contexts
  if (shouldSkipAnalytics()) {
    return;
  }

  if (process.env.NODE_ENV === 'development') console.log('🎯 TRACKING BUSINESS PAGE EVENT:', { eventType, businessPageId, businessId, eventData });

  try {
    const supabase = createClient();

    // Get visitor ID from localStorage, with fallback
    let visitorId: string;
    try {
      visitorId = localStorage.getItem('crownpages_visitor_id') || '';
      if (!visitorId) {
        visitorId = generateTempId('visitor');
        localStorage.setItem('crownpages_visitor_id', visitorId);
      }
    } catch (error) {
      // Fallback for storage issues
      visitorId = generateTempId('visitor');
    }

    // Get session ID from sessionStorage, with fallback
    let sessionId: string;
    try {
      sessionId = sessionStorage.getItem('crownpages_session_id') || '';
      if (!sessionId) {
        sessionId = generateTempId('session');
        sessionStorage.setItem('crownpages_session_id', sessionId);
      }
    } catch (error) {
      // Fallback for storage issues
      sessionId = generateTempId('session');
    }

    // Get basic browser info (these should work in normal browsers)
    const userAgent = navigator.userAgent || 'unknown';
    const referrer = document.referrer || null;

    // Platform detection
    const pathname = window.location.pathname;
    let platform = 'business_page';
    if (pathname.includes('/share/')) {
      platform = 'shared_link';
    } else if (pathname.includes('/mobile/preview/')) {
      platform = 'mobile_app';
    }

    const eventRecord = {
      business_page_id: businessPageId,
      business_id: businessId,
      event_type: eventType,
      event_data: eventData,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: userId || null,
      user_agent: userAgent,
      referrer: referrer,
      platform: platform,
    };

    if (process.env.NODE_ENV === 'development') console.log('📤 SENDING BUSINESS PAGE ANALYTICS TO SUPABASE:', eventRecord);

    const { error } = await supabase.from('business_page_analytics').insert(eventRecord);

    if (error) {
      console.error('❌ Business page analytics tracking failed:', error);
    } else {
      if (process.env.NODE_ENV === 'development') console.log('✅ Business page analytics event tracked successfully!', eventType);
    }
  } catch (error) {
    console.error('❌ Business page analytics error:', error);
    // Don't throw - fail silently
  }
}

export async function trackBusinessPageView(
  businessPageId: string,
  businessId: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'page_view',
    userId,
  });
}

export async function trackBusinessPagePhoneClick(
  businessPageId: string,
  businessId: string,
  phoneNumber: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'phone_click',
    eventData: { phone_number: phoneNumber },
    userId,
  });
}

export async function trackBusinessPageEmailClick(
  businessPageId: string,
  businessId: string,
  email: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'email_click',
    eventData: { email_address: email },
    userId,
  });
}

export async function trackBusinessPageAddressClick(
  businessPageId: string,
  businessId: string,
  address: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'address_click',
    eventData: { address: address },
    userId,
  });
}

export async function trackBusinessPageSocialClick(
  businessPageId: string,
  businessId: string,
  platform: string,
  url: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'social_click',
    eventData: { social_platform: platform, url: url },
    userId,
  });
}

export async function trackBusinessPageWebsiteClick(
  businessPageId: string,
  businessId: string,
  websiteUrl: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'website_click',
    eventData: { website_url: websiteUrl },
    userId,
  });
}

export async function trackBusinessPageLinkClick(
  businessPageId: string,
  businessId: string,
  linkTitle: string,
  linkSlug: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'link_click',
    eventData: { link_title: linkTitle, link_slug: linkSlug },
    userId,
  });
}

export async function trackBusinessPageShare(
  businessPageId: string,
  businessId: string,
  shareMethod: string,
  userId?: string
) {
  await trackBusinessPageEvent({
    businessPageId,
    businessId,
    eventType: 'share',
    eventData: { share_method: shareMethod },
    userId,
  });
}
