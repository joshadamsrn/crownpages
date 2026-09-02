import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

const PREMADE_PAGE_OWNER_EMAIL = "joshadamsrn@gmail.com";

type PremadePageResult = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  businessName: string | null;
  businessSlug: string | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canManageCustomers = await hasCrownAdminAccess(user.id, supabase);
  if (!canManageCustomers) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const adminSupabase = createAdminClient();
  const { data: sourceOwner, error: ownerError } = await adminSupabase
    .from("users")
    .select("id")
    .eq("email", PREMADE_PAGE_OWNER_EMAIL)
    .maybeSingle();

  if (ownerError) {
    return NextResponse.json({ error: ownerError.message }, { status: 500 });
  }

  if (!sourceOwner?.id) {
    return NextResponse.json({ results: [] });
  }

  const { data: sourceBusinesses, error: businessError } = await adminSupabase
    .from("businesses")
    .select("id, name, slug")
    .eq("owner_id", sourceOwner.id)
    .eq("is_active", true);

  if (businessError) {
    return NextResponse.json({ error: businessError.message }, { status: 500 });
  }

  const sourceBusinessIds = (sourceBusinesses || []).map((business) => business.id);
  const businessById = new Map(
    (sourceBusinesses || []).map((business) => [business.id, business]),
  );

  const pageRows = new Map<string, PremadePageResult>();

  const addPages = (rows: Array<Record<string, unknown>> | null) => {
    for (const row of rows || []) {
      const business = businessById.get(String(row.business_id));
      pageRows.set(String(row.id), {
        id: String(row.id),
        title: String(row.title || ""),
        slug: String(row.slug || ""),
        description: typeof row.description === "string" ? row.description : null,
        businessName: business?.name || null,
        businessSlug: business?.slug || null,
      });
    }
  };

  const { data: createdByPages, error: createdByError } = await adminSupabase
    .from("pages")
    .select("id, title, slug, description, business_id")
    .eq("created_by", sourceOwner.id)
    .eq("is_active", true)
    .ilike("title", `%${query}%`)
    .order("title", { ascending: true })
    .limit(25);

  if (createdByError) {
    return NextResponse.json({ error: createdByError.message }, { status: 500 });
  }

  addPages(createdByPages as Array<Record<string, unknown>> | null);

  if (sourceBusinessIds.length > 0 && pageRows.size < 25) {
    const { data: businessPages, error: businessPagesError } = await adminSupabase
      .from("pages")
      .select("id, title, slug, description, business_id")
      .in("business_id", sourceBusinessIds)
      .eq("is_active", true)
      .ilike("title", `%${query}%`)
      .order("title", { ascending: true })
      .limit(25);

    if (businessPagesError) {
      return NextResponse.json({ error: businessPagesError.message }, { status: 500 });
    }

    addPages(businessPages as Array<Record<string, unknown>> | null);
  }

  return NextResponse.json({
    results: Array.from(pageRows.values()).slice(0, 25),
  });
}
