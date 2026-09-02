"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  PlacementConfirmationCard,
  type PlacementConfirmationDetails,
} from "@/components/network/placement-confirmation-card";
import type {
  NetworkAdminReferral,
  NetworkAdminReferralAction,
  NetworkReferralFacilityStatus,
  NetworkReferralStatus,
} from "@/lib/network/admin-types";
import { cn } from "@/lib/utils";

const REFERRAL_STATUS_LABELS: Record<NetworkReferralStatus, string> = {
  submitted: "New",
  matching: "Qualified",
  delivered: "Delivered",
  touring: "Touring",
  placed: "Placed",
  closed: "Closed",
  cancelled: "Cancelled",
};

const FACILITY_STATUS_LABELS: Record<NetworkReferralFacilityStatus, string> = {
  pending: "Pending review",
  delivered: "Delivered",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  duplicate: "Duplicate",
  tour_scheduled: "Tour scheduled",
  placed: "Placed",
  lost: "Lost",
};

const STATUS_STYLES: Record<NetworkReferralStatus, string> = {
  submitted: "border-amber-200 bg-amber-50 text-amber-800",
  matching: "border-blue-200 bg-blue-50 text-blue-800",
  delivered: "border-violet-200 bg-violet-50 text-violet-800",
  touring: "border-cyan-200 bg-cyan-50 text-cyan-800",
  placed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  closed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

type QueueFilter = "all" | "submitted" | "matching" | "delivered" | "touring" | "placed";

function formatDate(value: string | null, withTime = true) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function formatMoney(low: number | null, high: number | null) {
  const currency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  if (low !== null && high !== null) return `${currency(low)}–${currency(high)} / month`;
  if (low !== null) return `${currency(low)}+ / month`;
  if (high !== null) return `Up to ${currency(high)} / month`;
  return "Not provided";
}

function titleCase(value: string | null) {
  if (!value) return "Not provided";
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function eventLabel(value: string) {
  return titleCase(value.replace(/^referral_/, ""));
}

export function ReferralOperationsDashboard({
  initialReferrals,
  previewMode,
}: {
  initialReferrals: NetworkAdminReferral[];
  previewMode: boolean;
}) {
  const [referrals, setReferrals] = useState(initialReferrals);
  const [selectedId, setSelectedId] = useState(initialReferrals[0]?.id || "");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const filteredReferrals = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return referrals.filter((referral) => {
      if (filter !== "all" && referral.status !== filter) return false;
      if (!normalizedQuery) return true;
      return [
        referral.contact.firstName,
        referral.contact.lastName,
        referral.contact.email,
        referral.contact.phone,
        referral.attributionCode,
        referral.search.desiredCity,
        referral.search.desiredState,
        ...referral.facilities.map((facility) => facility.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [filter, query, referrals]);

  const selectedReferral =
    filteredReferrals.find((referral) => referral.id === selectedId) || filteredReferrals[0];
  const counts = useMemo(
    () => ({
      new: referrals.filter((referral) => referral.status === "submitted").length,
      review: referrals.filter((referral) => referral.status === "matching").length,
      active: referrals.filter((referral) => ["delivered", "touring"].includes(referral.status)).length,
      placed: referrals.filter((referral) => referral.status === "placed").length,
    }),
    [referrals],
  );

  const runAction = async (
    action: NetworkAdminReferralAction,
    facilityId?: string,
    label = "Referral updated",
    placement?: PlacementConfirmationDetails,
  ) => {
    if (!selectedReferral) return;
    const actionKey = `${action}:${facilityId || "referral"}`;
    setPendingAction(actionKey);
    setFeedback(null);

    if (previewMode) {
      const now = new Date().toISOString();
      setReferrals((current) =>
        current.map((referral) => {
          if (referral.id !== selectedReferral.id) return referral;
          const nextStatus: NetworkReferralStatus =
            action === "qualify"
              ? "matching"
              : action === "deliver"
                ? "delivered"
                : action === "schedule_tour"
                  ? "touring"
                  : action === "mark_placed"
                    ? "placed"
                    : action === "close"
                      ? "closed"
                      : referral.status;
          const facilityStatus: Partial<Record<NetworkAdminReferralAction, NetworkReferralFacilityStatus>> = {
            deliver: "delivered",
            mark_duplicate: "duplicate",
            mark_accepted: "accepted",
            schedule_tour: "tour_scheduled",
            mark_placed: "placed",
            mark_lost: "lost",
          };
          const targetFacility = referral.facilities.find((facility) => facility.facilityId === facilityId);
          return {
            ...referral,
            status: nextStatus,
            facilities: referral.facilities.map((facility) => {
              if (facility.facilityId !== facilityId) return facility;
              return {
                ...facility,
                ...(facilityStatus[action] ? { status: facilityStatus[action] } : {}),
                deliveredAt: action === "deliver" ? now : facility.deliveredAt,
                notificationStatus:
                  action === "deliver" || action === "resend_access"
                    ? "sent"
                    : facility.notificationStatus,
                notificationError:
                  action === "deliver" || action === "resend_access"
                    ? null
                    : facility.notificationError,
                placement:
                  action === "mark_placed" && placement?.moveInDate
                    ? {
                        id: crypto.randomUUID(),
                        status: "confirmed",
                        moveInDate: placement.moveInDate,
                        placementValue: placement.placementValue,
                        currency: "USD",
                        careLevel: null,
                        notes: note.trim() || null,
                        reportedAt: now,
                        confirmedAt: now,
                      }
                    : facility.placement,
              };
            }),
            events: [
              ...referral.events,
              {
                id: crypto.randomUUID(),
                eventType: action,
                actorType: "navigator",
                createdAt: now,
                note: note.trim() || "Preview-only workflow update.",
                facilityName: targetFacility?.name || null,
              },
            ],
          };
        }),
      );
      setNote("");
      setFeedback(`${label}. This preview change was not saved.`);
      setPendingAction(null);
      return;
    }

    try {
      const response = await fetch(`/api/network/admin/referrals/${selectedReferral.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          facilityId: facilityId || null,
          note: note.trim() || null,
          placement: placement || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update the referral.");
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to update the referral.");
      setPendingAction(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            <HeartHandshake className="h-4 w-4" /> Crown Network operations
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Referral inbox</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Review consent, resolve existing relationships, and control when each family request reaches a provider.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Clock3 className="h-4 w-4" /> Sorted by newest request
        </div>
      </div>

      {previewMode ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <div className="font-semibold">Operations preview</div>
            <p className="mt-0.5 text-sm text-amber-800">
              Every family and event shown here is synthetic. You can test workflow actions, but nothing is saved or delivered.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "New requests", value: counts.new, icon: Mail, color: "text-amber-700 bg-amber-50" },
          { label: "In review", value: counts.review, icon: FileCheck2, color: "text-blue-700 bg-blue-50" },
          { label: "Active referrals", value: counts.active, icon: Building2, color: "text-violet-700 bg-violet-50" },
          { label: "Placements", value: counts.placed, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card className="border-slate-200/80 bg-white shadow-sm" key={stat.label}>
              <CardContent className="flex items-center justify-between p-4">
                <div><div className="text-2xl font-bold text-slate-950">{stat.value}</div><div className="text-xs font-medium text-slate-500">{stat.label}</div></div>
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", stat.color)}><Icon className="h-5 w-5" /></span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden border-slate-200/90 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "submitted", "matching", "delivered", "touring", "placed"] as QueueFilter[]).map((value) => (
                <button
                  className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", filter === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300")}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === "all" ? "All" : REFERRAL_STATUS_LABELS[value]}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search referrals</span>
              <Input className="border-slate-200 bg-white pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Family, provider, or reference" value={query} />
            </label>
          </div>
        </div>

        <div className="grid min-h-[680px] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/40 lg:border-b-0 lg:border-r">
            {filteredReferrals.length ? (
              <div className="divide-y divide-slate-200">
                {filteredReferrals.map((referral) => {
                  const active = referral.id === selectedReferral?.id;
                  return (
                    <button
                      className={cn("w-full px-4 py-4 text-left transition", active ? "bg-white shadow-[inset_3px_0_0_#d69a28]" : "hover:bg-white/80")}
                      key={referral.id}
                      onClick={() => { setSelectedId(referral.id); setFeedback(null); }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-950">{referral.contact.firstName} {referral.contact.lastName}</div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {[referral.search.desiredCity, referral.search.desiredState].filter(Boolean).join(", ")}</div>
                        </div>
                        <Badge className={cn("shrink-0 border shadow-none hover:bg-inherit", STATUS_STYLES[referral.status])}>{REFERRAL_STATUS_LABELS[referral.status]}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>{referral.search.careTypes.join(" · ")}</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-slate-400">{referral.attributionCode} · {formatDate(referral.submittedAt)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-500">No referrals match this view.</div>
            )}
          </aside>

          {selectedReferral ? (
            <section className="min-w-0 bg-white">
              <div className="border-b border-slate-200 px-5 py-5 xl:px-7">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold tracking-tight text-slate-950">{selectedReferral.contact.firstName} {selectedReferral.contact.lastName}</h2>
                      <Badge className={cn("border shadow-none hover:bg-inherit", STATUS_STYLES[selectedReferral.status])}>{REFERRAL_STATUS_LABELS[selectedReferral.status]}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{selectedReferral.attributionCode}</span><span>Submitted {formatDate(selectedReferral.submittedAt)}</span><span>Protection through {formatDate(selectedReferral.protectionExpiresAt, false)}</span>
                    </div>
                  </div>
                  {selectedReferral.status === "submitted" ? (
                    <Button className="bg-slate-950 text-white hover:bg-slate-800" disabled={Boolean(pendingAction)} onClick={() => runAction("qualify", undefined, "Referral qualified")}>
                      <FileCheck2 /> Approve for matching
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:p-7">
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><UserRound className="h-4 w-4 text-amber-700" /> Family contact</div>
                      <div className="space-y-2 text-sm text-slate-600">
                        {selectedReferral.contact.email ? <a className="flex items-center gap-2 hover:text-slate-950" href={`mailto:${selectedReferral.contact.email}`}><Mail className="h-4 w-4" /> {selectedReferral.contact.email}</a> : null}
                        {selectedReferral.contact.phone ? <a className="flex items-center gap-2 hover:text-slate-950" href={`tel:${selectedReferral.contact.phone.replace(/[^+\d]/g, "")}`}><Phone className="h-4 w-4" /> {selectedReferral.contact.phone}</a> : null}
                        <div className="text-xs text-slate-400">Prefers {selectedReferral.contact.preferredContactMethod || "unspecified contact"}</div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin className="h-4 w-4 text-amber-700" /> Search area</div>
                      <div className="text-sm text-slate-600">{[selectedReferral.search.desiredCity, selectedReferral.search.desiredState, selectedReferral.search.desiredZipCode].filter(Boolean).join(", ")}</div>
                      <div className="mt-1 text-xs text-slate-400">Within {selectedReferral.search.radiusMiles || 25} miles · Helping {titleCase(selectedReferral.search.relationship).toLowerCase()}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Care brief</h3>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Care types</dt><dd className="mt-1 text-slate-700">{selectedReferral.search.careTypes.join(", ")}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timing</dt><dd className="mt-1 text-slate-700">{titleCase(selectedReferral.search.moveTimeframe)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Private-pay budget</dt><dd className="mt-1 text-slate-700">{formatMoney(selectedReferral.search.budgetLow, selectedReferral.search.budgetHigh)}</dd></div>
                      <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Support needs</dt><dd className="mt-1 text-slate-700">{selectedReferral.search.supportNeeds.join(", ") || "None provided"}</dd></div>
                    </dl>
                    {selectedReferral.search.preferences.length ? <div className="mt-4 flex flex-wrap gap-2">{selectedReferral.search.preferences.map((preference) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600" key={preference}>{preference}</span>)}</div> : null}
                    {selectedReferral.search.additionalNotes ? <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-800">Family note: </span>{selectedReferral.search.additionalNotes}</div> : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Selected providers</h3><span className="text-xs text-slate-400">{selectedReferral.facilities.length} authorized</span></div>
                    {selectedReferral.facilities.map((facility) => (
                      <div className="rounded-2xl border border-slate-200 p-4" key={facility.facilityId}>
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <div className="font-bold text-slate-900">{facility.name}</div>
                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /> {[facility.city, facility.state].filter(Boolean).join(", ")}</div>
                            {facility.notificationEmail ? <div className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3.5 w-3.5" /> {facility.notificationEmail}</div> : null}
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-600">{FACILITY_STATUS_LABELS[facility.status]}</Badge>
                            {facility.notificationStatus === "sent" ? <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-none hover:bg-emerald-50">Secure email sent</Badge> : null}
                            {facility.notificationStatus === "failed" ? <Badge className="border border-rose-200 bg-rose-50 text-rose-800 shadow-none hover:bg-rose-50">Email failed</Badge> : null}
                          </div>
                        </div>
                        {!facility.notificationEmail ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Add a referral notification email in Network Facilities before secure delivery.</span></div> : null}
                        {facility.notificationStatus === "failed" ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{facility.notificationError || "The provider notification could not be sent."}</div> : null}
                        {facility.previouslyContacted ? (
                          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertTriangle className="h-4 w-4 shrink-0" /><span><strong>Prior contact reported.</strong> Verify referral ownership and add a navigator note before delivery.</span></div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {facility.status === "pending" ? <Button size="sm" disabled={Boolean(pendingAction) || !facility.notificationEmail || selectedReferral.status === "submitted" || (facility.previouslyContacted && !note.trim())} onClick={() => runAction("deliver", facility.facilityId, `Secure referral sent to ${facility.name}`)}>{facility.previouslyContacted ? "Send after verification" : "Send secure referral"} <ArrowUpRight /></Button> : null}
                          {facility.notificationStatus === "failed" ? <Button size="sm" disabled={Boolean(pendingAction) || !facility.notificationEmail} onClick={() => runAction("resend_access", facility.facilityId, `Secure referral resent to ${facility.name}`)} variant="outline">Retry secure email <Mail /></Button> : null}
                          {facility.previouslyContacted && facility.status === "pending" ? <Button size="sm" variant="outline" disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("mark_duplicate", facility.facilityId, `${facility.name} marked duplicate`)}>Mark duplicate</Button> : null}
                          {["delivered", "viewed"].includes(facility.status) ? <Button size="sm" variant="outline" disabled={Boolean(pendingAction)} onClick={() => runAction("mark_accepted", facility.facilityId, `${facility.name} accepted the referral`)}>Mark accepted</Button> : null}
                          {["delivered", "viewed", "accepted"].includes(facility.status) ? <Button size="sm" variant="outline" disabled={Boolean(pendingAction)} onClick={() => runAction("schedule_tour", facility.facilityId, "Tour scheduled")}>Tour scheduled</Button> : null}
                          {["delivered", "viewed", "accepted", "tour_scheduled"].includes(facility.status) ? <Button size="sm" variant="ghost" disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("mark_lost", facility.facilityId, `${facility.name} marked lost`)}>Mark lost</Button> : null}
                        </div>
                        {["accepted", "tour_scheduled"].includes(facility.status) && facility.feeTerms.feeType ? (
                          <PlacementConfirmationCard
                            disabled={Boolean(pendingAction)}
                            facility={facility}
                            onConfirm={(details) => runAction(
                              "mark_placed",
                              facility.facilityId,
                              facility.feeTerms.feeType === "none"
                                ? "Non-compensated placement confirmed"
                                : "Placement confirmed and fee created",
                              details,
                            )}
                          />
                        ) : null}
                        {facility.fee ? (
                          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                            {facility.fee.feeType === "none"
                              ? "Non-compensated referral · No fee due"
                              : <>Referral fee: {new Intl.NumberFormat("en-US", { style: "currency", currency: facility.fee.currency }).format(facility.fee.amount)} · {titleCase(facility.fee.status)}</>}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="text-sm font-bold text-slate-900" htmlFor="navigator-note">Navigator note</label>
                    <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" id="navigator-note" maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the audit timeline before taking an action…" value={note} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("request_information", undefined, "Information request recorded")}><MessageSquareText /> Record information request</Button>
                      <Button size="sm" variant="ghost" disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("close", undefined, "Referral closed")}>Close referral</Button>
                    </div>
                    {feedback ? <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700" role="status">{feedback}</div> : null}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-950"><ShieldCheck className="h-5 w-5" /> Consent evidence</div>
                    {selectedReferral.consent ? (
                      <>
                        <p className="mt-3 text-xs leading-5 text-emerald-900/80">{selectedReferral.consent.disclosureText}</p>
                        <div className="mt-3 border-t border-emerald-200 pt-3 text-[11px] text-emerald-800">Version {selectedReferral.consent.version} · Granted {formatDate(selectedReferral.consent.grantedAt)}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">{selectedReferral.consent.allowEmail ? <Badge className="bg-white text-emerald-800 hover:bg-white">Email</Badge> : null}{selectedReferral.consent.allowPhone ? <Badge className="bg-white text-emerald-800 hover:bg-white">Phone</Badge> : null}{selectedReferral.consent.allowSms ? <Badge className="bg-white text-emerald-800 hover:bg-white">SMS</Badge> : null}</div>
                      </>
                    ) : <p className="mt-3 text-xs text-rose-700">No consent evidence is attached. Do not deliver this referral.</p>}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Activity timeline</h3>
                    <ol className="mt-4 space-y-4">
                      {[...selectedReferral.events].reverse().map((event, index) => (
                        <li className="relative flex gap-3" key={event.id}>
                          {index < selectedReferral.events.length - 1 ? <span className="absolute left-[7px] top-5 h-[calc(100%+4px)] w-px bg-slate-200" /> : null}
                          <span className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-amber-500 ring-1 ring-amber-200" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800">{eventLabel(event.eventType)}</div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{formatDate(event.createdAt)} · {titleCase(event.actorType)}</div>
                            {event.facilityName ? <div className="mt-1 text-xs text-slate-500">{event.facilityName}</div> : null}
                            {event.note ? <p className="mt-1 text-xs leading-5 text-slate-600">{event.note}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </section>
          ) : <div className="grid place-items-center p-10 text-sm text-slate-500">Select a referral to review.</div>}
        </div>
      </Card>
    </div>
  );
}
