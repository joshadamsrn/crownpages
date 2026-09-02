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
  | 'website_click'
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

const VISITOR_ID_KEY = 'crownpages_visitor_id';
const ANONYMOUS_VISITOR_ID_KEY = 'crownpages_anonymous_visitor_id';
const SESSION_ID_KEY = 'crownpages_session_id';
const TRACKING_CODE_KEY = 'crownpages_tl';
const ATTRIBUTION_MODE_KEY = 'crownpages_attribution_mode';
const NAMED_ATTRIBUTION_KEY = 'crownpages_named_attribution';

type AttributionMode = 'contact' | 'anonymous' | 'quick_share' | null;

interface AttributionContext {
  trackingCode: string | null;
  mode: AttributionMode;
  contactName?: string | null;
  trackingLinkId?: string | null;
}

interface TrackingApiResponse {
  success?: boolean;
  attribution?: {
    mode?: AttributionMode;
    isNamed?: boolean;
    trackingCode?: string | null;
    trackingLinkId?: string | null;
    contactName?: string | null;
  };
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

function safeLocalGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private/restricted modes. Tracking should continue.
  }
}

function safeSessionGet(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private/restricted modes. Tracking should continue.
  }
}

function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function readStoredNamedAttribution(): AttributionContext | null {
  const raw = safeLocalGet(NAMED_ATTRIBUTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      trackingCode?: unknown;
      trackingLinkId?: unknown;
      contactName?: unknown;
    };
    const trackingCode = typeof parsed.trackingCode === 'string' ? parsed.trackingCode.trim() : '';

    if (!trackingCode) {
      return null;
    }

    return {
      trackingCode,
      trackingLinkId: typeof parsed.trackingLinkId === 'string' ? parsed.trackingLinkId : null,
      contactName: typeof parsed.contactName === 'string' ? parsed.contactName : null,
      mode: 'contact',
    };
  } catch {
    return null;
  }
}

function storeNamedAttribution(attribution: TrackingApiResponse['attribution']) {
  if (!attribution?.isNamed || !attribution.trackingCode || !attribution.contactName) {
    return;
  }

  safeLocalSet(
    NAMED_ATTRIBUTION_KEY,
    JSON.stringify({
      trackingCode: attribution.trackingCode,
      trackingLinkId: attribution.trackingLinkId || null,
      contactName: attribution.contactName,
      storedAt: new Date().toISOString(),
    }),
  );
}

function getAttributionContext(): AttributionContext {
  const pathname = window.location.pathname;

  if (pathname.startsWith('/share/')) {
    safeSessionSet(ATTRIBUTION_MODE_KEY, 'quick_share');
    safeSessionRemove(TRACKING_CODE_KEY);
    return { trackingCode: null, mode: 'quick_share' };
  }

  try {
    const url = new URL(window.location.href);
    const trackingCode = url.searchParams.get('tl')?.trim() || '';
    const modeParam = url.searchParams.get('cp_track')?.trim().toLowerCase();

    if (trackingCode) {
      const mode: AttributionMode = modeParam === 'anonymous' || modeParam === 'quick_share' ? 'anonymous' : 'contact';
      safeSessionSet(TRACKING_CODE_KEY, trackingCode);
      safeSessionSet(ATTRIBUTION_MODE_KEY, mode);
      return { trackingCode, mode };
    }
  } catch {
    // Fall back to stored attribution below.
  }

  const sessionMode = safeSessionGet(ATTRIBUTION_MODE_KEY) as AttributionMode;
  if (sessionMode === 'anonymous') {
    return { trackingCode: safeSessionGet(TRACKING_CODE_KEY), mode: 'anonymous' };
  }

  if (sessionMode === 'quick_share') {
    return { trackingCode: null, mode: 'quick_share' };
  }

  const sessionTrackingCode = safeSessionGet(TRACKING_CODE_KEY);
  if (sessionTrackingCode) {
    return { trackingCode: sessionTrackingCode, mode: 'contact' };
  }

  return readStoredNamedAttribution() || { trackingCode: null, mode: null };
}

function getVisitorId(attribution: AttributionContext) {
  const shouldUseAnonymousVisitor = attribution.mode === 'anonymous' || attribution.mode === 'quick_share';
  const storageKey = shouldUseAnonymousVisitor ? ANONYMOUS_VISITOR_ID_KEY : VISITOR_ID_KEY;
  const prefix = shouldUseAnonymousVisitor ? 'unknown' : 'visitor';
  let visitorId = shouldUseAnonymousVisitor ? safeSessionGet(storageKey) : safeLocalGet(storageKey);

  if (!visitorId) {
    visitorId = generateTempId(prefix);
    if (shouldUseAnonymousVisitor) {
      safeSessionSet(storageKey, visitorId);
    } else {
      safeLocalSet(storageKey, visitorId);
    }
  }

  return visitorId;
}

function getSessionId() {
  let sessionId = safeSessionGet(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = generateTempId('session');
    safeSessionSet(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

function getPlatform() {
  const pathname = window.location.pathname;
  if (pathname.includes('/share/')) return 'shared_link';
  if (pathname.includes('/mobile/preview/')) return 'mobile_preview';
  return 'web_app';
}

function shouldUseKeepalive(eventType: TrackEventParams['eventType']) {
  return [
    'page_exit',
    'link_click',
    'button_click',
    'phone_click',
    'email_click',
    'address_click',
    'download',
    'social_click',
    'website_click',
  ].includes(eventType);
}

async function insertFallbackAnalyticsEvent(args: {
  pageId: string;
  eventType: TrackEventParams['eventType'];
  eventData: Record<string, unknown>;
  userId?: string;
  visitorId: string;
  sessionId: string;
  attribution: AttributionContext;
}) {
  const supabase = createClient();
  const userAgent = navigator.userAgent || 'unknown';
  const referrer = document.referrer || null;
  const trackingFields =
    args.attribution.trackingCode
      ? {
          tracking_code: args.attribution.trackingCode,
          attribution_mode: args.attribution.mode,
          tracking_link_id: args.attribution.trackingLinkId || null,
          tracking_contact_name:
            args.attribution.mode === 'contact' ? args.attribution.contactName || null : null,
          tracking_link_name:
            args.attribution.mode === 'contact' ? args.attribution.contactName || null : null,
          tracking_link_is_named: args.attribution.mode === 'contact' && Boolean(args.attribution.contactName),
        }
      : {
          attribution_mode: args.attribution.mode,
          tracking_link_is_named: false,
        };

  await supabase.from('analytics_events').insert({
    page_id: args.pageId,
    event_type: args.eventType,
    event_data: {
      ...args.eventData,
      ...trackingFields,
    },
    visitor_id: args.visitorId,
    session_id: args.sessionId,
    user_id: args.userId || null,
    user_agent: userAgent,
    referrer,
    platform: getPlatform(),
  });
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
    const attribution = getAttributionContext();
    const visitorId = getVisitorId(attribution);
    const sessionId = getSessionId();
    const payload = {
      page_id: pageId,
      event_type: eventType,
      event_data: eventData,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: userId || null,
      tracking_code: attribution.trackingCode,
      attribution_mode: attribution.mode,
      platform: getPlatform(),
      referrer: document.referrer || null,
      client_event_id: generateTempId('evt'),
    };

    if (process.env.NODE_ENV === 'development') console.log('📤 SENDING ANALYTICS EVENT:', payload);

    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: shouldUseKeepalive(eventType),
    });

    if (!response.ok) {
      throw new Error(`Analytics API failed with status ${response.status}`);
    }

    const result = (await response.json()) as TrackingApiResponse;
    storeNamedAttribution(result.attribution);

    if (process.env.NODE_ENV === 'development') console.log('✅ Analytics event tracked successfully!', eventType);
  } catch (error) {
    console.error('❌ Analytics error:', error);
    try {
      const attribution = getAttributionContext();
      await insertFallbackAnalyticsEvent({
        pageId,
        eventType,
        eventData,
        userId,
        visitorId: getVisitorId(attribution),
        sessionId: getSessionId(),
        attribution,
      });
    } catch (fallbackError) {
      console.error('❌ Analytics fallback error:', fallbackError);
    }
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
