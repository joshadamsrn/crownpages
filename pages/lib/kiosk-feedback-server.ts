import { createAdminClient } from "@/lib/supabase/admin";

export type KioskFeedbackPage = {
  id: string;
  title: string;
  business_id: string;
  created_by: string | null;
  content: { sections?: Array<{ type?: string; data?: Record<string, unknown> }> } | null;
};

export type KioskFeedbackBusiness = {
  name: string | null;
  email: string | null;
  owner_id: string | null;
};

export function getKioskFeedbackText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isValidEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function getPageContactEmail(page: KioskFeedbackPage) {
  const contactCard = page.content?.sections?.find((section) => section.type === "contactCard")?.data;
  const email = getKioskFeedbackText(contactCard?.email);
  return isValidEmail(email) ? email : null;
}

async function getUserEmail(userId: string | null | undefined) {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("users").select("email").eq("id", userId).maybeSingle();
  return isValidEmail(data?.email) ? data?.email : null;
}

export async function resolveKioskFeedbackNotification(page: KioskFeedbackPage) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("businesses")
    .select("name, email, owner_id")
    .eq("id", page.business_id)
    .maybeSingle();
  const business = (data || null) as KioskFeedbackBusiness | null;

  const ownerEmail =
    (await getUserEmail(business?.owner_id)) ||
    (business?.owner_id !== page.created_by ? await getUserEmail(page.created_by) : null);
  const recipient =
    ownerEmail ||
    (isValidEmail(business?.email) ? business?.email : null) ||
    getPageContactEmail(page);

  return {
    business,
    recipient,
    facilityName: business?.name || page.title,
  };
}

export function formatKioskFeedbackDate(value: Date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Denver",
  }).format(value);
}
