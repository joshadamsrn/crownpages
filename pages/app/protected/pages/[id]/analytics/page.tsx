import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bookmark,
  CalendarCheck,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  ImageIcon,
  Info,
  LinkIcon,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MousePointerClick,
  Phone,
  QrCode,
  Save,
  Share2,
  UserCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalyticsRealtimeRefresh } from "@/components/analytics-realtime-refresh";

const QUERY_BATCH_SIZE = 1000;
const ACTION_DEDUPE_WINDOW_MS = 30 * 1000;

const MEANINGFUL_EVENT_TYPES = new Set([
  "phone_click",
  "email_click",
  "link_click",
  "button_click",
  "form_submit",
  "media_click",
  "photo_click",
  "video_click",
  "contact_open",
  "save",
  "social_click",
  "website_click",
  "address_click",
  "save_contact",
]);

const CONTACT_EVENT_TYPES = new Set(["phone_click", "email_click"]);

type EventData = Record<string, unknown>;

interface AnalyticsEvent {
  id: string;
  event_type: string;
  event_data: unknown;
  visitor_id: string | null;
  session_id: string | null;
  user_id: string | null;
  created_at: string | null;
  page_id: string;
  platform: string | null;
  referrer: string | null;
  city: string | null;
  country: string | null;
}

interface KioskCheckoutRow {
  id: string;
  first_name: string;
  last_name: string;
  visitor_type: string;
  visitor_type_other: string | null;
  action: "check_in" | "check_out";
  occurred_at: string | null;
  company_name: string | null;
  visiting: string | null;
  responsible_party: string | null;
  checkout_duration: string | null;
  checkout_type: string | null;
  checking_out: string | null;
  checked_out_first_name: string | null;
  checked_out_last_name: string | null;
  checked_out_full_name: string | null;
  metadata: Record<string, unknown> | null;
}

type RecentActivityItem =
  | { kind: "analytics"; id: string; occurredAt: string | null; event: AnalyticsEvent }
  | { kind: "checkout"; id: string; occurredAt: string | null; checkout: KioskCheckoutRow };

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
  created_at: string | null;
}

interface MetricCardConfig {
  title: string;
  value: string | number;
  color: string;
  icon: LucideIcon;
}

interface EngagementBreakdownItem {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}

interface LeadRow {
  visitorId: string;
  name: string | null;
  meaningful: number;
  isHot: boolean;
  isContacted: boolean;
  lastSeen: string | null;
}

function formatDateTime(value: string | null) {
  if (!value) return "Unknown";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(value: string | null) {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function cap(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function getEventData(value: unknown): EventData {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as EventData;
  }

  return {};
}

function getDataString(data: EventData, ...keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function getMetadataString(row: KioskCheckoutRow, key: string) {
  const value = row.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function formatCheckoutVisitorType(row: KioskCheckoutRow) {
  const checkoutType = row.checkout_type || getMetadataString(row, "checkoutType");
  if (checkoutType) {
    return checkoutType;
  }

  if (row.visitor_type === "Current Patient Visitor") {
    return "Guest / Family";
  }

  return row.visitor_type === "Other" && row.visitor_type_other ? row.visitor_type_other : row.visitor_type;
}

function getCheckoutDuration(row: KioskCheckoutRow) {
  return row.checkout_duration || getMetadataString(row, "checkoutDuration");
}

function getCheckingOut(row: KioskCheckoutRow) {
  return row.checking_out || getMetadataString(row, "checkingOut");
}

function getCheckedOutFullName(row: KioskCheckoutRow) {
  const explicitName = row.checked_out_full_name || getMetadataString(row, "checkedOutFullName");
  if (explicitName) {
    return explicitName;
  }

  return [
    row.checked_out_first_name || getMetadataString(row, "checkedOutFirstName"),
    row.checked_out_last_name || getMetadataString(row, "checkedOutLastName"),
  ]
    .filter(Boolean)
    .join(" ");
}

function getCheckoutSubject(row: KioskCheckoutRow) {
  return getCheckedOutFullName(row) || getCheckingOut(row) || row.visiting || row.responsible_party || "";
}

function getCheckoutActorName(row: KioskCheckoutRow) {
  return [row.first_name, row.last_name].filter(Boolean).join(" ");
}

function getDataNumber(data: EventData, key: string) {
  const value = data[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getDataBoolean(data: EventData, key: string) {
  const value = data[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return null;
}

function isNamedContactTrackableLink(link: Pick<TrackableLinkRow, "name" | "utm_source">) {
  const name = link.name?.trim() || "";
  const normalizedName = name.toLowerCase();
  const normalizedSource = link.utm_source?.trim().toLowerCase() || "";

  if (!name) {
    return false;
  }

  return !(
    normalizedSource === "qr_code" ||
    normalizedSource.includes("quick") ||
    normalizedSource.includes("share") ||
    normalizedName === "quick share" ||
    normalizedName.startsWith("quick share")
  );
}

function extractDomain(value: string) {
  try {
    const url = value.startsWith("http") ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function formatEventLabel(eventType: string, rawData: unknown) {
  const data = getEventData(rawData);

  switch (eventType) {
    case "page_view":
      return "Viewed page";
    case "page_exit":
      return "Left page";
    case "share":
      return "Shared page";
    case "save":
      return "Saved page";
    case "form_submit": {
      const formType = getDataString(data, "form_type", "source");
      if (formType === "connect_form" || formType === "Connect Form") return "Submitted Connect Form";
      if (formType === "schedule_tour" || formType === "Schedule Tour" || formType === "Visit Form") {
        return "Scheduled a Visit";
      }
      return "Submitted Form";
    }
    case "phone_click": {
      const number = getDataString(data, "phone_number", "value", "label");
      return number ? `Called ${number}` : "Clicked Call";
    }
    case "email_click": {
      const email = getDataString(data, "email", "value", "label");
      return email ? `Emailed ${email}` : "Clicked Email";
    }
    case "address_click":
      return "Clicked Address / Map";
    case "contact_open":
      return "Opened Contact Section";
    case "save_contact":
      return "Saved Contact";
    case "social_click": {
      const platform = cap(getDataString(data, "platform"));
      const handle = getDataString(data, "handle", "username", "button_text");
      if (platform && handle) return `Clicked ${platform} (${handle})`;
      if (platform) return `Clicked ${platform}`;
      return "Clicked Social Link";
    }
    case "website_click": {
      const url = getDataString(data, "url", "href");
      return url ? `Clicked Website (${extractDomain(url)})` : "Clicked Website";
    }
    case "link_click": {
      const label = getDataString(data, "label", "text", "title");
      const url = getDataString(data, "url", "href");
      if (label) return `Clicked '${label}'`;
      if (url) return `Clicked ${extractDomain(url)}`;
      return "Clicked Link";
    }
    case "media_click":
      return "Viewed Media";
    case "photo_click":
      return "Viewed Photo";
    case "video_click": {
      const title = getDataString(data, "title", "label");
      return title ? `Played Video (${title})` : "Played Video";
    }
    case "download": {
      const name = getDataString(data, "file_name", "name", "label");
      return name ? `Downloaded ${name}` : "Downloaded File";
    }
    case "button_click": {
      const action = getDataString(data, "action").toLowerCase();
      const label = getDataString(data, "label", "button_text", "text");
      const sectionType = getDataString(data, "section_type", "section");

      if (action === "read_more" || action === "read more") return "Read More (About)";
      if (action === "show_more" || action === "show more") return "Show More (Amenities)";
      if (action === "call" || sectionType === "phone") return "Clicked Call";
      if (action === "email" || sectionType === "email") return "Clicked Email";
      if (action === "website" || sectionType === "website") {
        const url = getDataString(data, "url", "href");
        return url ? `Clicked Website (${extractDomain(url)})` : "Clicked Website";
      }
      if (sectionType === "about") return "Read More (About)";
      if (sectionType === "amenities") return "Viewed Amenities";
      if (sectionType === "socialLinks") {
        const platform = cap(getDataString(data, "platform"));
        return platform ? `Clicked ${platform}` : "Clicked Social Link";
      }

      const platform = cap(getDataString(data, "platform"));
      if (platform) return `Clicked ${platform}`;
      if (label) return `Clicked '${label}'`;
      return "Clicked Button";
    }
    default:
      return cap(eventType.replace(/_/g, " "));
  }
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "page_view":
      return Eye;
    case "page_exit":
      return ExternalLink;
    case "share":
      return Share2;
    case "save":
      return Bookmark;
    case "form_submit":
      return MessageSquare;
    case "phone_click":
      return Phone;
    case "email_click":
      return Mail;
    case "address_click":
      return MapPin;
    case "contact_open":
      return Users;
    case "save_contact":
      return UserCheck;
    case "social_click":
      return Share2;
    case "website_click":
      return Globe;
    case "link_click":
      return LinkIcon;
    case "media_click":
    case "photo_click":
      return ImageIcon;
    case "video_click":
      return CalendarCheck;
    case "download":
      return Save;
    default:
      return MousePointerClick;
  }
}

async function fetchAllAnalyticsEvents(supabase: SupabaseClient, pageId: string) {
  const rows: AnalyticsEvent[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("id, event_type, event_data, visitor_id, session_id, user_id, created_at, page_id, platform, referrer, city, country")
      .eq("page_id", pageId)
      .order("created_at", { ascending: false })
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = (data || []) as AnalyticsEvent[];
    rows.push(...batch);

    if (batch.length < QUERY_BATCH_SIZE) break;
    from += QUERY_BATCH_SIZE;
  }

  return rows;
}

async function fetchKioskCheckoutRows(supabase: SupabaseClient, pageId: string) {
  const { data, error } = await supabase
    .from("kiosk_visitor_logs" as any)
    .select(
      "id, first_name, last_name, visitor_type, visitor_type_other, action, occurred_at, company_name, visiting, responsible_party, checkout_duration, checkout_type, checking_out, checked_out_first_name, checked_out_last_name, checked_out_full_name, metadata",
    )
    .eq("page_id", pageId)
    .eq("action", "check_out")
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return (data || []) as unknown as KioskCheckoutRow[];
}

async function fetchAllTrackableLinkEvents(supabase: SupabaseClient, linkIds: string[]) {
  const rows: TrackableLinkEvent[] = [];
  let from = 0;

  if (linkIds.length === 0) {
    return rows;
  }

  while (true) {
    const { data, error } = await supabase
      .from("trackable_link_events")
      .select("trackable_link_id, visitor_id, created_at")
      .in("trackable_link_id", linkIds)
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = (data || []) as TrackableLinkEvent[];
    rows.push(...batch);

    if (batch.length < QUERY_BATCH_SIZE) break;
    from += QUERY_BATCH_SIZE;
  }

  return rows;
}

function countDistinctVisitors(events: AnalyticsEvent[]) {
  return new Set(events.map((event) => event.visitor_id).filter(Boolean)).size;
}

function isInternalAnalyticsEvent(event: AnalyticsEvent) {
  return Boolean(event.user_id);
}

function eventTime(event: Pick<AnalyticsEvent, "created_at">) {
  return event.created_at ? new Date(event.created_at).getTime() : 0;
}

function dedupePageExitEvents(events: AnalyticsEvent[]) {
  const deduped = new Map<string, AnalyticsEvent>();

  for (const event of events) {
    const data = getEventData(event.event_data);
    const currentSeconds = getDataNumber(data, "time_on_page");
    if (event.event_type !== "page_exit" || !currentSeconds) continue;

    const key = `${event.page_id}:${event.session_id || event.visitor_id || event.id}`;
    const existing = deduped.get(key);
    const existingSeconds = existing ? getDataNumber(getEventData(existing.event_data), "time_on_page") : 0;

    if (!existing || currentSeconds > existingSeconds) {
      deduped.set(key, event);
    }
  }

  return Array.from(deduped.values());
}

function getEventDedupeSignature(event: AnalyticsEvent) {
  const data = getEventData(event.event_data);

  return JSON.stringify({
    eventType: event.event_type,
    action: getDataString(data, "action"),
    label: getDataString(data, "label", "link_title", "button_label", "title", "name"),
    url: getDataString(data, "url", "href", "link_url", "website_url"),
    section: getDataString(data, "section_type", "section"),
    mediaIndex: data.media_index ?? null,
    formType: getDataString(data, "form_type", "source"),
    phone: getDataString(data, "phone_number", "phone"),
    email: getDataString(data, "email_address", "email"),
  });
}

function dedupeRepeatedActionEvents(events: AnalyticsEvent[]) {
  const sorted = [...events].sort((left, right) => eventTime(left) - eventTime(right));
  const deduped: AnalyticsEvent[] = [];
  const lastSeenByKey = new Map<string, number>();

  for (const event of sorted) {
    const actorKey = event.session_id || event.visitor_id || event.user_id || event.id;
    const key = `${event.page_id}:${actorKey}:${getEventDedupeSignature(event)}`;
    const currentTime = eventTime(event);
    const previousTime = lastSeenByKey.get(key);

    if (previousTime !== undefined && currentTime - previousTime <= ACTION_DEDUPE_WINDOW_MS) {
      continue;
    }

    lastSeenByKey.set(key, currentTime);
    deduped.push(event);
  }

  return deduped.sort((left, right) => eventTime(right) - eventTime(left));
}

function buildVisitorNameMap(
  analyticsEvents: AnalyticsEvent[],
  trackerLinks: TrackableLinkRow[],
  trackerLinkEvents: TrackableLinkEvent[],
  pageId: string,
) {
  const map: Record<string, string> = {};
  const namesByVisitor: Record<string, Set<string>> = {};

  const addName = (visitorId: string, name: string) => {
    if (!namesByVisitor[visitorId]) {
      namesByVisitor[visitorId] = new Set<string>();
    }

    namesByVisitor[visitorId].add(name);
  };

  for (const event of analyticsEvents) {
    const data = getEventData(event.event_data);
    const attributionMode = getDataString(data, "attribution_mode");
    const eventName = getDataString(data, "tracking_contact_name", "tracking_link_name");
    const namedFlag = getDataBoolean(data, "tracking_link_is_named");

    if (
      event.visitor_id &&
      eventName &&
      namedFlag !== false &&
      attributionMode !== "anonymous" &&
      attributionMode !== "quick_share"
    ) {
      addName(event.visitor_id, eventName);
      continue;
    }

    const trackingCode = getDataString(data, "tracking_code");
    if (!event.visitor_id || !trackingCode) continue;

    const link = trackerLinks.find(
      (candidate) =>
        candidate.tracking_code === trackingCode &&
        isNamedContactTrackableLink(candidate) &&
        candidate.page_id === pageId,
    );

    if (link) addName(event.visitor_id, link.name);
  }

  for (const event of trackerLinkEvents) {
    if (!event.visitor_id) continue;

    const link = trackerLinks.find(
      (candidate) => candidate.id === event.trackable_link_id && isNamedContactTrackableLink(candidate),
    );

    if (link) addName(event.visitor_id, link.name);
  }

  for (const [visitorId, names] of Object.entries(namesByVisitor)) {
    if (names.size === 1) {
      map[visitorId] = Array.from(names)[0];
    }
  }

  return map;
}

function buildMetrics(analyticsEvents: AnalyticsEvent[]) {
  const pageViews = analyticsEvents.filter((event) => event.event_type === "page_view");
  const dedupedActionEvents = dedupeRepeatedActionEvents(
    analyticsEvents.filter((event) => event.event_type !== "page_view" && event.event_type !== "page_exit"),
  );
  const meaningfulByVisitor: Record<string, number> = {};

  for (const event of dedupedActionEvents) {
    if (event.visitor_id && MEANINGFUL_EVENT_TYPES.has(event.event_type)) {
      meaningfulByVisitor[event.visitor_id] = (meaningfulByVisitor[event.visitor_id] || 0) + 1;
    }
  }

  const hotLeadVisitors = new Set(
    Object.entries(meaningfulByVisitor)
      .filter(([, count]) => count >= 3)
      .map(([visitorId]) => visitorId),
  );
  const allVisitors = new Set(analyticsEvents.map((event) => event.visitor_id).filter(Boolean));
  const exitEvents = dedupePageExitEvents(analyticsEvents);
  const avgTimeSeconds =
    exitEvents.length > 0
      ? Math.round(
          exitEvents.reduce((total, event) => total + getDataNumber(getEventData(event.event_data), "time_on_page"), 0) /
            exitEvents.length,
        )
      : null;
  const avgTimeStr = avgTimeSeconds
    ? avgTimeSeconds >= 60
      ? `${Math.floor(avgTimeSeconds / 60)}m ${avgTimeSeconds % 60}s`
      : `${avgTimeSeconds}s`
    : "-";

  return {
    views: pageViews.length,
    visitors: countDistinctVisitors(pageViews),
    leads: Math.max(0, allVisitors.size - hotLeadVisitors.size),
    hotLeads: hotLeadVisitors.size,
    contacted: countDistinctVisitors(dedupedActionEvents.filter((event) => CONTACT_EVENT_TYPES.has(event.event_type))),
    actions: dedupedActionEvents.length,
    avgTimeStr,
    shares: analyticsEvents.filter((event) => event.event_type === "share").length,
    saves: analyticsEvents.filter((event) => event.event_type === "save").length,
    connectForms: analyticsEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return event.event_type === "form_submit" && getDataString(data, "form_type") === "connect_form";
    }).length,
    toursScheduled: analyticsEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return event.event_type === "form_submit" && getDataString(data, "form_type") === "schedule_tour";
    }).length,
    dedupedActionEvents,
  };
}

function buildEngagementBreakdown(analyticsEvents: AnalyticsEvent[]): EngagementBreakdownItem[] {
  const dedupedActionEvents = dedupeRepeatedActionEvents(
    analyticsEvents.filter((event) => event.event_type !== "page_view" && event.event_type !== "page_exit"),
  );

  const mediaEngagement = countDistinctVisitors(
    dedupedActionEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return (
        ["link_click", "social_click", "website_click"].includes(event.event_type) ||
        (event.event_type === "button_click" && getDataString(data, "section_type") === "socialLinks")
      );
    }),
  );
  const calls = countDistinctVisitors(dedupedActionEvents.filter((event) => event.event_type === "phone_click"));
  const emails = countDistinctVisitors(dedupedActionEvents.filter((event) => event.event_type === "email_click"));
  const photoVideo = countDistinctVisitors(
    dedupedActionEvents.filter((event) => ["media_click", "photo_click", "video_click"].includes(event.event_type)),
  );
  const about = countDistinctVisitors(
    dedupedActionEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return event.event_type === "button_click" && getDataString(data, "section_type", "section") === "about";
    }),
  );
  const amenities = countDistinctVisitors(
    dedupedActionEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return event.event_type === "button_click" && getDataString(data, "section_type", "section") === "amenities";
    }),
  );
  const savedContacts = countDistinctVisitors(
    dedupedActionEvents.filter((event) => {
      const data = getEventData(event.event_data);
      return (
        event.event_type === "save_contact" ||
        event.event_type === "contact_open" ||
        (event.event_type === "button_click" &&
          ["contact", "personalContact", "multiContact", "contact_card"].includes(getDataString(data, "section_type")))
      );
    }),
  );

  return [
    { label: "Media Engagement", icon: Share2, value: mediaEngagement, color: "#FF9500" },
    { label: "Calls", icon: Phone, value: calls, color: "#34C759" },
    { label: "Emails", icon: Mail, value: emails, color: "#007AFF" },
    { label: "Photos / Videos", icon: ImageIcon, value: photoVideo, color: "#AF52DE" },
    { label: "About Clicks", icon: Info, value: about, color: "#5AC8FA" },
    { label: "Amenities Clicks", icon: MessageSquare, value: amenities, color: "#FF2D55" },
    { label: "Saved Contacts", icon: UserCheck, value: savedContacts, color: "#4CD964" },
  ];
}

function buildLeadsList(
  analyticsEvents: AnalyticsEvent[],
  visitorNameMap: Record<string, string>,
): LeadRow[] {
  const visitors = new Set(analyticsEvents.map((event) => event.visitor_id).filter(Boolean) as string[]);

  return Array.from(visitors)
    .map((visitorId) => {
      const events = analyticsEvents.filter((event) => event.visitor_id === visitorId);
      const meaningful = events.filter((event) => MEANINGFUL_EVENT_TYPES.has(event.event_type)).length;
      const isHot = meaningful >= 3;
      const isContacted = events.some((event) => CONTACT_EVENT_TYPES.has(event.event_type));
      const lastSeen = events[0]?.created_at || null;
      const name = visitorNameMap[visitorId] || null;

      return { visitorId, name, meaningful, isHot, isContacted, lastSeen };
    })
    .sort((left, right) => new Date(right.lastSeen || 0).getTime() - new Date(left.lastSeen || 0).getTime());
}

function buildRecentActivityItems(
  analyticsEvents: AnalyticsEvent[],
  checkoutRows: KioskCheckoutRow[],
): RecentActivityItem[] {
  return [
    ...analyticsEvents.map((event) => ({
      kind: "analytics" as const,
      id: `analytics-${event.id}`,
      occurredAt: event.created_at,
      event,
    })),
    ...checkoutRows.map((checkout) => ({
      kind: "checkout" as const,
      id: `checkout-${checkout.id}`,
      occurredAt: checkout.occurred_at,
      checkout,
    })),
  ]
    .sort((left, right) => new Date(right.occurredAt || 0).getTime() - new Date(left.occurredAt || 0).getTime())
    .slice(0, 30);
}

function LeadAvatar({ name, isHot }: { name: string | null; isHot: boolean }) {
  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
        isHot ? "bg-[#FF6B35]" : "bg-slate-500",
      )}
    >
      {initials}
    </div>
  );
}

function MetricCard({ metric }: { metric: MetricCardConfig }) {
  const Icon = metric.icon;

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
      <CardContent className="flex flex-col items-center p-5 text-center">
        <div
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${metric.color}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: metric.color }} />
        </div>
        <div className="text-2xl font-bold text-slate-950">{metric.value}</div>
        <div className="mt-1 text-xs font-medium text-slate-500">{metric.title}</div>
      </CardContent>
    </Card>
  );
}

function LeadStatusBadge({ lead }: { lead: LeadRow }) {
  if (lead.isHot) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B35] px-2.5 py-1 text-xs font-bold text-white">
        <Flame className="h-3 w-3" />
        Hot Lead
      </span>
    );
  }

  if (lead.isContacted) {
    return (
      <span className="rounded-full bg-[#34C75915] px-2.5 py-1 text-xs font-semibold text-[#34C759]">
        Contacted
      </span>
    );
  }

  return <span className="rounded-full bg-[#5856D615] px-2.5 py-1 text-xs font-semibold text-[#5856D6]">Lead</span>;
}

export default async function PageAnalytics({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const canViewCustomerAnalytics = await hasCrownAdminAccess(user.id, supabase);
  const analyticsSupabase = canViewCustomerAnalytics ? createAdminClient() : supabase;
  let pageQuery = analyticsSupabase
    .from("pages")
    .select(
      "id, title, slug, description, created_at, updated_at, published_at, is_published, is_active, view_count, save_count, share_count, businesses(name, slug)",
    )
    .eq("id", id);

  if (!canViewCustomerAnalytics) {
    pageQuery = pageQuery.eq("created_by", user.id);
  }

  const { data: page } = await pageQuery.single();

  if (!page) {
    notFound();
  }

  const business = Array.isArray(page.businesses) ? page.businesses[0] ?? null : page.businesses ?? null;

  const [allEvents, kioskCheckoutRows, linksResult] = await Promise.all([
    fetchAllAnalyticsEvents(analyticsSupabase, id),
    fetchKioskCheckoutRows(analyticsSupabase, id),
    analyticsSupabase
      .from("trackable_links")
      .select("id, name, description, page_id, utm_source, tracking_code")
      .eq("page_id", id)
      .eq("is_active", true),
  ]);

  const analyticsEvents = allEvents.filter((event) => !isInternalAnalyticsEvent(event));
  const trackerLinks = ((linksResult.data || []) as TrackableLinkRow[]) || [];
  const trackerLinkEvents = await fetchAllTrackableLinkEvents(
    analyticsSupabase,
    trackerLinks.map((link) => link.id),
  );
  const qrLinkIds = new Set(trackerLinks.filter((link) => link.utm_source === "qr_code").map((link) => link.id));
  const qrScanCount = trackerLinkEvents.filter((event) => qrLinkIds.has(event.trackable_link_id)).length;
  const visitorNameMap = buildVisitorNameMap(analyticsEvents, trackerLinks, trackerLinkEvents, id);
  const metrics = buildMetrics(analyticsEvents);
  const engagementBreakdown = buildEngagementBreakdown(analyticsEvents);
  const engagementTotal = engagementBreakdown.reduce((total, item) => total + item.value, 0);
  const leadsList = buildLeadsList(analyticsEvents, visitorNameMap);
  const recentActivity = buildRecentActivityItems(analyticsEvents, kioskCheckoutRows);

  const liveUrl = page.is_published && business?.slug ? `/${business.slug}/${page.slug}` : null;
  const metricCards: MetricCardConfig[] = [
    { title: "Page Views", value: metrics.views, color: "#007AFF", icon: Eye },
    { title: "Visitors", value: metrics.visitors, color: "#0EA5E9", icon: Users },
    { title: "Leads", value: metrics.leads, color: "#5856D6", icon: Users },
    { title: "Hot Leads", value: metrics.hotLeads, color: "#FF6B35", icon: Flame },
    { title: "Contacted People", value: metrics.contacted, color: "#34C759", icon: Phone },
    { title: "Action Events", value: `${metrics.actions} Total`, color: "#FF9500", icon: Zap },
    { title: "Share Events", value: `${metrics.shares} Total`, color: "#FF2D55", icon: Share2 },
    { title: "QR Scans", value: `${qrScanCount} Total`, color: "#AF52DE", icon: QrCode },
    { title: "Save Events", value: `${metrics.saves} Total`, color: "#3B82F6", icon: Bookmark },
    { title: "Connect Forms", value: metrics.connectForms, color: "#4F46E5", icon: MessageSquare },
    { title: "Visits Scheduled", value: metrics.toursScheduled, color: "#2563EB", icon: CalendarCheck },
    { title: "Checkouts", value: kioskCheckoutRows.length, color: "#0F766E", icon: LogOut },
  ];

  return (
    <div className="space-y-6">
      <AnalyticsRealtimeRefresh pageId={id} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/protected/pages">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Pages
              </Link>
            </Button>
            {page.is_published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{page.title} - Stats</h1>
            <p className="text-muted-foreground">
              Analytics dashboard for {business?.name || "this page"} · Last updated{" "}
              {formatDateTime(page.updated_at || page.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/protected/pages/${page.id}/edit`}>Edit Page</Link>
          </Button>
          {liveUrl ? (
            <Button asChild>
              <Link href={liveUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Live
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard key={metric.title} metric={metric} />
        ))}
      </div>

      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Engagement Breakdown (Unique People)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {engagementBreakdown.map((item) => {
            const Icon = item.icon;
            const width = engagementTotal > 0 ? Math.max(4, Math.round((item.value / engagementTotal) * 100)) : 0;

            return (
              <div key={item.label} className="grid gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0 md:grid-cols-[220px_1fr_40px] md:items-center">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                  <span className="truncate text-sm font-medium text-slate-800">{item.label}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: item.color }} />
                </div>
                <div className="text-right text-sm font-semibold text-slate-700">{item.value}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Kiosk Checkout Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {kioskCheckoutRows.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
              <LogOut className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-500">No checkout activity yet</p>
              <p className="text-xs text-slate-400">Resident, Guest / Family, and Vendor checkouts will appear here.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Checkout Time</th>
                      <th className="px-4 py-3">Visitor Type</th>
                      <th className="px-4 py-3">Person Checking Out</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Who Is Being Checked Out</th>
                      <th className="px-4 py-3">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kioskCheckoutRows.slice(0, 12).map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                          {formatDateTime(row.occurred_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatCheckoutVisitorType(row)}</td>
                        <td className="px-4 py-3 text-slate-700">{getCheckoutActorName(row) || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{row.company_name || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{getCheckoutSubject(row) || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{getCheckoutDuration(row) || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsList.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
                <Users className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-500">No leads yet</p>
                <p className="text-xs text-slate-400">Leads appear when visitors engage with your page</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {leadsList.slice(0, 8).map((lead) => (
                  <div key={lead.visitorId} className="flex items-center gap-3 py-3">
                    <LeadAvatar name={lead.name} isHot={lead.isHot} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-950">{lead.name || "Unknown User"}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {lead.isContacted
                          ? "Contacted"
                          : `${lead.meaningful} interaction${lead.meaningful !== 1 ? "s" : ""}`}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <LeadStatusBadge lead={lead} />
                      <span className="text-xs text-slate-400">{timeAgo(lead.lastSeen)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center rounded-xl border border-dashed p-8 text-center">
                <MousePointerClick className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-500">No activity yet</p>
                <p className="text-xs text-slate-400">Activity appears as visitors interact with your page</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((activity) => {
                  if (activity.kind === "checkout") {
                    const checkout = activity.checkout;
                    const duration = getCheckoutDuration(checkout);
                    const subject = getCheckoutSubject(checkout);
                    const details = [
                      `Visitor type: ${formatCheckoutVisitorType(checkout)}`,
                      checkout.company_name ? `Company: ${checkout.company_name}` : "",
                      subject ? `Checking out: ${subject}` : "",
                      duration ? `Duration: ${duration}` : "",
                    ].filter(Boolean);

                    return (
                      <div key={activity.id} className="flex items-start gap-3 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 text-slate-700">
                            <span className="font-semibold text-slate-950">
                              {getCheckoutActorName(checkout) || "Kiosk visitor"}
                            </span>
                            <span className="px-1 text-slate-400">·</span>
                            Checked out from kiosk
                          </p>
                          {details.length > 0 ? (
                            <p className="mt-1 text-xs leading-5 text-slate-500">{details.join(" · ")}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-right text-xs text-slate-400">
                          <span className="block">{timeAgo(checkout.occurred_at)}</span>
                          <span className="block whitespace-nowrap">{formatDateTime(checkout.occurred_at)}</span>
                        </span>
                      </div>
                    );
                  }

                  const event = activity.event;
                  const Icon = getEventIcon(event.event_type);
                  const actor = event.visitor_id ? visitorNameMap[event.visitor_id] || "Unknown User" : "Unknown User";

                  return (
                    <div key={activity.id} className="flex items-start gap-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-5 text-slate-700">
                          <span className="font-semibold text-slate-950">{actor}</span>
                          <span className="px-1 text-slate-400">·</span>
                          {formatEventLabel(event.event_type, event.event_data)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">{timeAgo(event.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Web analytics now uses the same external-event filtering, lead thresholds, QR scan source, and engagement categories as the mobile analytics screen.
        Average time on page: {metrics.avgTimeStr}
      </p>
    </div>
  );
}
