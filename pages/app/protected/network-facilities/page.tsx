import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NetworkFacilitiesDashboard } from "@/components/network/network-facilities-dashboard";
import { getNetworkAdminFacilities } from "@/lib/network/admin-facilities";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Facility partners | Crown Network",
  robots: { index: false, follow: false },
};

export default async function NetworkFacilitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (!(await hasCrownAdminAccess(user.id, supabase))) redirect("/protected/pages");

  const previewMode = !isNetworkReferralsEnabled();
  const facilities = previewMode ? [] : await getNetworkAdminFacilities();
  return <NetworkFacilitiesDashboard initialFacilities={facilities} previewMode={previewMode} />;
}
