import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  KIOSK_OVERVIEW_COOKIE_NAME,
  verifyKioskOverviewAccessToken,
} from "@/lib/kiosk-overview-access";
import { parseKioskHomeRoute } from "@/lib/kiosk-home-route";
import { KioskVisitorLog } from "@/components/kiosk-visitor-log";
import { createClient } from "@/lib/supabase/server";

type KioskOverviewPageProps = {
  params: Promise<{ business_slug: string; slug: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

type KioskOverviewPageRecord = {
  id: string;
  title: string;
  slug: string;
  business_id: string;
  businesses: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export const metadata: Metadata = {
  title: "Overview of Kiosk | Crown Pages",
  robots: {
    index: false,
    follow: false,
  },
};

async function getKioskOverviewPage(businessSlug: string, pageSlug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pages")
    .select(
      `
        id,
        title,
        slug,
        business_id,
        businesses!inner (
          id,
          name,
          slug
        )
      `,
    )
    .eq("slug", pageSlug)
    .eq("businesses.slug", businessSlug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as KioskOverviewPageRecord;
}

export default async function PublicKioskOverviewPage({
  params,
  searchParams,
}: KioskOverviewPageProps) {
  const { business_slug: businessSlug, slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnToParam = Array.isArray(resolvedSearchParams.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams.returnTo;
  const kioskHome = parseKioskHomeRoute(returnToParam);
  const returnHref = `/${businessSlug}/${slug}/${kioskHome}`;
  const page = await getKioskOverviewPage(businessSlug, slug);

  if (!page) {
    redirect(returnHref);
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(KIOSK_OVERVIEW_COOKIE_NAME)?.value;

  if (!verifyKioskOverviewAccessToken(accessToken, page.business_id)) {
    redirect(returnHref);
  }

  return (
    <KioskVisitorLog
      accessMode="kiosk"
      businessId={page.business_id}
      businessName={page.businesses?.name || page.title}
      returnHref={returnHref}
      initialPageFilter="All"
      initialRange="1d"
    />
  );
}
