import { NextRequest, NextResponse } from "next/server";

import {
  KIOSK_OVERVIEW_COOKIE_NAME,
  verifyKioskOverviewAccessToken,
} from "@/lib/kiosk-overview-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const VISITOR_PAGE_SIZE = 1000;

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get("businessId") || "";
  const pageFilter = request.nextUrl.searchParams.get("pageId") || "All";
  const visitorTypeFilter = request.nextUrl.searchParams.get("visitorType") || "All";
  const startDateTime = request.nextUrl.searchParams.get("start") || "";
  const endDateTime = request.nextUrl.searchParams.get("end") || "";
  const token = request.cookies.get(KIOSK_OVERVIEW_COOKIE_NAME)?.value;

  if (!verifyKioskOverviewAccessToken(token, businessId)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const adminSupabase = createAdminClient();
  const [{ data: pageRows, error: pageError }, rowsResult] = await Promise.all([
    adminSupabase
      .from("pages")
      .select("id, title, business_id, businesses(name)")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("title", { ascending: true }),
    (async () => {
      const rows: unknown[] = [];

      for (let from = 0; ; from += VISITOR_PAGE_SIZE) {
        let query = adminSupabase
          .from("kiosk_visitor_logs")
          .select("*, pages(title), businesses(name)")
          .eq("business_id", businessId)
          .order("occurred_at", { ascending: false })
          .range(from, from + VISITOR_PAGE_SIZE - 1);

        if (pageFilter !== "All") {
          query = query.eq("page_id", pageFilter);
        }

        if (visitorTypeFilter !== "All") {
          query = query.eq("visitor_type", visitorTypeFilter);
        }

        if (startDateTime) {
          query = query.gte("occurred_at", new Date(startDateTime).toISOString());
        }

        if (endDateTime) {
          query = query.lte("occurred_at", new Date(endDateTime).toISOString());
        }

        const result = await query;
        if (result.error) {
          return result;
        }

        const batch = result.data || [];
        rows.push(...batch);

        if (batch.length < VISITOR_PAGE_SIZE) {
          break;
        }
      }

      return { data: rows, error: null };
    })(),
  ]);

  if (pageError) {
    return NextResponse.json({ error: pageError.message }, { status: 500 });
  }

  if (rowsResult.error) {
    return NextResponse.json({ error: rowsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    pages: (pageRows || []).map((entry: any) => ({
      id: entry.id,
      title: entry.title,
      business_id: entry.business_id,
      business_name: entry.businesses?.name || null,
    })),
    rows: rowsResult.data || [],
  });
}
