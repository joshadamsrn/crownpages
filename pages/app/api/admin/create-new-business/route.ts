import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

const PREMADE_PAGE_OWNER_EMAIL = "joshadamsrn@gmail.com";
const AUTO_SHARE_EDIT_EMAILS = [
  "jkuya@hotmail.com",
  "afrasure74@gmail.com",
  "frasurekenny@yahoo.com",
  "parkerfrasure@gmail.com",
  "frasurepaxton@gmail.com",
];
const TEAM_LICENSE_SEATS = 20;

type AdminSupabase = ReturnType<typeof createAdminClient>;

type CreateBusinessPayload = {
  pageId?: string;
  pageName?: string;
  accountOwnerEmail?: string;
  accountPassword?: string;
  businessName?: string;
  businessDescription?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerRole?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  faxNumber?: string;
  mainOfficeNumber?: string;
  website?: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return getText(value).toLowerCase();
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

  return slug || "business";
}

async function findAvailableSlug(
  adminSupabase: AdminSupabase,
  table: "businesses" | "pages",
  baseSlug: string,
  excludeId?: string,
) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    let query = adminSupabase.from(table).select("id").eq("slug", candidate).limit(1);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw error;
    }

    if (!data?.id) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function generateLicenseCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function generateUniqueLicenseCode(adminSupabase: AdminSupabase) {
  while (true) {
    const code = generateLicenseCode();
    const { data, error } = await adminSupabase
      .from("license")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      return code;
    }
  }
}

async function getActiveLicenseSeatCount(adminSupabase: AdminSupabase, licenseId: string) {
  const { count, error } = await adminSupabase
    .from("license_membership")
    .select("*", { count: "exact", head: true })
    .eq("license_id", licenseId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function ensureTeamLicense(adminSupabase: AdminSupabase, userId: string) {
  const { data: existingMembership } = await adminSupabase
    .from("license_membership")
    .select(`
      id,
      license:license_id (
        id,
        code,
        is_active,
        max_seats
      )
    `)
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const membershipLicense = Array.isArray(existingMembership?.license)
    ? existingMembership.license[0]
    : existingMembership?.license;

  if (membershipLicense?.code && membershipLicense.is_active) {
    return {
      code: membershipLicense.code as string,
      maxSeats: Number(membershipLicense.max_seats) || TEAM_LICENSE_SEATS,
      activeSeats: await getActiveLicenseSeatCount(adminSupabase, membershipLicense.id as string),
    };
  }

  const { data: existingOwned } = await adminSupabase
    .from("license")
    .select("id, code, max_seats")
    .eq("purchased_by", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOwned?.id && existingOwned.code) {
    await ensureLicenseMembership(adminSupabase, existingOwned.id, userId);
    return {
      code: existingOwned.code as string,
      maxSeats: Number(existingOwned.max_seats) || TEAM_LICENSE_SEATS,
      activeSeats: await getActiveLicenseSeatCount(adminSupabase, existingOwned.id),
    };
  }

  const { data: planRows, error: planError } = await adminSupabase
    .from("plans_pricing")
    .select("id, min_seats, max_seats, pricing_type")
    .eq("is_active", true)
    .order("min_seats", { ascending: true });

  if (planError) {
    throw planError;
  }

  const chosenPlan =
    planRows?.find(
      (plan) =>
        plan.pricing_type === "multi_line_item" ||
        (plan.pricing_type === "fixed" && plan.min_seats === 5 && plan.max_seats === 5),
    ) ?? null;

  if (!chosenPlan?.id) {
    throw new Error("No active team license plan is configured.");
  }

  const code = await generateUniqueLicenseCode(adminSupabase);
  const { data: insertedLicense, error: insertError } = await adminSupabase
    .from("license")
    .insert({
      code,
      max_seats: TEAM_LICENSE_SEATS,
      plan_pricing_id: chosenPlan.id,
      purchased_by: userId,
      stripe_price_id: null,
      stripe_subscription_id: null,
      is_active: true,
      type: "organization",
    })
    .select("id, code")
    .single();

  if (insertError) {
    throw insertError;
  }

  await ensureLicenseMembership(adminSupabase, insertedLicense.id, userId);
  return {
    code: insertedLicense.code as string,
    maxSeats: TEAM_LICENSE_SEATS,
    activeSeats: await getActiveLicenseSeatCount(adminSupabase, insertedLicense.id),
  };
}

async function ensureLicenseMembership(
  adminSupabase: AdminSupabase,
  licenseId: string,
  userId: string,
) {
  const { data: existingMemberships, error: lookupError } = await adminSupabase
    .from("license_membership")
    .select("id, is_active")
    .eq("license_id", licenseId)
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  if (lookupError) {
    throw lookupError;
  }

  const activeMembership = existingMemberships?.find((membership) => membership.is_active);
  if (activeMembership) {
    return;
  }

  const inactiveMembership = existingMemberships?.[0];
  if (inactiveMembership?.id) {
    const { error } = await adminSupabase
      .from("license_membership")
      .update({
        is_active: true,
        joined_at: new Date().toISOString(),
      })
      .eq("id", inactiveMembership.id);

    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await adminSupabase.from("license_membership").insert({
    license_id: licenseId,
    user_id: userId,
    is_active: true,
    joined_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function ensureOwnerAccount(
  adminSupabase: AdminSupabase,
  payload: Required<Pick<CreateBusinessPayload, "accountOwnerEmail" | "accountPassword" | "ownerFirstName" | "ownerLastName" | "ownerPhone">>,
) {
  const email = normalizeEmail(payload.accountOwnerEmail);
  const { data: existingProfile, error: profileLookupError } = await adminSupabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (profileLookupError) {
    throw profileLookupError;
  }

  let userId = existingProfile?.id as string | undefined;

  if (!userId) {
    const { data: authData, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email,
      password: payload.accountPassword,
      email_confirm: true,
      user_metadata: {
        first_name: payload.ownerFirstName,
        last_name: payload.ownerLastName,
        phone: payload.ownerPhone,
      },
    });

    if (createUserError) {
      throw createUserError;
    }

    userId = authData.user?.id;
  } else {
    const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: payload.accountPassword,
      email_confirm: true,
      user_metadata: {
        first_name: payload.ownerFirstName,
        last_name: payload.ownerLastName,
        phone: payload.ownerPhone,
      },
    });

    if (updateAuthError) {
      throw updateAuthError;
    }
  }

  if (!userId) {
    throw new Error("Unable to create or update the account owner.");
  }

  const { error: upsertProfileError } = await adminSupabase.from("users").upsert({
    id: userId,
    email,
    first_name: payload.ownerFirstName,
    last_name: payload.ownerLastName,
    phone: payload.ownerPhone,
    user_type: "individual",
  });

  if (upsertProfileError) {
    throw upsertProfileError;
  }

  return { id: userId, email };
}

async function ensureOrganization(
  adminSupabase: AdminSupabase,
  payload: {
    ownerId: string;
    name: string;
    email: string;
  },
) {
  const { data: existingByOwner, error: ownerLookupError } = await adminSupabase
    .from("organizations")
    .select("id")
    .eq("owner_id", payload.ownerId)
    .maybeSingle();

  if (ownerLookupError) {
    throw ownerLookupError;
  }

  if (existingByOwner?.id) {
    const { data: organization, error } = await adminSupabase
      .from("organizations")
      .update({
        name: payload.name,
        email: payload.email,
        is_active: true,
      })
      .eq("id", existingByOwner.id)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return organization.id as string;
  }

  const { data: organization, error } = await adminSupabase
    .from("organizations")
    .insert({
      name: payload.name,
      email: payload.email,
      owner_id: payload.ownerId,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return organization.id as string;
}

function updatePageContentWithProfile(
  content: unknown,
  profile: {
    businessName: string;
    businessDescription: string;
    ownerName: string;
    ownerRole: string;
    ownerPhone: string;
    ownerEmail: string;
    faxNumber: string;
    mainOfficeNumber: string;
    website: string;
  },
) {
  if (!content || typeof content !== "object" || !Array.isArray((content as { sections?: unknown }).sections)) {
    return content;
  }

  const nextContent = structuredClone(content) as { sections: Array<Record<string, unknown>> };

  nextContent.sections = nextContent.sections.map((section) => {
    const data =
      section.data && typeof section.data === "object"
        ? { ...(section.data as Record<string, unknown>) }
        : {};

    switch (section.type) {
      case "companyHeader":
        data.companyName = profile.businessName;
        break;
      case "contactCard":
        data.name = profile.ownerName;
        data.contactName = profile.ownerName;
        data.role = profile.ownerRole;
        data.contactRole = profile.ownerRole;
        data.phone = profile.ownerPhone;
        data.email = profile.ownerEmail;
        data.fax = profile.faxNumber;
        data.link = profile.website;
        data.communityName = profile.businessName;
        break;
      case "linksWithContact":
        data.contactName = profile.ownerName;
        data.contactRole = profile.ownerRole;
        data.contactPhone = profile.ownerPhone;
        data.contactPhone2 = profile.mainOfficeNumber;
        data.contactEmail = profile.ownerEmail;
        data.contactFax = profile.faxNumber;
        data.contactWebsite = profile.website;
        if (data.contactButton && typeof data.contactButton === "object") {
          const contactButton = { ...(data.contactButton as Record<string, unknown>) };
          contactButton.contactData = {
            ...((contactButton.contactData as Record<string, unknown> | undefined) || {}),
            contactName: profile.ownerName,
            contactRole: profile.ownerRole,
            phone: profile.ownerPhone,
            personalPhone: profile.mainOfficeNumber,
            email: profile.ownerEmail,
            fax: profile.faxNumber,
            link: profile.website,
          };
          data.contactButton = contactButton;
        }
        break;
      case "multiContact":
        data.businessInfo = [
          {
            id: "business_1",
            name: profile.businessName,
            address: "",
            phone: profile.mainOfficeNumber || profile.ownerPhone,
            fax: profile.faxNumber,
            email: profile.ownerEmail,
            website: profile.website,
          },
        ];
        data.contactPersons = [
          {
            id: "contact_1",
            name: profile.ownerName,
            title: profile.ownerRole,
            phone: profile.ownerPhone,
            email: profile.ownerEmail,
          },
        ];
        break;
      case "medicalProvider":
        data.facilityName = profile.businessName;
        data.serviceDescription = profile.businessDescription;
        data.phone = profile.mainOfficeNumber || profile.ownerPhone;
        data.fax = profile.faxNumber;
        data.email = profile.ownerEmail;
        data.website = profile.website;
        data.admissionCoordinator = profile.ownerName;
        data.admissionCoordinatorPhone = profile.ownerPhone;
        data.admissionCoordinatorEmail = profile.ownerEmail;
        break;
      case "personalContact":
        data.name = profile.ownerName;
        data.title = profile.ownerRole;
        data.phone = profile.ownerPhone;
        data.email = profile.ownerEmail;
        data.website = profile.website;
        break;
      default:
        break;
    }

    return { ...section, data };
  });

  return nextContent;
}

async function ensureAdminEditShares(
  adminSupabase: AdminSupabase,
  pageId: string,
  sharedByUserId: string,
) {
  const { data: adminProfiles } = await adminSupabase
    .from("users")
    .select("id, email")
    .in("email", AUTO_SHARE_EDIT_EMAILS);

  const profileByEmail = new Map(
    (adminProfiles || []).map((profile) => [String(profile.email).toLowerCase(), profile]),
  );

  for (const email of AUTO_SHARE_EDIT_EMAILS) {
    const profile = profileByEmail.get(email);
    const { data: existingShares, error: lookupError } = await adminSupabase
      .from("page_shares")
      .select("id")
      .eq("page_id", pageId)
      .eq("shared_with_email", email);

    if (lookupError) {
      throw lookupError;
    }

    if (existingShares && existingShares.length > 0) {
      const { error } = await adminSupabase
        .from("page_shares")
        .update({
          permission: "edit",
          shared_with_user_id: profile?.id || null,
        })
        .in(
          "id",
          existingShares.map((share) => share.id),
        );

      if (error) {
        throw error;
      }
      continue;
    }

    const { error } = await adminSupabase.from("page_shares").insert({
      page_id: pageId,
      shared_by: sharedByUserId,
      shared_with_email: email,
      shared_with_user_id: profile?.id || null,
      permission: "edit",
    });

    if (error) {
      throw error;
    }
  }
}

export async function POST(request: Request) {
  try {
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

    const body = (await request.json()) as CreateBusinessPayload;
    const requiredFields = {
      pageId: getText(body.pageId),
      pageName: getText(body.pageName),
      accountOwnerEmail: normalizeEmail(body.accountOwnerEmail),
      accountPassword: getText(body.accountPassword),
      businessName: getText(body.businessName),
      businessDescription: getText(body.businessDescription),
      ownerFirstName: getText(body.ownerFirstName),
      ownerLastName: getText(body.ownerLastName),
      ownerRole: getText(body.ownerRole),
      ownerPhone: getText(body.ownerPhone),
      ownerEmail: normalizeEmail(body.ownerEmail),
    };
    const optionalFields = {
      faxNumber: getText(body.faxNumber),
      mainOfficeNumber: getText(body.mainOfficeNumber),
      website: getText(body.website),
    };

    const missingField = Object.entries(requiredFields).find(([, value]) => !value)?.[0];
    if (missingField) {
      return NextResponse.json({ error: `${missingField} is required.` }, { status: 400 });
    }

    if (requiredFields.accountPassword.length < 8) {
      return NextResponse.json(
        { error: "Account password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data: sourceOwner, error: sourceOwnerError } = await adminSupabase
      .from("users")
      .select("id")
      .eq("email", PREMADE_PAGE_OWNER_EMAIL)
      .maybeSingle();

    if (sourceOwnerError) {
      throw sourceOwnerError;
    }

    if (!sourceOwner?.id) {
      return NextResponse.json(
        { error: `Premade page owner ${PREMADE_PAGE_OWNER_EMAIL} was not found.` },
        { status: 500 },
      );
    }

    const { data: selectedPage, error: selectedPageError } = await adminSupabase
      .from("pages")
      .select("*, businesses!inner(owner_id)")
      .eq("id", requiredFields.pageId)
      .eq("is_active", true)
      .maybeSingle();

    if (selectedPageError) {
      throw selectedPageError;
    }

    const selectedPageBusiness = Array.isArray(selectedPage?.businesses)
      ? selectedPage?.businesses[0]
      : selectedPage?.businesses;
    const pageIsOwnedBySource =
      selectedPage?.created_by === sourceOwner.id ||
      selectedPageBusiness?.owner_id === sourceOwner.id;

    if (!selectedPage || !pageIsOwnedBySource) {
      return NextResponse.json(
        { error: "Selected page is not available in Josh Adams RN premade pages." },
        { status: 400 },
      );
    }

    const ownerAccount = await ensureOwnerAccount(adminSupabase, {
      accountOwnerEmail: requiredFields.accountOwnerEmail,
      accountPassword: requiredFields.accountPassword,
      ownerFirstName: requiredFields.ownerFirstName,
      ownerLastName: requiredFields.ownerLastName,
      ownerPhone: requiredFields.ownerPhone,
    });

    const organizationId = await ensureOrganization(adminSupabase, {
      ownerId: ownerAccount.id,
      name: requiredFields.businessName,
      email: requiredFields.accountOwnerEmail,
    });

    const { error: ownerOrganizationError } = await adminSupabase
      .from("users")
      .update({
        organization_id: organizationId,
        user_type: "organization_owner",
      })
      .eq("id", ownerAccount.id);

    if (ownerOrganizationError) {
      throw ownerOrganizationError;
    }

    const teamLicense = await ensureTeamLicense(adminSupabase, ownerAccount.id);

    const businessSlug = await findAvailableSlug(
      adminSupabase,
      "businesses",
      slugify(requiredFields.businessName),
    );
    const { data: business, error: businessInsertError } = await adminSupabase
      .from("businesses")
      .insert({
        owner_id: ownerAccount.id,
        name: requiredFields.businessName,
        slug: businessSlug,
        description: requiredFields.businessDescription,
        email: requiredFields.ownerEmail,
        phone: optionalFields.mainOfficeNumber || requiredFields.ownerPhone,
        website: optionalFields.website || null,
        primary_color: "#2563EB",
        secondary_color: "#1E40AF",
        font_family: "Inter",
        is_active: true,
      })
      .select("id, slug")
      .single();

    if (businessInsertError) {
      throw businessInsertError;
    }

    const pageSlug = await findAvailableSlug(
      adminSupabase,
      "pages",
      slugify(requiredFields.pageName),
      requiredFields.pageId,
    );
    const ownerName = `${requiredFields.ownerFirstName} ${requiredFields.ownerLastName}`.trim();
    const nextContent = updatePageContentWithProfile(selectedPage.content, {
      businessName: requiredFields.businessName,
      businessDescription: requiredFields.businessDescription,
      ownerName,
      ownerRole: requiredFields.ownerRole,
      ownerPhone: requiredFields.ownerPhone,
      ownerEmail: requiredFields.ownerEmail,
      faxNumber: optionalFields.faxNumber,
      mainOfficeNumber: optionalFields.mainOfficeNumber,
      website: optionalFields.website,
    });

    const { data: movedPage, error: movePageError } = await adminSupabase
      .from("pages")
      .update({
        business_id: business.id,
        created_by: ownerAccount.id,
        title: requiredFields.pageName,
        slug: pageSlug,
        description: requiredFields.businessDescription,
        content: nextContent,
        meta_title: requiredFields.pageName,
        meta_description: requiredFields.businessDescription,
        is_active: true,
        is_published: true,
        published_at: selectedPage.published_at || new Date().toISOString(),
      })
      .eq("id", requiredFields.pageId)
      .select("id, title, slug")
      .single();

    if (movePageError) {
      throw movePageError;
    }

    await ensureAdminEditShares(adminSupabase, movedPage.id, user.id);

    return NextResponse.json({
      success: true,
      businessId: business.id,
      businessSlug: business.slug,
      pageId: movedPage.id,
      pageSlug: movedPage.slug,
      pageTitle: movedPage.title,
      accountOwnerEmail: ownerAccount.email,
      licenseCode: teamLicense.code,
      licenseMaxSeats: teamLicense.maxSeats,
      licenseActiveSeats: teamLicense.activeSeats,
      sharedWith: AUTO_SHARE_EDIT_EMAILS,
      publicPath: `/${business.slug}/${movedPage.slug}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error, "Failed to create the new business profile."),
      },
      { status: 500 },
    );
  }
}
