"use client";

import { FocusEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Send } from "lucide-react";

import { formatResidentInitials } from "@/lib/kiosk-resident-initials";

type NurseAssessmentFormProps = {
  pageId: string;
  pageTitle: string;
  businessName: string;
  logoUrl: string | null;
  hasRecipientEmail: boolean;
};

type FormState = {
  residentInitials: string;
  roomNumber: string;
  agencyName: string;
  providerName: string;
  position: string;
  visitDate: string;
  visitingNotes: string;
  bloodPressure: string;
  pulse: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  temperature: string;
  weightInLbs: string;
  otherNotes: string;
};

function keepAssessmentSubmitVisible(event: FocusEvent<HTMLFormElement>) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.matches("input, textarea, select")) {
    return;
  }

  const scrollFocusedField = () => {
    if (document.activeElement !== target) {
      return;
    }

    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    if (target.dataset.assessmentLastField === "true") {
      target
        .closest("form")
        ?.querySelector<HTMLElement>("[data-assessment-submit-area='true']")
        ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
    }
  };

  window.requestAnimationFrame(scrollFocusedField);
  window.setTimeout(scrollFocusedField, 280);
}

const EMPTY_FORM: FormState = {
  residentInitials: "",
  roomNumber: "",
  agencyName: "",
  providerName: "",
  position: "",
  visitDate: "",
  visitingNotes: "",
  bloodPressure: "",
  pulse: "",
  respiratoryRate: "",
  oxygenSaturation: "",
  temperature: "",
  weightInLbs: "",
  otherNotes: "",
};

function getTodayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  inputMode,
  autoCapitalize,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  inputMode?: "numeric" | "decimal" | "text";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onBlur?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-bold leading-tight text-[#0f172a]">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        onBlur={onBlur}
        required={required}
        placeholder={placeholder}
        className="h-14 w-full scroll-mb-28 rounded-[8px] border border-[#d5d9e4] bg-white px-4 text-[16px] text-[#0f172a] outline-none [color-scheme:light] placeholder:text-[#8a93a4] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
        style={{ colorScheme: "light" }}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 7,
  isLastField = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  rows?: number;
  isLastField?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[15px] font-bold leading-tight text-[#0f172a]">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </span>
      <textarea
        data-assessment-last-field={isLastField ? "true" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="w-full scroll-mb-28 resize-y rounded-[8px] border border-[#d5d9e4] bg-white px-4 py-3 text-[16px] leading-6 text-[#0f172a] outline-none [color-scheme:light] placeholder:text-[#8a93a4] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
        style={{ colorScheme: "light" }}
      />
    </label>
  );
}

export function NurseAssessmentForm({
  pageId,
  pageTitle,
  businessName,
  logoUrl,
  hasRecipientEmail,
}: NurseAssessmentFormProps) {
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    visitDate: getTodayIsoDate(),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const formElement = formRef.current;
    const viewport = window.visualViewport;
    if (!formElement || !viewport) {
      return;
    }

    let animationFrame = 0;
    const updateKeyboardInset = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const measuredInset = Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        );
        const inset = measuredInset >= 80 ? measuredInset : 0;
        formElement.style.setProperty("--assessment-keyboard-inset", `${inset}px`);
      });
    };

    updateKeyboardInset();
    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      formElement.style.removeProperty("--assessment-keyboard-inset");
    };
  }, [submitted]);

  const updateField = (field: keyof FormState, value: string) => {
    setError(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const requiredValues = useMemo(
    () => [
      form.residentInitials,
      form.roomNumber,
      form.agencyName,
      form.providerName,
      form.position,
      form.visitDate,
      form.visitingNotes,
      form.bloodPressure,
      form.pulse,
      form.respiratoryRate,
      form.oxygenSaturation,
      form.temperature,
      form.weightInLbs,
    ],
    [form],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!hasRecipientEmail) {
      setError("This page does not have a contact email configured yet.");
      return;
    }

    if (requiredValues.some((value) => !value.trim())) {
      setError("Please complete all required fields.");
      return;
    }

    const residentInitials = formatResidentInitials(form.residentInitials);
    if (Array.from(residentInitials).length !== 2) {
      setError("Please enter the resident's first-name and last-name initials.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/kiosk/nurse-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          assessment: { ...form, residentInitials },
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Unable to submit the assessment.");
      }

      setSubmitted(true);
      setForm({ ...EMPTY_FORM, visitDate: getTodayIsoDate() });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit the assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-dvh bg-white px-5 py-8 text-[#0f172a]">
        <div className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center text-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${businessName} logo`}
              width={280}
              height={120}
              className="mb-8 max-h-32 w-auto max-w-[78vw] object-contain"
              unoptimized
              priority
            />
          ) : (
            <div className="mb-8 text-3xl font-black uppercase tracking-normal text-[#06184a]">
              {businessName}
            </div>
          )}
          <div className="rounded-[8px] border border-[#bfdbfe] bg-[#eff6ff] px-5 py-6">
            <h1 className="text-3xl font-black text-[#06184a]">Thank you.</h1>
            <p className="mt-3 text-base font-medium leading-7 text-[#334155]">
              Your assessment has been submitted to {pageTitle}.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white px-4 py-6 text-[#0f172a] sm:px-6">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onFocusCapture={keepAssessmentSubmitVisible}
        noValidate
        className="mx-auto w-full max-w-5xl pb-10"
      >
        <header className="mb-8 text-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${businessName} logo`}
              width={320}
              height={140}
              className="mx-auto max-h-32 w-auto max-w-[78vw] object-contain"
              unoptimized
              priority
            />
          ) : (
            <div className="text-3xl font-black uppercase tracking-normal text-[#06184a]">
              {businessName}
            </div>
          )}
          <h1 className="mt-5 text-2xl font-black leading-tight text-[#0f172a] sm:text-3xl">
            Outside Provider Assessment
          </h1>
        </header>

        {!hasRecipientEmail ? (
          <div className="mb-6 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#991b1b]">
            This page does not have a contact email configured yet. Please notify the facility before submitting.
          </div>
        ) : null}

        <section className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Resident's Initials"
            value={form.residentInitials}
            onChange={(value) => updateField("residentInitials", value.toLocaleUpperCase())}
            onBlur={() =>
              updateField("residentInitials", formatResidentInitials(form.residentInitials))
            }
            placeholder="e.g., JA"
            autoCapitalize="characters"
            required
          />
          <Field
            label="Room Number"
            value={form.roomNumber}
            onChange={(value) => updateField("roomNumber", value)}
            placeholder="Enter room number"
            required
          />
          <Field
            label="Agency Name"
            value={form.agencyName}
            onChange={(value) => updateField("agencyName", value)}
            placeholder="Enter agency name"
            required
          />
          <Field
            label="Your Name (First and Last)"
            value={form.providerName}
            onChange={(value) => updateField("providerName", value)}
            placeholder="Enter your first and last name"
            required
          />
          <Field
            label="Position"
            value={form.position}
            onChange={(value) => updateField("position", value)}
            placeholder="Enter your position"
            required
          />
          <Field
            label="Date"
            value={form.visitDate}
            onChange={(value) => updateField("visitDate", value)}
            placeholder="MM/DD/YYYY"
            type="date"
            required
          />
        </section>

        <div className="mt-6">
          <TextAreaField
            label="Visiting Notes"
            value={form.visitingNotes}
            onChange={(value) => updateField("visitingNotes", value)}
            placeholder="Enter visiting notes here..."
            required
            rows={8}
          />
        </div>

        <section className="mt-7">
          <h2 className="mb-4 text-xl font-black text-[#0f172a]">Vitals <span className="text-red-600">*</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Field
              label="Blood Pressure"
              value={form.bloodPressure}
              onChange={(value) => updateField("bloodPressure", value)}
              placeholder="e.g., 120/80"
              required
            />
            <Field
              label="Pulse"
              value={form.pulse}
              onChange={(value) => updateField("pulse", value)}
              placeholder="e.g., 72"
              inputMode="numeric"
              required
            />
            <Field
              label="Respiratory Rate"
              value={form.respiratoryRate}
              onChange={(value) => updateField("respiratoryRate", value)}
              placeholder="e.g., 18"
              inputMode="numeric"
              required
            />
            <Field
              label="Oxygen Saturation (SpO2)"
              value={form.oxygenSaturation}
              onChange={(value) => updateField("oxygenSaturation", value)}
              placeholder="e.g., 98%"
              inputMode="numeric"
              required
            />
            <Field
              label="Temperature"
              value={form.temperature}
              onChange={(value) => updateField("temperature", value)}
              placeholder="e.g., 98.6 F"
              inputMode="decimal"
              required
            />
            <Field
              label="Weight in lbs"
              value={form.weightInLbs}
              onChange={(value) => updateField("weightInLbs", value)}
              placeholder="e.g., 150 lbs"
              inputMode="decimal"
              required
            />
          </div>
        </section>

        <div className="mt-6">
          <TextAreaField
            label="Other Notes"
            value={form.otherNotes}
            onChange={(value) => updateField("otherNotes", value)}
            placeholder="Enter any other notes here..."
            rows={5}
            isLastField
          />
        </div>

        {error ? (
          <div className="mt-6 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#991b1b]">
            {error}
          </div>
        ) : null}

        <div
          data-assessment-submit-area="true"
          className="sticky z-20 mt-6 bg-white/95 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm"
          style={{ bottom: "var(--assessment-keyboard-inset, 0px)" }}
        >
          <p className="text-center text-base font-medium text-[#0f172a]">Thanks for submitting this.</p>
          <button
            type="submit"
            disabled={submitting || !hasRecipientEmail}
            className="mt-4 flex h-14 w-full items-center justify-center gap-3 rounded-[8px] border border-[#9fc3fb] bg-[linear-gradient(180deg,#f8fbff_0%,#dcecff_100%)] text-lg font-black uppercase text-[#06184a] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-6 w-6 fill-[#06184a] text-[#06184a]" />
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </main>
  );
}
