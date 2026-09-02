import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

function normalizeReviewUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { id: user.id, email: user.email };

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;

  const admin = createAdminClient();
  const {
    data: { user: tokenUser },
  } = await admin.auth.getUser(token);

  return tokenUser ? { id: tokenUser.id, email: tokenUser.email } : null;
}

async function canManageBusiness(user: AuthenticatedUser, businessId: string) {
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!business) return false;
  if (business.owner_id === user.id) return true;

  const memberFilters = [`user_id.eq.${user.id}`];
  if (user.email) memberFilters.push(`invited_email.eq.${user.email.toLowerCase()}`);

  const { data: member } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .or(memberFilters.join(","))
    .maybeSingle();

  if (member) return true;

  const { data: kioskAdmin } = await admin
    .from("kiosk_admins")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(kioskAdmin);
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("kiosk_feedback_settings")
    .select("review_url, updated_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    reviewUrl: data?.review_url ?? null,
    updatedAt: data?.updated_at ?? null,
    isConfigured: Boolean(data?.review_url),
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const rawReviewUrl = typeof body?.reviewUrl === "string" ? body.reviewUrl.trim() : "";
  const reviewUrl = normalizeReviewUrl(rawReviewUrl);

  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  if (rawReviewUrl && !reviewUrl) {
    return NextResponse.json({ error: "Enter a valid http or https URL." }, { status: 400 });
  }
  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!reviewUrl) {
    const { error } = await admin.from("kiosk_feedback_settings").delete().eq("business_id", businessId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reviewUrl: null, updatedAt: null, isConfigured: false });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await admin.from("kiosk_feedback_settings").upsert(
    {
      business_id: businessId,
      review_url: reviewUrl,
      updated_at: updatedAt,
      updated_by: user.id,
    },
    { onConflict: "business_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviewUrl, updatedAt, isConfigured: true });
}
