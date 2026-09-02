import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCrownAdminAccess } from "@/lib/organization-utils";

const TEAM_LICENSE_SEATS = 20;

function generateLicenseCode(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function ensureActiveLicenseMembership(
  adminSupabase: ReturnType<typeof createAdminClient>,
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
    return false;
  }

  const inactiveMembership = existingMemberships?.[0];
  if (inactiveMembership?.id) {
    const { error: updateError } = await adminSupabase
      .from("license_membership")
      .update({
        is_active: true,
        joined_at: new Date().toISOString(),
      })
      .eq("id", inactiveMembership.id);

    if (updateError) {
      throw updateError;
    }

    return true;
  }

  const { error: insertError } = await adminSupabase
    .from("license_membership")
    .insert({
      license_id: licenseId,
      user_id: userId,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

  if (insertError) {
    throw insertError;
  }

  return true;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
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

    const adminSupabase = createAdminClient();

    const [{ data: existingOwned }, { data: existingMembership }] = await Promise.all([
      adminSupabase
        .from("license")
        .select("id, code")
        .eq("purchased_by", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      adminSupabase
        .from("license_membership")
        .select(`
          id,
          license:license_id (
            code,
            is_active
          )
        `)
        .eq("user_id", id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);

    const membershipLicense = Array.isArray(existingMembership?.license)
      ? existingMembership.license[0]
      : existingMembership?.license;

    if (membershipLicense?.code) {
      return NextResponse.json({
        success: true,
        code: membershipLicense.code,
        alreadyExisted: true,
      });
    }

    if (existingOwned?.id && existingOwned.code) {
      let membershipCreated = false;
      try {
        membershipCreated = await ensureActiveLicenseMembership(
          adminSupabase,
          existingOwned.id,
          id,
        );
      } catch (membershipError) {
        return NextResponse.json(
          {
            error:
              membershipError instanceof Error
                ? membershipError.message
                : "Failed to activate license membership",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        code: existingOwned.code,
        alreadyExisted: true,
        membershipCreated,
      });
    }

    let code = "";
    let isUnique = false;
    while (!isUnique) {
      code = generateLicenseCode();
      const { data: existing } = await adminSupabase
        .from("license")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) {
        isUnique = true;
      }
    }

    const { data: planRows, error: planError } = await adminSupabase
      .from("plans_pricing")
      .select("id, min_seats, max_seats, pricing_type")
      .eq("is_active", true)
      .order("min_seats", { ascending: true });

    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    const chosenPlan =
      planRows?.find(
        (plan) =>
          plan.pricing_type === "multi_line_item" ||
          (plan.pricing_type === "fixed" &&
            plan.min_seats === 5 &&
            plan.max_seats === 5),
      ) ?? null;

    if (!chosenPlan?.id) {
      return NextResponse.json(
        { error: "No active team license plan is configured." },
        { status: 500 },
      );
    }

    const { data: insertedLicense, error: insertError } = await adminSupabase
      .from("license")
      .insert({
        code,
        max_seats: TEAM_LICENSE_SEATS,
        plan_pricing_id: chosenPlan.id,
        purchased_by: id,
        stripe_price_id: null,
        stripe_subscription_id: null,
        is_active: true,
        type: "organization",
      })
      .select("id, code")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    if (!insertedLicense?.code) {
      return NextResponse.json(
        { error: "Generated license key was not returned." },
        { status: 500 },
      );
    }

    try {
      await ensureActiveLicenseMembership(adminSupabase, insertedLicense.id, id);
    } catch (membershipError) {
      return NextResponse.json(
        {
          error:
            membershipError instanceof Error
              ? membershipError.message
              : "Failed to activate license membership",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, code: insertedLicense.code });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate team license key",
      },
      { status: 500 },
    );
  }
}
