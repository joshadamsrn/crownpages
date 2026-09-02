import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Crown, ExternalLink, MapPin } from "lucide-react";
import { getNetworkFacility } from "@/lib/network/facilities";
import styles from "../../network.module.css";

export const dynamic = "force-dynamic";

type FacilityPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: FacilityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getNetworkFacility(slug);

  if (!facility) {
    return { title: "Facility not found" };
  }

  const location = [facility.city, facility.state].filter(Boolean).join(", ");
  const description = facility.about || facility.shortDescription || `Explore ${facility.name} on Crown Network.`;

  return {
    title: facility.name,
    description,
    openGraph: {
      title: facility.name,
      description,
      images: facility.imageUrl ? [{ url: facility.imageUrl, alt: facility.name }] : [],
      type: "website",
    },
    twitter: {
      card: facility.imageUrl ? "summary_large_image" : "summary",
      title: facility.name,
      description: location ? `${description} Located in ${location}.` : description,
      images: facility.imageUrl ? [facility.imageUrl] : [],
    },
  };
}

export default async function NetworkFacilityPage({ params }: FacilityPageProps) {
  const { slug } = await params;
  const facility = await getNetworkFacility(slug);

  if (!facility) notFound();

  const location = [facility.city, facility.state, facility.zipCode].filter(Boolean).join(", ");
  const address = [facility.streetAddress, location].filter(Boolean).join(", ");
  const referralSafeProfilePath = `/${facility.businessSlug}/${facility.pageSlug}1`;

  return (
    <main className={styles.detailMain}>
      <Link className={styles.backLink} href="/network#search">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to care search
      </Link>

      <section className={styles.detailHero}>
        {facility.imageUrl ? (
          <Image
            alt={`${facility.name} community`}
            className={styles.detailImage}
            fill
            priority
            sizes="(max-width: 1120px) 100vw, 1120px"
            src={facility.imageUrl}
          />
        ) : (
          <div className={styles.imageFallback} aria-hidden="true">
            <Crown />
          </div>
        )}
        <div className={styles.detailOverlay}>
          <div className={styles.detailHeroCopy}>
            <div className={styles.eyebrow}>Crown Network community</div>
            <h1>{facility.name}</h1>
            <div className={styles.detailLocation}>
              <MapPin size={17} aria-hidden="true" />
              {address || "Location available from the provider"}
            </div>
            {facility.careTypes.length > 0 ? (
              <div className={styles.tags} aria-label="Care types">
                {facility.careTypes.map((careType) => (
                  <span className={styles.tag} key={careType}>
                    {careType}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className={styles.detailGrid}>
        <div>
          <section className={styles.detailSection}>
            <h2>About this provider</h2>
            <p>
              {facility.about ||
                facility.shortDescription ||
                "This provider is part of the free Crown Network care directory. Open the full facility profile for additional details."}
            </p>
          </section>

          {facility.amenities.length > 0 ? (
            <section className={styles.detailSection}>
              <h2>Services and amenities</h2>
              <ul className={styles.amenityGrid}>
                {facility.amenities.map((amenity) => (
                  <li className={styles.amenity} key={amenity}>
                    <Check aria-hidden="true" />
                    <span>{amenity}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside>
          <div className={styles.contactCard}>
            <h2>Connect with {facility.name}</h2>
            <p>
              Crown Network will personalize help with availability, next steps, and connecting with {facility.name}.
            </p>
            <Link className={styles.primaryAction} href={`/network/get-help?facility=${encodeURIComponent(facility.slug)}`}>
              Connect for Free
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className={styles.secondaryAction} href={referralSafeProfilePath}>
              View full profile
              <ExternalLink size={16} aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
