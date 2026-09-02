import { NextRequest, NextResponse } from "next/server";

import { canManageBusiness, getAuthenticatedUser, openAIRequest } from "@/lib/ai-assistant";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const DEFAULT_WELCOME = "Hi! What would you like to know about this community?";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const businessId = request.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  if (!(await canManageBusiness(user, businessId))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: setting, error: settingsError }, { data: files, error: filesError }] = await Promise.all([
    admin.from("business_ai_assistant_settings").select("enabled, welcome_message, vector_store_id, updated_at").eq("business_id", businessId).maybeSingle(),
    admin.from("business_ai_knowledge_files").select("id, openai_file_id, filename, mime_type, byte_size, status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);
  if (settingsError || filesError) {
    return NextResponse.json({ error: settingsError?.message || filesError?.message }, { status: 500 });
  }
  let currentFiles = files || [];
  if (setting?.vector_store_id && currentFiles.some((file) => file.status === "in_progress") && process.env.OPENAI_API_KEY?.trim()) {
    try {
      const remote = await openAIRequest(`/vector_stores/${encodeURIComponent(setting.vector_store_id)}/files?limit=100`);
      const statusById = new Map((remote?.data || []).map((file: any) => [file.id, file.status]));
      currentFiles = currentFiles.map((file) => ({ ...file, status: statusById.get(file.openai_file_id) || file.status }));
      await Promise.all(currentFiles.map((file) => admin.from("business_ai_knowledge_files").update({ status: file.status }).eq("id", file.id)));
    } catch (statusError) {
      console.warn("Unable to refresh AI document status:", statusError instanceof Error ? statusError.message : statusError);
    }
  }

  return NextResponse.json({
    enabled: setting?.enabled ?? false,
    welcomeMessage: setting?.welcome_message || DEFAULT_WELCOME,
    updatedAt: setting?.updated_at ?? null,
    files: currentFiles.map(({ openai_file_id: _openaiFileId, ...file }) => file),
    serverReady: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const enabled = body?.enabled === true;
  const welcomeMessage = typeof body?.welcomeMessage === "string" ? body.welcomeMessage.trim() : "";
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  if (!(await canManageBusiness(user, businessId))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (!welcomeMessage || welcomeMessage.length > 180) {
    return NextResponse.json({ error: "Welcome message must be between 1 and 180 characters." }, { status: 400 });
  }
  if (enabled && !process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "The website server needs an OPENAI_API_KEY before the assistant can be enabled." }, { status: 503 });
  }

  const updatedAt = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("business_ai_assistant_settings").upsert({
    business_id: businessId,
    enabled,
    welcome_message: welcomeMessage,
    updated_at: updatedAt,
    updated_by: user.id,
  }, { onConflict: "business_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled, welcomeMessage, updatedAt });
}
