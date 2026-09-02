import { NextRequest, NextResponse } from "next/server";

import {
  buildIcsFile,
  verifyCalendarToken,
} from "@/lib/page-engagement-server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing calendar token." }, { status: 400 });
  }

  const payload = verifyCalendarToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid calendar token." }, { status: 400 });
  }

  const fileName = payload.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(buildIcsFile(payload), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName || "meeting"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
