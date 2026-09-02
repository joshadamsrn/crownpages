import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralOperationsDashboard } from "@/components/network/referral-operations-dashboard";
import { NETWORK_ADMIN_PREVIEW_REFERRALS } from "@/lib/network/admin-preview";
import { getNetworkAdminReferrals } from "@/lib/network/admin-referrals";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { hasCrownAdminAccess } from "@/lib/organization-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referral inbox | Crown Network",
  robots: { index: false, follow: false },
};

export default async function NetworkReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");
  if (!(await hasCrownAdminAccess(user.id, supabase))) redirect("/protected/pages");

  const previewMode = !isNetworkReferralsEnabled();
  const referrals = previewMode
    ? NETWORK_ADMIN_PREVIEW_REFERRALS
    : await getNetworkAdminReferrals();

  return (
    <ReferralOperationsDashboard
      initialReferrals={referrals}
      previewMode={previewMode}
    />
  );
}
