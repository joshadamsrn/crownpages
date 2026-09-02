import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CSV_BYTES = 10 * 1024 * 1024;

function sanitizeFilename(value: string) {
  const safeName = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  if (!safeName) {
    return "kiosk-visitors.csv";
  }

  return safeName.toLowerCase().endsWith(".csv") ? safeName : `${safeName}.csv`;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid export origin." }, { status: 403 });
  }

  const formData = await request.formData();
  const csv = formData.get("csv");
  const requestedFilename = formData.get("filename");

  if (typeof csv !== "string" || csv.length === 0) {
    return NextResponse.json({ error: "Missing visitor export data." }, { status: 400 });
  }

  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) {
    return NextResponse.json({ error: "Visitor export is too large." }, { status: 413 });
  }

  const filename = sanitizeFilename(
    typeof requestedFilename === "string" ? requestedFilename : "kiosk-visitors.csv",
  );

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
