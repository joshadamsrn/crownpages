import Link from "next/link";
import { ArrowRight, Compass, DollarSign, MapPin, Search } from "lucide-react";
import { FacilityCard } from "@/components/network/facility-card";
import { searchNetworkFacilities, getNetworkStates } from "@/lib/network/facilities";
import { NETWORK_CARE_TYPES } from "@/lib/network/types";
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
  const priceMax = getNumberParam(params, "priceMax", 1_000_000);
  const [{ facilities, total, location }, states] = await Promise.all([
    searchNetworkFacilities({
      query,
      careType,
      state,
      radiusMiles,
      priceMax,
      limit: 24,
    }),
    getNetworkStates(),
  ]);
  const hasFilters = Boolean(
    query || careType || state || radiusMiles || priceMax !== undefined,
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
        <form className={styles.searchForm} action="/network" method="get">
          <div className={styles.primaryFilters}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>City, ZIP, or provider</span>
              <span className={styles.field}>
                <Search className={styles.fieldIcon} aria-hidden="true" />
                <input
                  className={styles.searchInput}
                  defaultValue={query}
                  name="q"
                  placeholder="City, ZIP code, or provider name"
                  type="search"
                />
              </span>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Care type</span>
              <select className={styles.select} defaultValue={careType} name="care">
                <option value="">All care types</option>
                {NETWORK_CARE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>State</span>
              <select className={styles.select} defaultValue={state} name="state">
                <option value="">All states</option>
                {states.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <button className={styles.searchButton} type="submit">
              Search care
            </button>
          </div>

          <div className={styles.advancedFilters}>
            <div className={styles.filterHeading}>Narrow your results</div>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Distance</span>
              <select className={styles.select} defaultValue={radiusMiles ?? ""} name="radius">
                <option value="">Any distance</option>
                {[5, 10, 25, 50, 100].map((miles) => (
                  <option key={miles} value={miles}>
                    Within {miles} miles
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Maximum monthly budget</span>
              <span className={styles.moneyField}>
                <DollarSign aria-hidden="true" />
                <input
                  className={styles.priceInput}
                  defaultValue={priceMax}
                  inputMode="numeric"
                  min="0"
                  name="priceMax"
                  placeholder="Up to"
                  step="100"
                  type="number"
                />
              </span>
            </label>

            <p className={styles.filterHint}>
              <MapPin aria-hidden="true" />
              Enter a city or ZIP to use distance. Budget matches each community&apos;s starting monthly price.
            </p>
          </div>
        </form>
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
            {location.status === "resolved" || priceSummary ? (
              <div className={styles.appliedFilters} aria-label="Applied search filters">
                {location.status === "resolved" ? (
                  <span>Within {radiusMiles} miles of {location.label}</span>
                ) : null}
                {priceSummary ? <span>Starting price {priceSummary}</span> : null}
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
