import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { getUploadPublicUrl } from "@/lib/upload-public-url";

export type LinkedPageSource = {
  url: string;
  label: string;
  kind: "page" | "pdf";
};

export type LoadedLinkedPageKnowledge = {
  knowledge: string;
  documentUrls: string[];
  sourceLabels: string[];
};

type LoadedSource = {
  knowledge: string;
  documentUrl?: string;
  sourceLabel: string;
};

const SOURCE_CACHE_TTL_MS = 15 * 60_000;
const FAILED_SOURCE_CACHE_TTL_MS = 2 * 60_000;
const MAX_SOURCE_BYTES = 1_500_000;
const MAX_SOURCE_TEXT = 5_000;
const MAX_TOTAL_TEXT = 24_000;
const MAX_LINKED_PAGES = 12;
const MAX_LINKED_PDFS = 4;

const cache = new Map<string, { expiresAt: number; value: LoadedSource | null }>();

const LINK_KEY = /(url|website|link|href|document|file|resource)/i;
const ASSET_KEY = /(image|logo|thumbnail|avatar|favicon|video|audio|mediaitem)/i;
const WEB_URL_IN_TEXT = /https?:\/\/[^\s<>"')\]]+/gi;
const IMAGE_OR_MEDIA_EXTENSION = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|webp|mp3|m4a|wav|aac|mp4|m4v|mov|avi|webm)(?:$|[?#])/i;
const PDF_EXTENSION = /\.pdf(?:$|[?#])/i;

function sourceLabel(parent: Record<string, unknown> | null, url: string) {
  const preferred = [parent?.title, parent?.label, parent?.name, parent?.platform]
    .find((value) => typeof value === "string" && value.trim()) as string | undefined;
  if (preferred) return preferred.trim().slice(0, 120);
  try {
    const parsed = new URL(url);
    const lastSegment = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) || "");
    return (lastSegment || parsed.hostname.replace(/^www\./, "")).slice(0, 120);
  } catch {
    return "Linked resource";
  }
}

function normalizeUrl(rawValue: string, key: string) {
  let value = rawValue.trim().replace(/&amp;/gi, "&");
  if (!value || /^(?:mailto|tel|sms|javascript|data):/i.test(value)) return null;

  if (/^www\./i.test(value)) value = `https://${value}`;
  if (!/^https?:\/\//i.test(value) && LINK_KEY.test(key) && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(value)) {
    value = `https://${value}`;
  }
  if (!/^https?:\/\//i.test(value)) {
    if (!PDF_EXTENSION.test(value)) return null;
    value = getUploadPublicUrl(value);
  }
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export function collectLinkedPageSources(value: unknown, maxSources = 30): LinkedPageSource[] {
  const sources: LinkedPageSource[] = [];
  const seenObjects = new Set<object>();
  const seenUrls = new Set<string>();

  const add = (candidate: string, key: string, parent: Record<string, unknown> | null) => {
    const normalized = normalizeUrl(candidate, key);
    if (!normalized || seenUrls.has(normalized) || IMAGE_OR_MEDIA_EXTENSION.test(normalized)) return;
    seenUrls.add(normalized);
    sources.push({
      url: normalized,
      label: sourceLabel(parent, normalized),
      kind: PDF_EXTENSION.test(normalized) ? "pdf" : "page",
    });
  };

  const walk = (current: unknown, key = "", parent: Record<string, unknown> | null = null) => {
    if (sources.length >= maxSources || current == null) return;
    if (typeof current === "string") {
      if (LINK_KEY.test(key) && !ASSET_KEY.test(key)) add(current, key, parent);
      if (!ASSET_KEY.test(key)) {
        for (const match of current.match(WEB_URL_IN_TEXT) || []) add(match, key, parent);
      }
      return;
    }
    if (typeof current !== "object" || seenObjects.has(current)) return;
    seenObjects.add(current);
    if (Array.isArray(current)) {
      current.forEach((item) => walk(item, key, parent));
      return;
    }
    const record = current as Record<string, unknown>;
    // Page owners can keep a public link visible on their CrownPage while
    // relying on a cleaned, curated AI knowledge document instead of having
    // the assistant fetch that link again on every question.
    if (record.excludeFromAiAssistant === true) return;
    Object.entries(record).forEach(([childKey, child]) => walk(child, childKey, record));
  };

  walk(value);
  return sources;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return isPrivateIpv4(address);
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:")) return isPrivateIpv4(normalized.slice("::ffff:".length));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

async function assertPublicHttpUrl(value: string) {
  const url = new URL(value);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("Unsupported linked URL.");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Private linked URL blocked.");
  }
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Private linked URL blocked.");
  }
  return url;
}

async function readResponseBody(response: Response, limit = MAX_SOURCE_BYTES) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > limit) throw new Error("Linked source is too large.");
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 4_500);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("Linked source is too large.");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timeout);
  }
  if (timedOut) throw new Error("Linked source timed out.");
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

async function fetchExactPublicUrl(initialUrl: string) {
  let current = await assertPublicHttpUrl(initialUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_500);
    try {
      const response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/pdf,text/plain,application/json;q=0.9,*/*;q=0.5",
          "User-Agent": "CrownPages-AI-Knowledge/1.0 (+https://crownpages.com)",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Invalid linked-source redirect.");
        current = await assertPublicHttpUrl(new URL(location, current).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Linked source returned ${response.status}.`);
      return { response, finalUrl: current.toString() };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many linked-source redirects.");
}

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (match, code) => {
      const value = Number(code);
      return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
    })
    .replace(/&#x([\da-f]+);/gi, (match, code) => {
      const value = parseInt(code, 16);
      return Number.isInteger(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] || match?.[2] || match?.[3] || "").trim();
}

function extractHtmlText(html: string) {
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  const descriptions: string[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (attribute(tag, "name") || attribute(tag, "property")).toLowerCase();
    if (["description", "og:description", "twitter:description", "og:title"].includes(key)) {
      const content = attribute(tag, "content");
      if (content) descriptions.push(content);
    }
  }
  const structured = (html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [])
    .map((script) => decodeHtml(script.replace(/^[\s\S]*?>|<\/script>$/gi, "")).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  const visible = decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/?(?:p|div|section|article|main|header|footer|li|br|h[1-6]|tr)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1)
    .join("\n");
  return [title, ...new Set(descriptions), structured, visible].filter(Boolean).join("\n").slice(0, MAX_SOURCE_TEXT);
}

async function loadSource(source: LinkedPageSource): Promise<LoadedSource | null> {
  const cached = cache.get(source.url);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const { response, finalUrl } = await fetchExactPublicUrl(source.url);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (source.kind === "pdf" || contentType.includes("application/pdf")) {
      await response.body?.cancel();
      const result = { knowledge: "", documentUrl: finalUrl, sourceLabel: source.label };
      cache.set(source.url, { expiresAt: Date.now() + SOURCE_CACHE_TTL_MS, value: result });
      return result;
    }
    if (!contentType.includes("html") && !contentType.startsWith("text/") && !contentType.includes("json") && !contentType.includes("xml")) {
      await response.body?.cancel();
      throw new Error("Unsupported linked-source content type.");
    }
    const bytes = await readResponseBody(response);
    const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const text = contentType.includes("html") ? extractHtmlText(raw) : raw.replace(/\s+/g, " ").trim().slice(0, MAX_SOURCE_TEXT);
    if (!text) throw new Error("Linked source did not contain readable text.");
    const result = {
      knowledge: `SOURCE: ${source.label}\nURL: ${finalUrl}\n${text}`,
      sourceLabel: source.label,
    };
    cache.set(source.url, { expiresAt: Date.now() + SOURCE_CACHE_TTL_MS, value: result });
    if (cache.size > 250) {
      for (const [key, entry] of cache) if (entry.expiresAt <= Date.now()) cache.delete(key);
    }
    return result;
  } catch {
    cache.set(source.url, { expiresAt: Date.now() + FAILED_SOURCE_CACHE_TTL_MS, value: null });
    return null;
  }
}

export async function loadLinkedPageKnowledge(sources: LinkedPageSource[]): Promise<LoadedLinkedPageKnowledge> {
  const selectedPages = sources.filter((source) => source.kind === "page").slice(0, MAX_LINKED_PAGES);
  const selectedPdfs = sources.filter((source) => source.kind === "pdf").slice(0, MAX_LINKED_PDFS);
  const loaded = (await Promise.all([...selectedPages, ...selectedPdfs].map(loadSource)))
    .filter((source): source is LoadedSource => Boolean(source));

  const knowledgeParts: string[] = [];
  let knowledgeLength = 0;
  for (const source of loaded) {
    if (!source.knowledge || knowledgeLength >= MAX_TOTAL_TEXT) continue;
    const remaining = MAX_TOTAL_TEXT - knowledgeLength;
    const next = source.knowledge.slice(0, remaining);
    knowledgeParts.push(next);
    knowledgeLength += next.length;
  }

  return {
    knowledge: knowledgeParts.join("\n\n"),
    documentUrls: loaded.flatMap((source) => source.documentUrl ? [source.documentUrl] : []).slice(0, MAX_LINKED_PDFS),
    sourceLabels: Array.from(new Set(loaded.map((source) => source.sourceLabel))).slice(0, 8),
  };
}
