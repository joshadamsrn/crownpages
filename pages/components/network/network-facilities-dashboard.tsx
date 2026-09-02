"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  ExternalLink,
  Mail,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  NetworkAdminFacility,
  NetworkAdminFacilitySettings,
  NetworkFacilityAgreementStatus,
  NetworkFacilityFeeType,
  NetworkFacilityListingStatus,
  NetworkFacilityReferralStatus,
} from "@/lib/network/admin-facility-types";
import { isNetworkFacilityReferralEligible } from "@/lib/network/facility-eligibility";
import {
  NETWORK_CARE_TYPES,
  hasNetworkInsuranceCareType,
  type NetworkCareType,
} from "@/lib/network/types";
import { cn } from "@/lib/utils";

type Props = {
  initialFacilities: NetworkAdminFacility[];
  previewMode: boolean;
};

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function numberInputValue(value: number | null) {
  return value === null ? "" : String(value);
}

function nullableNumber(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseInsuranceInput(value: string) {
  return Array.from(
    new Set(
      value
        .split("\n")
        .map((insurance) => insurance.trim())
        .filter(Boolean),
    ),
  );
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

const facilityDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatFacilityDate(value: string) {
  return facilityDateFormatter.format(new Date(value));
}

function agreementBadgeClass(status: NetworkFacilityAgreementStatus) {
  if (status === "active") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "inactive") return "border-rose-200 bg-rose-50 text-rose-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function NetworkFacilitiesDashboard({ initialFacilities, previewMode }: Props) {
  const [facilities, setFacilities] = useState(initialFacilities);
  const [selectedId, setSelectedId] = useState(initialFacilities[0]?.id ?? null);
  const [draft, setDraft] = useState<NetworkAdminFacility | null>(initialFacilities[0] ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingAction, setPendingAction] = useState<"save" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredFacilities = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return facilities.filter((facility) => {
      if (statusFilter === "active" && !facility.isReferralEligible) return false;
      if (
        statusFilter === "needs_agreement" &&
        (facility.agreementStatus === "active" || facility.referralFeeType === "none")
      ) return false;
      if (statusFilter === "paused" && facility.referralStatus !== "paused") return false;
      if (!needle) return true;
      return [facility.name, facility.city, facility.state, facility.sourceFacilityId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [facilities, query, statusFilter]);

  const activeCount = facilities.filter((facility) => facility.isReferralEligible).length;
  const pendingCount = facilities.filter((facility) => facility.agreementStatus === "pending").length;
  const draftSupportsNoFee = draft ? hasNetworkInsuranceCareType(draft.careTypes) : false;
  const draftIsNonCompensated = draft?.referralFeeType === "none";
  const draftIsReferralEligible = draft
    ? isNetworkFacilityReferralEligible({
        listing_status: draft.listingStatus,
        referral_status: draft.referralStatus,
        is_accepting_referrals: draft.isAcceptingReferrals,
        care_types: draft.careTypes,
        agreement_status: draft.agreementStatus,
        referral_fee_type: draft.referralFeeType,
        notification_email: draft.notificationEmail,
        agreement_effective_at: draft.agreementEffectiveAt,
        agreement_expires_at: draft.agreementExpiresAt,
      })
    : false;
  const selectFacility = (facility: NetworkAdminFacility) => {
    setSelectedId(facility.id);
    setDraft(facility);
    setFeedback(null);
  };
  const patchDraft = (updates: Partial<NetworkAdminFacility>) => {
    setDraft((current) => (current ? { ...current, ...updates } : current));
  };
  const setReferralFeeType = (referralFeeType: NetworkFacilityFeeType | null) => {
    if (referralFeeType === "none") {
      patchDraft({
        referralFeeType,
        referralFeeAmount: null,
        referralFeePercentage: null,
        agreementStatus: "not_contacted",
        agreementEffectiveAt: null,
        agreementExpiresAt: null,
        referralTermsVersion: null,
      });
      return;
    }
    patchDraft({
      referralFeeType,
      ...(draftIsNonCompensated
        ? { referralStatus: "paused", isAcceptingReferrals: false }
        : {}),
    });
  };

  const saveFacility = async () => {
    if (!draft) return;
    setPendingAction("save");
    setFeedback(null);
    const settings: NetworkAdminFacilitySettings = {
      listingStatus: draft.listingStatus,
      referralStatus: draft.referralStatus,
      isAcceptingReferrals: draft.isAcceptingReferrals,
      careTypes: draft.careTypes,
      latitude: draft.latitude,
      longitude: draft.longitude,
      priceLow: draft.priceLow,
      priceHigh: draft.priceHigh,
      pricePeriod: draft.pricePeriod,
      acceptedInsurances: draft.acceptedInsurances,
      notificationEmail: draft.notificationEmail,
      agreementStatus: draft.agreementStatus,
      referralFeeType: draft.referralFeeType,
      referralFeeAmount: draft.referralFeeAmount,
      referralFeePercentage: draft.referralFeePercentage,
      referralProtectionDays: draft.referralProtectionDays,
      agreementEffectiveAt: draft.agreementEffectiveAt,
      agreementExpiresAt: draft.agreementExpiresAt,
      referralTermsVersion: draft.referralTermsVersion,
      agreementNotes: draft.agreementNotes,
    };

    try {
      const response = await fetch(`/api/network/admin/facilities/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = (await response.json()) as { facility?: NetworkAdminFacility; error?: string };
      if (!response.ok || !result.facility) throw new Error(result.error || "The facility could not be saved.");
      setFacilities((current) =>
        current.map((facility) => (facility.id === result.facility?.id ? result.facility : facility)),
      );
      setDraft(result.facility);
      setFeedback("Facility participation and referral terms saved.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The facility could not be saved.");
    } finally {
      setPendingAction(null);
    }
  };

  if (previewMode) {
    return (
      <Card className="mx-auto max-w-4xl border-amber-200 bg-amber-50 p-8">
        <h1 className="text-2xl font-bold text-slate-950">Network facility partners</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
          Facility onboarding is in preview mode. Enable Crown Network referrals in an environment with the
          facility onboarding migration before managing partner agreements.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            <Building2 className="h-4 w-4" /> Crown Network operations
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Facility partners</h1>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200 p-4"><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Imported profiles</div><div className="mt-1 text-3xl font-black text-slate-950">{facilities.length}</div></Card>
        <Card className="border-emerald-200 bg-emerald-50/70 p-4"><div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Referral ready</div><div className="mt-1 text-3xl font-black text-emerald-950">{activeCount}</div></Card>
        <Card className="border-amber-200 bg-amber-50/70 p-4"><div className="text-xs font-bold uppercase tracking-wide text-amber-700">Agreements pending</div><div className="mt-1 text-3xl font-black text-amber-950">{pendingCount}</div></Card>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <div className="grid min-h-[720px] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-slate-200 p-4">
              <label className="relative block">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input className="bg-white pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search facilities" value={query} />
              </label>
              <select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="all">All participation statuses</option>
                <option value="active">Referral ready</option>
                <option value="needs_agreement">Needs referral terms</option>
                <option value="paused">Paused</option>
              </select>
              <div className="text-xs text-slate-500">{filteredFacilities.length} facilities</div>
            </div>
            <div className="max-h-[650px] overflow-y-auto p-2">
              {filteredFacilities.map((facility) => (
                <button className={cn("w-full rounded-xl border border-transparent p-3 text-left transition", facility.id === selectedId ? "border-amber-300 bg-white shadow-sm" : "hover:bg-white")} key={facility.id} onClick={() => selectFacility(facility)} type="button">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate text-sm font-bold text-slate-900">{facility.name}</div><div className="mt-1 truncate text-xs text-slate-500">{[facility.city, facility.state].filter(Boolean).join(", ") || "Location unavailable"}</div></div>
                    {facility.isReferralEligible ? <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {facility.referralFeeType === "none" ? (
                      <Badge className="border-sky-200 bg-sky-50 text-sky-800" variant="outline">
                        No referral fee
                      </Badge>
                    ) : (
                      <Badge className={agreementBadgeClass(facility.agreementStatus)} variant="outline">
                        {titleCase(facility.agreementStatus)}
                      </Badge>
                    )}
                    <Badge variant="outline">{titleCase(facility.referralStatus)}</Badge>
                  </div>
                </button>
              ))}
              {!filteredFacilities.length ? <div className="p-6 text-center text-sm text-slate-500">No facilities match these filters.</div> : null}
            </div>
          </aside>

          {draft ? (
            <section className="bg-white p-5 sm:p-7">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-black text-slate-950">{draft.name}</h2>{draftIsReferralEligible ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800" variant="outline">Referral ready</Badge> : <Badge variant="outline">Not deliverable</Badge>}</div>
                  <p className="mt-1 text-sm text-slate-500">PHN ID: {draft.sourceFacilityId || "Not supplied"} · Updated {formatFacilityDate(draft.updatedAt)}</p>
                </div>
                <Button asChild size="sm" variant="outline"><Link href={`/network/facilities/${draft.slug}`} target="_blank">View profile <ExternalLink /></Link></Button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950"><ShieldCheck className="h-5 w-5 text-amber-600" /> Participation</div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Listing status<select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" onChange={(event) => { const listingStatus = event.target.value as NetworkFacilityListingStatus; patchDraft({ listingStatus, ...(listingStatus === "hidden" ? { referralStatus: "paused", isAcceptingReferrals: false } : {}) }); }} value={draft.listingStatus}><option value="listed">Listed</option><option value="verified">Verified</option><option value="partner">Partner</option><option value="hidden">Hidden</option></select></label>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">
                        Agreement status
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                          disabled={draftIsNonCompensated}
                          onChange={(event) => {
                            const agreementStatus = event.target.value as NetworkFacilityAgreementStatus;
                            patchDraft({
                              agreementStatus,
                              ...(agreementStatus !== "active"
                                ? { referralStatus: "paused", isAcceptingReferrals: false }
                                : {}),
                            });
                          }}
                          value={draft.agreementStatus}
                        >
                          <option value="not_contacted">
                            {draftIsNonCompensated ? "Not required" : "Not contacted"}
                          </option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </label>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Referral status<select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" onChange={(event) => { const referralStatus = event.target.value as NetworkFacilityReferralStatus; patchDraft({ referralStatus, ...(referralStatus !== "eligible" ? { isAcceptingReferrals: false } : {}) }); }} value={draft.referralStatus}><option value="disabled">Disabled</option><option value="paused">Paused</option><option value="eligible">Eligible</option></select></label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"><Checkbox checked={draft.isAcceptingReferrals} onCheckedChange={(checked) => patchDraft({ isAcceptingReferrals: checked === true })} /> Accepting referrals</label>
                    </div>
                    <div className="mt-4 space-y-2"><Label htmlFor="notification-email">Secure referral notification email</Label><div className="relative"><Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" id="notification-email" onChange={(event) => patchDraft({ notificationEmail: event.target.value || null })} placeholder={draft.businessEmail || "referrals@facility.com"} type="email" value={draft.notificationEmail || ""} /></div><p className="text-xs text-slate-500">This operational address is separate from the public profile contact.</p></div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="text-sm font-bold text-slate-950">Care types</div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {NETWORK_CARE_TYPES.map((careType) => (
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700" key={careType}>
                          <Checkbox
                            checked={draft.careTypes.includes(careType)}
                            onCheckedChange={(checked) => {
                              const next = checked === true
                                ? [...draft.careTypes, careType]
                                : draft.careTypes.filter((item) => item !== careType);
                              const stillSupportsNoFee = hasNetworkInsuranceCareType(next);
                              patchDraft({
                                careTypes: next as NetworkCareType[],
                                ...(draftIsNonCompensated && !stillSupportsNoFee
                                  ? {
                                      referralFeeType: null,
                                      referralStatus: "paused",
                                      isAcceptingReferrals: false,
                                    }
                                  : {}),
                              });
                            }}
                          />
                          {careType}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950"><WalletCards className="h-5 w-5 text-amber-600" /> Family search details</div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Minimum public price ($)<Input min={0} onChange={(event) => patchDraft({ priceLow: nullableNumber(event.target.value) })} step="100" type="number" value={numberInputValue(draft.priceLow)} /></label>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Maximum public price ($)<Input min={0} onChange={(event) => patchDraft({ priceHigh: nullableNumber(event.target.value) })} step="100" type="number" value={numberInputValue(draft.priceHigh)} /></label>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Billing period<select className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900" onChange={(event) => patchDraft({ pricePeriod: (event.target.value || null) as NetworkAdminFacility["pricePeriod"] })} value={draft.pricePeriod || ""}><option value="">Not listed</option><option value="hour">Per hour</option><option value="day">Per day</option><option value="week">Per week</option><option value="month">Per month</option></select></label>
                      <div className="flex items-end gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600"><MapPin className="h-4 w-4 shrink-0 text-amber-600" /><span>ZIP {draft.zipCode || "not supplied"} is used when coordinates are blank.</span></div>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Latitude<Input max={90} min={-90} onChange={(event) => patchDraft({ latitude: nullableNumber(event.target.value) })} step="0.000001" type="number" value={numberInputValue(draft.latitude)} /></label>
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600">Longitude<Input max={180} min={-180} onChange={(event) => patchDraft({ longitude: nullableNumber(event.target.value) })} step="0.000001" type="number" value={numberInputValue(draft.longitude)} /></label>
                    </div>
                    <label className="mt-4 block space-y-1.5 text-xs font-semibold text-slate-600">
                      Accepted insurance plans
                      <textarea
                        className="min-h-36 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
                        onChange={(event) => patchDraft({ acceptedInsurances: parseInsuranceInput(event.target.value) })}
                        placeholder={"Medicare\nUtah Medicaid\nAetna"}
                        value={draft.acceptedInsurances.join("\n")}
                      />
                    </label>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Enter one plan per line. These plans power the family-facing insurance filter for Skilled Nursing, Home Health, and Hospice searches.</p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">These values power family-facing distance and price filters. They are separate from referral fee terms.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-950"><CircleDollarSign className="h-5 w-5 text-amber-600" /> Referral arrangement</div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-xs font-semibold text-slate-600 sm:col-span-2">
                        Referral fee model
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"
                          onChange={(event) => setReferralFeeType((event.target.value || null) as NetworkFacilityFeeType | null)}
                          value={draft.referralFeeType || ""}
                        >
                          <option value="">Not set</option>
                          <option disabled={!draftSupportsNoFee} value="none">
                            No referral fee — insurance-covered services
                          </option>
                          <option value="flat">Flat fee</option>
                          <option value="percentage">Percentage</option>
                          <option value="custom">Custom terms</option>
                        </select>
                      </label>
                      {!draftIsNonCompensated ? (
                        <>
                          <label className="space-y-1.5 text-xs font-semibold text-slate-600">Protection window<Input min={1} max={730} onChange={(event) => patchDraft({ referralProtectionDays: Number(event.target.value) || 1 })} type="number" value={draft.referralProtectionDays} /></label>
                          <label className="space-y-1.5 text-xs font-semibold text-slate-600">Flat fee ($)<Input min={0} onChange={(event) => patchDraft({ referralFeeAmount: nullableNumber(event.target.value) })} step="0.01" type="number" value={numberInputValue(draft.referralFeeAmount)} /></label>
                          <label className="space-y-1.5 text-xs font-semibold text-slate-600">Percentage (%)<Input min={0.01} max={100} onChange={(event) => patchDraft({ referralFeePercentage: nullableNumber(event.target.value) })} step="0.01" type="number" value={numberInputValue(draft.referralFeePercentage)} /></label>
                          <label className="space-y-1.5 text-xs font-semibold text-slate-600">Effective date<Input onChange={(event) => patchDraft({ agreementEffectiveAt: event.target.value || null })} type="date" value={dateInputValue(draft.agreementEffectiveAt)} /></label>
                          <label className="space-y-1.5 text-xs font-semibold text-slate-600">Expiration date<Input onChange={(event) => patchDraft({ agreementExpiresAt: event.target.value || null })} type="date" value={dateInputValue(draft.agreementExpiresAt)} /></label>
                        </>
                      ) : null}
                    </div>
                    {draftIsNonCompensated ? (
                      <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                        <div className="font-bold">Non-compensated insurance referral</div>
                        <p className="mt-1 text-xs leading-5">
                          No facility payment, referral fee, agreement, effective date, or terms version is
                          required. This option requires Skilled Nursing, Home Health, or Hospice as a care type.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-1.5"><Label htmlFor="terms-version">Terms version</Label><Input id="terms-version" onChange={(event) => patchDraft({ referralTermsVersion: event.target.value || null })} placeholder="e.g. crown-network-2026-v1" value={draft.referralTermsVersion || ""} /></div>
                    )}
                    <div className="mt-4 space-y-1.5"><Label htmlFor="agreement-notes">Internal notes</Label><textarea className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" id="agreement-notes" maxLength={4000} onChange={(event) => patchDraft({ agreementNotes: event.target.value || null })} placeholder="Document agreement terms, compliance exceptions, or referral context." value={draft.agreementNotes || ""} /></div>
                  </div>

                  <div className={cn("rounded-2xl border p-4 text-sm", draftIsReferralEligible ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700")}>
                    <div className="font-bold">{draftIsReferralEligible ? "This facility is referral ready" : "Referral readiness is incomplete"}</div>
                    <p className="mt-1 text-xs leading-5">
                      {draftIsNonCompensated
                        ? "A free-referral facility needs a visible listing, a qualifying insurance-covered care type, eligible status, a notification email, and the accepting-referrals switch."
                        : "A compensated facility needs a visible listing, active and currently effective agreement, eligible status, notification email, and the accepting-referrals switch."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-4 mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-medium text-slate-600" role="status">{feedback || "Changes are recorded in the facility audit trail when saved."}</div>
                <Button disabled={Boolean(pendingAction)} onClick={saveFacility}><Save /> {pendingAction === "save" ? "Saving…" : "Save facility"}</Button>
              </div>
            </section>
          ) : <div className="grid place-items-center p-10 text-sm text-slate-500">Select a facility to manage.</div>}
        </div>
      </Card>
    </div>
  );
}
