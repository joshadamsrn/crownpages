import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const supabase = createClient()

type ImageTransformOptions = {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

const RESIZABLE_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
]);

function isResizableImagePath(pathname: string) {
  const extension = pathname.split("?")[0]?.split(".").pop()?.toLowerCase();
  return extension ? RESIZABLE_IMAGE_EXTENSIONS.has(extension) : false;
}

export function getOptimizedPublicImageUrl(
  url?: string | null,
  options: ImageTransformOptions = {},
) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const publicMarker = "/storage/v1/object/public/";

    if (!parsed.pathname.includes(publicMarker) || !isResizableImagePath(parsed.pathname)) {
      return url;
    }

    const storagePath = parsed.pathname.slice(parsed.pathname.indexOf(publicMarker) + publicMarker.length);
    parsed.pathname = `/storage/v1/render/image/public/${storagePath}`;
    parsed.searchParams.delete("token");

    const width = options.width ?? 1200;
    const quality = options.quality ?? 78;
    parsed.searchParams.set("width", String(width));
    parsed.searchParams.set("quality", String(quality));
    parsed.searchParams.set("resize", options.resize ?? "contain");

    if (options.height) {
      parsed.searchParams.set("height", String(options.height));
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function normalizeUploadPath(url?: string | null) {
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
      const pathname = parsed.pathname;
      const marker = storageMarkers.find((value) => pathname.includes(value));

      if (!marker) {
        return null;
      }

      normalized = pathname.slice(pathname.indexOf(marker) + marker.length);
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

export const generateSignedUrl = async(url: string, expiry?: number) => {
  const normalized = normalizeUploadPath(url);
  if (!normalized) return null;

  const { data, error } = await supabase.storage
    .from("uploads")
    .createSignedUrl(normalized, expiry || 60 * 60);

  if(data?.signedUrl) return data.signedUrl
  if(error) return null

  return null
}

export const generatePublicUrl = async (url: string) => {

  if(!url) return null

  const normalized = normalizeUploadPath(url);

  if (normalized) {
    const { data } = await supabase.storage
      .from("uploads")
      .getPublicUrl(normalized);

    if (data?.publicUrl) return data.publicUrl
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return null

}
