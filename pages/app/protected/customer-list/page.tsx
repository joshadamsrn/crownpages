import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import {
  CustomerListAdmin,
  type CustomerListRow,
} from "@/components/customer-list-admin";

async function listAllAuthUsers(adminSupabase: ReturnType<typeof createAdminClient>) {
  const allUsers: Array<{
    id: string;
    app_metadata?: Record<string, unknown>;
    last_sign_in_at?: string | null;
  }> = [];

  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    allUsers.push(
      ...users.map((user) => ({
        id: user.id,
        app_metadata: (user.app_metadata as Record<string, unknown> | undefined) ?? {},
        last_sign_in_at: user.last_sign_in_at ?? null,
      })),
    );

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function listCustomerProfiles(adminSupabase: ReturnType<typeof createAdminClient>) {
  const baseSelect = "id, first_name, last_name, email, organization_id, created_at";
  const withActivitySelect = `${baseSelect}, last_activity_at`;

  const withActivityResult = await adminSupabase
    .from("users")
    .select(withActivitySelect)
    .order("created_at", { ascending: false });

  if (!withActivityResult.error) {
    return withActivityResult;
  }

  if (!withActivityResult.error.message?.toLowerCase().includes("last_activity_at")) {
    return withActivityResult;
  }

  const fallbackResult = await adminSupabase
    .from("users")
    .select(baseSelect)
    .order("created_at", { ascending: false });

  return {
    ...fallbackResult,
    data: (fallbackResult.data ?? []).map((row: any) => ({
      ...row,
      last_activity_at: null,
    })),
  };
}

export default async function CustomerListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const canManageCustomers = await hasCrownAdminAccess(user.id, supabase);
  if (!canManageCustomers) {
    redirect("/protected/pages");
  }

  const adminSupabase = createAdminClient();

  const usersResult = await listCustomerProfiles(adminSupabase);

  const [
    _usersPlaceholder,
    { data: businesses, error: businessesError },
    { data: pages, error: pagesError },
    { data: ownedLicenses, error: ownedLicensesError },
    { data: licenseMemberships, error: membershipsError },
    authUsers,
  ] = await Promise.all([
    Promise.resolve(usersResult),
    adminSupabase
      .from("businesses")
      .select("id, name, slug, website, owner_id, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("pages")
      .select("id, title, slug, business_id, is_active, is_published")
      .eq("is_active", true)
      .eq("is_published", true)
      .order("title", { ascending: true }),
    adminSupabase
      .from("license")
      .select("code, purchased_by, is_active")
      .eq("is_active", true),
    adminSupabase
      .from("license_membership")
      .select(`
          user_id,
          is_active,
          license:license_id (
            code,
            is_active
          )
        `)
      .eq("is_active", true),
    listAllAuthUsers(adminSupabase),
  ]);

  const { data: users, error: usersError } = _usersPlaceholder as Awaited<
    ReturnType<typeof listCustomerProfiles>
  >;
  if (usersError) throw new Error(usersError.message);

  if (businessesError) {
    throw new Error(businessesError.message);
  }

  if (pagesError) {
    throw new Error(pagesError.message);
  }

  if (ownedLicensesError) {
    throw new Error(ownedLicensesError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const authUsersById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const businessByOwnerId = new Map(
    (businesses ?? []).map((business) => [business.owner_id, business]),
  );
  const businessById = new Map((businesses ?? []).map((business) => [business.id, business]));
  const pagesByBusinessId = new Map<
    string,
    Array<{ id: string; title: string; url: string }>
  >();

  for (const page of pages ?? []) {
    if (!page.business_id) continue;
    const business = businessById.get(page.business_id);
    if (!business?.slug) continue;

    const businessPages = pagesByBusinessId.get(page.business_id) ?? [];
    businessPages.push({
      id: page.id,
      title: page.title || "Untitled Page",
      url: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://crownpages.com"}/${business.slug}/${page.slug}`,
    });
    pagesByBusinessId.set(page.business_id, businessPages);
  }
  const ownedLicenseByUserId = new Map(
    (ownedLicenses ?? []).map((license) => [license.purchased_by, license.code]),
  );
  const membershipLicenseByUserId = new Map(
    (licenseMemberships ?? [])
      .map((membership) => {
        const license = Array.isArray(membership.license) ? membership.license[0] : membership.license;
        return license?.code ? [membership.user_id, license.code] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );

  const rows: CustomerListRow[] = (users ?? [])
    .map((customer) => {
      const authUser = authUsersById.get(customer.id);
      const business = businessByOwnerId.get(customer.id) ?? null;
      const businessName = business?.name ?? "No Business";
      const teamLicense = ownedLicenseByUserId.get(customer.id) || membershipLicenseByUserId.get(customer.id) || "Free Account";

      return {
        id: customer.id,
        businessName,
        pages: business?.id ? pagesByBusinessId.get(business.id) ?? [] : [],
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        createdAt: customer.created_at,
        lastActivityAt: customer.last_activity_at ?? null,
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        teamLicense,
        isLocked: Boolean(authUser?.app_metadata?.customer_locked),
      };
    })
    .sort((a, b) => {
      const activityA = a.lastActivityAt
        ? new Date(a.lastActivityAt).getTime()
        : a.lastSignInAt
          ? new Date(a.lastSignInAt).getTime()
          : 0;
      const activityB = b.lastActivityAt
        ? new Date(b.lastActivityAt).getTime()
        : b.lastSignInAt
          ? new Date(b.lastSignInAt).getTime()
          : 0;

      if (activityB !== activityA) {
        return activityB - activityA;
      }

      return a.email.localeCompare(b.email);
    });

  return <CustomerListAdmin initialRows={rows} />;
}
