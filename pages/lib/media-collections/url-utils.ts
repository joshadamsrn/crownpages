const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".avif",
  ".tif",
  ".tiff",
]);

const DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".txt",
  ".rtf",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".webm",
  ".avi",
  ".mkv",
]);

const NON_MEDIA_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".ts",
  ".tsx",
  ".xml",
]);

const MEDIA_HINTS = ["/image", "/images/", "/img/", "/media/", "/assets/"];
const DECORATIVE_ASSET_HINTS = [
  "favicon",
  "apple-touch-icon",
  "sprite",
  "placeholder",
  "spinner",
  "loader",
  "tracking",
  "pixel",
  "/icons/",
  "icon-",
  "-icon",
  "badge",
  "award",
  "seal",
  "rating",
];

export function cleanFilename(name: string) {
  const normalized = name.trim() || "file";
  return normalized.replace(/[<>:"/\\|?*]+/g, "_");
}

export function normalizeCandidateUrl(baseUrl: string, candidate?: string | null) {
  if (!candidate) return null;
  const trimmed = candidate.trim().replace(/&amp;/g, "&").replace(/\\\//g, "/");
  if (!trimmed || trimmed.startsWith("data:")) return null;

  const resolved = new URL(trimmed, baseUrl);
  resolved.hash = "";
  return resolved.toString();
}

export function sameDomain(urlA: string, urlB: string) {
  return new URL(urlA).host === new URL(urlB).host;
}

export function extractSrcsetUrls(srcsetValue: string, baseUrl: string) {
  const candidates = srcsetValue
    .split(",")
    .map((part) => {
      const [rawUrl, descriptor] = part.trim().split(/\s+/);
      const url = normalizeCandidateUrl(baseUrl, rawUrl || "");
      const widthMatch = descriptor?.match(/^(\d+)w$/i);
      return {
        url,
        width: widthMatch ? Number(widthMatch[1]) : null,
      };
    })
    .filter((candidate): candidate is { url: string; width: number | null } =>
      Boolean(candidate.url),
    );

  const widthCandidates = candidates.filter((candidate) => candidate.width !== null);
  if (widthCandidates.length > 0) {
    const widest = widthCandidates.reduce((best, candidate) =>
      (candidate.width ?? 0) > (best.width ?? 0) ? candidate : best,
    );
    return [widest.url];
  }

  return candidates.map((candidate) => candidate.url);
}

export function extractCssUrlValues(styleValue: string, baseUrl: string) {
  const matches = [...styleValue.matchAll(/url\((.*?)\)/gi)];
  return matches
    .map((match) => normalizeCandidateUrl(baseUrl, match[1]?.trim().replace(/^['"]|['"]$/g, "") || ""))
    .filter((url): url is string => Boolean(url));
}

function extensionForUrl(url: string) {
  const pathname = new URL(url).pathname.toLowerCase();
  const lastDot = pathname.lastIndexOf(".");
  return lastDot >= 0 ? pathname.slice(lastDot) : "";
}

export function isKnownExtensionlessImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname.endsWith(".stylelabs.cloud") &&
      parsed.pathname.toLowerCase().includes("/api/public/content/")
    );
  } catch {
    return false;
  }
}

export function isLikelyDecorativeAssetUrl(url: string) {
  const lower = decodeURIComponent(url).toLowerCase();
  return DECORATIVE_ASSET_HINTS.some((hint) => lower.includes(hint));
}

export function isLikelyImageUrl(
  url: string,
  options: { allowExtensionlessCdn?: boolean } = {},
) {
  const extension = extensionForUrl(url);
  if (NON_MEDIA_EXTENSIONS.has(extension)) return false;
  if (IMAGE_EXTENSIONS.has(extension)) return true;
  if (options.allowExtensionlessCdn && isKnownExtensionlessImageUrl(url)) return true;
  const lower = url.toLowerCase();
  return MEDIA_HINTS.some((hint) => lower.includes(hint));
}

export function isLikelyDocumentUrl(url: string) {
  return DOCUMENT_EXTENSIONS.has(extensionForUrl(url));
}

export function isLikelyVideoUrl(url: string) {
  return VIDEO_EXTENSIONS.has(extensionForUrl(url));
}

export function guessFilenameFromUrl(url: string, fallback = "file") {
  const pathname = new URL(url).pathname;
  const candidate = pathname.split("/").filter(Boolean).at(-1) || fallback;
  return cleanFilename(candidate);
}

export function normalizeFileExtensionFromMimeType(mimeType?: string | null) {
  if (!mimeType) return null;
  if (mimeType.includes("image/jpeg")) return ".jpg";
  if (mimeType.includes("image/png")) return ".png";
  if (mimeType.includes("image/webp")) return ".webp";
  if (mimeType.includes("image/gif")) return ".gif";
  if (mimeType.includes("image/svg+xml")) return ".svg";
  if (mimeType.includes("application/pdf")) return ".pdf";
  if (mimeType.includes("video/mp4")) return ".mp4";
  return null;
}
