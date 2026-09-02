import { NextRequest, NextResponse } from "next/server";

import {
  KIOSK_TEMPLATE_BY_KEY,
  type KioskTemplateKey,
} from "@/lib/kiosk-template-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

type PageAccessRow = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  created_by: string;
  businesses: {
    name: string;
    slug: string;
  } | null;
};

type ShareRow = {
  page_id: string;
  permission: "view" | "edit" | null;
};

const MAX_SHORT_TEXT_LENGTH = 120;
const MAX_SCAN_TEXT_LENGTH = 180;
const MAX_SCAN_ITEMS = 6;
const MAX_LOGO_PATH_LENGTH = 500;
const SETTINGS_SELECT_COLUMNS =
  "page_id, business_id, template_key, display_page_name, welcome_title, welcome_subtitle, scan_title, scan_description, scan_items, kiosk_logo_url, hide_intake_form_button, hide_check_in_out_button, hide_review_button, updated_at";

function cleanText(value: unknown, maxLength = MAX_SHORT_TEXT_LENGTH) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function cleanScanItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => cleanText(item, MAX_SCAN_TEXT_LENGTH))
    .filter((item): item is string => Boolean(item))
    .slice(0, MAX_SCAN_ITEMS);
}

function cleanLogoPath(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized) return null;

  return normalized.slice(0, MAX_LOGO_PATH_LENGTH);
}

function cleanBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function parseTemplateKey(value: unknown): KioskTemplateKey | null {
  return typeof value === "string" && value in KIOSK_TEMPLATE_BY_KEY
    ? (value as KioskTemplateKey)
    : null;
}

async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { id: user.id, email: user.email };
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return null;
  }

  const adminSupabase = createAdminClient();
  const {
    data: { user: tokenUser },
  } = await adminSupabase.auth.getUser(token);

  return tokenUser ? { id: tokenUser.id, email: tokenUser.email } : null;
}

async function getAccessContext(user: AuthenticatedUser) {
  const adminSupabase = createAdminClient();
  const userEmail = user.email?.toLowerCase() || "";

  const [{ data: memberRows }, { data: kioskAdminRows }, { data: shareRows }] = await Promise.all([
    adminSupabase
      .from("business_members")
      .select("business_id")
      .or(`user_id.eq.${user.id},invited_email.eq.${userEmail}`),
    adminSupabase
      .from("kiosk_admins")
      .select("business_id")
      .eq("user_id", user.id),
    adminSupabase
      .from("page_shares")
      .select("page_id, permission")
      .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${userEmail}`),
  ]);

  const memberBusinessIds = Array.from(
    new Set(
      [...(memberRows || []), ...(kioskAdminRows || [])]
        .map((row: { business_id: string | null }) => row.business_id)
        .filter(Boolean),
    ),
  ) as string[];
  const shares = ((shareRows || []) as ShareRow[]).filter((row) => row.page_id);
  const sharedPageIds = Array.from(new Set(shares.map((row) => row.page_id)));
  const editableSharedPageIds = new Set(
    shares.filter((row) => row.permission === "edit").map((row) => row.page_id),
  );

  return { memberBusinessIds, sharedPageIds, editableSharedPageIds };
}

function getPageFilters(user: AuthenticatedUser, memberBusinessIds: string[], sharedPageIds: string[]) {
  const filters = [`created_by.eq.${user.id}`];
  if (memberBusinessIds.length > 0) {
    filters.push(`business_id.in.(${memberBusinessIds.join(",")})`);
  }
  if (sharedPageIds.length > 0) {
    filters.push(`id.in.(${sharedPageIds.join(",")})`);
  }
  return filters.join(",");
}

async function getAccessiblePages(user: AuthenticatedUser) {
  const adminSupabase = createAdminClient();
  const access = await getAccessContext(user);

  const { data, error } = await adminSupabase
    .from("pages")
    .select(
      `
        id,
        title,
        slug,
        business_id,
        created_by,
        businesses (
          name,
          slug
        )
      `,
    )
    .eq("is_active", true)
    .or(getPageFilters(user, access.memberBusinessIds, access.sharedPageIds))
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  const pages = ((data || []) as unknown as PageAccessRow[]).map((page) => ({
    ...page,
    canEdit:
      page.created_by === user.id ||
      access.memberBusinessIds.includes(page.business_id) ||
      access.editableSharedPageIds.has(page.id),
  }));

  return pages;
}

async function getEditablePage(user: AuthenticatedUser, pageId: string) {
  const pages = await getAccessiblePages(user);
  return pages.find((page) => page.id === pageId && page.canEdit) || null;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const adminSupabase = createAdminClient();
    const pages = await getAccessiblePages(user);
    const pageIds = pages.map((page) => page.id);

    const { data: settings, error } = pageIds.length > 0
      ? await adminSupabase
        .from("kiosk_template_settings")
        .select(SETTINGS_SELECT_COLUMNS)
        .in("page_id", pageIds)
      : { data: [], error: null };

    if (error) {
      throw error;
    }

    return NextResponse.json({
      pages: pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        businessId: page.business_id,
        businessName: page.businesses?.name || "",
        businessSlug: page.businesses?.slug || "",
        canEdit: page.canEdit,
      })),
      settings: settings || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load kiosk template settings." },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const pageId = typeof body?.pageId === "string" ? body.pageId : "";
  const templateKey = parseTemplateKey(body?.templateKey);

  if (!pageId || !templateKey) {
    return NextResponse.json({ error: "Missing pageId or templateKey." }, { status: 400 });
  }

  const page = await getEditablePage(user, pageId);
  if (!page) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const payload = {
    page_id: page.id,
    business_id: page.business_id,
    template_key: templateKey,
    display_page_name: cleanText(body?.displayPageName),
    welcome_title: cleanText(body?.welcomeTitle),
    welcome_subtitle: cleanText(body?.welcomeSubtitle, MAX_SCAN_TEXT_LENGTH),
    scan_title: cleanText(body?.scanTitle),
    scan_description: cleanText(body?.scanDescription, MAX_SCAN_TEXT_LENGTH),
    scan_items: cleanScanItems(body?.scanItems),
    kiosk_logo_url: cleanLogoPath(body?.kioskLogoUrl),
    hide_intake_form_button: cleanBoolean(body?.hideIntakeFormButton),
    hide_check_in_out_button: cleanBoolean(body?.hideCheckInOutButton),
    hide_review_button: cleanBoolean(body?.hideReviewButton, true),
    updated_by: user.id,
    updated_at: now,
  };

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("kiosk_template_settings")
    .upsert(payload, { onConflict: "page_id,template_key" })
    .select(SETTINGS_SELECT_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: logoUpdateError } = await adminSupabase
    .from("kiosk_template_settings")
    .update({
      kiosk_logo_url: payload.kiosk_logo_url,
      updated_by: user.id,
      updated_at: now,
    })
    .eq("page_id", page.id);

  if (logoUpdateError) {
    return NextResponse.json({ error: logoUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ setting: data });
}
