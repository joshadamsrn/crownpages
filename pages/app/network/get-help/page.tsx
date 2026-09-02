import type { Metadata } from "next";
import Link from "next/link";
import { FamilyIntakeForm, type IntakeFacilityOption } from "@/components/network/family-intake-form";
import { isNetworkReferralsEnabled } from "@/lib/network/config";
import { getNetworkFacilities, getReferralEligiblePageIds } from "@/lib/network/facilities";
import styles from "../network.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function generateMetadata(): Metadata {
  const previewMode = !isNetworkReferralsEnabled();
  return {
    title: "Personalized care search",
    description: "Tell Crown Network what your family needs and choose which providers may contact you.",
    robots: previewMode ? { index: false, follow: false } : undefined,
  };
}

export default async function GetHelpPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedSlugValue = params.facility;
  const requestedSlug = Array.isArray(requestedSlugValue) ? requestedSlugValue[0] : requestedSlugValue;
  const requestedSourceValue = params.source;
  const requestedSource = Array.isArray(requestedSourceValue) ? requestedSourceValue[0] : requestedSourceValue;
  const previewMode = !isNetworkReferralsEnabled();
  const [allFacilities, eligiblePageIds] = await Promise.all([
    getNetworkFacilities({ limit: 1000 }),
    previewMode ? Promise.resolve(null) : getReferralEligiblePageIds(),
  ]);
  const facilities = allFacilities
    .filter((facility) =>
      previewMode || eligiblePageIds?.has(facility.pageId),
    )
    .map<IntakeFacilityOption>((facility) => ({
      id: facility.id,
      slug: facility.slug,
      name: facility.name,
      city: facility.city,
      state: facility.state,
      careTypes: facility.careTypes,
    }));
  const initialFacilityId = facilities.find((facility) => facility.slug === requestedSlug)?.id;
  const referralSource = requestedSource === "network-profile" && initialFacilityId
    ? "network_profile"
    : undefined;

  if (!previewMode && facilities.length === 0) {
    return (
      <main className={styles.intakeMain}>
        <section className={styles.intakeSuccess}>
          <h1>Personalized referrals are opening soon.</h1>
          <p>
            You can search Crown Network providers today. Direct referral requests will open as participating
            providers complete their agreements and availability setup.
          </p>
          <Link className={styles.primaryAction} href="/network#search">
            Search the care directory
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.intakeMain}>
      <FamilyIntakeForm
        facilities={facilities}
        initialFacilityId={initialFacilityId}
        previewMode={previewMode}
        referralSource={referralSource}
      />
    </main>
  );
}
