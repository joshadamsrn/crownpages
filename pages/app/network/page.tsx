import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { FacilityCard } from "@/components/network/facility-card";
import { NetworkSearchForm } from "@/components/network/network-search-form";
import {
  getNetworkInsuranceOptions,
  getNetworkLocationOptions,
  getNetworkStates,
  searchNetworkFacilities,
} from "@/lib/network/facilities";
import { isNetworkInsuranceCareType } from "@/lib/network/types";
import styles from "./network.module.css";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function getNumberParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
  maximum: number,
) {
  const value = getParam(params, key);
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum ? number : undefined;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function NetworkHome({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = getParam(params, "q");
  const careType = getParam(params, "care");
  const state = getParam(params, "state");
  const radiusMiles = getNumberParam(params, "radius", 500);
  const usesInsurance = isNetworkInsuranceCareType(careType);
  const priceMax = usesInsurance ? undefined : getNumberParam(params, "priceMax", 1_000_000);
  const insurance = usesInsurance ? getParam(params, "insurance") : "";
  const [{ facilities, total, location }, states, insuranceOptions, locationOptions] = await Promise.all([
    searchNetworkFacilities({
      query,
      careType,
      state,
      radiusMiles,
      priceMax,
      insurance,
      limit: 24,
    }),
    getNetworkStates(),
    getNetworkInsuranceOptions(),
    getNetworkLocationOptions(),
  ]);
  const hasFilters = Boolean(
    query || careType || state || radiusMiles || priceMax !== undefined || insurance,
  );
  const priceSummary = priceMax !== undefined ? `up to ${formatCurrency(priceMax)}` : null;

  return (
    <main className={styles.main}>
      <section className={styles.intro} aria-labelledby="network-title">
        <div>
          <div className={styles.eyebrow}>
            <Compass size={15} aria-hidden="true" />
            Free care directory
          </div>
          <h1 className={styles.title} id="network-title">
            Find care that fits your family.
          </h1>
        </div>
        <div>
          <p className={styles.introCopy}>
            Explore senior living and care providers, understand what they offer, and create a shortlist with
            confidence. Browsing Crown Network is always free for families.
          </p>
          <Link className={styles.introAction} href="/network/get-help">
            Get personalized help
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className={styles.searchPanel} aria-label="Search care providers">
        <NetworkSearchForm
          careType={careType}
          insurance={insurance}
          insuranceOptions={insuranceOptions}
          locationOptions={locationOptions}
          priceMax={priceMax}
          query={query}
          radiusMiles={radiusMiles}
          state={state}
          states={states}
        />
        {location.status === "missing" ? (
          <p className={styles.searchNotice} role="status">
            Enter a city or ZIP code to apply the distance filter.
          </p>
        ) : location.status === "unresolved" ? (
          <p className={styles.searchNotice} role="status">
            We couldn&apos;t identify that location, so distance was not applied. Try a five-digit ZIP code or
            choose a state with the city.
          </p>
        ) : null}
      </section>

      <section id="results" aria-labelledby="results-title">
        <div className={styles.resultHeader}>
          <div>
            <h2 className={styles.resultTitle} id="results-title">
              {hasFilters ? "Matching care options" : "Explore care options"}
            </h2>
            <p className={styles.resultCopy}>
              {total === 1 ? "1 listing" : `${total} listings`}
              {total > facilities.length ? ` · showing the first ${facilities.length}` : ""}
            </p>
            {location.status === "resolved" || location.status === "exact" || priceSummary || insurance ? (
              <div className={styles.appliedFilters} aria-label="Applied search filters">
                {location.status === "resolved" ? (
                  <span>Within {radiusMiles} miles of {location.label}</span>
                ) : location.status === "exact" ? (
                  <span>In {location.label}</span>
                ) : null}
                {priceSummary ? <span>Published starting price {priceSummary}; unknown prices also shown</span> : null}
                {insurance ? <span>Accepts {insurance}</span> : null}
              </div>
            ) : null}
          </div>
          {hasFilters ? (
            <Link className={styles.clearLink} href="/network#results">
              Clear filters
            </Link>
          ) : null}
        </div>

        <div className={styles.grid}>
          {facilities.length > 0 ? (
            facilities.map((facility) => <FacilityCard facility={facility} key={facility.id} />)
          ) : (
            <div className={styles.empty}>
              <h2>No exact matches yet</h2>
              <p>Try a nearby city, a broader care type, or clear your current filters.</p>
              <Link className={styles.clearLink} href="/network#results">
                View all providers
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className={styles.howItWorks} id="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">A clearer path to the next right step.</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <h3>Explore freely</h3>
            <p>Search every listed provider without creating an account or paying a fee.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <h3>Compare what matters</h3>
            <p>Review care types, location, services, and community details in one consistent format.</p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <h3>Connect confidently</h3>
            <p>Ask for personalized help and choose exactly which providers may receive your request.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
