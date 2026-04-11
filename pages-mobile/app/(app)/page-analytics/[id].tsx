import AppHeader from '@/components/common/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../utils/supabase';

const { width: screenWidth } = Dimensions.get('window');
const BREAKDOWN_LEFT_WIDTH = 175;
const BAR_MAX_WIDTH = screenWidth - 32 - 32 - BREAKDOWN_LEFT_WIDTH - 8 - 30 - 8;

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: any;
  visitor_id: string | null;
  created_at: string;
  page_id: string;
}

interface TrackableLinkRow {
  id: string;
  name: string;
  description: string | null;
  page_id: string | null;
  utm_source: string | null;
  tracking_code: string | null;
}

interface TrackableLinkEvent {
  trackable_link_id: string;
  visitor_id: string | null;
  created_at: string;
}

type VisitorNameMap = Record<string, string>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEANINGFUL_EVENT_TYPES = new Set([
  'phone_click', 'email_click', 'link_click', 'button_click',
  'media_click', 'photo_click', 'video_click', 'contact_open',
  'social_click', 'website_click', 'address_click', 'save_contact',
]);

// Contacted = call + email only (per spec)
const CONTACT_EVENT_TYPES = new Set([
  'phone_click', 'email_click',
]);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractDomain(url: string): string {
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function formatEventLabel(eventType: string, eventData: any): string {
  const d = eventData || {};
  switch (eventType) {
    case 'page_view': return 'Viewed page';
    case 'page_exit': return 'Left page';
    case 'share': return 'Shared page';
    case 'phone_click': {
      const num = d.phone_number || d.value || d.label || '';
      return num ? `Called ${num}` : 'Clicked Call';
    }
    case 'email_click': {
      const email = d.email || d.value || d.label || '';
      return email ? `Emailed ${email}` : 'Clicked Email';
    }
    case 'address_click': return 'Clicked Address / Map';
    case 'contact_open': return 'Opened Contact Section';
    case 'save_contact': return 'Saved Contact';
    case 'social_click': {
      const platform = cap(d.platform || '');
      const handle = d.handle || d.username || d.button_text || '';
      if (platform && handle) return `Clicked ${platform} (${handle})`;
      if (platform) return `Clicked ${platform}`;
      return 'Clicked Social Link';
    }
    case 'website_click': {
      const url = d.url || d.href || '';
      return url ? `Clicked Website (${extractDomain(url)})` : 'Clicked Website';
    }
    case 'link_click': {
      const label = d.label || d.text || d.title || '';
      const url = d.url || d.href || '';
      if (label) return `Clicked '${label}'`;
      if (url) return `Clicked ${extractDomain(url)}`;
      return 'Clicked Link';
    }
    case 'media_click': return 'Viewed Media';
    case 'photo_click': return 'Viewed Photo';
    case 'video_click': {
      const title = d.title || d.label || '';
      return title ? `Played Video (${title})` : 'Played Video';
    }
    case 'download': {
      const name = d.file_name || d.name || d.label || '';
      return name ? `Downloaded ${name}` : 'Downloaded File';
    }
    case 'button_click': {
      const action = (d.action || '').toLowerCase();
      const label = d.label || d.button_text || d.text || '';
      const sectionType = d.section_type || d.section || '';

      if (action === 'read_more' || action === 'read more') return 'Read More (About)';
      if (action === 'show_more' || action === 'show more') return 'Show More (Amenities)';
      if (action === 'call' || sectionType === 'phone') return 'Clicked Call';
      if (action === 'email' || sectionType === 'email') return 'Clicked Email';
      if (action === 'website' || sectionType === 'website') {
        const url = d.url || d.href || '';
        return url ? `Clicked Website (${extractDomain(url)})` : 'Clicked Website';
      }
      if (sectionType === 'about') return 'Read More (About)';
      if (sectionType === 'amenities') return 'Viewed Amenities';
      if (sectionType === 'socialLinks') {
        const platform = cap(d.platform || '');
        return platform ? `Clicked ${platform}` : 'Clicked Social Link';
      }

      const platform = cap(d.platform || '');
      if (platform) return `Clicked ${platform}`;
      if (label) return `Clicked '${label}'`;
      return 'Clicked Button';
    }
    default: return cap(eventType.replace(/_/g, ' '));
  }
}

function getEventIcon(eventType: string): string {
  const map: Record<string, string> = {
    page_view: 'eye-outline',
    page_exit: 'exit-outline',
    share: 'share-outline',
    phone_click: 'call-outline',
    email_click: 'mail-outline',
    address_click: 'location-outline',
    contact_open: 'person-circle-outline',
    save_contact: 'person-add-outline',
    social_click: 'share-social-outline',
    website_click: 'globe-outline',
    link_click: 'link-outline',
    media_click: 'image-outline',
    photo_click: 'camera-outline',
    video_click: 'videocam-outline',
    download: 'download-outline',
    button_click: 'radio-button-on-outline',
  };
  return map[eventType] || 'analytics-outline';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PageAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pageTitle, setPageTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d');
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [recentActivity, setRecentActivity] = useState<AnalyticsEvent[]>([]);
  const [trackerLinks, setTrackerLinks] = useState<TrackableLinkRow[]>([]);
  const [trackerLinkEvents, setTrackerLinkEvents] = useState<TrackableLinkEvent[]>([]);
  const [qrScanCount, setQrScanCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (id) fetchAll(timeRange);
    }, [id, timeRange])
  );

  const fetchAll = async (range: '1d' | '7d' | '30d' | '90d') => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      switch (range) {
        case '1d': start.setDate(end.getDate() - 1); break;
        case '7d': start.setDate(end.getDate() - 7); break;
        case '30d': start.setDate(end.getDate() - 30); break;
        case '90d': start.setDate(end.getDate() - 90); break;
      }

      const [pageRes, eventsRes, recentRes, linksRes] = await Promise.all([
        supabase.from('pages').select('title').eq('id', id).single(),
        supabase
          .from('analytics_events')
          .select('id, event_type, event_data, visitor_id, created_at, page_id')
          .eq('page_id', id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('analytics_events')
          .select('id, event_type, event_data, visitor_id, created_at, page_id')
          .eq('page_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('trackable_links')
          .select('id, name, description, page_id, utm_source, tracking_code')
          .eq('page_id', id)
          .eq('is_active', true),
      ]);

      if (pageRes.data?.title) setPageTitle(pageRes.data.title);
      setAnalyticsEvents(eventsRes.data || []);
      setRecentActivity(recentRes.data || []);

      const links: TrackableLinkRow[] = linksRes.data || [];
      setTrackerLinks(links);

      const qrIds = links.filter((l) => l.utm_source === 'qr_code').map((l) => l.id);
      if (qrIds.length > 0) {
        const { count } = await supabase
          .from('trackable_link_events')
          .select('id', { count: 'exact', head: true })
          .in('trackable_link_id', qrIds)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        setQrScanCount(count || 0);
      } else {
        setQrScanCount(0);
      }

      if (links.length > 0) {
        const { data: tleData } = await supabase
          .from('trackable_link_events')
          .select('trackable_link_id, visitor_id, created_at')
          .in('trackable_link_id', links.map((l) => l.id))
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        setTrackerLinkEvents(tleData || []);
      } else {
        setTrackerLinkEvents([]);
      }
    } catch (err) {
      console.error('Error fetching page analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Visitor Name Map ────────────────────────────────────────────────────

  const visitorNameMap = useMemo<VisitorNameMap>(() => {
    const map: VisitorNameMap = {};
    for (const e of analyticsEvents) {
      if (e.visitor_id && e.event_data?.tracking_code) {
        const link = trackerLinks.find(
          (l) => l.tracking_code === e.event_data.tracking_code && l.utm_source !== 'qr_code'
        );
        if (link) map[e.visitor_id] = link.name;
      }
    }
    for (const tle of trackerLinkEvents) {
      if (tle.visitor_id && !map[tle.visitor_id]) {
        const link = trackerLinks.find((l) => l.id === tle.trackable_link_id && l.utm_source !== 'qr_code');
        if (link) map[tle.visitor_id] = link.name;
      }
    }
    return map;
  }, [analyticsEvents, trackerLinks, trackerLinkEvents]);

  // ─── Computed Metrics ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const views = analyticsEvents.filter((e) => e.event_type === 'page_view').length;
    const meaningfulByVisitor: Record<string, number> = {};
    for (const e of analyticsEvents) {
      if (e.visitor_id && MEANINGFUL_EVENT_TYPES.has(e.event_type)) {
        meaningfulByVisitor[e.visitor_id] = (meaningfulByVisitor[e.visitor_id] || 0) + 1;
      }
    }
    const hotLeadVisitors = new Set(
      Object.entries(meaningfulByVisitor).filter(([, c]) => c >= 3).map(([id]) => id)
    );
    const hotLeads = hotLeadVisitors.size;

    // Leads: unique visitors who are NOT hot leads (status is mutually exclusive)
    const allVisitors = new Set(analyticsEvents.map((e) => e.visitor_id).filter(Boolean) as string[]);
    const leads = allVisitors.size - hotLeads;

    const contacted = analyticsEvents.filter((e) => CONTACT_EVENT_TYPES.has(e.event_type)).length;

    const actions = analyticsEvents.filter((e) => e.event_type !== 'page_view' && e.event_type !== 'page_exit').length;

    const exitEvents = analyticsEvents.filter((e) => e.event_type === 'page_exit' && e.event_data?.time_on_page > 0);
    const avgTimeSeconds = exitEvents.length > 0
      ? Math.round(exitEvents.reduce((s, e) => s + (e.event_data?.time_on_page || 0), 0) / exitEvents.length)
      : null;
    const avgTimeStr = avgTimeSeconds
      ? avgTimeSeconds >= 60 ? `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s` : `${avgTimeSeconds}s`
      : '—';

    const shares = analyticsEvents.filter((e) => e.event_type === 'share').length;

    return { views, leads, hotLeads, contacted, actions, avgTimeStr, shares };
  }, [analyticsEvents]);

  const engagementBreakdown = useMemo(() => {
    const mediaEngagement = analyticsEvents.filter((e) =>
      ['link_click', 'social_click', 'website_click'].includes(e.event_type) ||
      (e.event_type === 'button_click' && e.event_data?.section_type === 'socialLinks')
    ).length;
    const calls = analyticsEvents.filter((e) => e.event_type === 'phone_click').length;
    const emails = analyticsEvents.filter((e) => e.event_type === 'email_click').length;
    const photoVideo = analyticsEvents.filter((e) => ['media_click', 'photo_click', 'video_click'].includes(e.event_type)).length;
    const about = analyticsEvents.filter((e) =>
      e.event_type === 'button_click' && ['about'].includes(e.event_data?.section_type || e.event_data?.section || '')
    ).length;
    const amenities = analyticsEvents.filter((e) =>
      e.event_type === 'button_click' && ['amenities'].includes(e.event_data?.section_type || e.event_data?.section || '')
    ).length;
    const savedContacts = analyticsEvents.filter((e) =>
      e.event_type === 'save_contact' ||
      e.event_type === 'contact_open' ||
      (e.event_type === 'button_click' && ['contact', 'personalContact', 'multiContact', 'contact_card'].includes(e.event_data?.section_type || ''))
    ).length;

    return [
      { label: 'Media Engagement', icon: 'share-social-outline', value: mediaEngagement, color: '#FF9500' },
      { label: 'Calls', icon: 'call-outline', value: calls, color: '#34C759' },
      { label: 'Emails', icon: 'mail-outline', value: emails, color: '#007AFF' },
      { label: 'Photos / Videos', icon: 'image-outline', value: photoVideo, color: '#AF52DE' },
      { label: 'About Clicks', icon: 'information-circle-outline', value: about, color: '#5AC8FA' },
      { label: 'Amenities Clicks', icon: 'list-outline', value: amenities, color: '#FF2D55' },
      { label: 'Saved Contacts', icon: 'person-outline', value: savedContacts, color: '#4CD964' },
    ];
  }, [analyticsEvents]);

  const leadsList = useMemo(() => {
    const visitors = new Set(analyticsEvents.map((e) => e.visitor_id).filter(Boolean) as string[]);
    return Array.from(visitors).map((visitorId) => {
      const events = analyticsEvents.filter((e) => e.visitor_id === visitorId);
      const meaningful = events.filter((e) => MEANINGFUL_EVENT_TYPES.has(e.event_type)).length;
      const isHot = meaningful >= 3;
      const isContacted = events.some((e) => CONTACT_EVENT_TYPES.has(e.event_type));
      const lastSeen = events[0]?.created_at || '';
      const name = visitorNameMap[visitorId] || null;
      return { visitorId, name, meaningful, isHot, isContacted, lastSeen };
    }).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }, [analyticsEvents, visitorNameMap]);

  // ─── Sub-components ──────────────────────────────────────────────────────

  const MetricCard = ({ icon, title, value, color }: { icon: string; title: string; value: string | number; color: string }) => (
    <View style={[styles.metricCard, { width: metricCardWidth }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{title}</Text>
    </View>
  );

  const metricCardWidth = (screenWidth - 32 - 12) / 2;

  const LeadAvatar = ({ name, isHot }: { name: string | null; isHot: boolean }) => {
    const initials = name ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
    return (
      <View style={[styles.avatar, { backgroundColor: isHot ? '#FF6B35' : '#6B7280' }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppHeader title="Analytics" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={pageTitle ? `${pageTitle} — Stats` : 'Analytics'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Time Range Selector ── */}
        <View style={styles.timeRangeRow}>
          {(['1d', '7d', '30d', '90d'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.timeBtn, timeRange === r && styles.timeBtnActive]}
              onPress={() => setTimeRange(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeBtnText, timeRange === r && styles.timeBtnTextActive]}>
                {r === '1d' ? '1D' : r === '7d' ? '7D' : r === '30d' ? '30D' : '90D'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Primary Metrics Grid ── */}
        <View style={styles.metricsGrid}>
          <MetricCard icon="eye-outline" title="Views" value={metrics.views} color="#007AFF" />
          <MetricCard icon="people-outline" title="Leads" value={metrics.leads} color="#5856D6" />
          <MetricCard icon="flame-outline" title="Hot Leads" value={metrics.hotLeads} color="#FF6B35" />
          <MetricCard icon="call-outline" title="Contacted" value={metrics.contacted} color="#34C759" />
          <MetricCard icon="flash-outline" title="Actions" value={`${metrics.actions} Total`} color="#FF9500" />
          <MetricCard icon="share-outline" title="Shares" value={`${metrics.shares} Total`} color="#FF2D55" />
          <MetricCard icon="qr-code-outline" title="QR Scans" value={`${qrScanCount} Total`} color="#AF52DE" />
        </View>

        {/* ── Engagement Breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Engagement Breakdown</Text>
          {(() => {
            const total = engagementBreakdown.reduce((s, i) => s + i.value, 0);
            return engagementBreakdown.map((item) => {
              const pct = total > 0 ? item.value / total : 0;
              const barWidth = Math.max(0, Math.min(BAR_MAX_WIDTH, Math.round(BAR_MAX_WIDTH * pct)));
              return (
                <View key={item.label} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <Ionicons name={item.icon as any} size={14} color={item.color} style={{ marginRight: 6 }} />
                    <Text style={styles.breakdownLabel} numberOfLines={1}>{item.label}</Text>
                  </View>
                  <View style={styles.breakdownRight}>
                    <View style={styles.breakdownBarBg}>
                      <View style={[styles.breakdownBar, { width: barWidth, backgroundColor: item.color }]} />
                    </View>
                    <Text style={styles.breakdownValue}>{item.value}</Text>
                  </View>
                </View>
              );
            });
          })()}
        </View>

        {/* ── Leads ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Leads</Text>
            {leadsList.length > 0 && (
              <TouchableOpacity onPress={() => router.push({
                pathname: '/(app)/all-leads' as any,
                params: { pageIds: JSON.stringify([id as string]) },
              })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {leadsList.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="people-outline" size={32} color="#ccc" />
              <Text style={styles.emptySectionText}>No leads yet</Text>
              <Text style={styles.emptySectionSub}>Leads appear when visitors engage with your page</Text>
            </View>
          ) : (
            leadsList.slice(0, 8).map((lead) => (
              <TouchableOpacity
                key={lead.visitorId}
                style={styles.leadRow}
                activeOpacity={0.7}
                onPress={() => router.push({
                  pathname: '/(app)/lead-detail/[pageId]/[visitorId]' as any,
                  params: { pageId: id as string, visitorId: lead.visitorId },
                })}
              >
                <LeadAvatar name={lead.name} isHot={lead.isHot} />
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name || 'Unknown User'}</Text>
                  <Text style={styles.leadMeta}>
                    {lead.isContacted ? 'Contacted' : `${lead.meaningful} interaction${lead.meaningful !== 1 ? 's' : ''}`}
                  </Text>
                </View>
                <View style={styles.leadRight}>
                  {lead.isHot ? (
                    <View style={styles.hotBadge}>
                      <Ionicons name="flame" size={11} color="#fff" />
                      <Text style={styles.hotBadgeText}>Hot Lead</Text>
                    </View>
                  ) : lead.isContacted ? (
                    <View style={styles.contactedBadge}>
                      <Text style={styles.contactedBadgeText}>Contacted</Text>
                    </View>
                  ) : (
                    <View style={styles.leadBadge}>
                      <Text style={styles.leadBadgeText}>Lead</Text>
                    </View>
                  )}
                  <Text style={styles.leadTime}>{timeAgo(lead.lastSeen)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          {recentActivity.length === 0 ? (
            <View style={styles.emptySection}>
              <Ionicons name="analytics-outline" size={32} color="#ccc" />
              <Text style={styles.emptySectionText}>No activity yet</Text>
              <Text style={styles.emptySectionSub}>Activity appears as visitors interact with your page</Text>
            </View>
          ) : (
            recentActivity.map((event) => {
              const actor = event.visitor_id ? (visitorNameMap[event.visitor_id] || 'User') : 'User';
              const label = formatEventLabel(event.event_type, event.event_data);
              return (
                <View key={event.id} style={styles.activityRow}>
                  <View style={styles.activityIconWrap}>
                    <Ionicons name={getEventIcon(event.event_type) as any} size={14} color="#666" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      <Text style={{ fontWeight: '600' }}>{actor}</Text>
                      {' · '}
                      {label}
                    </Text>
                  </View>
                  <Text style={styles.activityTime}>{timeAgo(event.created_at)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const metricCardWidth = (screenWidth - 32 - 12) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  scrollContent: { backgroundColor: '#f2f2f7', paddingBottom: 32 },

  timeRangeRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f2f2f7',
  },
  timeBtnActive: { backgroundColor: '#000' },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: '#666' },
  timeBtnTextActive: { color: '#fff' },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  metricIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#000', marginBottom: 2 },
  metricLabel: { fontSize: 11, color: '#888', fontWeight: '500', textAlign: 'center' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  viewAllText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: BREAKDOWN_LEFT_WIDTH,
  },
  breakdownDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  breakdownLabel: { fontSize: 13, color: '#222', fontWeight: '500', flex: 1 },
  breakdownRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownBarBg: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' },
  breakdownBar: { height: 6, borderRadius: 3 },
  breakdownValue: { width: 30, fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'right' },

  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 10,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 14, fontWeight: '600', color: '#000' },
  leadMeta: { fontSize: 12, color: '#888', marginTop: 1 },
  leadRight: { alignItems: 'flex-end', gap: 4 },
  hotBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FF6B35', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  hotBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  contactedBadge: {
    backgroundColor: '#34C75915', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  contactedBadgeText: { fontSize: 11, fontWeight: '600', color: '#34C759' },
  leadBadge: {
    backgroundColor: '#5856D615', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  leadBadgeText: { fontSize: 11, fontWeight: '600', color: '#5856D6' },
  leadTime: { fontSize: 11, color: '#bbb' },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 8,
  },
  activityIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f2f2f7', justifyContent: 'center', alignItems: 'center',
  },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: '#333', lineHeight: 18 },
  activityTime: { fontSize: 11, color: '#bbb', marginTop: 2 },

  emptySection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptySectionText: { fontSize: 14, fontWeight: '500', color: '#888' },
  emptySectionSub: { fontSize: 12, color: '#bbb', textAlign: 'center' },
});
