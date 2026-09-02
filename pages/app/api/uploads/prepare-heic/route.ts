import { NextResponse } from "next/server";
import convert from "heic-convert";
import sharp from "sharp";

import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_HEIC_UPLOAD_BYTES = 30 * 1024 * 1024;
const OUTPUT_MAX_DIMENSION = 2400;

function isHeicFile(file: File) {
  return /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
}

function toBuffer(value: ArrayBuffer | Buffer | Uint8Array) {
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in to adjust images." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !isHeicFile(file)) {
    return NextResponse.json({ error: "A HEIC or HEIF image is required." }, { status: 400 });
  }

  if (file.size > MAX_HEIC_UPLOAD_BYTES) {
    return NextResponse.json({ error: "HEIC file is too large to prepare." }, { status: 413 });
  }

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const decodedJpeg = toBuffer(
      await convert({
        buffer: inputBuffer,
        format: "JPEG",
        quality: 0.92,
      }),
    );
    const preparedJpeg = await sharp(decodedJpeg)
      .rotate()
      .resize({
        width: OUTPUT_MAX_DIMENSION,
        height: OUTPUT_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    return new Response(new Uint8Array(preparedJpeg), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="prepared-kiosk-logo.jpg"',
        "Content-Type": "image/jpeg",
      },
    });
  } catch (error) {
    console.error("HEIC preview preparation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare HEIC image." },
      { status: 500 },
    );
  }
}
