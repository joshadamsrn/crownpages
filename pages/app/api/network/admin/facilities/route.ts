import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getNetworkAdminFacilities } from "@/lib/network/admin-facilities";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

async function authorize() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (!(await hasCrownAdminAccess(user.id, supabase))) {
    return {
      response: NextResponse.json(
        { error: "Crown Network staff access is required." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET() {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Facility operations are still in preview mode." }, { status: 503 });
  }
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;

  try {
    return NextResponse.json({ facilities: await getNetworkAdminFacilities() });
  } catch (error) {
    console.error("Unable to load Crown Network facilities", error);
    return NextResponse.json({ error: "Facilities could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isNetworkReferralsEnabled()) {
    return NextResponse.json({ error: "Facility operations are still in preview mode." }, { status: 503 });
  }
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const authorization = await authorize();
  if ("response" in authorization) return authorization.response;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("sync_phn_network_facilities" as never);
  if (error) {
    console.error("Unable to synchronize PHN facilities", error);
    return NextResponse.json({ error: "PHN facilities could not be synchronized." }, { status: 500 });
  }

  revalidatePath("/network");
  revalidatePath("/network/get-help");
  revalidatePath("/protected/network-facilities");
  return NextResponse.json({ success: true, syncedCount: typeof data === "number" ? data : 0 });
}
