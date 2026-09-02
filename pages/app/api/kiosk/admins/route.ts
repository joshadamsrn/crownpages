import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AuthenticatedUser = {
  id: string;
  email?: string | null;
};

const MAX_KIOSK_ADMINS = 2;

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return { id: user.id, email: user.email };

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;

  const adminSupabase = createAdminClient();
  const {
    data: { user: tokenUser },
  } = await adminSupabase.auth.getUser(token);

  return tokenUser ? { id: tokenUser.id, email: tokenUser.email } : null;
}

async function getOwnedBusiness(userId: string, businessId: string) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("businesses")
    .select("id, name, slug, owner_id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  try {
    const business = await getOwnedBusiness(user.id, businessId);
    if (!business) return NextResponse.json({ error: "Only the business owner can manage kiosk administrators." }, { status: 403 });

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("kiosk_admins")
      .select("id, business_id, user_id, first_name, last_name, email, created_at, updated_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ business, admins: data || [], maxAdmins: MAX_KIOSK_ADMINS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load kiosk administrators." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const firstName = cleanName(body?.firstName);
  const lastName = cleanName(body?.lastName);
  const email = cleanEmail(body?.email);

  if (!businessId || !firstName || !lastName || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "First name, last name, and a valid email address are required." },
      { status: 400 },
    );
  }

  try {
    const business = await getOwnedBusiness(user.id, businessId);
    if (!business) return NextResponse.json({ error: "Only the business owner can manage kiosk administrators." }, { status: 403 });
    if (email === user.email?.trim().toLowerCase()) {
      return NextResponse.json({ error: "The account holder already has kiosk administration access." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { count, error: countError } = await adminSupabase
      .from("kiosk_admins")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    if (countError) throw countError;
    if ((count || 0) >= MAX_KIOSK_ADMINS) {
      return NextResponse.json({ error: "This business already has the maximum of two kiosk administrators." }, { status: 409 });
    }

    const { data: linkedUser } = await adminSupabase
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!linkedUser?.id) {
      return NextResponse.json(
        { error: "That email must already have a CrownPages account before kiosk access can be granted." },
        { status: 400 },
      );
    }

    const { data, error } = await adminSupabase
      .from("kiosk_admins")
      .insert({
        business_id: businessId,
        user_id: linkedUser.id,
        first_name: firstName,
        last_name: lastName,
        email,
        invited_by: user.id,
      })
      .select("id, business_id, user_id, first_name, last_name, email, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That email already has kiosk administration access." }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ admin: data, maxAdmins: MAX_KIOSK_ADMINS }, { status: 201 });
  } catch (error) {
    const databaseError = error as { code?: string };
    if (databaseError.code === "23514") {
      return NextResponse.json(
        { error: "This business already has the maximum of two kiosk administrators." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add kiosk administrator." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = request.nextUrl.searchParams.get("businessId") || "";
  const adminId = request.nextUrl.searchParams.get("adminId") || "";
  if (!businessId || !adminId) {
    return NextResponse.json({ error: "Missing businessId or adminId" }, { status: 400 });
  }

  try {
    const business = await getOwnedBusiness(user.id, businessId);
    if (!business) return NextResponse.json({ error: "Only the business owner can manage kiosk administrators." }, { status: 403 });

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("kiosk_admins")
      .delete()
      .eq("id", adminId)
      .eq("business_id", businessId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove kiosk administrator." },
      { status: 500 },
    );
  }
}
