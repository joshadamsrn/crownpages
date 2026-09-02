"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Download,
  Home,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatResidentInitials } from "@/lib/kiosk-resident-initials";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type VisitorAction = "check_in" | "check_out";
type VisitorType =
  | "Resident"
  | "Current Patient Visitor"
  | "Vendor"
  | "Maintenance"
  | "Clinical Support"
  | "Future Patient / Family"
  | "Other";
type LogStatus = "success" | "error";
type VisitorCategory = "Guest / Family" | "Resident" | "Vendor";
type VisitorMetric = "all" | VisitorCategory | "Checked In" | "Checked Out";
type DateRangeFilter = "1d" | "7d" | "30d" | "90d" | "all" | "custom";

type KioskVisitorRow = {
  id: string;
  business_id: string;
  page_id: string;
  first_name: string;
  last_name: string;
  visitor_type: VisitorType;
  visitor_type_other: string | null;
  action: VisitorAction;
  occurred_at: string;
  phone?: string | null;
  email?: string | null;
  company_name?: string | null;
  visiting?: string | null;
  purpose?: string | null;
  responsible_party?: string | null;
  checkout_duration?: string | null;
  checkout_type?: string | null;
  checking_out?: string | null;
  checked_out_first_name?: string | null;
  checked_out_last_name?: string | null;
  checked_out_full_name?: string | null;
  comments?: string | null;
  metadata?: Record<string, unknown> | null;
  status?: LogStatus | null;
  error_message?: string | null;
  pages?: { title?: string | null } | null;
  businesses?: { name?: string | null } | null;
};

type PageOption = {
  id: string;
  title: string;
  business_id: string;
  business_name: string | null;
};

type KioskVisitorLogProps = {
  accessMode?: "protected" | "kiosk";
  businessId?: string;
  businessName?: string | null;
  returnHref?: string;
  initialPageFilter?: string;
  initialRange?: DateRangeFilter;
};

const VISITOR_CATEGORIES: VisitorCategory[] = ["Guest / Family", "Resident", "Vendor"];
const VISITOR_METRICS: VisitorMetric[] = [
  "all",
  "Guest / Family",
  "Resident",
  "Vendor",
  "Checked In",
  "Checked Out",
];

const DATE_RANGE_OPTIONS: Array<{
  label: string;
  value: Exclude<DateRangeFilter, "custom">;
  days: number | null;
}> = [
  { label: "1D", value: "1d", days: 1 },
  { label: "7D", value: "7d", days: 7 },
  { label: "30D", value: "30d", days: 30 },
  { label: "90D", value: "90d", days: 90 },
  { label: "All", value: "all", days: null },
];

const VISITOR_THEME: Record<
  VisitorCategory,
  {
    accent: string;
    background: string;
    soft: string;
    border: string;
    icon: LucideIcon;
  }
> = {
  "Guest / Family": {
    accent: "#1d5fd8",
    background: "#eff5ff",
    soft: "#dfeaff",
    border: "#bfdbfe",
    icon: UsersRound,
  },
  Resident: {
    accent: "#16a34a",
    background: "#edf9ef",
    soft: "#d9f4df",
    border: "#bbf7d0",
    icon: Home,
  },
  Vendor: {
    accent: "#7c2dce",
    background: "#f4ecff",
    soft: "#eadcff",
    border: "#e9d5ff",
    icon: BriefcaseBusiness,
  },
};

function isDateRangeFilter(value: string | null | undefined): value is DateRangeFilter {
  return (
    value === "1d" ||
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "all" ||
    value === "custom"
  );
}

function formatDateInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDateRangeWindow(range: DateRangeFilter) {
  const end = new Date();
  const option = DATE_RANGE_OPTIONS.find((entry) => entry.value === range);

  if (!option || option.days === null) {
    return {
      startDate: "",
      endDate: formatDateInput(end),
    };
  }

  const start = new Date(end);
  start.setDate(end.getDate() - option.days);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function toStartIso(dateValue: string) {
  return dateValue ? new Date(`${dateValue}T00:00:00`).toISOString() : "";
}

function toEndIso(dateValue: string) {
  return dateValue ? new Date(`${dateValue}T23:59:59.999`).toISOString() : "";
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatTimeOnly(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDate(date, now)) {
    return `Today at ${formatTimeOnly(date)}`;
  }

  if (isSameDate(date, yesterday)) {
    return `Yesterday at ${formatTimeOnly(date)}`;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAction(action: VisitorAction) {
  return action === "check_in" ? "Checked In" : "Checked Out";
}

function getVisitorName(row: KioskVisitorRow) {
  return `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Visitor";
}

function getInitials(row: KioskVisitorRow) {
  return formatResidentInitials(row.first_name, row.last_name) || "?";
}

function escapeCsvCell(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? "" : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function getMetadataText(row: KioskVisitorRow, key: string) {
  const value = row.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function getResponsibleParty(row: KioskVisitorRow) {
  return row.responsible_party || getMetadataText(row, "responsibleParty");
}

function getCheckoutDuration(row: KioskVisitorRow) {
  return row.checkout_duration || getMetadataText(row, "checkoutDuration");
}

function getCheckoutType(row: KioskVisitorRow) {
  return row.checkout_type || getMetadataText(row, "checkoutType");
}

function getCheckingOut(row: KioskVisitorRow) {
  return row.checking_out || getMetadataText(row, "checkingOut");
}

function getCheckedOutFullName(row: KioskVisitorRow) {
  const explicitName = row.checked_out_full_name || getMetadataText(row, "checkedOutFullName");
  if (explicitName) return explicitName;

  return [
    row.checked_out_first_name || getMetadataText(row, "checkedOutFirstName"),
    row.checked_out_last_name || getMetadataText(row, "checkedOutLastName"),
  ]
    .filter(Boolean)
    .join(" ");
}

function getVisitorCategory(row: KioskVisitorRow): VisitorCategory {
  const checkoutType = row.action === "check_out" ? getCheckoutType(row).toLowerCase() : "";
  if (checkoutType.includes("resident")) return "Resident";
  if (checkoutType.includes("guest") || checkoutType.includes("family")) return "Guest / Family";
  if (checkoutType.includes("vendor")) return "Vendor";

  if (row.visitor_type === "Resident") return "Resident";
  if (
    row.visitor_type === "Current Patient Visitor" ||
    row.visitor_type === "Future Patient / Family"
  ) {
    return "Guest / Family";
  }

  return "Vendor";
}

function getVisitorTypeLabel(row: KioskVisitorRow) {
  return getVisitorCategory(row);
}

function getVisitingOrCheckingOut(row: KioskVisitorRow) {
  if (row.action === "check_out") {
    return getCheckedOutFullName(row) || getCheckingOut(row) || row.visiting || "";
  }

  return row.visiting || getResponsibleParty(row) || "";
}

function getVendorName(row: KioskVisitorRow) {
  return getVisitorCategory(row) === "Vendor" ? row.company_name || getMetadataText(row, "companyName") : "";
}

function getFacilityName(row: KioskVisitorRow) {
  return row.businesses?.name || row.pages?.title || "";
}

function getPurpose(row: KioskVisitorRow) {
  return row.purpose || getMetadataText(row, "purpose") || getMetadataText(row, "purposeOfVisit");
}

function getComments(row: KioskVisitorRow) {
  return row.comments || getMetadataText(row, "comments") || getMetadataText(row, "additionalComments");
}

function getSearchableMetadata(row: KioskVisitorRow) {
  return Object.values(row.metadata || {})
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function getMetricLabel(metric: VisitorMetric) {
  return metric === "all" ? "All Visitors" : metric;
}

function getMetricAccent(metric: VisitorMetric) {
  if (metric === "Resident") return VISITOR_THEME.Resident.accent;
  if (metric === "Vendor") return VISITOR_THEME.Vendor.accent;
  if (metric === "Checked In") return "#16a34a";
  if (metric === "Checked Out") return "#1d5fd8";
  return VISITOR_THEME["Guest / Family"].accent;
}

function getDetailLines(row: KioskVisitorRow) {
  return [
    `${formatAction(row.action)} on ${formatTimestamp(row.occurred_at)}`,
    getVisitorTypeLabel(row),
    getCheckoutDuration(row) ? `Duration: ${getCheckoutDuration(row)}` : "",
    getVisitingOrCheckingOut(row)
      ? `${row.action === "check_out" ? "Checking Out" : "Visiting"}: ${getVisitingOrCheckingOut(row)}`
      : "",
    row.phone ? `Phone: ${row.phone}` : "",
    row.email ? `Email: ${row.email}` : "",
    getVendorName(row) ? `Vendor: ${getVendorName(row)}` : "",
    getPurpose(row) ? `Purpose: ${getPurpose(row)}` : "",
    getComments(row) ? `Comments: ${getComments(row)}` : "",
    getFacilityName(row) ? `Company: ${getFacilityName(row)}` : "",
  ].filter(Boolean);
}

export function KioskVisitorLog({
  accessMode = "protected",
  businessId,
  businessName,
  returnHref,
  initialPageFilter = "All",
  initialRange = "1d",
}: KioskVisitorLogProps = {}) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const requestedRange = searchParams.get("range");
  const resolvedInitialRange = isDateRangeFilter(requestedRange) ? requestedRange : initialRange;
  const resolvedInitialPageFilter = searchParams.get("pageId") || initialPageFilter;
  const initialWindow = useMemo(() => getDateRangeWindow(resolvedInitialRange), [resolvedInitialRange]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<KioskVisitorRow[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [pageFilter, setPageFilter] = useState(resolvedInitialPageFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(resolvedInitialRange);
  const [startDate, setStartDate] = useState(initialWindow.startDate);
  const [endDate, setEndDate] = useState(initialWindow.endDate);
  const [visitorMetric, setVisitorMetric] = useState<VisitorMetric>("all");
  const [selectedVisitorTypes, setSelectedVisitorTypes] = useState<Record<VisitorCategory, boolean>>({
    "Guest / Family": true,
    Resident: true,
    Vendor: true,
  });
  const [selectedVisitor, setSelectedVisitor] = useState<KioskVisitorRow | null>(null);

  const startDateTime = useMemo(() => toStartIso(startDate), [startDate]);
  const endDateTime = useMemo(() => toEndIso(endDate), [endDate]);

  const loadPages = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const userEmail = (user.email || "").toLowerCase();
    const [
      { data: ownPages, error: ownPagesError },
      { data: kioskAdminRows, error: kioskAdminError },
      { data: shareRows, error: shareError },
    ] =
      await Promise.all([
        supabase
          .from("pages")
          .select("id, title, business_id, businesses(name)")
          .eq("created_by", user.id)
          .eq("is_active", true)
          .order("title", { ascending: true }),
        supabase
          .from("kiosk_admins")
          .select("business_id")
          .eq("user_id", user.id),
        supabase
          .from("page_shares")
          .select("page_id")
          .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${userEmail}`),
      ]);

    if (ownPagesError) throw ownPagesError;
    if (kioskAdminError) throw kioskAdminError;
    if (shareError) throw shareError;

    const kioskAdminBusinessIds = Array.from(
      new Set((kioskAdminRows || []).map((row: any) => row.business_id).filter(Boolean)),
    );

    let kioskAdminPages: any[] = [];
    if (kioskAdminBusinessIds.length > 0) {
      const { data, error: kioskAdminPagesError } = await supabase
        .from("pages")
        .select("id, title, business_id, businesses(name)")
        .in("business_id", kioskAdminBusinessIds)
        .eq("is_active", true)
        .order("title", { ascending: true });
      if (kioskAdminPagesError) throw kioskAdminPagesError;
      kioskAdminPages = data || [];
    }

    const sharedPageIds = Array.from(
      new Set((shareRows || []).map((row: any) => row.page_id).filter(Boolean)),
    );

    let sharedPages: any[] = [];
    if (sharedPageIds.length > 0) {
      const { data, error: sharedPagesError } = await supabase
        .from("pages")
        .select("id, title, business_id, businesses(name)")
        .in("id", sharedPageIds)
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (sharedPagesError) throw sharedPagesError;
      sharedPages = data || [];
    }

    const dedupedPages = Array.from(
      new Map([...(ownPages || []), ...kioskAdminPages, ...sharedPages].map((entry: any) => [entry.id, entry])).values(),
    );

    setPages(
      dedupedPages.map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        business_id: entry.business_id,
        business_name: entry.businesses?.name || null,
      })),
    );
  }, [supabase]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (accessMode === "kiosk") {
        if (!businessId) {
          throw new Error("Missing kiosk overview business.");
        }

        const params = new URLSearchParams({
          businessId,
          pageId: pageFilter,
          visitorType: "All",
          start: startDateTime,
          end: endDateTime,
        });
        const response = await fetch(`/api/kiosk/overview-data?${params.toString()}`, {
          credentials: "include",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load kiosk visitors.");
        }

        setPages((payload?.pages || []) as PageOption[]);
        setRows((payload?.rows || []) as unknown as KioskVisitorRow[]);
        return;
      }

      await loadPages();

      const pageSize = 1000;
      const allRows: KioskVisitorRow[] = [];

      for (let from = 0; ; from += pageSize) {
        let query = supabase
          .from("kiosk_visitor_logs" as any)
          .select("*, pages(title), businesses(name)")
          .order("occurred_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (pageFilter !== "All") {
          query = query.eq("page_id", pageFilter);
        }

        if (startDateTime) {
          query = query.gte("occurred_at", startDateTime);
        }

        if (endDateTime) {
          query = query.lte("occurred_at", endDateTime);
        }

        const { data, error: rowsError } = await query;
        if (rowsError) throw rowsError;

        const batch = (data || []) as unknown as KioskVisitorRow[];
        allRows.push(...batch);

        if (batch.length < pageSize) {
          break;
        }
      }

      setRows(allRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load kiosk visitors.");
    } finally {
      setLoading(false);
    }
  }, [accessMode, businessId, endDateTime, loadPages, pageFilter, startDateTime, supabase]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (accessMode !== "kiosk" || !returnHref) {
      return;
    }

    let timeout: number | undefined;
    const goBackToKiosk = () => {
      window.location.href = returnHref;
    };
    const restartIdleTimer = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(goBackToKiosk, 8000);
    };

    restartIdleTimer();

    const windowEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "touchmove",
      "wheel",
      "scroll",
    ];
    const documentEvents = ["input", "change", "focusin"];

    windowEvents.forEach((eventName) =>
      window.addEventListener(eventName, restartIdleTimer, { passive: true }),
    );
    documentEvents.forEach((eventName) =>
      document.addEventListener(eventName, restartIdleTimer),
    );

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      windowEvents.forEach((eventName) =>
        window.removeEventListener(eventName, restartIdleTimer),
      );
      documentEvents.forEach((eventName) =>
        document.removeEventListener(eventName, restartIdleTimer),
      );
    };
  }, [accessMode, returnHref]);

  useEffect(() => {
    if (!selectedVisitor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedVisitor(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVisitor]);

  const applyDateRange = useCallback((range: Exclude<DateRangeFilter, "custom">) => {
    const window = getDateRangeWindow(range);
    setDateRange(range);
    setStartDate(window.startDate);
    setEndDate(window.endDate);
  }, []);

  const searchableRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rows.filter((row) => {
      const category = getVisitorCategory(row);
      if (!selectedVisitorTypes[category]) return false;

      if (!query) return true;

      return [
        getVisitorName(row),
        row.phone,
        row.email,
        row.company_name,
        row.visiting,
        row.purpose,
        getResponsibleParty(row),
        getCheckoutDuration(row),
        getCheckoutType(row),
        getCheckingOut(row),
        getCheckedOutFullName(row),
        getVisitorTypeLabel(row),
        getFacilityName(row),
        getSearchableMetadata(row),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [rows, searchQuery, selectedVisitorTypes]);

  const visitorCounts = useMemo(() => {
    const counts = {
      all: searchableRows.length,
      "Guest / Family": 0,
      Resident: 0,
      Vendor: 0,
      "Checked In": 0,
      "Checked Out": 0,
    } as Record<VisitorMetric, number>;

    searchableRows.forEach((row) => {
      counts[getVisitorCategory(row)] += 1;
      counts[formatAction(row.action) as "Checked In" | "Checked Out"] += 1;
    });

    return counts;
  }, [searchableRows]);

  const filteredRows = useMemo(() => {
    return searchableRows.filter((row) => {
      if (visitorMetric === "all") return true;
      if (visitorMetric === "Checked In" || visitorMetric === "Checked Out") {
        return formatAction(row.action) === visitorMetric;
      }
      return getVisitorCategory(row) === visitorMetric;
    });
  }, [searchableRows, visitorMetric]);

  const exportCsv = () => {
    const header = [
      "Name",
      "Type",
      "Status",
      "Date & Time",
      "Duration",
      "Phone",
      "Email",
      "Visiting / Checking Out",
      "Vendor",
      "Purpose of Visit",
      "Company",
      "Page",
    ];
    const csvRows = filteredRows.map((row) => [
      getVisitorName(row),
      getVisitorTypeLabel(row),
      formatAction(row.action),
      formatTimestamp(row.occurred_at),
      getCheckoutDuration(row),
      row.phone || "",
      row.email || "",
      getVisitingOrCheckingOut(row),
      getVendorName(row),
      getPurpose(row),
      getFacilityName(row),
      row.pages?.title || "",
    ]);
    const csv = [header, ...csvRows]
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
      .join("\n");
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/kiosk/visitor-export";
    form.enctype = "multipart/form-data";
    form.hidden = true;

    const csvField = document.createElement("textarea");
    csvField.name = "csv";
    csvField.value = csv;
    form.appendChild(csvField);

    const filenameField = document.createElement("input");
    filenameField.type = "hidden";
    filenameField.name = "filename";
    filenameField.value = `kiosk-visitors-${formatDateInput(new Date())}.csv`;
    form.appendChild(filenameField);

    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => form.remove(), 1000);
  };

  const report = (
    <>
      <section className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.02em] text-slate-950 md:text-4xl">
              Visitor Report
            </h1>
            <p className="mt-1 text-base font-medium text-slate-600">All kiosk visitors</p>
          </div>
          {accessMode === "protected" ? (
            <div className="flex flex-wrap gap-3">
              {pages.length > 1 ? (
                <select
                  value={pageFilter}
                  onChange={(event) => setPageFilter(event.target.value)}
                  className="h-12 min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="All">All Pages</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.business_name ? `${page.business_name} - ${page.title}` : page.title}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-lg border-slate-200 px-5 text-base font-bold"
                onClick={() => void loadRows()}
              >
                <RefreshCw className="h-5 w-5" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-lg border-slate-200 px-5 text-base font-bold"
                onClick={exportCsv}
                disabled={filteredRows.length === 0}
              >
                <Download className="h-5 w-5" />
                Export CSV
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-base font-bold text-slate-950 shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              onClick={exportCsv}
              disabled={filteredRows.length === 0}
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-slate-950">
            <UserRound className="h-5 w-5" />
            <h2 className="text-lg font-black">Visitor Type</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {VISITOR_CATEGORIES.map((category) => {
              const theme = VISITOR_THEME[category];
              const Icon = theme.icon;
              const selected = selectedVisitorTypes[category];

              return (
                <button
                  key={category}
                  type="button"
                  className="flex min-h-[68px] items-center gap-4 rounded-md border border-transparent px-5 text-left transition active:scale-[0.99]"
                  style={{
                    backgroundColor: theme.background,
                    borderColor: selected ? theme.border : "transparent",
                  }}
                  onClick={() =>
                    setSelectedVisitorTypes((current) => ({
                      ...current,
                      [category]: !selected,
                    }))
                  }
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-slate-300 bg-white"
                    style={{
                      backgroundColor: selected ? theme.accent : "#fff",
                      borderColor: selected ? theme.accent : "#d1d5db",
                    }}
                  >
                    {selected ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
                  </span>
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: theme.soft }}
                  >
                    <Icon className="h-6 w-6" style={{ color: theme.accent }} />
                  </span>
                  <span className="text-xl font-black" style={{ color: theme.accent }}>
                    {category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-950" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, phone, email, company..."
              className="h-16 rounded-lg border-slate-200 bg-white pl-14 text-base font-medium shadow-sm"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-center gap-3 text-slate-950">
              <CalendarDays className="h-5 w-5" />
              <h2 className="text-base font-black">Date Filter</h2>
            </div>
            <div className="space-y-4">
              <div className="mx-auto grid w-full max-w-[760px] grid-cols-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {DATE_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "min-h-12 border-r border-slate-200 px-3 text-sm font-black text-slate-600 last:border-r-0 active:scale-[0.99]",
                      dateRange === option.value && "bg-white text-[#1d5fd8] ring-1 ring-inset ring-[#1d5fd8]",
                    )}
                    onClick={() => applyDateRange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mx-auto grid w-full max-w-[980px] gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <DateField
                  label="Start Date"
                  value={startDate}
                  onChange={(value) => {
                    setDateRange("custom");
                    setStartDate(value);
                  }}
                />
                <span className="hidden pb-3 text-xl font-bold text-slate-400 sm:block">-</span>
                <DateField
                  label="End Date"
                  value={endDate}
                  onChange={(value) => {
                    setDateRange("custom");
                    setEndDate(value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-7 overflow-x-auto border-b border-slate-200 pb-1">
          {VISITOR_METRICS.map((metric) => {
            const active = visitorMetric === metric;
            const accent = getMetricAccent(metric);
            const Icon =
              metric === "Resident"
                ? Home
                : metric === "Vendor"
                  ? BriefcaseBusiness
                  : metric === "Checked In" || metric === "Checked Out"
                    ? null
                    : UsersRound;

            return (
              <button
                key={metric}
                type="button"
                className="flex min-h-14 shrink-0 items-center gap-2 border-b-4 px-1 text-base font-black active:scale-[0.99]"
                style={{ borderBottomColor: active ? accent : "transparent", color: accent }}
                onClick={() => setVisitorMetric(metric)}
              >
                {Icon ? <Icon className="h-5 w-5" /> : <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />}
                <span>{getMetricLabel(metric)}</span>
                <span className="rounded-full px-2.5 py-1 text-sm" style={{ backgroundColor: `${accent}17` }}>
                  {visitorCounts[metric]}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-base font-semibold text-slate-500">
            Loading visitors...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-base font-semibold text-slate-500">
            No visitor activity found.
          </div>
        ) : (
          <VisitorTable rows={filteredRows} onSelect={setSelectedVisitor} />
        )}
      </section>

      {selectedVisitor ? (
        <VisitorDetailModal row={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
      ) : null}
    </>
  );

  if (accessMode === "kiosk") {
    return (
      <KioskReportShell businessName={businessName} returnHref={returnHref}>
        {report}
      </KioskReportShell>
    );
  }

  return report;
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0 space-y-2">
      <span className="block text-sm font-black text-slate-600">{label}</span>
      <span className="relative block">
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pr-10 text-base font-bold text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          aria-label={label}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-950" />
      </span>
    </label>
  );
}

function VisitorTable({
  rows,
  onSelect,
}: {
  rows: KioskVisitorRow[];
  onSelect: (row: KioskVisitorRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1420px] text-left text-sm">
          <thead className="bg-white text-xs font-black text-slate-950">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-4">Name</th>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4">Date & Time</th>
              <th className="px-4 py-4">Duration</th>
              <th className="px-4 py-4">Phone</th>
              <th className="px-4 py-4">Visiting / Checking Out</th>
              <th className="px-4 py-4">Vendor</th>
              <th className="px-4 py-4">Purpose of Visit</th>
              <th className="px-4 py-4">Company</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const category = getVisitorCategory(row);
              const theme = VISITOR_THEME[category];
              const checkedIn = row.action === "check_in";
              const statusAccent = checkedIn ? "#16a34a" : "#1d5fd8";

              return (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer bg-white outline-none transition hover:bg-slate-50 focus:bg-slate-50 active:bg-slate-100"
                  onClick={() => onSelect(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(row);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex min-w-[180px] items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black"
                        style={{ backgroundColor: theme.background, color: theme.accent }}
                      >
                        {getInitials(row)}
                      </span>
                      <span className="font-semibold text-slate-950">{getVisitorName(row)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Pill background={theme.background} color={theme.accent}>
                      {getVisitorTypeLabel(row)}
                    </Pill>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusAccent }} />
                      <Pill background={`${statusAccent}14`} color={statusAccent}>
                        {formatAction(row.action)}
                      </Pill>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{formatTimestamp(row.occurred_at)}</td>
                  <td className="px-4 py-3 text-slate-800">{getCheckoutDuration(row) || "-"}</td>
                  <td className="px-4 py-3 text-slate-800">{row.phone || "-"}</td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-800">
                    <span className="line-clamp-2">{getVisitingOrCheckingOut(row) || "-"}</span>
                  </td>
                  <td className="max-w-[190px] px-4 py-3 text-slate-800">
                    <span className="line-clamp-2">{getVendorName(row) || "-"}</span>
                  </td>
                  <td className="max-w-[190px] px-4 py-3 text-slate-800">
                    <span className="line-clamp-2">{getPurpose(row) || "-"}</span>
                  </td>
                  <td className="max-w-[190px] px-4 py-3 text-slate-800">
                    <span className="line-clamp-2">{getFacilityName(row) || "-"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({
  children,
  background,
  color,
}: {
  children: React.ReactNode;
  background: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-black"
      style={{ backgroundColor: background, color }}
    >
      {children}
    </span>
  );
}

function VisitorDetailModal({
  row,
  onClose,
}: {
  row: KioskVisitorRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${getVisitorName(row)} visitor details`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[640px] rounded-[44px] bg-[#3a3a3a] px-8 py-8 text-white shadow-2xl sm:px-12 sm:py-10">
        <h2 className="text-4xl font-semibold tracking-[-0.02em] sm:text-5xl">{getVisitorName(row)}</h2>
        <div className="mt-8 space-y-2 text-3xl font-light leading-tight text-white/65 sm:text-4xl">
          {getDetailLines(row).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button
          type="button"
          className="mt-12 flex h-20 w-full items-center justify-center rounded-full bg-white/15 text-4xl font-medium text-white transition active:scale-[0.99]"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function KioskReportShell({
  businessName,
  returnHref,
  children,
}: {
  businessName?: string | null;
  returnHref?: string;
  children: React.ReactNode;
}) {
  const initials =
    (businessName || "CP")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "CP";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="flex min-h-[84px] flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          {returnHref ? (
            <Link
              href={returnHref}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-5 text-base font-black text-slate-950 shadow-sm transition active:scale-[0.99]"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Kiosk
            </Link>
          ) : null}
          <Image
            src="/darklogo.png"
            alt="Crown Pages"
            width={150}
            height={48}
            className="h-10 w-auto object-contain sm:h-12"
            priority
          />
          <div className="hidden h-10 w-px bg-slate-200 sm:block" />
          <div className="text-base font-black text-slate-950">Visitor Report</div>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-950">
            {initials}
          </span>
          <span className="hidden max-w-[260px] truncate text-base font-black text-slate-950 sm:block">
            {businessName || "Crown Pages"}
          </span>
        </div>
      </header>
      <div className="mx-auto max-w-[1720px] px-4 py-6 sm:px-6 lg:px-10">{children}</div>
    </main>
  );
}
