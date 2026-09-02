import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = { id: string; email?: string | null };

const OPENAI_API_BASE = "https://api.openai.com/v1";
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 12;
const rateBuckets = new Map<string, number[]>();

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return { id: user.id, email: user.email };

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;
  const admin = createAdminClient();
  const { data: { user: tokenUser } } = await admin.auth.getUser(token);
  return tokenUser ? { id: tokenUser.id, email: tokenUser.email } : null;
}

export async function canManageBusiness(user: AuthenticatedUser, businessId: string) {
  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
  if (!business) return false;
  if (business.owner_id === user.id) return true;

  const memberFilters = [`user_id.eq.${user.id}`];
  if (user.email) memberFilters.push(`invited_email.eq.${user.email.toLowerCase()}`);
  const { data: member } = await admin
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .or(memberFilters.join(","))
    .maybeSingle();
  if (member) return true;

  const { data: kioskAdmin } = await admin
    .from("kiosk_admins")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(kioskAdmin);
}

export function getOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured on the website server.");
  return key;
}

export async function openAIRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${OPENAI_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getOpenAIKey()}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload;
}

export function extractPageKnowledge(value: unknown, limit = 18_000) {
  const pieces: string[] = [];
  const seen = new Set<unknown>();
  const walk = (current: unknown, key = "") => {
    if (pieces.join("\n").length >= limit || current == null || seen.has(current)) return;
    if (typeof current === "string") {
      const text = current.replace(/\s+/g, " ").trim();
      if (text && !/^https?:\/\//i.test(text) && !/^data:/i.test(text)) {
        pieces.push(key ? `${key}: ${text}` : text);
      }
      return;
    }
    if (typeof current !== "object") return;
    seen.add(current);
    if (Array.isArray(current)) {
      current.forEach((item) => walk(item, key));
      return;
    }
    Object.entries(current as Record<string, unknown>).forEach(([childKey, child]) => {
      if (["id", "styles", "image", "imageUrl", "logo", "url"].includes(childKey)) return;
      walk(child, childKey.replace(/([A-Z])/g, " $1").trim());
    });
  };
  walk(value);
  return pieces.join("\n").slice(0, limit);
}

export function isRateLimited(request: NextRequest, pageId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "unknown";
  const identity = createHash("sha256").update(`${address}:${pageId}`).digest("hex");
  const now = Date.now();
  const recent = (rateBuckets.get(identity) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateBuckets.set(identity, recent);
  if (rateBuckets.size > 5_000) {
    for (const [key, values] of rateBuckets) {
      if (!values.some((time) => now - time < RATE_WINDOW_MS)) rateBuckets.delete(key);
    }
  }
  return false;
}

export function parseResponseText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text.trim();
    }
  }
  return "";
}

export function parseFileCitations(payload: any) {
  const filenames = new Set<string>();
  for (const output of payload?.output || []) {
    for (const content of output?.content || []) {
      for (const annotation of content?.annotations || []) {
        if (annotation?.type === "file_citation" && annotation.filename) filenames.add(annotation.filename);
      }
    }
  }
  return Array.from(filenames).slice(0, 4);
}
