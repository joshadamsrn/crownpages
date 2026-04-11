import type { Database } from '../database.types';
import { supabase } from './supabase';

type TrackableLink = Database['public']['Tables']['trackable_links']['Row'];
type TrackableLinkInsert = Database['public']['Tables']['trackable_links']['Insert'];
type TrackableLinkUpdate = Database['public']['Tables']['trackable_links']['Update'];
type TrackableLinkEvent = Database['public']['Tables']['trackable_link_events']['Row'];
type TrackableLinkEventInsert = Database['public']['Tables']['trackable_link_events']['Insert'];

// Detailed trackable link with related data
export interface TrackableLinkWithDetails extends TrackableLink {
  page?: Database['public']['Tables']['pages']['Row'] & {
    business: Database['public']['Tables']['businesses']['Row'];
  };
  business_page?: Database['public']['Tables']['business_pages']['Row'] & {
    business: Database['public']['Tables']['businesses']['Row'];
  };
}

export interface CreateTrackableLinkParams {
  name: string;
  description?: string;
  pageId?: string;
  businessPageId?: string;
  
  // Access control
  password?: string;
  expiresAt?: Date;
  maxClicks?: number;
  
  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  
  // Behavior settings
  redirectDelay?: number;
  showPreview?: boolean;
  collectEmail?: boolean;
}

export interface TrackableLinkAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  clickThroughRate: number;
  topCountries: Array<{ country: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  dailyClicks: Array<{ date: string; clicks: number }>;
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
    unknown: number;
  };
  browserBreakdown: Array<{ browser: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; clicks: number }>;
}

// Generate URL variations for a trackable link
export function generateTrackableUrls(
  trackingCode: string,
  originalUrl?: string,
  businessSlug?: string,
  pageSlug?: string
): {
  shortUrl: string;
  trackedUrl: string;
  originalUrl: string;
} {
  const baseUrl = 'https://crownpages.com'; // Always use production URL for sharing

  const shortUrl = `${baseUrl}/t/${trackingCode}`;
  
  let trackedUrl = shortUrl;
  let resolvedOriginalUrl = originalUrl || '';

  // If we have business and page slugs, create the tracked business URL
  if (businessSlug && pageSlug) {
    resolvedOriginalUrl = `${baseUrl}/${businessSlug}/${pageSlug}`;
    trackedUrl = `${baseUrl}/${businessSlug}/${pageSlug}?track=${trackingCode}`;
  } else if (businessSlug) {
    // Business page URL
    resolvedOriginalUrl = `${baseUrl}/${businessSlug}`;
    trackedUrl = `${baseUrl}/${businessSlug}?track=${trackingCode}`;
  }

  return {
    shortUrl,
    trackedUrl,
    originalUrl: resolvedOriginalUrl,
  };
}

// Simple password hashing for mobile
async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use expo-crypto or similar
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Create a new trackable link
export async function createTrackableLink(params: CreateTrackableLinkParams): Promise<TrackableLink | null> {
  // Validate that either pageId or businessPageId is provided
  if (!params.pageId && !params.businessPageId) {
    throw new Error('Either pageId or businessPageId must be provided');
  }

  if (params.pageId && params.businessPageId) {
    throw new Error('Cannot provide both pageId and businessPageId');
  }

  // Get current user ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const insertData: TrackableLinkInsert = {
    name: params.name,
    description: params.description,
    page_id: params.pageId || null,
    business_page_id: params.businessPageId || null,
    created_by: user.id,
    password_hash: params.password ? await hashPassword(params.password) : null,
    expires_at: params.expiresAt?.toISOString() || null,
    max_clicks: params.maxClicks || null,
    utm_source: params.utmSource || null,
    utm_medium: params.utmMedium || null,
    utm_campaign: params.utmCampaign || null,
    utm_term: params.utmTerm || null,
    utm_content: params.utmContent || null,
    redirect_delay: params.redirectDelay || 0,
    show_preview: params.showPreview || false,
    collect_email: params.collectEmail || false,
  };

  const { data, error } = await supabase
    .from('trackable_links')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating trackable link:', error);
    throw new Error(error.message || 'Failed to create trackable link');
  }

  return data;
}

// Get trackable links for a user
export async function getUserTrackableLinks(): Promise<TrackableLinkWithDetails[]> {
  const { data, error } = await supabase
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
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trackable links:', error);
    return [];
  }

  return data as TrackableLinkWithDetails[];
}

// Get trackable links for a specific page
export async function getPageTrackableLinks(pageId: string): Promise<TrackableLinkWithDetails[]> {
  const { data, error } = await supabase
    .from('trackable_links')
    .select(`
      *,
      page:pages(
        *,
        business:businesses(*)
      )
    `)
    .eq('page_id', pageId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching page trackable links:', error);
    return [];
  }

  return data as TrackableLinkWithDetails[];
}

// Get trackable links for a specific business page
export async function getBusinessPageTrackableLinks(businessPageId: string): Promise<TrackableLinkWithDetails[]> {
  const { data, error } = await supabase
    .from('trackable_links')
    .select(`
      *,
      business_page:business_pages(
        *,
        business:businesses(*)
      )
    `)
    .eq('business_page_id', businessPageId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching business page trackable links:', error);
    return [];
  }

  return data as TrackableLinkWithDetails[];
}

// Update a trackable link
export async function updateTrackableLink(
  linkId: string, 
  updates: TrackableLinkUpdate
): Promise<TrackableLink | null> {
  const { data, error } = await supabase
    .from('trackable_links')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkId)
    .select()
    .single();

  if (error) {
    console.error('Error updating trackable link:', error);
    return null;
  }

  return data;
}

// Delete a trackable link (soft delete)
export async function deleteTrackableLink(linkId: string): Promise<boolean> {
  const { error } = await supabase
    .from('trackable_links')
    .update({ 
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkId);

  if (error) {
    console.error('Error deleting trackable link:', error);
    return false;
  }

  return true;
}

// Get a trackable link by tracking code (for public access)
export async function getTrackableLinkByCode(trackingCode: string): Promise<TrackableLinkWithDetails | null> {
  const { data, error } = await supabase
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

  if (error || !data) {
    return null;
  }

  // Check if link has expired
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check if max clicks exceeded
  if (data.max_clicks && data.click_count && data.click_count >= data.max_clicks) {
    return null;
  }

  return data as TrackableLinkWithDetails;
}

// Track a view event (simplified for mobile)
export async function trackLinkView(
  trackableLinkId: string,
  additionalData: Partial<TrackableLinkEventInsert> = {}
): Promise<boolean> {
  try {
    // Generate visitor ID for this session
    const visitorId = `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const eventData: TrackableLinkEventInsert = {
      trackable_link_id: trackableLinkId,
      event_type: 'view',
      visitor_id: visitorId,
      session_id: sessionId,
      device_type: 'mobile', // Always mobile for React Native app
      event_data: {},
      ...additionalData,
    };

    const { error } = await supabase
      .from('trackable_link_events')
      .insert(eventData);

    if (error) {
      console.error('Error tracking link view:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in trackLinkView:', error);
    return false;
  }
}

// Get analytics for a trackable link
export async function getTrackableLinkAnalytics(
  linkId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TrackableLinkAnalytics | null> {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const end = endDate || new Date();

  const { data, error } = await supabase
    .from('trackable_link_events')
    .select('*')
    .eq('trackable_link_id', linkId)
    .eq('event_type', 'view')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());

  if (error) {
    console.error('Error fetching trackable link analytics:', error);
    return null;
  }

  const events = data || [];

  // Calculate analytics
  const totalViews = events.length;
  const uniqueViews = new Set(events.map(e => e.visitor_id)).size;
  
  // Group by country
  const countryMap = new Map<string, number>();
  events.forEach(event => {
    if (event.country) {
      countryMap.set(event.country, (countryMap.get(event.country) || 0) + 1);
    }
  });
  
  // Group by referrer
  const referrerMap = new Map<string, number>();
  events.forEach(event => {
    if (event.referrer) {
      referrerMap.set(event.referrer, (referrerMap.get(event.referrer) || 0) + 1);
    }
  });
  
  // Group by date
  const dailyMap = new Map<string, number>();
  events.forEach(event => {
    const date = new Date(event.created_at!).toISOString().split('T')[0];
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });
  
  // Device breakdown
  const deviceBreakdown = {
    mobile: events.filter(e => e.device_type === 'mobile').length,
    tablet: events.filter(e => e.device_type === 'tablet').length,
    desktop: events.filter(e => e.device_type === 'desktop').length,
    unknown: events.filter(e => !e.device_type || e.device_type === 'unknown').length,
  };
  
  // Browser breakdown
  const browserMap = new Map<string, number>();
  events.forEach(event => {
    if (event.browser) {
      browserMap.set(event.browser, (browserMap.get(event.browser) || 0) + 1);
    }
  });
  
  // Hourly distribution
  const hourlyMap = new Map<number, number>();
  events.forEach(event => {
    const hour = new Date(event.created_at!).getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  });

  return {
    totalClicks: totalViews, // Keep old property name for backward compatibility  
    uniqueClicks: uniqueViews, // Keep old property name for backward compatibility
    clickThroughRate: uniqueViews > 0 ? (totalViews / uniqueViews) * 100 : 0,
    topCountries: Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topReferrers: Array.from(referrerMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    dailyClicks: Array.from(dailyMap.entries())
      .map(([date, clicks]) => ({ date, clicks })) // Keep 'clicks' for backward compatibility
      .sort((a, b) => a.date.localeCompare(b.date)),
    deviceBreakdown,
    browserBreakdown: Array.from(browserMap.entries())
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    hourlyDistribution: Array.from(hourlyMap.entries())
      .map(([hour, clicks]) => ({ hour, clicks })) // Keep 'clicks' for backward compatibility
      .sort((a, b) => a.hour - b.hour),
  };
}

// Verify password
export async function verifyTrackableLinkPassword(
  linkId: string, 
  password: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('trackable_links')
    .select('password_hash')
    .eq('id', linkId)
    .single();

  if (error || !data?.password_hash) {
    return false;
  }

  const hashedInput = await hashPassword(password);
  return hashedInput === data.password_hash;
}
