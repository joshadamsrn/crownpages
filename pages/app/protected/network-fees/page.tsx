import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NetworkFeeLedgerDashboard } from "@/components/network/network-fee-ledger-dashboard";
import { getNetworkAdminFees } from "@/lib/network/admin-fees";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referral fees | Crown Network",
  robots: { index: false, follow: false },
};

export default async function NetworkFeesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  if (!(await hasCrownAdminAccess(user.id, supabase))) redirect("/protected/pages");

  const previewMode = !isNetworkReferralsEnabled();
  const fees = previewMode ? [] : await getNetworkAdminFees();
  return <NetworkFeeLedgerDashboard initialFees={fees} previewMode={previewMode} />;
}
