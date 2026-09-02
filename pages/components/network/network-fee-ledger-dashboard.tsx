"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NetworkAdminFee, NetworkAdminFeeAction } from "@/lib/network/admin-fee-types";
import type { NetworkReferralFeeStatus } from "@/lib/network/admin-types";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<NetworkReferralFeeStatus, string> = {
  confirmed: "Ready to invoice",
  invoiced: "Invoiced",
  paid: "Paid",
  disputed: "Disputed",
  waived: "Waived",
};

const STATUS_STYLES: Record<NetworkReferralFeeStatus, string> = {
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  invoiced: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  disputed: "border-rose-200 bg-rose-50 text-rose-800",
  waived: "border-slate-200 bg-slate-100 text-slate-700",
};

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function date(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value.includes("T") ? value : `${value}T12:00:00Z`));
}

export function NetworkFeeLedgerDashboard({
  initialFees,
  previewMode,
}: {
  initialFees: NetworkAdminFee[];
  previewMode: boolean;
}) {
  const [fees] = useState(initialFees);
  const [selectedId, setSelectedId] = useState(initialFees[0]?.id || "");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | NetworkReferralFeeStatus>("all");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<NetworkAdminFeeAction | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredFees = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return fees.filter((fee) => {
      if (filter !== "all" && fee.status !== filter) return false;
      if (!needle) return true;
      return [fee.facilityName, fee.familyName, fee.attributionCode, fee.invoiceReference]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [fees, filter, query]);
  const selectedFee =
    filteredFees.find((fee) => fee.id === selectedId) || filteredFees[0] || null;
  const totals = useMemo(
    () => ({
      confirmed: fees
        .filter((fee) => fee.status === "confirmed")
        .reduce((total, fee) => total + fee.amount, 0),
      invoiced: fees
        .filter((fee) => fee.status === "invoiced")
        .reduce((total, fee) => total + fee.amount, 0),
      paid: fees
        .filter((fee) => fee.status === "paid")
        .reduce((total, fee) => total + fee.amount, 0),
      disputed: fees
        .filter((fee) => fee.status === "disputed")
        .reduce((total, fee) => total + fee.amount, 0),
    }),
    [fees],
  );

  const runAction = async (action: NetworkAdminFeeAction) => {
    if (!selectedFee) return;
    if (["mark_disputed", "resolve_confirmed", "waive"].includes(action) && !note.trim()) {
      setFeedback("Add a note explaining this decision.");
      return;
    }
    setPendingAction(action);
    setFeedback(null);
    if (previewMode) {
      setFeedback("Preview action recorded. Nothing was saved.");
      setPendingAction(null);
      return;
    }

    try {
      const response = await fetch(`/api/network/admin/fees/${selectedFee.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          invoiceReference: invoiceReference.trim() || null,
          dueAt: dueAt || null,
          paidAt: paidAt || null,
          note: note.trim() || null,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "The fee could not be updated.");
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "The fee could not be updated.");
      setPendingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1450px] space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
          <CircleDollarSign className="h-4 w-4" /> Crown Network revenue operations
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Referral fee ledger</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Track confirmed placements from calculated referral fee through manual invoice and payment.
        </p>
      </div>

      {previewMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Fee operations are in preview mode. Live ledger records are not loaded.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Ready to invoice", amount: totals.confirmed, icon: FileText, color: "bg-blue-50 text-blue-700" },
          { label: "Outstanding invoices", amount: totals.invoiced, icon: Banknote, color: "bg-amber-50 text-amber-700" },
          { label: "Paid", amount: totals.paid, icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
          { label: "Disputed", amount: totals.disputed, icon: ShieldAlert, color: "bg-rose-50 text-rose-700" },
        ].map((item) => {
          const Icon = item.icon;
          return <Card className="border-slate-200" key={item.label}><CardContent className="flex items-center justify-between p-4"><div><div className="text-2xl font-black text-slate-950">{money(item.amount)}</div><div className="mt-1 text-xs text-slate-500">{item.label}</div></div><span className={cn("grid h-10 w-10 place-items-center rounded-xl", item.color)}><Icon className="h-5 w-5" /></span></CardContent></Card>;
        })}
      </div>

      <Card className="overflow-hidden border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "confirmed", "invoiced", "paid", "disputed", "waived"] as const).map((status) => <button className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", filter === status ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600")} key={status} onClick={() => setFilter(status)} type="button">{status === "all" ? "All" : STATUS_LABELS[status]}</button>)}
            </div>
            <label className="relative block w-full lg:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><span className="sr-only">Search fees</span><Input className="bg-white pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Facility, family, or invoice" value={query} /></label>
          </div>
        </div>

        <div className="grid min-h-[620px] lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50/60 lg:border-b-0 lg:border-r">
            {filteredFees.map((fee) => <button className={cn("w-full border-b border-slate-200 p-4 text-left", fee.id === selectedFee?.id ? "bg-white shadow-[inset_3px_0_0_#d69a28]" : "hover:bg-white")} key={fee.id} onClick={() => { setSelectedId(fee.id); setFeedback(null); }} type="button"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-bold text-slate-950">{fee.facilityName}</div><div className="mt-1 truncate text-xs text-slate-500">{fee.familyName} · Move-in {date(fee.moveInDate)}</div></div><div className="text-right"><div className="font-black text-slate-950">{money(fee.amount, fee.currency)}</div><Badge className={cn("mt-1 border", STATUS_STYLES[fee.status])}>{STATUS_LABELS[fee.status]}</Badge></div></div></button>)}
            {!filteredFees.length ? <div className="p-8 text-center text-sm text-slate-500">No referral fees match this view.</div> : null}
          </aside>

          {selectedFee ? (
            <section className="space-y-5 bg-white p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
                <div><h2 className="text-2xl font-black text-slate-950">{selectedFee.facilityName}</h2><p className="mt-1 text-sm text-slate-500">{selectedFee.familyName} · {selectedFee.attributionCode}</p></div>
                <Badge className={cn("w-fit border px-3 py-1", STATUS_STYLES[selectedFee.status])}>{STATUS_LABELS[selectedFee.status]}</Badge>
              </div>

              {selectedFee.outsideProtectionWindow ? <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><AlertTriangle className="h-5 w-5 shrink-0" /><div><strong>Outside protection window</strong><p className="mt-1 text-xs">Resolve the ownership question before invoicing this fee.</p></div></div> : null}

              <dl className="grid gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-2 xl:grid-cols-3">
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Referral fee</dt><dd className="mt-1 text-xl font-black text-slate-950">{money(selectedFee.amount, selectedFee.currency)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Fee model</dt><dd className="mt-1 text-sm font-semibold capitalize text-slate-700">{selectedFee.feeType}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Move-in date</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{date(selectedFee.moveInDate)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Placement value</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{selectedFee.placementValue === null ? "Not reported" : money(selectedFee.placementValue, selectedFee.currency)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Protection through</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{date(selectedFee.protectionExpiresAt)}</dd></div>
                <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Invoice</dt><dd className="mt-1 text-sm font-semibold text-slate-700">{selectedFee.invoiceReference || "Not invoiced"}</dd></div>
              </dl>

              {selectedFee.status === "confirmed" ? <div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-950">Create manual invoice record</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="invoice-reference">Invoice reference</Label><Input id="invoice-reference" onChange={(event) => setInvoiceReference(event.target.value)} placeholder="INV-1001" value={invoiceReference} /></div><div className="space-y-1.5"><Label htmlFor="invoice-due">Due date</Label><Input id="invoice-due" onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} /></div></div><Button className="mt-4" disabled={Boolean(pendingAction) || !invoiceReference.trim()} onClick={() => runAction("mark_invoiced")}><FileText /> Mark invoiced</Button></div> : null}

              {selectedFee.status === "invoiced" || selectedFee.status === "confirmed" ? <div className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-slate-950">Record payment</h3><div className="mt-3 max-w-xs space-y-1.5"><Label htmlFor="paid-at">Payment date</Label><Input id="paid-at" onChange={(event) => setPaidAt(event.target.value)} type="date" value={paidAt} /></div><Button className="mt-4 bg-emerald-700 text-white hover:bg-emerald-800" disabled={Boolean(pendingAction)} onClick={() => runAction("mark_paid")}><CheckCircle2 /> Mark paid</Button></div> : null}

              {["confirmed", "invoiced", "disputed"].includes(selectedFee.status) ? <div className="rounded-2xl border border-slate-200 p-5"><Label htmlFor="fee-note">Decision note</Label><textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" id="fee-note" maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="Explain a dispute, resolution, or waiver." value={note} /><div className="mt-3 flex flex-wrap gap-2">{["confirmed", "invoiced"].includes(selectedFee.status) ? <Button disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("mark_disputed")} variant="outline"><ShieldAlert /> Mark disputed</Button> : null}{selectedFee.status === "disputed" ? <Button disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("resolve_confirmed")} variant="outline">Resolve as confirmed</Button> : null}<Button disabled={Boolean(pendingAction) || !note.trim()} onClick={() => runAction("waive")} variant="ghost">Waive fee</Button></div></div> : null}

              {selectedFee.notes ? <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><strong className="text-slate-800">Ledger notes: </strong>{selectedFee.notes}</div> : null}
              {feedback ? <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700" role="status">{feedback}</div> : null}
            </section>
          ) : <div className="grid place-items-center p-10 text-sm text-slate-500">No fee record selected.</div>}
        </div>
      </Card>
    </div>
  );
}

