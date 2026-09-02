import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Crown, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import styles from "@/app/network/network.module.css";
import { isNetworkInsuranceCareType, type NetworkFacility } from "@/lib/network/types";

export function FacilityCard({ facility }: { facility: NetworkFacility }) {
  const location = [facility.city, facility.state].filter(Boolean).join(", ") || "Location available on profile";
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  const pricePeriod = facility.pricePeriod ? ` / ${facility.pricePeriod}` : "";
  const usesInsurance = facility.careTypes.some(isNetworkInsuranceCareType);
  const price =
    facility.priceLow !== null && facility.priceHigh !== null
      ? facility.priceLow === facility.priceHigh
        ? `${currency.format(facility.priceLow)}${pricePeriod}`
        : `${currency.format(facility.priceLow)}–${currency.format(facility.priceHigh)}${pricePeriod}`
      : facility.priceLow !== null
        ? `From ${currency.format(facility.priceLow)}${pricePeriod}`
        : facility.priceHigh !== null
          ? `Up to ${currency.format(facility.priceHigh)}${pricePeriod}`
          : "Contact for pricing";

  return (
    <article className={styles.card}>
      <Link
        aria-label={`View ${facility.name}`}
        className={styles.cardClickTarget}
        href={`/network/facilities/${facility.slug}`}
      >
        <div className={styles.cardImageWrap}>
          {facility.imageUrl ? (
            <Image
              alt={`${facility.name} community`}
              className={styles.cardImage}
              fill
              sizes="(max-width: 680px) 100vw, (max-width: 940px) 50vw, 33vw"
              src={facility.imageUrl}
            />
          ) : (
            <div className={styles.imageFallback} aria-hidden="true">
              <Crown />
            </div>
          )}
        </div>

        <div className={styles.cardBody}>
          <div className={styles.location}>
            <MapPin aria-hidden="true" />
            <span>{location}</span>
            {facility.distanceMiles !== null ? (
              <span className={styles.distance}>{facility.distanceMiles.toFixed(1)} mi away</span>
            ) : null}
          </div>
          <h2 className={styles.cardTitle}>{facility.name}</h2>
          <p className={styles.cardDescription}>
            {facility.about || facility.shortDescription || "Explore this provider's services and community information."}
          </p>

          {usesInsurance ? (
            <div className={styles.cardPrice}>
              <ShieldCheck aria-hidden="true" />
              <span>
                {facility.acceptedInsurances.length > 0
                  ? `Accepts ${facility.acceptedInsurances.slice(0, 2).join(", ")}${facility.acceptedInsurances.length > 2 ? " + more" : ""}`
                  : "Contact provider to verify insurance"}
              </span>
            </div>
          ) : (
            <div className={styles.cardPrice}>
              <WalletCards aria-hidden="true" />
              <span>{price}</span>
            </div>
          )}

          {facility.careTypes.length > 0 ? (
            <div className={styles.tags} aria-label="Care types">
              {facility.careTypes.slice(0, 3).map((careType) => (
                <span className={styles.tag} key={careType}>
                  {careType}
                </span>
              ))}
            </div>
          ) : null}

          <span className={styles.cardLink}>
            View community
            <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}
