import { NextResponse } from "next/server";
import convert from "heic-convert";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_HEIC_UPLOAD_BYTES = 30 * 1024 * 1024;
const OUTPUT_MAX_DIMENSION = 1600;

function isHeicName(value: string) {
  return /\.(heic|heif)$/i.test(value);
}

function normalizeStoragePath(value: string) {
  return value.trim().replace(/^\/+/, "");
}

function toJpegStoragePath(storagePath: string) {
  if (/\.[^/]+$/.test(storagePath)) {
    return storagePath.replace(/\.[^/.]+$/i, ".jpg");
  }

  return `${storagePath}.jpg`;
}

function isSafeStoragePath(storagePath: string) {
  if (!storagePath || storagePath.startsWith("/") || storagePath.includes("\\")) {
    return false;
  }

  return storagePath.split("/").every((segment) => segment && segment !== "." && segment !== "..");
}

function toBuffer(value: ArrayBuffer | Buffer | Uint8Array) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  return Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
}

async function userCanWriteStoragePath(storagePath: string, userId: string) {
  if (storagePath.startsWith(`${userId}/`)) {
    return true;
  }

  const pageOgMatch = storagePath.match(/^pages\/([^/]+)\/og\//);
  if (!pageOgMatch) {
    return false;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pages")
    .select("id")
    .eq("id", pageOgMatch[1])
    .eq("created_by", userId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in to upload files." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const requestedPath = formData.get("storagePath");

  if (!(file instanceof File) || typeof requestedPath !== "string") {
    return NextResponse.json({ error: "Missing HEIC file or storage path." }, { status: 400 });
  }

  if (file.size > MAX_HEIC_UPLOAD_BYTES) {
    return NextResponse.json({ error: "HEIC file is too large to convert." }, { status: 413 });
  }

  const storagePath = normalizeStoragePath(requestedPath);

  if (!isSafeStoragePath(storagePath)) {
    return NextResponse.json({ error: "Invalid storage path." }, { status: 400 });
  }

  const isHeicUpload = isHeicName(file.name) || isHeicName(storagePath) || /image\/hei[cf]/i.test(file.type);
  if (!isHeicUpload) {
    return NextResponse.json({ error: "Only HEIC or HEIF files can use this endpoint." }, { status: 400 });
  }

  if (!(await userCanWriteStoragePath(storagePath, user.id))) {
    return NextResponse.json({ error: "You do not have permission to upload to this path." }, { status: 403 });
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const decodedJpeg = toBuffer(
      await convert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.9,
      }),
    );
    const optimizedJpeg = await sharp(decodedJpeg)
      .rotate()
      .resize({
        width: OUTPUT_MAX_DIMENSION,
        height: OUTPUT_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    const jpegStoragePath = toJpegStoragePath(storagePath);
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage.from("uploads").upload(jpegStoragePath, optimizedJpeg, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      throw uploadError;
    }

    return NextResponse.json({
      storagePath: jpegStoragePath,
      contentType: "image/jpeg",
      converted: true,
      originalSize: file.size,
      convertedSize: optimizedJpeg.byteLength,
    });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to convert HEIC image.",
      },
      { status: 500 },
    );
  }
}
