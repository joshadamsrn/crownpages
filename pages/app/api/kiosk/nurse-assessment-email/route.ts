import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
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
    .from("nurse_assessment_settings")
    .select("recipient_email, updated_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    recipientEmail: data?.recipient_email ?? null,
    updatedAt: data?.updated_at ?? null,
    isConfigured: Boolean(data?.recipient_email),
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const recipientEmail = typeof body?.recipientEmail === "string" ? body.recipientEmail.trim() : "";

  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  if (recipientEmail && !isValidEmail(recipientEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!(await canManageBusiness(user, businessId))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const updatedAt = new Date().toISOString();

  if (!recipientEmail) {
    const { error } = await adminSupabase
      .from("nurse_assessment_settings")
      .delete()
      .eq("business_id", businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      recipientEmail: null,
      updatedAt: null,
      isConfigured: false,
    });
  }

  const { error } = await adminSupabase.from("nurse_assessment_settings").upsert(
    {
      business_id: businessId,
      recipient_email: recipientEmail,
      updated_at: updatedAt,
      updated_by: user.id,
    },
    { onConflict: "business_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    recipientEmail,
    updatedAt,
    isConfigured: true,
  });
}
