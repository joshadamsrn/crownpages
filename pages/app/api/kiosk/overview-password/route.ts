import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashKioskOverviewPassword } from "@/lib/kiosk-overview-password";

export const runtime = "nodejs";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

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

async function canManageBusiness(user: AuthenticatedUser, businessId: string) {
  const adminSupabase = createAdminClient();

  const { data: business, error: businessError } = await adminSupabase
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    return false;
  }

  if (business.owner_id === user.id) {
    return true;
  }

  const normalizedEmail = user.email?.toLowerCase();
  const memberFilters = [`user_id.eq.${user.id}`];
  if (normalizedEmail) {
    memberFilters.push(`invited_email.eq.${normalizedEmail}`);
  }

  const { data: member } = await adminSupabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .or(memberFilters.join(","))
    .maybeSingle();

  if (member) return true;

  const { data: kioskAdmin } = await adminSupabase
    .from("kiosk_admins")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(kioskAdmin);
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("kiosk_overview_settings")
    .select("updated_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    isConfigured: Boolean(data),
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json(
      { error: "Password must be at least 4 characters." },
      { status: 400 },
    );
  }

  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("kiosk_overview_settings").upsert(
    {
      business_id: businessId,
      password_hash: hashKioskOverviewPassword(password),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    isConfigured: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const businessId = request.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("kiosk_overview_settings")
    .delete()
    .eq("business_id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ isConfigured: false, updatedAt: null });
}
