import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProviderReferralView } from "@/components/network/provider-referral-view";
import { NETWORK_PROVIDER_PREVIEW_REFERRAL } from "@/lib/network/provider-preview";
import { getNetworkProviderReferral } from "@/lib/network/provider-referral-access";
import { isNetworkReferralsEnabled } from "@/lib/network/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Secure provider referral | Crown Network",
  description: "Private Crown Network provider referral access.",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  referrer: "no-referrer",
};

export default async function ProviderReferralPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const referralsEnabled = isNetworkReferralsEnabled();
  const previewMode = token === "preview" && process.env.NODE_ENV !== "production";

  if (previewMode) {
    return (
      <ProviderReferralView
        accessToken={token}
        previewMode
        referral={NETWORK_PROVIDER_PREVIEW_REFERRAL}
      />
    );
  }

  if (!referralsEnabled) notFound();

  const requestHeaders = await headers();
  const referral = await getNetworkProviderReferral(token, requestHeaders.get("user-agent"));
  if (!referral) notFound();

  return (
    <ProviderReferralView
      accessToken={token}
      previewMode={false}
      referral={referral}
    />
  );
}
