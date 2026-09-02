type CrmContactInsert = {
  businessId: string;
  pageId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source: "Connect Form" | "Schedule Tour" | "Manual";
  sourcePageName?: string | null;
  visitorId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
  status?: "New" | "In Process" | "Closed" | "Lost";
};

export async function createCrmContact(
  supabase: any,
  input: CrmContactInsert
) {
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      business_id: input.businessId,
      page_id: input.pageId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      message: input.message?.trim() || null,
      source: input.source,
      status: input.status || "New",
      source_page_name: input.sourcePageName || null,
      visitor_id: input.visitorId || null,
      session_id: input.sessionId || null,
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id as string;
}

export async function logCrmActivity(
  supabase: any,
  input: {
    contactId: string;
    activityType: string;
    title: string;
    details?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("crm_contact_activity").insert({
    contact_id: input.contactId,
    activity_type: input.activityType,
    title: input.title,
    details: input.details || null,
    metadata: input.metadata || {},
  });

  if (error) {
    throw error;
  }
}
