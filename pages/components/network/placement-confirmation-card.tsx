"use client";

import { useState } from "react";
import { CalendarCheck2, CircleDollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NetworkAdminReferralFacility } from "@/lib/network/admin-types";

export type PlacementConfirmationDetails = {
  moveInDate: string | null;
  placementValue: number | null;
  feeAmount: number | null;
};

function money(value: number | null) {
  if (value === null) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function PlacementConfirmationCard({
  facility,
  disabled,
  onConfirm,
}: {
  facility: NetworkAdminReferralFacility;
  disabled: boolean;
  onConfirm: (details: PlacementConfirmationDetails) => void;
}) {
  const [moveInDate, setMoveInDate] = useState(facility.placement?.moveInDate || "");
  const [placementValue, setPlacementValue] = useState(
    facility.placement?.placementValue === null || facility.placement?.placementValue === undefined
      ? ""
      : String(facility.placement.placementValue),
  );
  const [feeAmount, setFeeAmount] = useState("");
  const feeType = facility.feeTerms.feeType;
  const requiresPlacementValue = feeType === "percentage";
  const requiresManualFee = feeType === "custom";
  const canConfirm =
    Boolean(moveInDate) &&
    (!requiresPlacementValue || Boolean(placementValue)) &&
    (!requiresManualFee || Boolean(feeAmount));

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
          <CalendarCheck2 className="h-4 w-4" /> Placement confirmation
        </div>
        {facility.placement?.status === "reported" ? (
          <Badge className="border-amber-200 bg-amber-50 text-amber-800" variant="outline">
            Provider reported
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`move-in-${facility.facilityId}`}>Move-in date</Label>
          <Input
            id={`move-in-${facility.facilityId}`}
            onChange={(event) => setMoveInDate(event.target.value)}
            type="date"
            value={moveInDate}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`placement-value-${facility.facilityId}`}>
            First-month service value
          </Label>
          <Input
            id={`placement-value-${facility.facilityId}`}
            min="0"
            onChange={(event) => setPlacementValue(event.target.value)}
            placeholder={requiresPlacementValue ? "Required" : "Optional"}
            step="0.01"
            type="number"
            value={placementValue}
          />
        </div>
        {requiresManualFee ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`fee-amount-${facility.facilityId}`}>Confirmed custom referral fee</Label>
            <Input
              id={`fee-amount-${facility.facilityId}`}
              min="0"
              onChange={(event) => setFeeAmount(event.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={feeAmount}
            />
          </div>
        ) : null}
      </div>
      <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-emerald-900">
        <CircleDollarSign className="mr-1 inline h-3.5 w-3.5" />
        {feeType === "flat"
          ? `${money(facility.feeTerms.flatAmount)} flat fee`
          : feeType === "percentage"
            ? `${facility.feeTerms.percentage ?? 0}% of reported placement value`
            : "Custom fee entered at confirmation"}
        {facility.protectionExpiresAt
          ? ` · protected through ${new Date(facility.protectionExpiresAt).toLocaleDateString()}`
          : ""}
      </div>
      <Button
        className="mt-3"
        disabled={disabled || !canConfirm}
        onClick={() =>
          onConfirm({
            moveInDate: moveInDate || null,
            placementValue: placementValue ? Number(placementValue) : null,
            feeAmount: feeAmount ? Number(feeAmount) : null,
          })
        }
        size="sm"
      >
        Confirm placement and create fee
      </Button>
    </div>
  );
}

