"use client";

import { useState } from "react";
import { DollarSign, MapPin, Search, ShieldCheck } from "lucide-react";
import styles from "@/app/network/network.module.css";
import {
  NETWORK_CARE_TYPES,
  isNetworkInsuranceCareType,
} from "@/lib/network/types";

type Props = {
  query: string;
  careType: string;
  state: string;
  states: string[];
  radiusMiles?: number;
  priceMax?: number;
  insurance: string;
  insuranceOptions: string[];
  locationOptions: string[];
};

export function NetworkSearchForm({
  query,
  careType,
  state,
  states,
  radiusMiles,
  priceMax,
  insurance,
  insuranceOptions,
  locationOptions,
}: Props) {
  const [selectedCareType, setSelectedCareType] = useState(careType);
  const usesInsurance = isNetworkInsuranceCareType(selectedCareType);

  return (
    <form className={styles.searchForm} action="/network" method="get">
      <div className={styles.primaryFilters}>
        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>City, ZIP, or provider</span>
          <span className={styles.field}>
            <Search className={styles.fieldIcon} aria-hidden="true" />
            <input
              className={styles.searchInput}
              defaultValue={query}
              list="network-location-options"
              name="q"
              placeholder="City, ZIP code, or provider name"
              type="search"
            />
            <datalist id="network-location-options">
              {locationOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </span>
        </label>

        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Care type</span>
          <select
            className={styles.select}
            name="care"
            onChange={(event) => setSelectedCareType(event.target.value)}
            value={selectedCareType}
          >
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

        {usesInsurance ? (
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>Insurance accepted</span>
            <span className={styles.field}>
              <ShieldCheck className={styles.fieldIcon} aria-hidden="true" />
              <input
                autoComplete="off"
                className={styles.searchInput}
                defaultValue={insurance}
                list="network-insurance-options"
                name="insurance"
                placeholder="Medicare, Medicaid, or plan"
                type="search"
              />
              <datalist id="network-insurance-options">
                {insuranceOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </span>
          </label>
        ) : (
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
        )}

        <p className={styles.filterHint}>
          {usesInsurance ? (
            <>
              <ShieldCheck aria-hidden="true" />
              Insurance participation can change. Confirm coverage and authorization directly with the provider.
            </>
          ) : (
            <>
              <MapPin aria-hidden="true" />
              Enter a city or ZIP to use distance. Budget matches published starting prices; communities
              without public pricing remain available after priced matches.
            </>
          )}
        </p>
      </div>
    </form>
  );
}
