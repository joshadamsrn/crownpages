export function normalizeUploadPath(url?: string | null) {
  if (!url) return null;

  let normalized = url.trim();
  if (!normalized) return null;

  const storageMarkers = [
    "/storage/v1/object/sign/uploads/",
    "/storage/v1/object/public/uploads/",
    "/object/sign/uploads/",
    "/object/public/uploads/",
  ];

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    try {
      const parsed = new URL(normalized);
      const marker = storageMarkers.find((value) =>
        parsed.pathname.includes(value)
      );

      if (!marker) {
        return null;
      }

      normalized = parsed.pathname.slice(
        parsed.pathname.indexOf(marker) + marker.length
      );
    } catch {
      return null;
    }
  } else {
    const marker = storageMarkers.find((value) => normalized.includes(value));
    if (marker) {
      normalized = normalized.slice(normalized.indexOf(marker) + marker.length);
    }
  }

  normalized = normalized.replace(/^\/+/, "");

  if (normalized.startsWith("uploads/")) {
    normalized = normalized.slice("uploads/".length);
  }

  return normalized || null;
}

export function getUploadPublicUrl(url?: string | null) {
  if (!url) return "";

  const normalized = normalizeUploadPath(url);
  if (!normalized) {
    return url.startsWith("http://") || url.startsWith("https://") ? url : "";
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";

  const encodedPath = normalized.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/uploads/${encodedPath}`;
}
