"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  buildNetworkSharingDisclosure,
  NETWORK_COMMUNICATION_DISCLOSURE,
  NETWORK_COMPENSATION_DISCLOSURE,
  NETWORK_REFERRAL_DISCLOSURE_VERSION,
} from "@/lib/network/consent";
import styles from "@/app/network/network.module.css";

export type IntakeFacilityOption = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  careTypes: string[];
};

type IntakeState = {
  relationship: string;
  desiredCity: string;
  desiredState: string;
  desiredZipCode: string;
  searchRadiusMiles: string;
  careTypes: string[];
  moveTimeframe: string;
  supportNeeds: string[];
  preferences: string[];
  additionalNotes: string;
  budgetRange: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  allowEmail: boolean;
  allowPhone: boolean;
  allowSms: boolean;
  facilityIds: string[];
  previouslyContactedFacilityIds: string[];
  sharingAccepted: boolean;
  compensationAcknowledged: boolean;
  privacyAccepted: boolean;
  company: string;
};

const CARE_TYPES = ["Independent Living", "Assisted Living", "Memory Care"];
const SUPPORT_NEEDS = [
  "Walking or transfers",
  "Bathing or dressing",
  "Medication assistance",
  "Memory support",
  "Meals and housekeeping",
  "Transportation",
  "Overnight supervision",
  "Accessibility features",
];
const PREFERENCES = [
  "Private room",
  "Pet friendly",
  "Active social calendar",
  "Outdoor space",
  "Faith-based options",
  "Close to family",
  "Flexible dining",
  "Respite stay available",
];
const STEPS = ["Care needs", "Preferences", "Contact", "Review & consent"];

const EMPTY_STATE: IntakeState = {
  relationship: "",
  desiredCity: "",
  desiredState: "",
  desiredZipCode: "",
  searchRadiusMiles: "25",
  careTypes: [],
  moveTimeframe: "",
  supportNeeds: [],
  preferences: [],
  additionalNotes: "",
  budgetRange: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  allowEmail: true,
  allowPhone: false,
  allowSms: false,
  facilityIds: [],
  previouslyContactedFacilityIds: [],
  sharingAccepted: false,
  compensationAcknowledged: false,
  privacyAccepted: false,
  company: "",
};

function toggleValue(values: string[], value: string, max?: number) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (max && values.length >= max) return values;
  return [...values, value];
}

function getBudgetValues(range: string) {
  switch (range) {
    case "under-3000":
      return { budgetLow: null, budgetHigh: 3000 };
    case "3000-5000":
      return { budgetLow: 3000, budgetHigh: 5000 };
    case "5000-7000":
      return { budgetLow: 5000, budgetHigh: 7000 };
    case "7000-plus":
      return { budgetLow: 7000, budgetHigh: null };
    default:
      return { budgetLow: null, budgetHigh: null };
  }
}

export function FamilyIntakeForm({
  facilities,
  initialFacilityId,
  previewMode,
}: {
  facilities: IntakeFacilityOption[];
  initialFacilityId?: string;
  previewMode: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeState>(() => {
    const initialFacility = facilities.find((facility) => facility.id === initialFacilityId);
    return {
      ...EMPTY_STATE,
      desiredCity: initialFacility?.city || "",
      desiredState: initialFacility?.state || "",
      careTypes: initialFacility?.careTypes.filter((careType) => CARE_TYPES.includes(careType)) || [],
      facilityIds: initialFacility ? [initialFacility.id] : [],
    };
  });
  const [facilityQuery, setFacilityQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ referralId: string; preview: boolean } | null>(null);

  const selectedFacilities = useMemo(
    () => facilities.filter((facility) => form.facilityIds.includes(facility.id)),
    [facilities, form.facilityIds],
  );
  const visibleFacilities = useMemo(() => {
    const query = facilityQuery.trim().toLowerCase();
    const matches = query
      ? facilities.filter((facility) =>
          [facility.name, facility.city, facility.state, ...facility.careTypes]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : facilities;
    return matches.slice(0, 18);
  }, [facilities, facilityQuery]);
  const sharingDisclosure = buildNetworkSharingDisclosure(
    selectedFacilities.map((facility) => facility.name),
  );

  const update = <K extends keyof IntakeState>(key: K, value: IntakeState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleFacility = (facilityId: string) => {
    setForm((current) => {
      const facilityIds = toggleValue(current.facilityIds, facilityId, 3);
      return {
        ...current,
        facilityIds,
        previouslyContactedFacilityIds: current.previouslyContactedFacilityIds.filter((id) =>
          facilityIds.includes(id),
        ),
        sharingAccepted: false,
      };
    });
  };

  const validateStep = (targetStep: number) => {
    if (targetStep === 0) {
      if (!form.relationship) return "Tell us who you are helping.";
      if (!form.desiredCity.trim() && !form.desiredZipCode.trim()) return "Enter a city or ZIP code.";
      if (form.careTypes.length === 0) return "Select at least one care type.";
      if (!form.moveTimeframe) return "Select a move timeframe.";
    }

    if (targetStep === 2) {
      if (!form.firstName.trim() || !form.lastName.trim()) return "Enter your first and last name.";
      if (!form.email.trim() && !form.phone.trim()) return "Enter an email address or phone number.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        return "Enter a valid email address.";
      }
      if (form.allowEmail && !form.email.trim()) return "Enter an email address or turn off email contact.";
      if ((form.allowPhone || form.allowSms) && !form.phone.trim()) {
        return "Enter a phone number or turn off phone and text contact.";
      }
      if (!form.allowEmail && !form.allowPhone && !form.allowSms) return "Choose at least one contact method.";
    }

    if (targetStep === 3) {
      if (form.facilityIds.length < 1 || form.facilityIds.length > 3) {
        return "Select between one and three facilities.";
      }
      if (!form.sharingAccepted || !form.compensationAcknowledged || !form.privacyAccepted) {
        return "Review and accept all three required statements.";
      }
    }

    return null;
  };

  const next = () => {
    const nextError = validateStep(step);
    if (nextError) {
      setError(nextError);
      return;
    }
    setError(null);
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const nextError = validateStep(3);
    if (nextError) {
      setError(nextError);
      return;
    }

    setSubmitting(true);
    setError(null);
    const budget = getBudgetValues(form.budgetRange);
    const payload = {
      ...form,
      ...budget,
      searchRadiusMiles: Number(form.searchRadiusMiles),
      preferredContactMethod: form.allowSms ? "sms" : form.allowPhone ? "phone" : "email",
      disclosureVersion: NETWORK_REFERRAL_DISCLOSURE_VERSION,
      disclosureText: [
        sharingDisclosure,
        NETWORK_COMPENSATION_DISCLOSURE,
        NETWORK_COMMUNICATION_DISCLOSURE,
      ].join("\n\n"),
    };

    if (previewMode) {
      setResult({ referralId: `PREVIEW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, preview: true });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/network/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = (await response.json()) as { referralId?: string; error?: string };
      if (!response.ok || !responseBody.referralId) {
        throw new Error(responseBody.error || "Unable to submit the request.");
      }
      setResult({ referralId: responseBody.referralId, preview: false });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to submit the request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <section className={styles.intakeSuccess} aria-live="polite">
        <span className={styles.successIcon}>
          <CheckCircle2 aria-hidden="true" />
        </span>
        <div className={styles.eyebrow}>{result.preview ? "Preview complete" : "Request received"}</div>
        <h1>{result.preview ? "The family flow is working." : "Your care request is on its way."}</h1>
        <p>
          {result.preview
            ? "Nothing you entered was transmitted or saved. When referrals are enabled, this confirmation will include live provider delivery and status tracking."
            : "Crown Network will review your request and coordinate next steps with the providers you selected."}
        </p>
        <div className={styles.referenceNumber}>Reference: {result.referralId}</div>
        <Link className={styles.primaryAction} href="/network">
          Return to Crown Network
        </Link>
      </section>
    );
  }

  return (
    <div className={styles.intakeLayout}>
      <aside className={styles.intakeSidebar}>
        <div className={styles.eyebrow}>Personalized care search</div>
        <h1>Tell us what your family needs.</h1>
        <p>Most families finish in about five minutes. Only the selected providers may receive this request.</p>
        <ol className={styles.progressList}>
          {STEPS.map((label, index) => (
            <li className={index === step ? styles.progressActive : ""} key={label}>
              <span>{index < step ? <Check aria-hidden="true" /> : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>

      <section className={styles.intakeCard}>
        {previewMode ? (
          <div className={styles.previewNotice}>
            <CircleAlert aria-hidden="true" />
            <div>
              <strong>Safe preview mode</strong>
              <span>Use sample information. Nothing entered here will leave your browser or be saved.</span>
            </div>
          </div>
        ) : null}

        <div className={styles.mobileProgress}>Step {step + 1} of {STEPS.length} · {STEPS[step]}</div>

        {step === 0 ? (
          <div className={styles.intakeStep}>
            <div className={styles.stepHeading}>
              <span>Step 1</span>
              <h2>Who are you helping?</h2>
              <p>Start with the basics so we can narrow the directory to relevant options.</p>
            </div>

            <div className={styles.formGridTwo}>
              <label className={styles.formLabel}>
                Relationship
                <select value={form.relationship} onChange={(event) => update("relationship", event.target.value)}>
                  <option value="">Choose one</option>
                  <option value="self">Myself</option>
                  <option value="parent">Parent</option>
                  <option value="spouse-partner">Spouse or partner</option>
                  <option value="relative-friend">Relative or friend</option>
                  <option value="professional">A person I support professionally</option>
                </select>
              </label>
              <label className={styles.formLabel}>
                Move timeframe
                <select value={form.moveTimeframe} onChange={(event) => update("moveTimeframe", event.target.value)}>
                  <option value="">Choose one</option>
                  <option value="immediately">Immediately</option>
                  <option value="within-30-days">Within 30 days</option>
                  <option value="one-to-three-months">1–3 months</option>
                  <option value="three-plus-months">More than 3 months</option>
                  <option value="researching">Researching for the future</option>
                </select>
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>What type of care are you considering?</legend>
              <div className={styles.choiceGridThree}>
                {CARE_TYPES.map((careType) => (
                  <label className={form.careTypes.includes(careType) ? styles.choiceSelected : styles.choice} key={careType}>
                    <input
                      checked={form.careTypes.includes(careType)}
                      onChange={() => update("careTypes", toggleValue(form.careTypes, careType))}
                      type="checkbox"
                    />
                    <span>{careType}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={styles.formGridLocation}>
              <label className={styles.formLabel}>
                Preferred city
                <input value={form.desiredCity} onChange={(event) => update("desiredCity", event.target.value)} placeholder="Salt Lake City" />
              </label>
              <label className={styles.formLabel}>
                State
                <input value={form.desiredState} onChange={(event) => update("desiredState", event.target.value)} placeholder="Utah" />
              </label>
              <label className={styles.formLabel}>
                ZIP code
                <input value={form.desiredZipCode} onChange={(event) => update("desiredZipCode", event.target.value)} inputMode="numeric" placeholder="84101" />
              </label>
              <label className={styles.formLabel}>
                Search radius
                <select value={form.searchRadiusMiles} onChange={(event) => update("searchRadiusMiles", event.target.value)}>
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                  <option value="100">100 miles</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className={styles.intakeStep}>
            <div className={styles.stepHeading}>
              <span>Step 2</span>
              <h2>What would make care a good fit?</h2>
              <p>Select only what is useful for matching. Detailed medical information is not needed.</p>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>Support that may be helpful</legend>
              <div className={styles.checkGrid}>
                {SUPPORT_NEEDS.map((need) => (
                  <label className={styles.checkChoice} key={need}>
                    <input checked={form.supportNeeds.includes(need)} onChange={() => update("supportNeeds", toggleValue(form.supportNeeds, need))} type="checkbox" />
                    <span>{need}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Community preferences</legend>
              <div className={styles.checkGrid}>
                {PREFERENCES.map((preference) => (
                  <label className={styles.checkChoice} key={preference}>
                    <input checked={form.preferences.includes(preference)} onChange={() => update("preferences", toggleValue(form.preferences, preference))} type="checkbox" />
                    <span>{preference}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className={styles.formLabel}>
              Approximate monthly private-pay budget
              <select value={form.budgetRange} onChange={(event) => update("budgetRange", event.target.value)}>
                <option value="">Not sure yet</option>
                <option value="under-3000">Under $3,000</option>
                <option value="3000-5000">$3,000–$5,000</option>
                <option value="5000-7000">$5,000–$7,000</option>
                <option value="7000-plus">$7,000+</option>
              </select>
            </label>

            <label className={styles.formLabel}>
              Anything else that would help with matching? <span>(optional)</span>
              <textarea
                maxLength={1200}
                onChange={(event) => update("additionalNotes", event.target.value)}
                placeholder="For example: prefers a smaller community near family. Please do not include diagnoses, medications, insurance numbers, or medical records."
                rows={5}
                value={form.additionalNotes}
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className={styles.intakeStep}>
            <div className={styles.stepHeading}>
              <span>Step 3</span>
              <h2>How should we reach you?</h2>
              <p>This should be the family member or authorized person coordinating the search.</p>
            </div>

            <div className={styles.formGridTwo}>
              <label className={styles.formLabel}>
                First name
                <input autoComplete="given-name" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
              </label>
              <label className={styles.formLabel}>
                Last name
                <input autoComplete="family-name" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
              </label>
              <label className={styles.formLabel}>
                Email
                <input autoComplete="email" inputMode="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
              </label>
              <label className={styles.formLabel}>
                Phone
                <input autoComplete="tel" inputMode="tel" type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
              </label>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>How may Crown Network and the selected providers contact you?</legend>
              <div className={styles.contactChoices}>
                <label className={styles.checkChoice}>
                  <input checked={form.allowEmail} onChange={(event) => update("allowEmail", event.target.checked)} type="checkbox" />
                  <Mail aria-hidden="true" /> Email
                </label>
                <label className={styles.checkChoice}>
                  <input checked={form.allowPhone} onChange={(event) => update("allowPhone", event.target.checked)} type="checkbox" />
                  <Phone aria-hidden="true" /> Phone calls
                </label>
                <label className={styles.checkChoice}>
                  <input checked={form.allowSms} onChange={(event) => update("allowSms", event.target.checked)} type="checkbox" />
                  <Phone aria-hidden="true" /> Text messages
                </label>
              </div>
              <p className={styles.fieldHelp}>{NETWORK_COMMUNICATION_DISCLOSURE}</p>
            </fieldset>

            <label className={styles.honeypot} aria-hidden="true">
              Company
              <input autoComplete="off" tabIndex={-1} value={form.company} onChange={(event) => update("company", event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 3 ? (
          <div className={styles.intakeStep}>
            <div className={styles.stepHeading}>
              <span>Step 4</span>
              <h2>Choose who may receive the request.</h2>
              <p>Select one to three providers. Your information will not be broadcast to the entire directory.</p>
            </div>

            <label className={styles.facilitySearch}>
              <Search aria-hidden="true" />
              <span className="sr-only">Search facilities</span>
              <input onChange={(event) => setFacilityQuery(event.target.value)} placeholder="Search provider or city" type="search" value={facilityQuery} />
            </label>

            <div className={styles.selectionCount}>{form.facilityIds.length} of 3 selected</div>
            <div className={styles.facilityPicker}>
              {visibleFacilities.map((facility) => {
                const selected = form.facilityIds.includes(facility.id);
                const disabled = !selected && form.facilityIds.length >= 3;
                return (
                  <label className={selected ? styles.facilityOptionSelected : styles.facilityOption} key={facility.id}>
                    <input
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleFacility(facility.id)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{facility.name}</strong>
                      <small><MapPin aria-hidden="true" /> {[facility.city, facility.state].filter(Boolean).join(", ")}</small>
                    </span>
                  </label>
                );
              })}
            </div>

            {selectedFacilities.length > 0 ? (
              <>
                <fieldset className={styles.previousContactBox}>
                  <legend>Have you already contacted any of these providers?</legend>
                  <p>This helps Crown Network and the provider identify an existing relationship accurately.</p>
                  {selectedFacilities.map((facility) => (
                    <label className={styles.checkChoice} key={facility.id}>
                      <input
                        checked={form.previouslyContactedFacilityIds.includes(facility.id)}
                        onChange={() =>
                          update(
                            "previouslyContactedFacilityIds",
                            toggleValue(form.previouslyContactedFacilityIds, facility.id),
                          )
                        }
                        type="checkbox"
                      />
                      <span>I have already contacted {facility.name}</span>
                    </label>
                  ))}
                </fieldset>

                <div className={styles.reviewBox}>
                  <h3>Request summary</h3>
                  <dl>
                    <div><dt>Helping</dt><dd>{form.relationship.replaceAll("-", " ")}</dd></div>
                    <div><dt>Care</dt><dd>{form.careTypes.join(", ")}</dd></div>
                    <div><dt>Location</dt><dd>{[form.desiredCity, form.desiredState, form.desiredZipCode].filter(Boolean).join(", ")}</dd></div>
                    <div><dt>Timing</dt><dd>{form.moveTimeframe.replaceAll("-", " ")}</dd></div>
                    <div><dt>Selected providers</dt><dd>{selectedFacilities.map((facility) => facility.name).join(", ")}</dd></div>
                  </dl>
                </div>
              </>
            ) : null}

            <div className={styles.consentBox}>
              <div className={styles.consentHeading}>
                <ShieldCheck aria-hidden="true" />
                <div><strong>Review and authorize</strong><span>These choices are recorded with the request.</span></div>
              </div>
              <label className={styles.consentChoice}>
                <input checked={form.sharingAccepted} onChange={(event) => update("sharingAccepted", event.target.checked)} type="checkbox" />
                <span>{selectedFacilities.length ? sharingDisclosure : "Select facilities to review the sharing authorization."}</span>
              </label>
              <label className={styles.consentChoice}>
                <input checked={form.compensationAcknowledged} onChange={(event) => update("compensationAcknowledged", event.target.checked)} type="checkbox" />
                <span>{NETWORK_COMPENSATION_DISCLOSURE}</span>
              </label>
              <label className={styles.consentChoice}>
                <input checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} type="checkbox" />
                <span>
                  I have reviewed the <Link href="/privacy-policy" target="_blank">Privacy Policy</Link> and <Link href="/terms-of-service" target="_blank">Terms of Service</Link>.
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {error ? <div className={styles.formError} role="alert">{error}</div> : null}

        <div className={styles.formActions}>
          {step > 0 ? (
            <button className={styles.backButton} onClick={back} type="button">
              <ArrowLeft aria-hidden="true" /> Back
            </button>
          ) : (
            <Link className={styles.backButton} href="/network">
              <ArrowLeft aria-hidden="true" /> Directory
            </Link>
          )}
          {step < STEPS.length - 1 ? (
            <button className={styles.continueButton} onClick={next} type="button">
              Continue <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button className={styles.continueButton} disabled={submitting} onClick={submit} type="button">
              {submitting ? "Submitting…" : previewMode ? "Preview my care plan" : "Send my request"}
              {!submitting ? <ArrowRight aria-hidden="true" /> : null}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
