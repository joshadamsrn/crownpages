import { NextRequest, NextResponse } from "next/server";

import { createCrmContact, logCrmActivity } from "@/lib/crm";
import { normalizeUsPhone, sendSmsMessage } from "@/lib/page-engagement-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type VisitorType =
  | "Resident"
  | "Current Patient Visitor"
  | "Vendor"
  | "Maintenance"
  | "Clinical Support"
  | "Future Patient / Family"
  | "Other";

const VISITOR_TYPES: VisitorType[] = [
  "Resident",
  "Current Patient Visitor",
  "Vendor",
  "Maintenance",
  "Clinical Support",
  "Future Patient / Family",
  "Other",
];

type CheckInAction = "check_in" | "check_out";
type RequestedCheckInAction = CheckInAction | "toggle";

type CheckInBody = {
  pageId?: string;
  firstName?: string;
  lastName?: string;
  visitorType?: VisitorType;
  visitorTypeOther?: string;
  action?: RequestedCheckInAction;
  metadata?: Record<string, unknown>;
  phone?: string | null;
  companyName?: string | null;
  visiting?: string | null;
  purpose?: string | null;
  responsibleParty?: string | null;
  checkoutDuration?: string | null;
  checkoutType?: string | null;
  checkingOut?: string | null;
  checkedOutFirstName?: string | null;
  checkedOutLastName?: string | null;
  checkedOutFullName?: string | null;
};

type CheckedOutResident = {
  firstName: string;
  lastName: string;
  fullName: string;
  checkedOutAt: string | null;
};

const CHECKED_OUT_RESIDENT_LOOKBACK_MS = 4 * 60 * 60 * 1_000;

function acceptedResponse(action?: CheckInAction) {
  return NextResponse.json(action ? { success: true, action } : { success: true }, { status: 202 });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to save check-in activity.";
}

function getOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getMetadataObject(row: Record<string, unknown>) {
  return typeof row.metadata === "object" && row.metadata
    ? (row.metadata as Record<string, unknown>)
    : {};
}

function splitFullName(fullName: string | null) {
  if (!fullName) {
    return { firstName: null, lastName: null };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function normalizeResidentKey(firstName: string | null, lastName: string | null) {
  const key = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return key || null;
}

function getCheckedOutResidentIdentity(row: Record<string, unknown>) {
  const action = getOptionalText(row.action);
  const visitorType = getOptionalText(row.visitor_type);
  const checkoutType = getOptionalText(row.checkout_type);
  const metadata = getMetadataObject(row);

  if (action === "check_in" && visitorType !== "Resident") {
    return null;
  }

  let firstName =
    getOptionalText(row.checked_out_first_name) ||
    getOptionalText(metadata.checkedOutFirstName);
  let lastName =
    getOptionalText(row.checked_out_last_name) ||
    getOptionalText(metadata.checkedOutLastName);
  const fullName =
    getOptionalText(row.checked_out_full_name) ||
    getOptionalText(metadata.checkedOutFullName);

  if ((!firstName || !lastName) && fullName) {
    const splitName = splitFullName(fullName);
    firstName = firstName || splitName.firstName;
    lastName = lastName || splitName.lastName;
  }

  if ((!firstName || !lastName) && (visitorType === "Resident" || checkoutType?.toLowerCase().includes("resident"))) {
    firstName = getOptionalText(row.first_name);
    lastName = getOptionalText(row.last_name);
  }

  if (!firstName || !lastName) {
    return null;
  }

  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].join(" "),
  };
}

function isMissingCheckoutDetailColumn(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const details = "message" in error ? String(error.message) : "";
  return (
    details.includes("responsible_party") ||
    details.includes("checkout_duration") ||
    details.includes("checkout_type") ||
    details.includes("checking_out") ||
    details.includes("checked_out_first_name") ||
    details.includes("checked_out_last_name") ||
    details.includes("checked_out_full_name")
  );
}

async function insertKioskVisitorLog(
  supabase: ReturnType<typeof createAdminClient>,
  row: Record<string, unknown>,
) {
  const { error } = await supabase.from("kiosk_visitor_logs" as any).insert(row as any);

  if (!error || !isMissingCheckoutDetailColumn(error)) {
    return { error };
  }

  const {
    responsible_party: _responsibleParty,
    checkout_duration: _checkoutDuration,
    checkout_type: _checkoutType,
    checking_out: _checkingOut,
    checked_out_first_name: _checkedOutFirstName,
    checked_out_last_name: _checkedOutLastName,
    checked_out_full_name: _checkedOutFullName,
    ...fallbackRow
  } = row;
  return supabase.from("kiosk_visitor_logs" as any).insert(fallbackRow as any);
}

async function loadPublicPage(pageId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, business_id, title, created_by, content")
    .eq("id", pageId)
    .eq("is_active", true)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

function getSectionData(
  page: NonNullable<Awaited<ReturnType<typeof loadPublicPage>>>,
  sectionType: string,
) {
  const content = page.content as
    | { sections?: Array<{ type?: string; data?: Record<string, unknown> }> }
    | null;

  return content?.sections?.find((section) => section.type === sectionType)?.data || {};
}

async function loadPageOwnerPhone(page: NonNullable<Awaited<ReturnType<typeof loadPublicPage>>>) {
  const supabase = createAdminClient();
  const { data: owner, error: ownerError } = await supabase
    .from("users")
    .select("phone")
    .eq("id", page.created_by)
    .maybeSingle();

  if (ownerError) {
    console.error("Kiosk page owner phone lookup failed:", ownerError);
  }

  const contactCardData = getSectionData(page, "contactCard");
  const fallbackPhone = typeof contactCardData.phone === "string" ? contactCardData.phone : "";

  return normalizeUsPhone(owner?.phone || fallbackPhone);
}

async function notifyFuturePatientTourRequest(args: {
  page: NonNullable<Awaited<ReturnType<typeof loadPublicPage>>>;
  firstName: string;
  lastName: string;
}) {
  const ownerPhone = await loadPageOwnerPhone(args.page);

  if (!ownerPhone) {
    console.error("Kiosk future-patient notification skipped: no valid page owner phone.");
    return;
  }

  await sendSmsMessage(
    ownerPhone,
    `${args.firstName} ${args.lastName} just signed into the Lobby Kiosk and is requesting a tour.`,
  );
}

async function createFuturePatientContact(args: {
  page: NonNullable<Awaited<ReturnType<typeof loadPublicPage>>>;
  firstName: string;
  lastName: string;
  action: "check_in" | "check_out";
  phone?: string | null;
  visiting?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const crmSupabase = createAdminClient();
  const contactMessage = [
    "Family / Guest checked in from the kiosk and requested a tour.",
    args.phone ? `Phone: ${args.phone}` : "",
    args.visiting ? `Visiting: ${args.visiting}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const contactMetadata = {
    ...args.metadata,
    channel: "kiosk",
    requestType: "future_patient_check_in",
    visitorType: "Future Patient / Family",
    kioskRole: "Family / Guest",
    action: args.action,
    phone: args.phone || null,
    visiting: args.visiting || null,
  };
  const contactId = await createCrmContact(crmSupabase, {
    businessId: args.page.business_id,
    pageId: args.page.id,
    firstName: args.firstName,
    lastName: args.lastName,
    phone: args.phone || null,
    message: contactMessage,
    source: "Schedule Tour",
    sourcePageName: args.page.title,
    metadata: contactMetadata,
  });

  await logCrmActivity(crmSupabase, {
    contactId,
    activityType: "contact_created",
    title: "Contact created",
    details: "Family / Guest tour request via Kiosk",
    metadata: contactMetadata,
  });
}

async function loadLatestMatchingOpenCheckIn(args: {
  supabase: ReturnType<typeof createAdminClient>;
  page: NonNullable<Awaited<ReturnType<typeof loadPublicPage>>>;
  firstName: string;
  lastName: string;
  visitorType?: VisitorType;
}) {
  let checkInQuery = args.supabase
    .from("kiosk_visitor_logs" as any)
    .select(
      "id, visitor_type, visitor_type_other, phone, company_name, visiting, purpose, metadata, occurred_at",
    )
    .eq("business_id", args.page.business_id)
    .eq("page_id", args.page.id)
    .eq("action", "check_in")
    .ilike("first_name", args.firstName)
    .ilike("last_name", args.lastName)
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (args.visitorType) {
    checkInQuery = checkInQuery.eq("visitor_type", args.visitorType);
  }

  const { data: checkIn, error: checkInError } = await checkInQuery.maybeSingle();

  if (checkInError) {
    console.error("Kiosk checkout match lookup failed:", checkInError);
    return null;
  }

  if (!checkIn) {
    return null;
  }

  let checkOutQuery = args.supabase
    .from("kiosk_visitor_logs" as any)
    .select("occurred_at")
    .eq("business_id", args.page.business_id)
    .eq("page_id", args.page.id)
    .eq("action", "check_out")
    .ilike("first_name", args.firstName)
    .ilike("last_name", args.lastName)
    .order("occurred_at", { ascending: false })
    .limit(1);

  if (args.visitorType) {
    checkOutQuery = checkOutQuery.eq("visitor_type", args.visitorType);
  }

  const { data: checkOut, error: checkOutError } = await checkOutQuery.maybeSingle();

  if (checkOutError) {
    console.error("Kiosk checkout previous-checkout lookup failed:", checkOutError);
    return checkIn as Record<string, unknown>;
  }

  const checkInTime = new Date(String((checkIn as Record<string, unknown>).occurred_at)).getTime();
  const checkOutTime = checkOut
    ? new Date(String((checkOut as Record<string, unknown>).occurred_at)).getTime()
    : 0;

  return checkInTime > checkOutTime ? (checkIn as Record<string, unknown>) : null;
}

export async function GET(request: NextRequest) {
  try {
    const pageId = request.nextUrl.searchParams.get("pageId")?.trim() || "";

    if (!pageId) {
      return NextResponse.json({ residents: [] }, { status: 400 });
    }

    const page = await loadPublicPage(pageId);
    if (!page) {
      return NextResponse.json({ residents: [] }, { status: 404 });
    }

    const supabase = createAdminClient();
    const rows: Array<Record<string, unknown>> = [];
    const batchSize = 1_000;
    const checkedOutSince = new Date(
      Date.now() - CHECKED_OUT_RESIDENT_LOOKBACK_MS,
    ).toISOString();

    for (let from = 0; ; from += batchSize) {
      const { data, error } = await supabase
        .from("kiosk_visitor_logs" as any)
        .select(
          "id, action, first_name, last_name, visitor_type, checkout_type, checked_out_first_name, checked_out_last_name, checked_out_full_name, metadata, occurred_at, status",
        )
        .eq("business_id", page.business_id)
        .eq("page_id", page.id)
        .in("action", ["check_in", "check_out"])
        .gte("occurred_at", checkedOutSince)
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error("Kiosk checked-out resident lookup failed:", error);
        return NextResponse.json({ residents: [] });
      }

      const batch = (data || []) as Array<Record<string, unknown>>;
      rows.push(...batch);
      if (batch.length < batchSize) {
        break;
      }
    }

    const seen = new Set<string>();
    const residents: CheckedOutResident[] = [];

    for (const row of rows) {
      const action = getOptionalText(row.action);
      if (action !== "check_in" && action !== "check_out") {
        continue;
      }

      const identity = getCheckedOutResidentIdentity(row);
      if (!identity) {
        continue;
      }

      // Older resident checkout rows may have been marked as errors solely
      // because the resident (or accompanying family member) did not have a
      // prior kiosk check-in. The checkout still represents a resident who is
      // away from the facility and must remain eligible for return autofill.
      if (getOptionalText(row.status) === "error" && action !== "check_out") {
        continue;
      }

      const key = normalizeResidentKey(identity.firstName, identity.lastName);
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      if (action === "check_out") {
        residents.push({
          ...identity,
          checkedOutAt: getOptionalText(row.occurred_at),
        });
      }
    }

    return NextResponse.json({ residents });
  } catch (error) {
    console.error("Kiosk checked-out resident lookup error:", error);
    return NextResponse.json({ residents: [] });
  }
}

export async function POST(request: NextRequest) {
  let body: CheckInBody = {};
  let page: Awaited<ReturnType<typeof loadPublicPage>> = null;
  let normalizedPayload: {
    firstName: string;
    lastName: string;
    visitorType: VisitorType;
    visitorTypeOther: string | null;
    action: "check_in" | "check_out";
    metadata: Record<string, unknown>;
    phone: string | null;
    companyName: string | null;
    visiting: string | null;
    purpose: string | null;
    responsibleParty: string | null;
    checkoutDuration: string | null;
    checkoutType: string | null;
    checkingOut: string | null;
    checkedOutFirstName: string | null;
    checkedOutLastName: string | null;
    checkedOutFullName: string | null;
    status: "success" | "error";
    errorMessage: string | null;
  } | null = null;

  try {
    body = (await request.json()) as CheckInBody;
    const firstName = body.firstName?.trim() || "";
    const lastName = body.lastName?.trim() || "";
    let visitorType = body.visitorType || "Current Patient Visitor";
    let visitorTypeOther = body.visitorTypeOther?.trim() || null;
    const requestedAction = body.action || "check_in";
    let action: CheckInAction = requestedAction === "check_out" ? "check_out" : "check_in";
    let metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};
    let phone = getOptionalText(body.phone) || getOptionalText(metadata.phone);
    let companyName = getOptionalText(body.companyName) || getOptionalText(metadata.companyName);
    let visiting = getOptionalText(body.visiting) || getOptionalText(metadata.visiting);
    let purpose = getOptionalText(body.purpose) || getOptionalText(metadata.purpose);
    const responsibleParty =
      getOptionalText(body.responsibleParty) || getOptionalText(metadata.responsibleParty);
    const checkoutDuration =
      getOptionalText(body.checkoutDuration) || getOptionalText(metadata.checkoutDuration);
    const checkoutType = getOptionalText(body.checkoutType) || getOptionalText(metadata.checkoutType);
    const checkingOut = getOptionalText(body.checkingOut) || getOptionalText(metadata.checkingOut);
    const checkedOutFirstName =
      getOptionalText(body.checkedOutFirstName) || getOptionalText(metadata.checkedOutFirstName);
    const checkedOutLastName =
      getOptionalText(body.checkedOutLastName) || getOptionalText(metadata.checkedOutLastName);
    const checkedOutFullName =
      getOptionalText(body.checkedOutFullName) || getOptionalText(metadata.checkedOutFullName);
    let status: "success" | "error" = "success";
    let errorMessage: string | null = null;

    if (!body.pageId || !firstName || !lastName) {
      return acceptedResponse();
    }

    if (!VISITOR_TYPES.includes(visitorType)) {
      return acceptedResponse();
    }

    if (visitorType === "Other" && !visitorTypeOther) {
      return acceptedResponse();
    }

    if (!["check_in", "check_out", "toggle"].includes(requestedAction)) {
      return acceptedResponse();
    }

    page = await loadPublicPage(body.pageId);
    if (!page) {
      console.error("Kiosk check-in page not found:", body.pageId);
      return acceptedResponse();
    }

    const supabase = createAdminClient();
    let matchingCheckIn: Record<string, unknown> | null = null;

    if (requestedAction === "toggle" || requestedAction === "check_out") {
      matchingCheckIn = await loadLatestMatchingOpenCheckIn({
        supabase,
        page,
        firstName,
        lastName,
        visitorType: requestedAction === "toggle" ? visitorType : undefined,
      });
    }

    if (requestedAction === "toggle") {
      action = matchingCheckIn ? "check_out" : "check_in";
      metadata = {
        ...metadata,
        requestedAction: "toggle",
        toggleResult: action,
      };
    }

    if (action === "check_out") {
      const isResidentCheckout =
        visitorType === "Resident" ||
        checkoutType?.toLowerCase().includes("resident") === true ||
        Boolean(checkedOutFirstName && checkedOutLastName) ||
        Boolean(checkedOutFullName);

      if (matchingCheckIn) {
        const matchedVisitorType = getOptionalText(matchingCheckIn.visitor_type);
        visitorType = VISITOR_TYPES.includes(matchedVisitorType as VisitorType)
          ? (matchedVisitorType as VisitorType)
          : visitorType;
        visitorTypeOther = getOptionalText(matchingCheckIn.visitor_type_other);
        phone = phone || getOptionalText(matchingCheckIn.phone);
        companyName = companyName || getOptionalText(matchingCheckIn.company_name);
        visiting = visiting || getOptionalText(matchingCheckIn.visiting);
        purpose = purpose || getOptionalText(matchingCheckIn.purpose);
        metadata = {
          ...(typeof matchingCheckIn.metadata === "object" && matchingCheckIn.metadata
            ? (matchingCheckIn.metadata as Record<string, unknown>)
            : {}),
          ...metadata,
          checkoutLookup: "matched",
          checkoutMatchedCheckInId: getOptionalText(matchingCheckIn.id),
          checkoutMatchedCheckInAt: getOptionalText(matchingCheckIn.occurred_at),
        };
      } else if (isResidentCheckout) {
        // Residents often use the kiosk for the first time while leaving the
        // facility, so a previous kiosk check-in is not a prerequisite for a
        // valid resident checkout.
        status = "success";
        errorMessage = null;
        metadata = {
          ...metadata,
          checkoutLookup: "not_required",
          residentCheckoutWithoutPriorKioskCheckIn: true,
        };
      } else {
        status = "error";
        errorMessage = "No matching open check-in found for checkout.";
        metadata = {
          ...metadata,
          checkoutLookup: "no_match",
        };
      }
    }

    normalizedPayload = {
      firstName,
      lastName,
      visitorType,
      visitorTypeOther,
      action,
      metadata,
      phone,
      companyName,
      visiting,
      purpose,
      responsibleParty,
      checkoutDuration,
      checkoutType,
      checkingOut,
      checkedOutFirstName,
      checkedOutLastName,
      checkedOutFullName,
      status,
      errorMessage,
    };

    const { error } = await insertKioskVisitorLog(supabase, {
      business_id: page.business_id,
      page_id: page.id,
      first_name: firstName,
      last_name: lastName,
      visitor_type: visitorType,
      visitor_type_other: visitorType === "Other" ? visitorTypeOther : null,
      action,
      user_agent: request.headers.get("user-agent"),
      phone,
      company_name: companyName,
      visiting,
      purpose,
      responsible_party: responsibleParty,
      checkout_duration: checkoutDuration,
      checkout_type: checkoutType,
      checking_out: checkingOut,
      checked_out_first_name: checkedOutFirstName,
      checked_out_last_name: checkedOutLastName,
      checked_out_full_name: checkedOutFullName,
      status,
      error_message: errorMessage,
      metadata: {
        pageTitle: page.title,
        responsibleParty,
        checkoutDuration,
        checkoutType,
        checkingOut,
        checkedOutFirstName,
        checkedOutLastName,
        checkedOutFullName,
        ...metadata,
      },
    });

    if (error) {
      console.error("Kiosk check-in save error:", error);
      await insertKioskVisitorLog(supabase, {
        business_id: page.business_id,
        page_id: page.id,
        first_name: firstName,
        last_name: lastName,
        visitor_type: visitorType,
        visitor_type_other: visitorType === "Other" ? visitorTypeOther : null,
        action,
        user_agent: request.headers.get("user-agent"),
        phone,
        company_name: companyName,
        visiting,
        purpose,
        responsible_party: responsibleParty,
        checkout_duration: checkoutDuration,
        checkout_type: checkoutType,
        checking_out: checkingOut,
        checked_out_first_name: checkedOutFirstName,
        checked_out_last_name: checkedOutLastName,
        checked_out_full_name: checkedOutFullName,
        status: "error",
        error_message: getErrorMessage(error),
        metadata: {
          pageTitle: page.title,
          responsibleParty,
          checkoutDuration,
          checkoutType,
          checkingOut,
          checkedOutFirstName,
          checkedOutLastName,
          checkedOutFullName,
          ...metadata,
          failedOperation: "save_checkin_activity",
        },
      });
    }

    if (action === "check_in" && visitorType === "Future Patient / Family") {
      try {
        await createFuturePatientContact({
          page,
          firstName,
          lastName,
          action,
          phone,
          visiting,
          metadata,
        });
      } catch (contactError) {
        console.error("Kiosk future-patient CRM contact creation failed:", contactError);
      }

      try {
        await notifyFuturePatientTourRequest({ page, firstName, lastName });
      } catch (notificationError) {
        console.error("Kiosk future-patient notification failed:", notificationError);
      }
    }

    return acceptedResponse(action);
  } catch (error) {
    console.error("Kiosk check-in error:", error);

    if (page && normalizedPayload) {
      const supabase = createAdminClient();
      await insertKioskVisitorLog(supabase, {
        business_id: page.business_id,
        page_id: page.id,
        first_name: normalizedPayload.firstName,
        last_name: normalizedPayload.lastName,
        visitor_type: normalizedPayload.visitorType,
        visitor_type_other:
          normalizedPayload.visitorType === "Other" ? normalizedPayload.visitorTypeOther : null,
        action: normalizedPayload.action,
        user_agent: request.headers.get("user-agent"),
        phone: normalizedPayload.phone,
        company_name: normalizedPayload.companyName,
        visiting: normalizedPayload.visiting,
        purpose: normalizedPayload.purpose,
        responsible_party: normalizedPayload.responsibleParty,
        checkout_duration: normalizedPayload.checkoutDuration,
        checkout_type: normalizedPayload.checkoutType,
        checking_out: normalizedPayload.checkingOut,
        checked_out_first_name: normalizedPayload.checkedOutFirstName,
        checked_out_last_name: normalizedPayload.checkedOutLastName,
        checked_out_full_name: normalizedPayload.checkedOutFullName,
        status: "error",
        error_message: normalizedPayload.errorMessage || getErrorMessage(error),
        metadata: {
          pageTitle: page.title,
          responsibleParty: normalizedPayload.responsibleParty,
          checkoutDuration: normalizedPayload.checkoutDuration,
          checkoutType: normalizedPayload.checkoutType,
          checkingOut: normalizedPayload.checkingOut,
          checkedOutFirstName: normalizedPayload.checkedOutFirstName,
          checkedOutLastName: normalizedPayload.checkedOutLastName,
          checkedOutFullName: normalizedPayload.checkedOutFullName,
          ...normalizedPayload.metadata,
          failedOperation: "process_checkin_activity",
        },
      });
    }

    return acceptedResponse();
  }
}
