import { supabase } from "@/utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

// card padding(16*2=32) + breakdownLeft(175) + gap(8) + valueWidth(30) + gap(8) + card margin(16*2=32)
const BREAKDOWN_LEFT_WIDTH = 175;
const BAR_MAX_WIDTH = screenWidth - 32 - 32 - BREAKDOWN_LEFT_WIDTH - 8 - 30 - 8;

// ─── Types ─────────────────────────────────────────────────────────────────

interface Page {
  id: string;
  title: string;
  isShared?: boolean;
}

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: any;
  visitor_id: string | null;
  session_id: string | null;
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

// Visitor ID → tracker name (from tracker links)
type VisitorNameMap = Record<string, string>;

// ─── Helpers ────────────────────────────────────────────────────────────────

const MEANINGFUL_EVENT_TYPES = new Set([
  "phone_click",
  "email_click",
  "link_click",
  "button_click",
  "media_click",
  "photo_click",
  "video_click",
  "contact_open",
  "social_click",
  "website_click",
  "address_click",
  "save_contact",
]);

// Contacted = call + email only (per spec)
const CONTACT_EVENT_TYPES = new Set([
  "phone_click",
  "email_click",
]);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
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
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 30 ? url.slice(0, 30) + "…" : url;
  }
}

function formatEventLabel(eventType: string, eventData: any): string {
  const d = eventData || {};

  switch (eventType) {
    case "page_view": return "Viewed page";
    case "page_exit": return "Left page";
    case "phone_click": {
      const num = d.phone_number || d.phone || "";
      return num ? `Called (${num})` : "Clicked Call";
    }
    case "email_click": {
      const addr = d.email_address || d.email || "";
      return addr ? `Emailed (${addr})` : "Clicked Email";
    }
    case "address_click": {
      const addr = d.address || "";
      return addr ? `Opened directions` : "Clicked Address";
    }
    case "link_click": {
      const title = d.link_title || d.label || d.name || "";
      if (title) return `Clicked "${title}"`;
      if (d.url || d.href) return `Clicked ${extractDomain(d.url || d.href)}`;
      return "Clicked a link";
    }
    case "button_click": {
      // Specific action field takes priority
      const action = (d.action || "").toLowerCase();
      if (action === "call" || action === "phone") return "Clicked Call";
      if (action === "email") return "Clicked Email";
      if (action === "text" || action === "sms") return "Clicked Text";
      if (action === "website" || action === "url") {
        const url = d.url || d.website_url || d.href || "";
        return url ? `Clicked Website (${extractDomain(url)})` : "Clicked Website";
      }
      if (["instagram", "facebook", "linkedin", "twitter", "x", "tiktok", "youtube", "snapchat"].includes(action)) {
        return `Clicked ${cap(action)}`;
      }
      if (action === "social") {
        const platform = d.platform || d.social_platform || "";
        return platform ? `Clicked ${cap(platform)}` : "Clicked Social Link";
      }

      // Named label / button text
      const label = d.label || d.button_label || d.text || d.title || "";
      if (label) return `Clicked "${label}"`;

      // URL present on button
      const url = d.url || d.href || d.website_url || "";
      if (url) return `Clicked ${extractDomain(url)}`;

      // Section-based fallback
      const section = d.section_type || d.section || "";
      const sectionMap: Record<string, string> = {
        about: "Clicked About",
        amenities: "Clicked Amenities",
        contact: "Opened Contact",
        personalContact: "Opened Contact",
        multiContact: "Opened Contact",
        medicalProvider: "Opened Contact",
        hero: "Clicked Hero Button",
        cta: "Clicked Call to Action",
        features: "Clicked Features",
        gallery: "Clicked Gallery",
        socialLinks: "Clicked Social Links",
        linksWithContact: "Clicked a Link",
        faq: "Expanded FAQ",
      };
      if (section && sectionMap[section]) return sectionMap[section];
      if (section) return `Clicked ${cap(section)}`;

      return "Tapped a button";
    }
    case "social_click": {
      const platform = cap(d.social_platform || d.platform || "");
      const handle = d.handle || "";
      return platform
        ? `Clicked ${platform}${handle ? ` (@${handle})` : ""}`
        : "Clicked Social Link";
    }
    case "website_click": {
      const url = d.website_url || d.url || "";
      return url ? `Clicked Website (${extractDomain(url)})` : "Clicked Website";
    }
    case "contact_open": return "Opened contact section";
    case "save_contact": return "Saved your contact";
    case "share": return "Shared this page";
    case "download": {
      const name = d.file_name || d.name || "";
      return name ? `Downloaded "${name}"` : "Downloaded a file";
    }
    case "media_click": {
      const title = d.title || d.name || "";
      return title ? `Viewed media "${title}"` : "Viewed media";
    }
    case "photo_click": return "Viewed a photo";
    case "video_click": {
      const title = d.title || d.name || "";
      return title ? `Played video "${title}"` : "Played a video";
    }
    default:
      return eventType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case "page_view": return "eye-outline";
    case "page_exit": return "exit-outline";
    case "phone_click": return "call-outline";
    case "email_click": return "mail-outline";
    case "address_click": return "location-outline";
    case "link_click": return "link-outline";
    case "button_click": return "radio-button-on-outline";
    case "social_click": return "share-social-outline";
    case "contact_open": return "person-outline";
    case "save_contact": return "person-add-outline";
    case "share": return "share-outline";
    case "download": return "download-outline";
    case "media_click":
    case "photo_click":
    case "video_click": return "image-outline";
    default: return "analytics-outline";
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

const Analytics = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"1d" | "7d" | "30d" | "90d">("7d");
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [recentActivity, setRecentActivity] = useState<AnalyticsEvent[]>([]);
  const [trackerLinks, setTrackerLinks] = useState<TrackableLinkRow[]>([]);
  const [trackerLinkEvents, setTrackerLinkEvents] = useState<TrackableLinkEvent[]>([]);
  const [qrScanCount, setQrScanCount] = useState(0);

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    if (selectedPageIds.length > 0) {
      fetchAnalytics();
    } else {
      setAnalyticsEvents([]);
      setRecentActivity([]);
    }
  }, [selectedPageIds, timeRange]);

  // Refetch when the user navigates back to this tab so the data is never stale.
  useFocusEffect(
    useCallback(() => {
      if (selectedPageIds.length > 0) {
        fetchAnalytics();
      }
    }, [selectedPageIds, timeRange])
  );

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case "1d": start.setDate(end.getDate() - 1); break;
      case "7d": start.setDate(end.getDate() - 7); break;
      case "30d": start.setDate(end.getDate() - 30); break;
      case "90d": start.setDate(end.getDate() - 90); break;
    }
    return { start, end };
  }, [timeRange]);

  const fetchPages = async () => {
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    const userId = user?.user?.id;
    if (!userId) { setLoading(false); return; }

    const { data: memberRows } = await supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId);
    const memberBusinessIds = (memberRows || []).map((r: any) => r.business_id);

    let query = supabase.from("pages").select("id, title, created_by");
    if (memberBusinessIds.length > 0) {
      query = query.or(`created_by.eq.${userId},business_id.in.(${memberBusinessIds.join(",")})`);
    } else {
      query = query.eq("created_by", userId);
    }

    const { data } = await query;
    const pagesData: Page[] = (data || []).map((p: any) => ({
      id: String(p.id),
      title: p.title,
      isShared: p.created_by !== userId,
    }));
    setPages(pagesData);
    if (pagesData.length > 0) {
      setSelectedPageIds(pagesData.map((p) => p.id));
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    if (selectedPageIds.length === 0) return;
    const { start, end } = dateRange;

    // Main analytics events (limit 2000 for the time range)
    const { data: eventsData } = await supabase
      .from("analytics_events")
      .select("id, event_type, event_data, visitor_id, session_id, created_at, page_id")
      .in("page_id", selectedPageIds)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);

    setAnalyticsEvents(eventsData || []);

    // Recent activity (last 30, no date filter)
    const { data: recentData } = await supabase
      .from("analytics_events")
      .select("id, event_type, event_data, visitor_id, session_id, created_at, page_id")
      .in("page_id", selectedPageIds)
      .order("created_at", { ascending: false })
      .limit(30);
    setRecentActivity(recentData || []);

    // Tracker links for selected pages (to resolve visitor names + QR counts)
    const { data: linksData } = await supabase
      .from("trackable_links")
      .select("id, name, description, page_id, utm_source, tracking_code")
      .in("page_id", selectedPageIds)
      .eq("is_active", true);
    const links: TrackableLinkRow[] = linksData || [];
    setTrackerLinks(links);

    // QR code scan count
    const qrLinkIds = links
      .filter((l) => l.utm_source === "qr_code")
      .map((l) => l.id);
    if (qrLinkIds.length > 0) {
      const { count } = await supabase
        .from("trackable_link_events")
        .select("id", { count: "exact", head: true })
        .in("trackable_link_id", qrLinkIds)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      setQrScanCount(count || 0);
    } else {
      setQrScanCount(0);
    }

    // Tracker link events (to resolve visitor → name mapping)
    if (links.length > 0) {
      const { data: tleData } = await supabase
        .from("trackable_link_events")
        .select("trackable_link_id, visitor_id, created_at")
        .in("trackable_link_id", links.map((l) => l.id))
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      setTrackerLinkEvents(tleData || []);
    } else {
      setTrackerLinkEvents([]);
    }
  };

  // Build visitor_id → name map
  // Primary: read tracking_code stored in event_data (set by web app when visitor came via tracker link)
  // Fallback: match trackable_link_events visitor_id (older events before tracking_code was stored)
  const visitorNameMap = useMemo<VisitorNameMap>(() => {
    const map: VisitorNameMap = {};
    // Primary: event_data.tracking_code → trackerLinks.tracking_code → name
    for (const e of analyticsEvents) {
      if (e.visitor_id && e.event_data?.tracking_code) {
        const link = trackerLinks.find(
          (l) => l.tracking_code === e.event_data!.tracking_code && l.utm_source !== "qr_code"
        );
        if (link) map[e.visitor_id] = link.name;
      }
    }
    // Fallback: trackable_link_events visitor_id matching
    for (const tle of trackerLinkEvents) {
      if (tle.visitor_id && !map[tle.visitor_id]) {
        const link = trackerLinks.find((l) => l.id === tle.trackable_link_id && l.utm_source !== "qr_code");
        if (link) map[tle.visitor_id] = link.name;
      }
    }
    return map;
  }, [analyticsEvents, trackerLinks, trackerLinkEvents]);

  // ─── Computed Metrics ────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const views = analyticsEvents.filter((e) => e.event_type === "page_view").length;

    // Hot leads: visitors with 3+ meaningful interactions
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
    const allVisitorIds = new Set(
      analyticsEvents.map((e) => e.visitor_id).filter(Boolean) as string[]
    );
    const leads = allVisitorIds.size - hotLeads;

    // Contacted: total call + email clicks (per spec: Contacted = call clicks + email clicks)
    const contacted = analyticsEvents.filter((e) => CONTACT_EVENT_TYPES.has(e.event_type)).length;

    // Actions: all non-page_view / non-page_exit events
    const actions = analyticsEvents.filter(
      (e) => e.event_type !== "page_view" && e.event_type !== "page_exit"
    ).length;

    // Average time on page (from page_exit events with time_on_page)
    const exitEvents = analyticsEvents.filter(
      (e) => e.event_type === "page_exit" && e.event_data?.time_on_page > 0
    );
    const avgTimeSeconds =
      exitEvents.length > 0
        ? Math.round(
            exitEvents.reduce((sum, e) => sum + (e.event_data?.time_on_page || 0), 0) /
              exitEvents.length
          )
        : null;
    const avgTimeStr = avgTimeSeconds
      ? avgTimeSeconds >= 60
        ? `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`
        : `${avgTimeSeconds}s`
      : "—";

    const shares = analyticsEvents.filter((e) => e.event_type === "share").length;

    return { views, leads, hotLeads, contacted, actions, avgTimeStr, shares };
  }, [analyticsEvents]);

  // ─── Engagement Breakdown ────────────────────────────────────────────────

  const engagementBreakdown = useMemo(() => {
    const mediaEngagement = analyticsEvents.filter((e) =>
      ["link_click", "social_click", "website_click"].includes(e.event_type) ||
      (e.event_type === "button_click" && e.event_data?.section_type === "socialLinks")
    ).length;
    const calls = analyticsEvents.filter((e) => e.event_type === "phone_click").length;
    const emails = analyticsEvents.filter((e) => e.event_type === "email_click").length;
    const photoVideo = analyticsEvents.filter((e) =>
      ["media_click", "photo_click", "video_click"].includes(e.event_type)
    ).length;
    const about = analyticsEvents.filter(
      (e) =>
        e.event_type === "button_click" &&
        ["about"].includes(e.event_data?.section_type || e.event_data?.section || "")
    ).length;
    const amenities = analyticsEvents.filter(
      (e) =>
        e.event_type === "button_click" &&
        ["amenities"].includes(e.event_data?.section_type || e.event_data?.section || "")
    ).length;
    const contactOpens = analyticsEvents.filter(
      (e) =>
        e.event_type === "save_contact" ||
        e.event_type === "contact_open" ||
        (e.event_type === "button_click" &&
          ["contact", "personalContact", "multiContact", "contact_card"].includes(
            e.event_data?.section_type || ""
          ))
    ).length;

    return [
      { label: "Media Engagement", icon: "share-social-outline", value: mediaEngagement, color: "#FF9500" },
      { label: "Calls", icon: "call-outline", value: calls, color: "#34C759" },
      { label: "Emails", icon: "mail-outline", value: emails, color: "#007AFF" },
      { label: "Photos / Videos", icon: "image-outline", value: photoVideo, color: "#AF52DE" },
      { label: "About Clicks", icon: "information-circle-outline", value: about, color: "#5AC8FA" },
      { label: "Amenities Clicks", icon: "list-outline", value: amenities, color: "#FF2D55" },
      { label: "Saved Contacts", icon: "person-outline", value: contactOpens, color: "#4CD964" },
    ];
  }, [analyticsEvents]);

  // ─── Leads List ─────────────────────────────────────────────────────────

  const leadsList = useMemo(() => {
    const allVisitorIds = new Set(
      analyticsEvents.map((e) => e.visitor_id).filter(Boolean) as string[]
    );

    const meaningfulByVisitor: Record<string, number> = {};
    const contactedVisitors = new Set<string>();
    const lastSeenByVisitor: Record<string, string> = {};

    for (const e of analyticsEvents) {
      if (!e.visitor_id) continue;
      if (MEANINGFUL_EVENT_TYPES.has(e.event_type)) {
        meaningfulByVisitor[e.visitor_id] = (meaningfulByVisitor[e.visitor_id] || 0) + 1;
      }
      if (CONTACT_EVENT_TYPES.has(e.event_type)) {
        contactedVisitors.add(e.visitor_id);
      }
      if (!lastSeenByVisitor[e.visitor_id] || e.created_at > lastSeenByVisitor[e.visitor_id]) {
        lastSeenByVisitor[e.visitor_id] = e.created_at;
      }
    }

    return Array.from(allVisitorIds)
      .map((visitorId) => ({
        visitorId,
        name: visitorNameMap[visitorId] || null,
        meaningful: meaningfulByVisitor[visitorId] || 0,
        isHot: (meaningfulByVisitor[visitorId] || 0) >= 3,
        isContacted: contactedVisitors.has(visitorId),
        lastSeen: lastSeenByVisitor[visitorId] || "",
      }))
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  }, [analyticsEvents, visitorNameMap]);

  // ─── Page Filter Label ───────────────────────────────────────────────────

  const pageFilterLabel = useMemo(() => {
    if (selectedPageIds.length === pages.length) return `All Pages (${pages.length})`;
    if (selectedPageIds.length === 0) return "No Pages Selected";
    if (selectedPageIds.length === 1) {
      const p = pages.find((p) => p.id === selectedPageIds[0]);
      return p?.title || "1 Page";
    }
    return `${selectedPageIds.length} Pages`;
  }, [selectedPageIds, pages]);

  // ─── Render Helpers ─────────────────────────────────────────────────────

  const MetricCard = ({
    icon,
    title,
    value,
    color,
  }: {
    icon: string;
    title: string;
    value: string | number;
    color: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{title}</Text>
    </View>
  );

  const LeadAvatar = ({ name, isHot }: { name: string | null; isHot: boolean }) => {
    const initials = name
      ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
      : "?";
    const bg = isHot ? "#FF6B35" : "#6B7280";
    return (
      <View style={[styles.avatar, { backgroundColor: bg }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Time Range Selector ── */}
        <View style={styles.timeRangeRow}>
          {(["1d", "7d", "30d", "90d"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.timeBtn, timeRange === r && styles.timeBtnActive]}
              onPress={() => setTimeRange(r)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timeBtnText, timeRange === r && styles.timeBtnTextActive]}>
                {r === "1d" ? "1D" : r === "7d" ? "7D" : r === "30d" ? "30D" : "90D"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Page Filter Dropdown ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.pageDropdown}
            onPress={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
            activeOpacity={0.7}
          >
            <Ionicons name="documents-outline" size={16} color="#555" style={{ marginRight: 8 }} />
            <Text style={styles.pageDropdownText}>{pageFilterLabel}</Text>
            <Ionicons
              name={isPageDropdownOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#555"
            />
          </TouchableOpacity>

          {isPageDropdownOpen && (
            <View style={styles.pageDropdownList}>
              <TouchableOpacity
                style={styles.pageDropdownItem}
                onPress={() => setSelectedPageIds(pages.map((p) => p.id))}
              >
                <Ionicons
                  name={selectedPageIds.length === pages.length ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={selectedPageIds.length === pages.length ? "#007AFF" : "#ccc"}
                />
                <Text style={styles.pageDropdownItemText}>All Pages</Text>
              </TouchableOpacity>
              {pages.map((p) => {
                const sel = selectedPageIds.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.pageDropdownItem}
                    onPress={() => {
                      setSelectedPageIds((prev) =>
                        sel ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                      );
                    }}
                  >
                    <Ionicons
                      name={sel ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={sel ? "#007AFF" : "#ccc"}
                    />
                    <Text style={[styles.pageDropdownItemText, sel && styles.pageDropdownItemTextSel]}>
                      {p.title}
                    </Text>
                    {p.isShared && <View style={styles.sharedBadge}><Text style={styles.sharedBadgeText}>Shared</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
                pathname: "/(app)/all-leads" as any,
                params: { pageIds: JSON.stringify(selectedPageIds) },
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
                onPress={() => {
                  // Use the page this visitor actually has events on, not just the first selected page
                  const visitorEvent = analyticsEvents.find(e => e.visitor_id === lead.visitorId);
                  const pageId = visitorEvent?.page_id || selectedPageIds[0];
                  if (pageId) {
                    router.push({
                      pathname: "/(app)/lead-detail/[pageId]/[visitorId]" as any,
                      params: { pageId, visitorId: lead.visitorId, name: lead.name || '' },
                    });
                  }
                }}
              >
                <LeadAvatar name={lead.name} isHot={lead.isHot} />
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name || "Unknown User"}</Text>
                  <Text style={styles.leadMeta}>
                    {lead.isContacted ? "Contacted" : `${lead.meaningful} interaction${lead.meaningful !== 1 ? "s" : ""}`}
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
              <Text style={styles.emptySectionSub}>
                Activity appears as visitors interact with your pages
              </Text>
            </View>
          ) : (
            recentActivity.map((event) => {
              const actorName = event.visitor_id
                ? visitorNameMap[event.visitor_id] || "User"
                : "User";
              const label = formatEventLabel(event.event_type, event.event_data);
              const pageName = pages.find((p) => p.id === event.page_id)?.title;
              return (
                <View key={event.id} style={styles.activityRow}>
                  <View style={styles.activityIconWrap}>
                    <Ionicons name={getEventIcon(event.event_type) as any} size={14} color="#666" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>
                      <Text style={styles.activityActor}>{actorName} </Text>
                      {label.toLowerCase()}
                    </Text>
                    {pageName && (
                      <Text style={styles.activityPage} numberOfLines={1}>{pageName}</Text>
                    )}
                  </View>
                  <Text style={styles.activityTime}>{timeAgo(event.created_at)}</Text>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const cardPadding = 16;
// 16px padding each side (32) + 12px gap between the two columns
const metricCardWidth = (screenWidth - 32 - 12) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f6f9",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  // Time range
  timeRangeRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f0f2f5",
  },
  timeBtnActive: {
    backgroundColor: "#000",
  },
  timeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  timeBtnTextActive: {
    color: "#fff",
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  // Page dropdown
  pageDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  pageDropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  pageDropdownList: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8e8e8",
    overflow: "hidden",
  },
  pageDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 10,
  },
  pageDropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: "#444",
  },
  pageDropdownItemTextSel: {
    color: "#007AFF",
    fontWeight: "500",
  },
  sharedBadge: {
    backgroundColor: "#E8F0FF",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sharedBadgeText: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "600",
  },
  // Metrics grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    width: metricCardWidth,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    padding: cardPadding,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 16,
  },
  // Engagement breakdown
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: BREAKDOWN_LEFT_WIDTH,
  },
  breakdownDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  breakdownRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownBar: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    width: 30,
    textAlign: "right",
  },
  // Leads
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 2,
  },
  leadMeta: {
    fontSize: 12,
    color: "#888",
  },
  leadRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  hotBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },
  hotBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  contactedBadge: {
    backgroundColor: "#E8F7EE",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  contactedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#28a745",
  },
  leadBadge: {
    backgroundColor: "#F0F4FF",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  leadBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5856D6",
  },
  leadTime: {
    fontSize: 11,
    color: "#aaa",
  },
  // Recent Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 10,
  },
  activityIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 18,
  },
  activityActor: {
    fontWeight: "600",
    color: "#111",
  },
  activityPage: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 2,
  },
  // Empty states
  emptySection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptySectionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#666",
  },
  emptySectionSub: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    paddingHorizontal: 16,
  },
});

export default Analytics;
