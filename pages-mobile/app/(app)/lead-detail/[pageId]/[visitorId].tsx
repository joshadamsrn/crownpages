import AppHeader from '@/components/common/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../../utils/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: any;
  visitor_id: string | null;
  created_at: string;
  page_id: string;
}

interface TrackerLink {
  id: string;
  name: string;
  description: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MEANINGFUL_EVENT_TYPES = new Set([
  'phone_click', 'email_click', 'link_click', 'button_click',
  'media_click', 'photo_click', 'video_click', 'contact_open',
  'social_click', 'website_click', 'address_click', 'save_contact',
]);

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
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.length > 30 ? url.slice(0, 30) + '…' : url;
  }
}

function formatEventLabel(eventType: string, eventData: any): string {
  const d = eventData || {};

  switch (eventType) {
    case 'page_view': return 'Viewed page';
    case 'page_exit': return 'Left page';
    case 'phone_click': {
      const num = d.phone_number || d.phone || '';
      return num ? `Called (${num})` : 'Clicked Call';
    }
    case 'email_click': {
      const addr = d.email_address || d.email || '';
      return addr ? `Emailed (${addr})` : 'Clicked Email';
    }
    case 'address_click': return 'Opened Directions';
    case 'link_click': {
      const title = d.link_title || d.label || d.name || '';
      if (title) return `Clicked "${title}"`;
      if (d.url || d.href) return `Clicked ${extractDomain(d.url || d.href)}`;
      return 'Clicked a link';
    }
    case 'button_click': {
      const action = (d.action || '').toLowerCase();
      if (action === 'call' || action === 'phone') return 'Clicked Call';
      if (action === 'email') return 'Clicked Email';
      if (action === 'text' || action === 'sms') return 'Clicked Text';
      if (action === 'website' || action === 'url') {
        const url = d.url || d.website_url || d.href || '';
        return url ? `Clicked Website (${extractDomain(url)})` : 'Clicked Website';
      }
      if (['instagram', 'facebook', 'linkedin', 'twitter', 'x', 'tiktok', 'youtube', 'snapchat'].includes(action)) {
        return `Clicked ${cap(action)}`;
      }
      if (action === 'social') {
        const platform = d.platform || d.social_platform || '';
        return platform ? `Clicked ${cap(platform)}` : 'Clicked Social Link';
      }

      const label = d.label || d.button_label || d.text || d.title || '';
      if (label) return `Clicked "${label}"`;

      const url = d.url || d.href || d.website_url || '';
      if (url) return `Clicked ${extractDomain(url)}`;

      const section = d.section_type || d.section || '';
      const sectionMap: Record<string, string> = {
        about: 'Clicked About',
        amenities: 'Clicked Amenities',
        contact: 'Opened Contact',
        personalContact: 'Opened Contact',
        multiContact: 'Opened Contact',
        medicalProvider: 'Opened Contact',
        hero: 'Clicked Hero Button',
        cta: 'Clicked Call to Action',
        features: 'Clicked Features',
        gallery: 'Clicked Gallery',
        socialLinks: 'Clicked Social Links',
        linksWithContact: 'Clicked a Link',
        faq: 'Expanded FAQ',
      };
      if (section && sectionMap[section]) return sectionMap[section];
      if (section) return `Clicked ${cap(section)}`;

      return 'Tapped a button';
    }
    case 'social_click': {
      const platform = cap(d.social_platform || d.platform || '');
      const handle = d.handle || '';
      return platform
        ? `Clicked ${platform}${handle ? ` (@${handle})` : ''}`
        : 'Clicked Social Link';
    }
    case 'website_click': {
      const url = d.website_url || d.url || '';
      return url ? `Clicked Website (${extractDomain(url)})` : 'Clicked Website';
    }
    case 'contact_open': return 'Opened contact section';
    case 'save_contact': return 'Saved your contact';
    case 'share': return 'Shared this page';
    case 'download': {
      const name = d.file_name || d.name || '';
      return name ? `Downloaded "${name}"` : 'Downloaded a file';
    }
    case 'media_click': {
      const title = d.title || d.name || '';
      return title ? `Viewed media "${title}"` : 'Viewed media';
    }
    case 'photo_click': return 'Viewed a photo';
    case 'video_click': {
      const title = d.title || d.name || '';
      return title ? `Played video "${title}"` : 'Played a video';
    }
    default:
      return eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'page_view': return 'eye-outline';
    case 'page_exit': return 'exit-outline';
    case 'phone_click': return 'call-outline';
    case 'email_click': return 'mail-outline';
    case 'address_click': return 'location-outline';
    case 'link_click': return 'link-outline';
    case 'button_click': return 'radio-button-on-outline';
    case 'social_click': return 'share-social-outline';
    case 'contact_open': return 'person-outline';
    case 'save_contact': return 'person-add-outline';
    case 'share': return 'share-outline';
    case 'download': return 'download-outline';
    case 'media_click':
    case 'photo_click':
    case 'video_click': return 'image-outline';
    default: return 'analytics-outline';
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeadDetailScreen() {
  const { pageId, visitorId, name: nameParam } = useLocalSearchParams<{ pageId: string; visitorId: string; name?: string }>();

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [trackerLink, setTrackerLink] = useState<TrackerLink | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (pageId && visitorId) {
        loadData();
      }
    }, [pageId, visitorId])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      // All events for this visitor on this page
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('id, event_type, event_data, visitor_id, created_at, page_id')
        .eq('page_id', pageId)
        .eq('visitor_id', visitorId)
        .order('created_at', { ascending: false });

      setEvents(eventsData || []);

      // Primary: check event_data.tracking_code stored directly on the visitor's events
      const trackingCodeFromEvent = (eventsData || []).find(
        (e: any) => e.event_data?.tracking_code
      )?.event_data?.tracking_code;

      if (trackingCodeFromEvent) {
        const { data: linkData } = await supabase
          .from('trackable_links')
          .select('id, name, description')
          .eq('tracking_code', trackingCodeFromEvent)
          .neq('utm_source', 'qr_code')
          .maybeSingle();
        setTrackerLink(linkData || null);
      } else {
        // Fallback: match via trackable_link_events (older events)
        const { data: tleData } = await supabase
          .from('trackable_link_events')
          .select('trackable_link_id')
          .eq('visitor_id', visitorId)
          .limit(1)
          .maybeSingle();

        if (tleData?.trackable_link_id) {
          const { data: linkData } = await supabase
            .from('trackable_links')
            .select('id, name, description')
            .eq('id', tleData.trackable_link_id)
            .maybeSingle();
          setTrackerLink(linkData || null);
        }
      }
    } catch (err) {
      console.error('LeadDetail load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const meaningful = events.filter((e) => MEANINGFUL_EVENT_TYPES.has(e.event_type)).length;
    const isHot = meaningful >= 3;
    const isContacted = events.some((e) => CONTACT_EVENT_TYPES.has(e.event_type));

    const breakdown = [
      { label: 'Page Views', icon: 'eye-outline', value: events.filter((e) => e.event_type === 'page_view').length, color: '#007AFF' },
      { label: 'Calls', icon: 'call-outline', value: events.filter((e) => e.event_type === 'phone_click').length, color: '#34C759' },
      { label: 'Emails', icon: 'mail-outline', value: events.filter((e) => e.event_type === 'email_click').length, color: '#007AFF' },
      { label: 'Photos / Videos', icon: 'image-outline', value: events.filter((e) => ['media_click', 'photo_click', 'video_click'].includes(e.event_type)).length, color: '#AF52DE' },
      { label: 'Social / Links', icon: 'share-social-outline', value: events.filter((e) => ['social_click', 'link_click', 'website_click'].includes(e.event_type)).length, color: '#FF9500' },
      { label: 'Contact Opens', icon: 'person-outline', value: events.filter((e) => ['contact_open', 'save_contact'].includes(e.event_type)).length, color: '#FF6B35' },
    ];

    return { meaningful, isHot, isContacted, breakdown };
  }, [events]);

  // nameParam (passed from the leads list) takes priority — it reflects the context
  // Parker clicked on (e.g. "Austin"). The DB lookup may return a different name if
  // the same device later visited via a different trackable link.
  const prioritizedName = (nameParam as string) || trackerLink?.name || null;
  const displayName = prioritizedName || 'Unknown User';
  const initials = prioritizedName
    ? prioritizedName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
        <AppHeader title="Lead Profile" />
        <View style={[styles.loadingWrap, { backgroundColor: '#f4f6f9' }]}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]} edges={['top']}>
      <AppHeader title="Lead Profile" />
      <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: '#f4f6f9' }}>

        {/* ── Identity Card ── */}
        <View style={styles.identityCard}>
          <View style={[styles.avatar, { backgroundColor: stats.isHot ? '#FF6B35' : '#6B7280' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.identityName}>{displayName}</Text>
            {trackerLink?.description && (
              <Text style={styles.identityRole}>{trackerLink.description}</Text>
            )}
            <View style={styles.badgeRow}>
              {stats.isHot ? (
                <View style={styles.hotBadge}>
                  <Ionicons name="flame" size={11} color="#fff" />
                  <Text style={styles.hotBadgeText}>Hot Lead</Text>
                </View>
              ) : stats.isContacted ? (
                <View style={styles.contactedBadge}>
                  <Text style={styles.contactedBadgeText}>Contacted</Text>
                </View>
              ) : (
                <View style={styles.leadBadge}>
                  <Text style={styles.leadBadgeText}>Lead</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.identityStats}>
            <Text style={styles.identityStatValue}>{events.length}</Text>
            <Text style={styles.identityStatLabel}>Events</Text>
          </View>
        </View>

        {/* ── Engagement Breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Engagement Breakdown</Text>
          {stats.breakdown.map((item) => (
            <View key={item.label} style={styles.breakdownRow}>
              <Ionicons name={item.icon as any} size={16} color={item.color} style={{ marginRight: 10 }} />
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={[styles.breakdownValue, { color: item.value > 0 ? item.color : '#ccc' }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── All Actions ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Actions</Text>
          {events.length === 0 ? (
            <Text style={styles.noEvents}>No events recorded yet.</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View style={[styles.eventIconWrap, { backgroundColor: '#f5f5f5' }]}>
                  <Ionicons name={getEventIcon(event.event_type) as any} size={14} color="#555" />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventLabel}>{formatEventLabel(event.event_type, event.event_data)}</Text>
                </View>
                <Text style={styles.eventTime}>{timeAgo(event.created_at)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  identityCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  identityInfo: {
    flex: 1,
  },
  identityName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },
  identityRole: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  contactedBadge: {
    backgroundColor: '#E8F7EE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  contactedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#28a745',
  },
  leadBadge: {
    backgroundColor: '#F0F4FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  leadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#5856D6',
  },
  identityStats: {
    alignItems: 'center',
  },
  identityStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  identityStatLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 10,
  },
  eventIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventLabel: {
    fontSize: 13,
    color: '#333',
  },
  eventTime: {
    fontSize: 11,
    color: '#aaa',
  },
  noEvents: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
