import AppHeader from '@/components/common/AppHeader';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  event_type: string;
  event_data: any;
  visitor_id: string | null;
  created_at: string;
  page_id: string;
}

interface TrackableLinkRow {
  id: string;
  name: string;
  page_id: string | null;
  utm_source: string | null;
  tracking_code: string | null;
}

interface TrackableLinkEvent {
  trackable_link_id: string;
  visitor_id: string | null;
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
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AllLeadsScreen() {
  const { pageIds: pageIdsParam } = useLocalSearchParams<{ pageIds: string }>();
  const pageIds: string[] = useMemo(() => {
    try { return JSON.parse(pageIdsParam || '[]'); } catch { return []; }
  }, [pageIdsParam]);

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [trackerLinks, setTrackerLinks] = useState<TrackableLinkRow[]>([]);
  const [trackerLinkEvents, setTrackerLinkEvents] = useState<TrackableLinkEvent[]>([]);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (pageIds.length > 0) fetchAll();
    }, [pageIds.join(',')])
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [eventsRes, linksRes] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('event_type, event_data, visitor_id, created_at, page_id')
          .in('page_id', pageIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('trackable_links')
          .select('id, name, page_id, utm_source, tracking_code')
          .in('page_id', pageIds)
          .eq('is_active', true),
      ]);

      const links: TrackableLinkRow[] = linksRes.data || [];
      setTrackerLinks(links);
      setEvents(eventsRes.data || []);

      if (links.length > 0) {
        const { data: tleData } = await supabase
          .from('trackable_link_events')
          .select('trackable_link_id, visitor_id')
          .in('trackable_link_id', links.map((l) => l.id));
        setTrackerLinkEvents(tleData || []);
      } else {
        setTrackerLinkEvents([]);
      }
    } catch (err) {
      console.error('AllLeads fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── Visitor Name Map ────────────────────────────────────────────────────

  const visitorNameMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const e of events) {
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
  }, [events, trackerLinks, trackerLinkEvents]);

  // ─── Leads List ──────────────────────────────────────────────────────────

  const allLeads = useMemo(() => {
    const meaningfulByVisitor: Record<string, number> = {};
    const contactedVisitors = new Set<string>();
    const lastSeenByVisitor: Record<string, string> = {};
    const pageByVisitor: Record<string, string> = {};

    for (const e of events) {
      if (!e.visitor_id) continue;
      if (MEANINGFUL_EVENT_TYPES.has(e.event_type)) {
        meaningfulByVisitor[e.visitor_id] = (meaningfulByVisitor[e.visitor_id] || 0) + 1;
      }
      if (CONTACT_EVENT_TYPES.has(e.event_type)) contactedVisitors.add(e.visitor_id);
      if (!lastSeenByVisitor[e.visitor_id] || e.created_at > lastSeenByVisitor[e.visitor_id]) {
        lastSeenByVisitor[e.visitor_id] = e.created_at;
        pageByVisitor[e.visitor_id] = e.page_id;
      }
    }

    const allVisitorIds = new Set(events.map((e) => e.visitor_id).filter(Boolean) as string[]);

    return Array.from(allVisitorIds)
      .map((visitorId) => {
        const meaningful = meaningfulByVisitor[visitorId] || 0;
        const isHot = meaningful >= 3;
        return {
          visitorId,
          name: visitorNameMap[visitorId] || null,
          meaningful,
          isHot,
          isContacted: contactedVisitors.has(visitorId),
          lastSeen: lastSeenByVisitor[visitorId] || '',
          pageId: pageByVisitor[visitorId] || pageIds[0],
        };
      })
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [events, visitorNameMap, pageIds]);

  const filteredLeads = useMemo(() => {
    if (!search.trim()) return allLeads;
    const q = search.toLowerCase();
    return allLeads.filter((l) => (l.name || 'unknown user').toLowerCase().includes(q));
  }, [allLeads, search]);

  // ─── Render ──────────────────────────────────────────────────────────────

  const LeadAvatar = ({ name, isHot }: { name: string | null; isHot: boolean }) => {
    const initials = name ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
    return (
      <View style={[styles.avatar, { backgroundColor: isHot ? '#FF6B35' : '#6B7280' }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader title={`All Leads (${allLeads.length})`} />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search leads..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : filteredLeads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>{search ? 'No matching leads' : 'No leads yet'}</Text>
          <Text style={styles.emptySub}>
            {search ? 'Try a different search term' : 'Leads appear when visitors engage with your page'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {/* Summary row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{allLeads.filter((l) => l.isHot).length}</Text>
              <Text style={styles.summaryLabel}>Hot Leads</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{allLeads.filter((l) => !l.isHot).length}</Text>
              <Text style={styles.summaryLabel}>Leads</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryNum}>{allLeads.filter((l) => l.isContacted).length}</Text>
              <Text style={styles.summaryLabel}>Contacted</Text>
            </View>
          </View>

          {filteredLeads.map((lead) => (
            <TouchableOpacity
              key={lead.visitorId}
              style={styles.leadRow}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/(app)/lead-detail/[pageId]/[visitorId]' as any,
                params: { pageId: lead.pageId, visitorId: lead.visitorId },
              })}
            >
              <LeadAvatar name={lead.name} isHot={lead.isHot} />
              <View style={styles.leadInfo}>
                <Text style={styles.leadName}>{lead.name || 'Unknown User'}</Text>
                <Text style={styles.leadMeta}>
                  {lead.isContacted
                    ? 'Contacted'
                    : `${lead.meaningful} interaction${lead.meaningful !== 1 ? 's' : ''}`}
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
              <Ionicons name="chevron-forward" size={16} color="#ccc" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f2f7', gap: 8, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#666' },
  emptySub: { fontSize: 13, color: '#bbb', textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#000' },

  list: { backgroundColor: '#f2f2f7', paddingTop: 8 },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryNum: { fontSize: 20, fontWeight: '700', color: '#000' },
  summaryLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  leadInfo: { flex: 1 },
  leadName: { fontSize: 15, fontWeight: '600', color: '#000' },
  leadMeta: { fontSize: 12, color: '#888', marginTop: 2 },
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
});
