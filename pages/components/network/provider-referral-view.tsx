"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Crown,
  DollarSign,
  Home,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NetworkProviderReferral } from "@/lib/network/provider-referral-types";
import type { NetworkReferralFacilityStatus } from "@/lib/network/admin-types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<NetworkReferralFacilityStatus, string> = {
  pending: "Pending review",
  delivered: "New referral",
  viewed: "Under review",
  accepted: "Accepted",
  declined: "Declined",
  duplicate: "Duplicate",
  tour_scheduled: "Tour scheduled",
  placed: "Placed",
  lost: "Closed",
};

function titleCase(value: string | null) {
  if (!value) return "Not provided";
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Denver",
  }).format(new Date(value));
}

function formatMoney(low: number | null, high: number | null) {
  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  if (low !== null && high !== null) return `${currency(low)}–${currency(high)} monthly`;
  if (low !== null) return `${currency(low)}+ monthly`;
  if (high !== null) return `Up to ${currency(high)} monthly`;
  return "Not provided";
}

export function ProviderReferralView({
  referral,
  accessToken,
  previewMode,
}: {
  referral: NetworkProviderReferral;
  accessToken: string;
  previewMode: boolean;
}) {
  const [status, setStatus] = useState(referral.status);
  const [placement, setPlacement] = useState(referral.placement);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [outcomeForm, setOutcomeForm] = useState<"tour" | "placement" | "lost" | null>(null);
  const [tourScheduledAt, setTourScheduledAt] = useState(
    referral.tourScheduledAt ? referral.tourScheduledAt.slice(0, 16) : "",
  );
  const [moveInDate, setMoveInDate] = useState(referral.placement?.moveInDate || "");
  const [placementValue, setPlacementValue] = useState(
    referral.placement?.placementValue === null || referral.placement?.placementValue === undefined
      ? ""
      : String(referral.placement.placementValue),
  );
  const [careLevel, setCareLevel] = useState(referral.placement?.careLevel || "");
  const [outcomeNotes, setOutcomeNotes] = useState(referral.placement?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const respond = async (action: "accept" | "decline") => {
    if (action === "decline" && !declineReason.trim()) {
      setFeedback("Please provide a brief reason before declining.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    if (previewMode) {
      setStatus(action === "accept" ? "accepted" : "declined");
      setDeclining(false);
      setFeedback(`Preview response recorded. Nothing was saved or sent.`);
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/network/referrals/access/${encodeURIComponent(accessToken)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: declineReason.trim() || null }),
        },
      );
      const body = (await response.json()) as { error?: string; status?: NetworkReferralFacilityStatus };
      if (!response.ok || !body.status) {
        throw new Error(body.error || "Unable to record your response.");
      }
      setStatus(body.status);
      setDeclining(false);
      setFeedback(action === "accept" ? "Referral accepted." : "Referral declined.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to record your response.");
    } finally {
      setSubmitting(false);
    }
  };

  const canRespond = ["delivered", "viewed"].includes(status);
  const canReportProgress = ["accepted", "tour_scheduled"].includes(status);

  const reportProgress = async (action: "schedule_tour" | "report_placement" | "report_lost") => {
    if (action === "schedule_tour" && !tourScheduledAt) {
      setFeedback("Choose the tour date and time.");
      return;
    }
    if (action === "report_placement" && !moveInDate) {
      setFeedback("Enter the resident's move-in date.");
      return;
    }
    if (action === "report_lost" && !outcomeNotes.trim()) {
      setFeedback("Briefly explain why the referral did not move forward.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const nextStatus =
      action === "schedule_tour" ? "tour_scheduled" : action === "report_lost" ? "lost" : status;
    if (previewMode) {
      setStatus(nextStatus);
      if (action === "report_placement") {
        setPlacement({
          status: "reported",
          moveInDate,
          placementValue: placementValue ? Number(placementValue) : null,
          currency: "USD",
          careLevel: careLevel.trim() || null,
          notes: outcomeNotes.trim() || null,
        });
      }
      setOutcomeForm(null);
      setFeedback("Preview outcome recorded. Nothing was saved or sent.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/network/referrals/access/${encodeURIComponent(accessToken)}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            tourScheduledAt:
              action === "schedule_tour" ? new Date(tourScheduledAt).toISOString() : null,
            moveInDate: action === "report_placement" ? moveInDate : null,
            placementValue:
              action === "report_placement" && placementValue ? Number(placementValue) : null,
            careLevel: action === "report_placement" ? careLevel.trim() || null : null,
            notes: action === "report_placement" ? outcomeNotes.trim() || null : null,
            reason: action === "report_lost" ? outcomeNotes.trim() : null,
          }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        status?: NetworkReferralFacilityStatus;
      };
      if (!response.ok || !body.status) {
        throw new Error(body.error || "Unable to record this referral outcome.");
      }
      setStatus(body.status);
      if (action === "report_placement") {
        setPlacement({
          status: "reported",
          moveInDate,
          placementValue: placementValue ? Number(placementValue) : null,
          currency: "USD",
          careLevel: careLevel.trim() || null,
          notes: outcomeNotes.trim() || null,
        });
      }
      setOutcomeForm(null);
      setFeedback(
        action === "schedule_tour"
          ? "Tour schedule recorded."
          : action === "report_placement"
            ? "Placement reported to Crown Network for confirmation."
            : "Closed outcome recorded.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to record this outcome.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(218,164,59,0.16),transparent_30rem),linear-gradient(180deg,#fbfaf6_0%,#f2f0e8_100%)] text-[#17362f]">
      <header className="border-b border-[#17362f]/10 bg-[#fbfaf6]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#17362f] text-[#f2bd52] shadow-lg"><Crown className="h-5 w-5" /></span>
            <div><div className="font-extrabold tracking-tight">Crown Network</div><div className="text-[11px] font-semibold text-[#6e7d77]">Secure provider referral</div></div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#4d665e]"><LockKeyhole className="h-4 w-4" /> Private access</div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {previewMode ? (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div><div className="font-bold">Provider preview</div><p className="mt-0.5 text-sm text-amber-800">This referral is synthetic. Responses work for demonstration but are not saved.</p></div>
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-[#17362f]/10 bg-white shadow-[0_28px_80px_rgba(35,49,42,0.12)]">
          <div className="border-b border-[#17362f]/10 bg-[#17362f] px-5 py-6 text-white sm:px-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#f2bd52]">Referral for {referral.facilityName}</div>
                <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">A family has asked to connect.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Review the authorized care request below, then let Crown Network know whether your community can help.</p>
              </div>
              <Badge className="w-fit border border-white/15 bg-white/10 px-3 py-1.5 text-white shadow-none hover:bg-white/10">{STATUS_LABELS[status]}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60"><span>Reference {referral.attributionCode}</span><span>Delivered {formatDate(referral.deliveredAt)}</span><span>Link expires {formatDate(referral.accessExpiresAt)}</span></div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(310px,0.75fr)]">
            <div className="space-y-5 p-5 sm:p-7 lg:border-r lg:border-[#17362f]/10">
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-2xl border border-[#17362f]/10 bg-[#fbfaf6] p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold"><UserRound className="h-4 w-4 text-[#a7741e]" /> Family contact</div>
                  <div className="mt-3 text-lg font-bold">{referral.family.firstName} {referral.family.lastName}</div>
                  <div className="mt-1 text-xs text-[#6d7d77]">Helping {titleCase(referral.family.relationship).toLowerCase()}</div>
                  <div className="mt-4 space-y-2 text-sm">
                    {referral.family.email ? <a className="flex items-center gap-2 font-semibold text-[#244c42] hover:underline" href={`mailto:${referral.family.email}`}><Mail className="h-4 w-4" /> {referral.family.email}</a> : null}
                    {referral.family.phone ? <a className="flex items-center gap-2 font-semibold text-[#244c42] hover:underline" href={`tel:${referral.family.phone.replace(/[^+\d]/g, "")}`}><Phone className="h-4 w-4" /> {referral.family.phone}</a> : null}
                    {!referral.family.email && !referral.family.phone ? <div className="text-xs text-[#6d7d77]">Crown Network is coordinating contact for this request.</div> : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-[#17362f]/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold"><MapPin className="h-4 w-4 text-[#a7741e]" /> Preferred area</div>
                  <div className="mt-3 text-lg font-bold">{[referral.search.desiredCity, referral.search.desiredState].filter(Boolean).join(", ")}</div>
                  <div className="mt-1 text-xs text-[#6d7d77]">{referral.search.desiredZipCode ? `ZIP ${referral.search.desiredZipCode} · ` : ""}Within {referral.search.radiusMiles || 25} miles</div>
                  <div className="mt-4 flex flex-wrap gap-2">{referral.search.careTypes.map((careType) => <span className="rounded-full bg-[#eef3f0] px-2.5 py-1 text-xs font-bold text-[#345c51]" key={careType}>{careType}</span>)}</div>
                </section>
              </div>

              <section className="rounded-2xl border border-[#17362f]/10 p-5">
                <h2 className="text-lg font-extrabold">Care request</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#87938f]">Move timeframe</dt><dd className="mt-1 text-sm font-semibold">{titleCase(referral.search.moveTimeframe)}</dd></div>
                  <div><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#87938f]">Private-pay budget</dt><dd className="mt-1 text-sm font-semibold">{formatMoney(referral.search.budgetLow, referral.search.budgetHigh)}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#87938f]">Support that may help</dt><dd className="mt-1 text-sm leading-6 text-[#526961]">{referral.search.supportNeeds.join(", ") || "None specified"}</dd></div>
                </dl>
                {referral.search.preferences.length ? <div className="mt-4 flex flex-wrap gap-2">{referral.search.preferences.map((preference) => <span className="rounded-lg border border-[#17362f]/10 bg-[#fbfaf6] px-2.5 py-1.5 text-xs font-semibold text-[#526961]" key={preference}>{preference}</span>)}</div> : null}
                {referral.search.additionalNotes ? <div className="mt-4 rounded-xl bg-[#f5f3ec] p-3 text-sm leading-6 text-[#526961]"><strong className="text-[#28483f]">Family note: </strong>{referral.search.additionalNotes}</div> : null}
              </section>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" /><div><strong>Facility-specific authorization confirmed.</strong><p className="mt-1 text-xs leading-5 text-blue-800">The family authorized Crown Network to share this request with {referral.facilityName}. Contact details are limited to the communication methods they selected.</p></div></div>
            </div>

            <aside className="space-y-5 bg-[#fbfaf6] p-5 sm:p-7">
              <section className="rounded-2xl border border-[#17362f]/10 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-extrabold"><Building2 className="h-4 w-4 text-[#a7741e]" /> Provider response</div>
                {canRespond ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-[#63766f]">Can your community assist this family with the care request shown?</p>
                    {!declining ? (
                      <div className="mt-4 grid gap-2">
                        <Button className="h-11 bg-[#17362f] text-white hover:bg-[#244c42]" disabled={submitting} onClick={() => respond("accept")}><Check /> Accept referral</Button>
                        <Button className="h-11" disabled={submitting} onClick={() => setDeclining(true)} variant="outline"><X /> Decline referral</Button>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <label className="block text-xs font-bold text-[#425c53]" htmlFor="decline-reason">Why can’t your community assist?</label>
                        <textarea className="min-h-28 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#b98425] focus:ring-2 focus:ring-[#b98425]/15" id="decline-reason" maxLength={1000} onChange={(event) => setDeclineReason(event.target.value)} placeholder="For example: no current availability for this care type." value={declineReason} />
                        <div className="flex gap-2"><Button disabled={submitting || !declineReason.trim()} onClick={() => respond("decline")} variant="destructive">Confirm decline</Button><Button disabled={submitting} onClick={() => setDeclining(false)} variant="ghost">Cancel</Button></div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={cn("mt-4 flex items-start gap-3 rounded-xl p-3 text-sm", status === "accepted" ? "bg-emerald-50 text-emerald-900" : "bg-slate-100 text-slate-700")}>
                    {status === "accepted" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <Clock3 className="h-5 w-5 shrink-0" />}
                    <div><strong>{STATUS_LABELS[status]}</strong><p className="mt-1 text-xs leading-5">Your response has been recorded in Crown Network.</p></div>
                  </div>
                )}
                {feedback ? <div className="mt-3 rounded-xl bg-[#f2f0e8] px-3 py-2 text-xs font-semibold text-[#425c53]" role="status">{feedback}</div> : null}
              </section>

              {canReportProgress || placement ? (
                <section className="rounded-2xl border border-[#17362f]/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-sm font-extrabold"><Home className="h-4 w-4 text-[#a7741e]" /> Referral progress</div>
                  {placement ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                      <div className="font-bold">{placement.status === "confirmed" ? "Placement confirmed" : "Placement reported"}</div>
                      <div className="mt-1 text-xs text-emerald-800">Move-in {formatDate(`${placement.moveInDate}T12:00:00Z`)}</div>
                      {placement.placementValue !== null ? <div className="mt-1 text-xs text-emerald-800">Reported value {new Intl.NumberFormat("en-US", { style: "currency", currency: placement.currency }).format(placement.placementValue)}</div> : null}
                    </div>
                  ) : null}

                  {canReportProgress && !outcomeForm ? (
                    <div className="mt-4 grid gap-2">
                      <Button className="justify-start" disabled={submitting} onClick={() => setOutcomeForm("tour")} variant="outline"><CalendarDays /> Schedule or update tour</Button>
                      <Button className="justify-start" disabled={submitting} onClick={() => setOutcomeForm("placement")} variant="outline"><DollarSign /> Report a placement</Button>
                      <Button className="justify-start" disabled={submitting} onClick={() => setOutcomeForm("lost")} variant="ghost"><X /> Report referral did not move forward</Button>
                    </div>
                  ) : null}

                  {outcomeForm === "tour" ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="tour-scheduled-at">Tour date and time</label>
                      <input className="h-10 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 text-sm" id="tour-scheduled-at" onChange={(event) => setTourScheduledAt(event.target.value)} type="datetime-local" value={tourScheduledAt} />
                      <div className="flex gap-2"><Button disabled={submitting || !tourScheduledAt} onClick={() => reportProgress("schedule_tour")}>Save tour</Button><Button disabled={submitting} onClick={() => setOutcomeForm(null)} variant="ghost">Cancel</Button></div>
                    </div>
                  ) : null}

                  {outcomeForm === "placement" ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="move-in-date">Move-in date</label>
                      <input className="h-10 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 text-sm" id="move-in-date" onChange={(event) => setMoveInDate(event.target.value)} type="date" value={moveInDate} />
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="placement-value">First-month service value, if known</label>
                      <input className="h-10 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 text-sm" id="placement-value" min="0" onChange={(event) => setPlacementValue(event.target.value)} placeholder="0.00" step="0.01" type="number" value={placementValue} />
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="care-level">Care level</label>
                      <input className="h-10 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 text-sm" id="care-level" maxLength={200} onChange={(event) => setCareLevel(event.target.value)} placeholder="For example: Assisted Living" value={careLevel} />
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="placement-notes">Notes</label>
                      <textarea className="min-h-20 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 py-2 text-sm" id="placement-notes" maxLength={2000} onChange={(event) => setOutcomeNotes(event.target.value)} value={outcomeNotes} />
                      <div className="flex gap-2"><Button disabled={submitting || !moveInDate} onClick={() => reportProgress("report_placement")}>Report placement</Button><Button disabled={submitting} onClick={() => setOutcomeForm(null)} variant="ghost">Cancel</Button></div>
                    </div>
                  ) : null}

                  {outcomeForm === "lost" ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs font-bold text-[#425c53]" htmlFor="lost-reason">What prevented the placement?</label>
                      <textarea className="min-h-24 w-full rounded-xl border border-[#17362f]/15 bg-white px-3 py-2 text-sm" id="lost-reason" maxLength={1000} onChange={(event) => setOutcomeNotes(event.target.value)} value={outcomeNotes} />
                      <div className="flex gap-2"><Button disabled={submitting || !outcomeNotes.trim()} onClick={() => reportProgress("report_lost")} variant="destructive">Close referral</Button><Button disabled={submitting} onClick={() => setOutcomeForm(null)} variant="ghost">Cancel</Button></div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="flex items-center gap-2 text-sm font-bold"><AlertTriangle className="h-4 w-4 text-amber-700" /> Confidential referral</div>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-amber-900"><li className="flex gap-2"><span>•</span><span>Use this information only to respond to this care request.</span></li><li className="flex gap-2"><span>•</span><span>Do not forward or share this access link.</span></li><li className="flex gap-2"><span>•</span><span>Do not copy details into unsecured email or text messages.</span></li></ul>
              </section>

              <section className="rounded-2xl border border-[#17362f]/10 bg-white p-4 text-xs leading-5 text-[#63766f]">
                <div className="flex items-center gap-2 font-bold text-[#345c51]"><LockKeyhole className="h-4 w-4" /> Access protection</div>
                <p className="mt-2">This link is unique to {referral.facilityName}, expires automatically, and is audited when opened or used.</p>
                <p className="mt-2">Consent version {referral.consent.version} · Granted {formatDate(referral.consent.grantedAt)}</p>
              </section>
            </aside>
          </div>
        </section>

        <div className="mt-5 flex flex-col justify-between gap-2 text-center text-[11px] text-[#7a8883] sm:flex-row sm:text-left"><span>Crown Network · A Crown Pages service</span><span>Need help? Contact Crown Network through your provider account.</span></div>
      </div>
    </main>
  );
}
