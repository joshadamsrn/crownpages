import { NextRequest, NextResponse } from "next/server";

import { canManageBusiness, getAuthenticatedUser, openAIRequest } from "@/lib/ai-assistant";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "md", "ppt", "pptx"]);

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const businessId = typeof form?.get("businessId") === "string" ? String(form.get("businessId")) : "";
  const file = form?.get("file");
  if (!businessId || !(file instanceof File)) return NextResponse.json({ error: "Select a business and document." }, { status: 400 });
  if (!(await canManageBusiness(user, businessId))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Documents must be smaller than 20 MB." }, { status: 400 });
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXTENSIONS.has(extension)) return NextResponse.json({ error: "Upload a PDF, Word, PowerPoint, text, or Markdown document." }, { status: 400 });

  const admin = createAdminClient();
  try {
    const { data: setting } = await admin
      .from("business_ai_assistant_settings")
      .select("vector_store_id")
      .eq("business_id", businessId)
      .maybeSingle();
    let vectorStoreId = setting?.vector_store_id || null;
    if (!vectorStoreId) {
      const { data: business } = await admin.from("businesses").select("name").eq("id", businessId).single();
      const vectorStore = await openAIRequest("/vector_stores", {
        method: "POST",
        body: JSON.stringify({ name: `CrownPages - ${business?.name || businessId}` }),
      });
      vectorStoreId = vectorStore.id;
      const { error: upsertError } = await admin.from("business_ai_assistant_settings").upsert({
        business_id: businessId,
        vector_store_id: vectorStoreId,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      }, { onConflict: "business_id" });
      if (upsertError) throw upsertError;
    }

    const uploadForm = new FormData();
    uploadForm.append("purpose", "assistants");
    uploadForm.append("file", file, file.name);
    const uploaded = await openAIRequest("/files", { method: "POST", body: uploadForm });
    const attached = await openAIRequest(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, {
      method: "POST",
      body: JSON.stringify({ file_id: uploaded.id }),
    });
    const { data: record, error: insertError } = await admin.from("business_ai_knowledge_files").insert({
      business_id: businessId,
      openai_file_id: uploaded.id,
      filename: file.name,
      mime_type: file.type || null,
      byte_size: file.size,
      status: attached.status || "in_progress",
      uploaded_by: user.id,
    }).select("id, filename, mime_type, byte_size, status, created_at").single();
    if (insertError) throw insertError;
    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload document." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const businessId = typeof body?.businessId === "string" ? body.businessId : "";
  const documentId = typeof body?.documentId === "string" ? body.documentId : "";
  if (!businessId || !documentId) return NextResponse.json({ error: "Missing document" }, { status: 400 });
  if (!(await canManageBusiness(user, businessId))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: file }, { data: setting }] = await Promise.all([
    admin.from("business_ai_knowledge_files").select("openai_file_id").eq("id", documentId).eq("business_id", businessId).maybeSingle(),
    admin.from("business_ai_assistant_settings").select("vector_store_id").eq("business_id", businessId).maybeSingle(),
  ]);
  if (!file) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  try {
    if (setting?.vector_store_id) {
      await openAIRequest(`/vector_stores/${encodeURIComponent(setting.vector_store_id)}/files/${encodeURIComponent(file.openai_file_id)}`, { method: "DELETE" });
    }
    await openAIRequest(`/files/${encodeURIComponent(file.openai_file_id)}`, { method: "DELETE" }).catch(() => null);
    const { error } = await admin.from("business_ai_knowledge_files").delete().eq("id", documentId).eq("business_id", businessId);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete document." }, { status: 500 });
  }
}
