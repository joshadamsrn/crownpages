import { NextRequest, NextResponse } from "next/server";

import {
  createKioskOverviewAccessToken,
  getKioskOverviewAccessMaxAge,
  KIOSK_OVERVIEW_COOKIE_NAME,
} from "@/lib/kiosk-overview-access";
import { parseKioskHomeRoute } from "@/lib/kiosk-home-route";
import { verifyKioskOverviewPassword } from "@/lib/kiosk-overview-password";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const pageId = typeof body?.pageId === "string" ? body.pageId : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const returnTo = parseKioskHomeRoute(body?.returnTo);

  if (!pageId || !password.trim()) {
    return NextResponse.json({ error: "Enter the kiosk overview password." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: page, error: pageError } = await adminSupabase
    .from("pages")
    .select("id, slug, business_id, businesses!inner(slug)")
    .eq("id", pageId)
    .eq("is_active", true)
    .maybeSingle();

  if (pageError || !page) {
    return NextResponse.json({ error: "Kiosk page not found." }, { status: 404 });
  }

  const { data: settings, error: settingsError } = await adminSupabase
    .from("kiosk_overview_settings")
    .select("password_hash")
    .eq("business_id", page.business_id)
    .maybeSingle();

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  if (!settings?.password_hash) {
    return NextResponse.json(
      { error: "The kiosk overview password has not been set yet." },
      { status: 409 },
    );
  }

  if (!verifyKioskOverviewPassword(password, settings.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const business = Array.isArray(page.businesses) ? page.businesses[0] : page.businesses;
  const url = `/${business?.slug || ""}/${page.slug}/kiosk-overview?range=1d&returnTo=${returnTo}`;
  const response = NextResponse.json({ url });

  response.cookies.set({
    name: KIOSK_OVERVIEW_COOKIE_NAME,
    value: createKioskOverviewAccessToken(page.business_id),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getKioskOverviewAccessMaxAge(),
  });

  return response;
}
