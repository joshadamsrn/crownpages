"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  History,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  Send,
  Star,
  User,
  UsersRound,
  X,
} from "lucide-react";

import type { KioskTemplateSettingValues } from "@/lib/kiosk-template-settings";

type KioskScreenProps = {
  pageId: string;
  pageTitle: string;
  businessName: string;
  pageUrl: string;
  logoUrl: string | null;
  profileOptions?: KioskProfileOption[];
  variant?: KioskVariant;
  kioskText?: KioskTemplateSettingValues;
  feedbackReviewUrl?: string | null;
};

type KioskVariant = "connectFirst" | "checkInFirst" | "intakeForm" | "legacyIntakeForm";

type KioskProfileOption = {
  id: string;
  title: string;
  slug: string;
  label: string;
  pageUrl: string;
};

type LeadFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  tourDate: string;
  tourTime: string;
  comments: string;
};

type InfoFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  request: string;
};

type CheckFormState = {
  firstName: string;
  lastName: string;
};

type FamilyCheckFormState = CheckFormState & {
  visitingFirstName: string;
  visitingLastName: string;
};

type VendorCheckFormState = CheckFormState & {
  companyName: string;
  visiting: string;
};

type CheckoutFormState = CheckFormState & {
  phone: string;
  checkingOut: string;
  checkedOutFirstName: string;
  checkedOutLastName: string;
  companyName: string;
  checkoutDuration: string;
};

type CheckInAction = "check_in" | "check_out";
type RequestedCheckInAction = CheckInAction | "toggle";
type CheckoutType = "resident" | "family" | "vendor";

type CheckedOutResidentSuggestion = {
  firstName: string;
  lastName: string;
  fullName: string;
};

const RESIDENT_AUTOFILL_MIN_CHARACTERS = 3;

type KioskFlowStep =
  | "home"
  | "leadForm"
  | "welcome"
  | "visitorType"
  | "residentForm"
  | "familyForm"
  | "vendorForm"
  | "checkoutType"
  | "checkoutForm"
  | "leadThankYou"
  | "thankYou"
  | "feedbackPrompt"
  | "feedbackThanks"
  | "feedbackReview"
  | "feedbackFormQr"
  | "nurseAssessmentQr";

type VisitorType =
  | "Resident"
  | "Current Patient Visitor"
  | "Vendor"
  | "Maintenance"
  | "Clinical Support"
  | "Future Patient / Family"
  | "Other";

const EMPTY_LEAD_FORM: LeadFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  tourDate: "",
  tourTime: "",
  comments: "",
};

const EMPTY_INFO_FORM: InfoFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  request: "",
};

const EMPTY_CHECK_FORM: CheckFormState = {
  firstName: "",
  lastName: "",
};

const EMPTY_CHECKOUT_FORM: CheckoutFormState = {
  ...EMPTY_CHECK_FORM,
  phone: "",
  checkingOut: "",
  checkedOutFirstName: "",
  checkedOutLastName: "",
  companyName: "",
  checkoutDuration: "",
};

const EMPTY_FAMILY_CHECK_FORM: FamilyCheckFormState = {
  ...EMPTY_CHECK_FORM,
  visitingFirstName: "",
  visitingLastName: "",
};

const EMPTY_VENDOR_CHECK_FORM: VendorCheckFormState = {
  ...EMPTY_CHECK_FORM,
  companyName: "",
  visiting: "",
};

const CHECKOUT_DURATION_OPTIONS = [
  "Less than 1 hour",
  "1-2 hours",
  "2-4 hours",
  "4-8 hours",
  "Overnight",
  "Unsure",
];

const TOUR_TIME_OPTIONS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

const KIOSK_FLOW_FORM_SCROLL_CLASS =
  "relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [scroll-padding-bottom:clamp(120px,28dvh,260px)] [touch-action:pan-y]";
const KIOSK_STICKY_ACTION_BASE_CLASS =
  "sticky z-20 mt-auto shrink-0 bg-white/95 pb-[clamp(12px,2dvh,20px)] pt-[clamp(14px,3dvh,28px)] backdrop-blur-sm";
const KIOSK_STICKY_ACTION_CLASS = `${KIOSK_STICKY_ACTION_BASE_CLASS} bottom-0`;
const KIOSK_FLOW_STICKY_ACTION_CLASS =
  "relative z-20 mt-auto shrink-0 bg-white pb-[clamp(12px,2dvh,20px)] pt-[clamp(14px,3dvh,28px)]";
const KIOSK_BUTTON_TOUCH_CLASS = "touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";
const KIOSK_BOTTOM_ACTION_OFFSET_CLASS = "bottom-[clamp(28px,3.6dvh,40px)]";
const HEADER_LOGO_SIZE_UPDATE_THRESHOLD = 1.25;

function getTodayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
}

function isValidUsPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

function formatKioskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) {
    return "";
  }

  if (digits.length < 3) {
    return `(${digits}`;
  }

  if (digits.length === 3) {
    return `(${digits}) `;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getPhoneCaretPosition(value: string, digitCount: number) {
  if (digitCount <= 0) {
    return value.length > 0 ? 1 : 0;
  }

  let seenDigits = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) {
      seenDigits += 1;
    }

    if (seenDigits >= digitCount) {
      let caretPosition = index + 1;
      while (caretPosition < value.length && /\D/.test(value[caretPosition])) {
        caretPosition += 1;
      }
      return caretPosition;
    }
  }

  return value.length;
}

function setInputCaret(input: HTMLInputElement, position: number) {
  window.requestAnimationFrame(() => {
    input.setSelectionRange(position, position);
  });
}

function isKioskTextEntryElement(element: Element | null) {
  return Boolean(element?.matches("input, textarea, select, [contenteditable='true']"));
}

function dismissKioskKeyboardOnOutsidePointerDown(event: React.PointerEvent<HTMLElement>) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.closest("input, textarea, select, button, label, [contenteditable='true']")) {
    return;
  }

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && isKioskTextEntryElement(activeElement)) {
    activeElement.blur();
  }
}

function scrollKioskFieldIntoView(event: React.FocusEvent<HTMLElement>) {
  const target = event.target;

  if (!(target instanceof HTMLElement) || !isKioskTextEntryElement(target)) {
    return;
  }

  const scrollFocusedField = () => {
    if (document.activeElement === target) {
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });

      if (target.dataset.kioskLastField === "true") {
        const form = target.closest("form");
        const submitArea = form?.querySelector<HTMLElement>(
          "[data-kiosk-submit-area='true']",
        );
        submitArea?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
        form?.scrollTo({ top: form.scrollHeight, behavior: "auto" });
      }
    }
  };

  window.requestAnimationFrame(scrollFocusedField);
  window.setTimeout(scrollFocusedField, 280);
}

function isInteractiveKioskFormField(
  element: Element,
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !(element instanceof HTMLSelectElement)
  ) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return false;
  }

  return !element.disabled && element.getClientRects().length > 0;
}

function revealKioskFormActions(form: HTMLFormElement) {
  const reveal = () => {
    const submitArea = form.querySelector<HTMLElement>("[data-kiosk-submit-area='true']");
    submitArea?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });

    if (form.dataset.kioskScrollable === "true") {
      form.scrollTo({ top: form.scrollHeight, behavior: "auto" });
    }
  };

  window.requestAnimationFrame(reveal);
  window.setTimeout(reveal, 320);
}

function handleKioskFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const form = event.currentTarget;
  const allFields = Array.from(
    form.querySelectorAll("input, textarea, select"),
  ).filter(isInteractiveKioskFormField);
  const requiredFields = allFields.filter((field) => field.required);

  event.preventDefault();

  if (target.required && !target.value.trim()) {
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    return;
  }

  if (target.required) {
    const currentRequiredIndex = requiredFields.indexOf(target);
    const nextRequiredField =
      currentRequiredIndex >= 0 ? requiredFields[currentRequiredIndex + 1] : undefined;
    const incompleteRequiredField = requiredFields.find(
      (field) => field !== target && !field.value.trim(),
    );
    const nextField = nextRequiredField ?? incompleteRequiredField;

    if (nextField) {
      nextField.focus({ preventScroll: true });
      nextField.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      return;
    }

    if (form.dataset.kioskSubmitOnComplete === "true") {
      target.blur();
      form.requestSubmit();
      return;
    }

    target.blur();
    revealKioskFormActions(form);
    return;
  }

  if (target.dataset.kioskLastField !== "true") {
    const currentFieldIndex = allFields.indexOf(target);
    const nextOptionalField = allFields
      .slice(currentFieldIndex + 1)
      .find((field) => !field.required);

    if (nextOptionalField) {
      nextOptionalField.focus({ preventScroll: true });
      nextOptionalField.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      return;
    }
  }

  target.blur();
  revealKioskFormActions(form);
}

function handlePhoneInputChange(
  event: React.ChangeEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) {
  const input = event.currentTarget;
  const nextValue = formatKioskPhone(input.value);
  const selectionStart = input.selectionStart ?? input.value.length;
  const digitsBeforeCursor = input.value.slice(0, selectionStart).replace(/\D/g, "").length;

  onChange(nextValue);
  setInputCaret(input, getPhoneCaretPosition(nextValue, digitsBeforeCursor));
}

function handlePhoneInputKeyDown(
  event: React.KeyboardEvent<HTMLInputElement>,
  onChange: (value: string) => void,
) {
  const input = event.currentTarget;
  const selectionStart = input.selectionStart ?? 0;
  const selectionEnd = input.selectionEnd ?? selectionStart;

  if (selectionStart !== selectionEnd) {
    return;
  }

  const isBackspacingSeparator =
    event.key === "Backspace" && selectionStart > 0 && /\D/.test(input.value[selectionStart - 1]);
  const isDeletingSeparator =
    event.key === "Delete" && selectionStart < input.value.length && /\D/.test(input.value[selectionStart]);

  if (!isBackspacingSeparator && !isDeletingSeparator) {
    return;
  }

  const digits = input.value.replace(/\D/g, "").split("");
  const digitsBeforeCursor = input.value.slice(0, selectionStart).replace(/\D/g, "").length;
  const removeIndex = isBackspacingSeparator ? digitsBeforeCursor - 1 : digitsBeforeCursor;

  if (removeIndex < 0 || removeIndex >= digits.length) {
    return;
  }

  event.preventDefault();
  digits.splice(removeIndex, 1);

  const nextValue = formatKioskPhone(digits.join(""));
  onChange(nextValue);
  setInputCaret(input, getPhoneCaretPosition(nextValue, removeIndex));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function formatKioskDate(value: string) {
  if (!value) {
    return "Schedule a Tour";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatKioskTime(value: string) {
  if (!value) {
    return "Select time";
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return "Select time";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function buildTourRequestedAtIso(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const requestedAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(requestedAt.getTime())) {
    return null;
  }

  return requestedAt.toISOString();
}

function parseIsoLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toIsoLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCalendarMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addCalendarMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function generateTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getAnalyticsIdentity() {
  let visitorId: string | null = null;
  let sessionId: string | null = null;

  try {
    visitorId = localStorage.getItem("crownpages_visitor_id");
    if (!visitorId) {
      visitorId = generateTempId("visitor");
      localStorage.setItem("crownpages_visitor_id", visitorId);
    }
  } catch {
    visitorId = generateTempId("visitor");
  }

  try {
    sessionId = sessionStorage.getItem("crownpages_session_id");
    if (!sessionId) {
      sessionId = generateTempId("session");
      sessionStorage.setItem("crownpages_session_id", sessionId);
    }
  } catch {
    sessionId = generateTempId("session");
  }

  return { visitorId, sessionId };
}

function normalizeResidentSuggestionValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function KioskLabelText({
  label,
  keepTogether = false,
}: {
  label: string;
  keepTogether?: boolean;
}) {
  const qualifierMatch = label.match(/\s*(\((?:Optional|if applicable|applicable)\))$/i);

  if (!qualifierMatch) {
    return <>{label}</>;
  }

  const qualifier = qualifierMatch[1].replace(/\((applicable|if applicable)\)/i, "(If applicable)");
  const mainLabel = label.slice(0, qualifierMatch.index).trimEnd();

  if (keepTogether) {
    return (
      <span className="inline-flex max-w-full items-baseline gap-1 whitespace-nowrap">
        <span>{mainLabel}</span>
        <span className="shrink-0 text-[0.78em] font-semibold text-[#8b93a1]">{qualifier}</span>
      </span>
    );
  }

  return (
    <>
      {mainLabel}
      <span className="font-semibold text-[#8b93a1]"> {qualifier}</span>
    </>
  );
}

function KioskField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  className = "",
  size = "normal",
  isLastField = false,
  completesRequiredFields = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  className?: string;
  size?: "normal" | "large";
  isLastField?: boolean;
  completesRequiredFields?: boolean;
}) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (type !== "tel") {
      onChange(event.target.value);
      return;
    }

    handlePhoneInputChange(event, onChange);
  };

  return (
    <label className={`block ${className}`}>
      <span
        className={`mb-[clamp(7px,1.1dvh,13px)] flex items-center gap-1.5 font-black leading-none text-[#050505] ${
          size === "large" ? "text-[clamp(15px,2dvh,20px)]" : "text-[clamp(17px,2.55dvh,26px)]"
        }`}
      >
        <KioskLabelText label={label} />
        {required ? <span className="text-[#DFAF00]">*</span> : null}
      </span>
      <span className="relative block">
        <Icon
          className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-black ${
            size === "large"
              ? "left-[clamp(16px,1.8vw,26px)] h-[clamp(26px,3.8dvh,40px)] w-[clamp(26px,3.8dvh,40px)]"
              : "left-[clamp(13px,1.6vw,24px)] h-[clamp(21px,3.35dvh,40px)] w-[clamp(21px,3.35dvh,40px)]"
          }`}
        />
        <input
          data-kiosk-last-field={isLastField ? "true" : undefined}
          value={value}
          onChange={handleInputChange}
          onKeyDown={type === "tel" ? (event) => handlePhoneInputKeyDown(event, onChange) : undefined}
          type={type}
          inputMode={type === "tel" ? "numeric" : undefined}
          enterKeyHint={isLastField || completesRequiredFields ? "done" : "next"}
          autoComplete="off"
          maxLength={type === "tel" ? 14 : undefined}
          required={required}
          placeholder={placeholder}
          className={`w-full scroll-mb-[clamp(120px,24dvh,220px)] rounded-[8px] border border-[#c9cde0] bg-[#fbfcff] font-bold text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition [color-scheme:light] placeholder:text-black focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe] ${
            size === "large"
              ? "h-[clamp(72px,10.2dvh,106px)] pl-[clamp(50px,4.8vw,80px)] pr-[clamp(10px,1.5vw,22px)] text-[clamp(15px,1.95dvh,21px)]"
              : "h-[clamp(56px,7.2dvh,82px)] pl-[clamp(40px,4.6vw,86px)] pr-[clamp(10px,1.5vw,22px)] text-[clamp(13px,1.82dvh,24px)]"
          }`}
          style={{ colorScheme: "light" }}
        />
      </span>
    </label>
  );
}

type KioskLogoShape = "square" | "rectangle";
type KioskLogoMatteVariant = "actionHub" | "checkInFirst" | "legacyQr";

function getKioskLogoShape(width: number, height: number): KioskLogoShape {
  if (height <= 0) {
    return "rectangle";
  }

  return width / height >= 1.4 ? "rectangle" : "square";
}

function detectKioskLogoArtworkShape(src: string, naturalWidth: number, naturalHeight: number): Promise<KioskLogoShape> {
  const fallbackShape = getKioskLogoShape(naturalWidth, naturalHeight);

  if (typeof window === "undefined" || typeof document === "undefined" || !src) {
    return Promise.resolve(fallbackShape);
  }

  return new Promise((resolve) => {
    const analyzer = new window.Image();

    analyzer.crossOrigin = "anonymous";
    analyzer.onload = () => {
      try {
        const scanSize = 220;
        const sourceWidth = analyzer.naturalWidth || naturalWidth;
        const sourceHeight = analyzer.naturalHeight || naturalHeight;
        const scale = Math.min(1, scanSize / Math.max(sourceWidth, sourceHeight));
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          resolve(fallbackShape);
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(analyzer, 0, 0, width, height);

        const { data } = context.getImageData(0, 0, width, height);
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const alpha = data[index + 3];
            const isWhiteBackground = red > 244 && green > 244 && blue > 244;

            if (alpha > 12 && !isWhiteBackground) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        if (maxX < minX || maxY < minY) {
          resolve(fallbackShape);
          return;
        }

        resolve(getKioskLogoShape(maxX - minX + 1, maxY - minY + 1));
      } catch {
        resolve(fallbackShape);
      }
    };
    analyzer.onerror = () => resolve(fallbackShape);
    analyzer.src = src;
  });
}

function getKioskLogoMatteClass(variant: KioskLogoMatteVariant, shape: KioskLogoShape) {
  const base =
    "relative flex shrink-0 items-center justify-center overflow-hidden bg-white p-[clamp(12px,1.8dvh,24px)]";

  if (variant === "actionHub") {
    return shape === "rectangle"
      ? `${base} h-full max-h-[clamp(250px,36dvh,380px)] w-full max-w-[clamp(560px,52vw,900px)]`
      : `${base} h-full max-h-[clamp(260px,36dvh,410px)] aspect-square max-w-full`;
  }

  if (variant === "checkInFirst") {
    return shape === "rectangle"
      ? `${base} h-[clamp(220px,32dvh,340px)] w-full max-w-[clamp(600px,60vw,900px)]`
      : `${base} h-[clamp(245px,34dvh,360px)] aspect-square max-w-full`;
  }

  return shape === "rectangle"
    ? `${base} h-[clamp(170px,24.5dvh,250px)] w-full max-w-[clamp(360px,38vw,560px)]`
    : `${base} h-[clamp(185px,24.5dvh,270px)] aspect-square max-w-full`;
}

function getKioskLogoFallbackFontLimits(variant?: KioskLogoMatteVariant) {
  if (variant === "actionHub") {
    return { minFontSize: 12, maxFontSize: 68 };
  }

  if (variant === "checkInFirst") {
    return { minFontSize: 12, maxFontSize: 58 };
  }

  if (variant === "legacyQr") {
    return { minFontSize: 10, maxFontSize: 46 };
  }

  return { minFontSize: 10, maxFontSize: 54 };
}

function KioskLogoFallback({
  businessName,
  className,
  matteVariant,
}: {
  businessName: string;
  className: string;
  matteVariant?: KioskLogoMatteVariant;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const { minFontSize, maxFontSize } = getKioskLogoFallbackFontLimits(matteVariant);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) {
      return;
    }

    let frame = 0;
    const updateFontSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const availableWidth = container.clientWidth - 2;
        const availableHeight = container.clientHeight;

        if (availableWidth <= 0 || availableHeight <= 0) {
          return;
        }

        const measurementClone = text.cloneNode(true) as HTMLDivElement;
        measurementClone.removeAttribute("style");
        measurementClone.style.position = "absolute";
        measurementClone.style.visibility = "hidden";
        measurementClone.style.pointerEvents = "none";
        measurementClone.style.boxSizing = "border-box";
        measurementClone.style.width = `${availableWidth}px`;
        measurementClone.style.maxWidth = "none";
        measurementClone.style.height = "auto";
        measurementClone.style.maxHeight = "none";
        measurementClone.style.overflow = "visible";
        measurementClone.style.whiteSpace = "normal";
        measurementClone.style.overflowWrap = "anywhere";
        measurementClone.style.wordBreak = "normal";
        measurementClone.style.lineHeight = "1.04";
        measurementClone.style.fontSize = `${maxFontSize}px`;
        measurementClone.style.padding = "0";
        container.appendChild(measurementClone);

        let low = minFontSize;
        let high = maxFontSize;
        for (let step = 0; step < 8; step += 1) {
          const nextFontSize = (low + high) / 2;
          measurementClone.style.fontSize = `${nextFontSize}px`;
          const fits =
            measurementClone.scrollWidth <= availableWidth + 1 &&
            measurementClone.scrollHeight <= availableHeight + 1;

          if (fits) {
            low = nextFontSize;
          } else {
            high = nextFontSize;
          }
        }

        measurementClone.remove();
        setFontSize((currentFontSize) =>
          Math.abs(currentFontSize - low) > 0.2 ? low : currentFontSize,
        );
      });
    };

    updateFontSize();

    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateFontSize);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFontSize);
    };
  }, [businessName, maxFontSize, minFontSize]);

  return (
    <div ref={containerRef} className={`flex h-full w-full items-center justify-center overflow-hidden px-[clamp(8px,1.4vw,22px)] py-[clamp(6px,1.2dvh,18px)] ${className}`}>
      <div
        ref={textRef}
        className="max-w-full text-center leading-[1.04] tracking-normal [overflow-wrap:anywhere] [word-break:normal]"
        style={{ fontSize }}
      >
        {businessName}
      </div>
    </div>
  );
}

function KioskLogo({
  logoUrl,
  businessName,
  className = "",
  width = 430,
  height = 180,
  sizes = "(max-width: 1024px) 43vw, 570px",
  fallbackClassName = "text-center text-5xl font-black uppercase leading-none text-[#06184a]",
  matteVariant,
}: {
  logoUrl: string | null;
  businessName: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  fallbackClassName?: string;
  matteVariant?: KioskLogoMatteVariant;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoShape, setLogoShape] = useState<KioskLogoShape>("rectangle");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const displayableLogoUrl = logoUrl && !logoFailed ? logoUrl : null;
  const hasDisplayableLogo = Boolean(displayableLogoUrl);
  const displayedLogoShape = hasDisplayableLogo ? logoShape : "rectangle";

  const handleLoadedLogo = useCallback((image: HTMLImageElement) => {
    if (image.naturalWidth > 0) {
      const source = image.currentSrc || image.src;

      setLogoLoaded(true);
      setLogoShape(getKioskLogoShape(image.naturalWidth, image.naturalHeight));
      if (matteVariant) {
        void detectKioskLogoArtworkShape(source, image.naturalWidth, image.naturalHeight).then((detectedShape) => {
          const currentImage = imageRef.current;
          const currentSource = currentImage ? currentImage.currentSrc || currentImage.src : "";

          if (currentSource === source) {
            setLogoShape(detectedShape);
          }
        });
      }
      return;
    }

    setLogoFailed(true);
  }, [matteVariant]);

  useEffect(() => {
    setLogoFailed(false);
    setLogoLoaded(false);
    setLogoShape("rectangle");

    const checkCachedImage = () => {
      const image = imageRef.current;
      if (!image || !image.complete) {
        return;
      }

      if (image.naturalWidth > 0) {
        handleLoadedLogo(image);
        return;
      }

      setLogoFailed(true);
    };

    const frame = window.requestAnimationFrame(checkCachedImage);
    const timeout = window.setTimeout(checkCachedImage, 1200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [handleLoadedLogo, logoUrl]);

  if (matteVariant) {
    return (
      <div
        data-kiosk-logo-matte={matteVariant}
        data-kiosk-logo-shape={displayedLogoShape}
        className={`${getKioskLogoMatteClass(matteVariant, displayedLogoShape)} ${className}`}
      >
        {displayableLogoUrl ? (
          <Image
            ref={imageRef}
            src={displayableLogoUrl}
            alt={`${businessName} logo`}
            width={width}
            height={height}
            className={`max-h-full max-w-full object-contain transition-opacity ${logoLoaded ? "opacity-100" : "opacity-0"}`}
            unoptimized
            priority
            sizes={sizes}
            onLoad={(event) => handleLoadedLogo(event.currentTarget)}
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <KioskLogoFallback
            businessName={businessName}
            className={fallbackClassName}
            matteVariant={matteVariant}
          />
        )}
      </div>
    );
  }

  if (displayableLogoUrl) {
    return (
      <Image
        ref={imageRef}
        src={displayableLogoUrl}
        alt={`${businessName} logo`}
        width={width}
        height={height}
        className={`object-contain transition-opacity ${logoLoaded ? "opacity-100" : "opacity-0"} ${className}`}
        unoptimized
        priority
        sizes={sizes}
        onLoad={(event) => handleLoadedLogo(event.currentTarget)}
        onError={() => setLogoFailed(true)}
      />
    );
  }

  return (
    <KioskLogoFallback
      businessName={businessName}
      className={`${fallbackClassName} ${className}`}
      matteVariant={matteVariant}
    />
  );
}

function KioskScanItemsInline({ items }: { items: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(34);

  useEffect(() => {
    const container = containerRef.current;
    const row = rowRef.current;

    if (!container || !row) {
      return;
    }

    let frame = 0;
    const updateFontSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const availableWidth = container.clientWidth;

        if (availableWidth <= 0) {
          return;
        }

        const maxFontSize = Math.min(34, Math.max(21, window.innerHeight * 0.033));
        const minFontSize = 10;
        const measurementClone = row.cloneNode(true) as HTMLDivElement;
        measurementClone.removeAttribute("style");
        measurementClone.style.position = "absolute";
        measurementClone.style.visibility = "hidden";
        measurementClone.style.pointerEvents = "none";
        measurementClone.style.display = "inline-flex";
        measurementClone.style.flexWrap = "nowrap";
        measurementClone.style.width = "max-content";
        measurementClone.style.maxWidth = "none";
        measurementClone.style.whiteSpace = "nowrap";
        measurementClone.style.fontSize = `${maxFontSize}px`;
        container.appendChild(measurementClone);

        let low = minFontSize;
        let high = maxFontSize;
        for (let step = 0; step < 8; step += 1) {
          const nextFontSize = (low + high) / 2;
          measurementClone.style.fontSize = `${nextFontSize}px`;

          if (measurementClone.getBoundingClientRect().width <= availableWidth) {
            low = nextFontSize;
          } else {
            high = nextFontSize;
          }
        }

        measurementClone.remove();

        const nextFontSize = low;
        setFontSize((currentFontSize) =>
          Math.abs(currentFontSize - nextFontSize) > 0.2 ? nextFontSize : currentFontSize,
        );
      });
    };

    updateFontSize();

    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateFontSize);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFontSize);
    };
  }, [items]);

  return (
    <div
      ref={containerRef}
      className="mt-[clamp(12px,2dvh,22px)] flex w-full justify-center overflow-hidden text-black"
    >
      <div
        ref={rowRef}
        data-kiosk-template-3-scan-items="true"
        className="inline-flex flex-nowrap items-center justify-center gap-[clamp(10px,1.35vw,18px)] whitespace-nowrap font-black uppercase leading-none"
        style={{ fontSize }}
      >
        {items.map((item) => (
          <span key={item} className="inline-grid grid-cols-[0.6em_max-content] items-center justify-center gap-[clamp(5px,0.65vw,8px)]">
            <span aria-hidden="true" className="text-center text-[1.1em] leading-none">•</span>
            <span>{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function KioskScanDescriptionText({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(38);

  useEffect(() => {
    const container = containerRef.current;
    const textElement = textRef.current;

    if (!container || !textElement) {
      return;
    }

    let frame = 0;
    const updateFontSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const availableWidth = container.clientWidth;

        if (availableWidth <= 0) {
          return;
        }

        const maxFontSize = Math.min(42, Math.max(28, window.innerHeight * 0.041));
        const minFontSize = 14;
        const measurementClone = textElement.cloneNode(true) as HTMLDivElement;
        measurementClone.removeAttribute("style");
        measurementClone.style.position = "absolute";
        measurementClone.style.visibility = "hidden";
        measurementClone.style.pointerEvents = "none";
        measurementClone.style.display = "inline-block";
        measurementClone.style.width = "max-content";
        measurementClone.style.maxWidth = "none";
        measurementClone.style.whiteSpace = "nowrap";
        measurementClone.style.fontSize = `${maxFontSize}px`;
        container.appendChild(measurementClone);

        let low = minFontSize;
        let high = maxFontSize;
        for (let step = 0; step < 8; step += 1) {
          const nextFontSize = (low + high) / 2;
          measurementClone.style.fontSize = `${nextFontSize}px`;

          if (measurementClone.getBoundingClientRect().width <= availableWidth) {
            low = nextFontSize;
          } else {
            high = nextFontSize;
          }
        }

        measurementClone.remove();

        const nextFontSize = low;
        setFontSize((currentFontSize) =>
          Math.abs(currentFontSize - nextFontSize) > 0.2 ? nextFontSize : currentFontSize,
        );
      });
    };

    updateFontSize();

    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateFontSize);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFontSize);
    };
  }, [text]);

  return (
    <div className="mt-[clamp(12px,2dvh,22px)] box-border w-[calc(100%+clamp(70px,8vw,106px))] max-w-[calc(100vw-60px)] px-[clamp(14px,1.8vw,22px)]">
      <div ref={containerRef} className="flex w-full justify-center overflow-hidden text-black">
        <div
          ref={textRef}
          data-kiosk-scan-description="true"
          className="whitespace-nowrap text-center font-black uppercase leading-none"
          style={{ fontSize }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function KioskProfileSelector({
  profiles,
  selectedProfileId,
  onSelect,
}: {
  profiles: KioskProfileOption[];
  selectedProfileId: string;
  onSelect: (profileId: string) => void;
}) {
  if (profiles.length < 2) {
    return null;
  }

  return (
    <div
      className={`grid w-full gap-[clamp(8px,1.1vw,18px)] ${
        profiles.length === 2 ? "grid-cols-2" : "grid-cols-3"
      }`}
    >
      {profiles.map((profile) => {
        const selected = profile.id === selectedProfileId;

        return (
          <button
            key={profile.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(profile.id)}
            className={`flex h-[clamp(40px,5.45dvh,58px)] min-w-0 items-center justify-center rounded-[8px] border px-[clamp(6px,1vw,14px)] text-center text-[clamp(10px,1.32dvh,15px)] font-black leading-[1.05] text-black shadow-sm ${KIOSK_BUTTON_TOUCH_CLASS} ${
              selected
                ? "border-[#9fc3fb] bg-[linear-gradient(180deg,#f8fbff_0%,#dcecff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_rgba(37,99,235,0.12)]"
                : "border-[#d4d8df] bg-white"
            }`}
          >
            <span className="block min-w-0 whitespace-normal break-normal">{profile.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function KioskFlowShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] bg-[#111111] p-[clamp(6px,1.1dvh,12px)] text-[#06184a]">
      <div className="isolate flex h-full overflow-hidden rounded-[clamp(16px,2.4dvh,26px)] border-[clamp(10px,1.9dvh,18px)] border-black bg-black shadow-[inset_0_0_0_2px_rgba(15,23,42,0.08)] [backface-visibility:hidden] [transform:translateZ(0)]">
        <div className="relative flex min-h-0 w-full flex-col overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

function KioskHeaderLogo({ compact = false, textSize }: { compact?: boolean; textSize?: number }) {
  const logoHeight = textSize
    ? Math.floor(Math.max(compact ? 18 : 22, Math.min(compact ? 32 : 42, textSize * 1.28)))
    : null;
  const logoWidth = logoHeight ? Math.round(logoHeight * (949 / 179)) : null;

  return (
    <span
      aria-label="CrownPages"
      className={`relative block shrink-0 overflow-hidden ${
        logoHeight
          ? ""
          : compact
            ? "h-[clamp(22px,3.4dvh,34px)] w-[clamp(74px,10vw,114px)]"
            : "h-[clamp(51px,5.2dvh,62px)] w-[clamp(170px,17.3vw,260px)]"
      }`}
      style={logoHeight && logoWidth ? { height: logoHeight, width: logoWidth } : undefined}
    >
      <Image
        src="/cp-logo-black-cropped.jpeg"
        alt="CrownPages"
        fill
        className="object-contain"
        sizes={compact ? "(max-width: 1024px) 10vw, 114px" : "(max-width: 1024px) 18vw, 260px"}
        priority
        unoptimized
      />
    </span>
  );
}

function getKioskHeaderTitleSizing(
  hasHeaderIntakeButton: boolean,
  hasTallHeader: boolean,
  compactTitle = false,
) {
  if (compactTitle) {
    return { minFontSize: 7, maxFontSize: 22 };
  }

  if (hasHeaderIntakeButton) {
    return { minFontSize: 8, maxFontSize: 28 };
  }

  if (hasTallHeader) {
    return { minFontSize: 8, maxFontSize: 29 };
  }

  return { minFontSize: 7, maxFontSize: 14 };
}

function KioskHeaderTitle({
  title,
  minFontSize,
  maxFontSize,
  className = "",
  onFontSizeChange,
}: {
  title: string;
  minFontSize: number;
  maxFontSize: number;
  className?: string;
  onFontSizeChange?: (fontSize: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;

    if (!container || !text) {
      return;
    }

    let frame = 0;
    const updateFontSize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const availableWidth = container.clientWidth;

        if (availableWidth <= 0) {
          return;
        }

        const breathingRoom = Math.min(56, Math.max(16, availableWidth * 0.12));
        const fitWidth = Math.max(1, availableWidth - breathingRoom);

        const measurementClone = text.cloneNode(true) as HTMLSpanElement;
        measurementClone.removeAttribute("style");
        measurementClone.style.position = "absolute";
        measurementClone.style.visibility = "hidden";
        measurementClone.style.pointerEvents = "none";
        measurementClone.style.display = "inline-block";
        measurementClone.style.width = "max-content";
        measurementClone.style.maxWidth = "none";
        measurementClone.style.overflow = "visible";
        measurementClone.style.whiteSpace = "nowrap";
        measurementClone.style.fontSize = `${maxFontSize}px`;
        container.appendChild(measurementClone);
        const naturalWidth = measurementClone.getBoundingClientRect().width;
        measurementClone.remove();

        if (naturalWidth <= 0) {
          setFontSize(maxFontSize);
          return;
        }

        const fittedFontSize = Math.max(
          minFontSize,
          Math.min(maxFontSize, maxFontSize * (fitWidth / naturalWidth)),
        );

        setFontSize((currentFontSize) =>
          Math.abs(currentFontSize - fittedFontSize) > 0.2 ? fittedFontSize : currentFontSize,
        );
        onFontSizeChange?.(fittedFontSize);
      });
    };

    updateFontSize();

    const resizeObserver = new ResizeObserver(updateFontSize);
    resizeObserver.observe(container);
    window.addEventListener("resize", updateFontSize);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFontSize);
    };
  }, [maxFontSize, minFontSize, onFontSizeChange, title]);

  return (
    <div ref={containerRef} className={`min-w-0 overflow-hidden ${className}`} title={title}>
      <span
        ref={textRef}
        className="block max-w-full overflow-hidden whitespace-nowrap leading-none"
        style={{ fontSize }}
      >
        {title}
      </span>
    </div>
  );
}

function FlowBackButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[clamp(54px,8dvh,74px)] min-w-[clamp(150px,17vw,220px)] items-center justify-center gap-[clamp(12px,2vw,20px)] rounded-[8px] border border-[#b8bfcd] bg-white px-[clamp(18px,3vw,28px)] text-[clamp(20px,3.2dvh,31px)] font-bold uppercase text-[#06184a] shadow-sm ${KIOSK_BUTTON_TOUCH_CLASS} ${className}`}
    >
      <ArrowLeft className="h-[clamp(28px,4.5dvh,40px)] w-[clamp(28px,4.5dvh,40px)]" />
      Back
    </button>
  );
}

function KioskFeedbackPrompt({
  selectedRating,
  onSelect,
}: {
  selectedRating: number | null;
  onSelect: (rating: number) => void;
}) {
  return (
    <div className="mt-[clamp(26px,4dvh,42px)] rounded-[18px] border border-[#d7dbe5] bg-[#06184a] px-[clamp(26px,4vw,54px)] py-[clamp(22px,3.4dvh,36px)] shadow-[0_18px_42px_rgba(6,24,74,0.18)]">
      <div className="text-[clamp(24px,3.8dvh,36px)] font-black leading-none text-white">
        How are we doing?
      </div>
      <div className="mt-[clamp(18px,2.7dvh,28px)] flex items-center justify-center gap-[clamp(12px,2vw,24px)]" role="radiogroup" aria-label="Kiosk rating">
        {[1, 2, 3, 4, 5].map((rating) => {
          const isFilled = selectedRating !== null && rating <= selectedRating;
          return (
            <button
              key={rating}
              type="button"
              role="radio"
              aria-checked={selectedRating === rating}
              aria-label={`${rating} out of 5 stars`}
              disabled={selectedRating !== null}
              onClick={() => onSelect(rating)}
              className={`flex h-[clamp(54px,7.5dvh,76px)] w-[clamp(54px,7.5dvh,76px)] items-center justify-center rounded-full border border-white/25 bg-white/10 transition active:scale-95 disabled:cursor-default ${KIOSK_BUTTON_TOUCH_CLASS}`}
            >
              <Star
                className={`h-[clamp(38px,5.8dvh,58px)] w-[clamp(38px,5.8dvh,58px)] transition-colors ${
                  isFilled ? "fill-[#DFAF00] text-[#DFAF00]" : "fill-transparent text-white"
                }`}
                strokeWidth={1.8}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-[clamp(12px,1.8dvh,18px)] text-[clamp(14px,2dvh,18px)] font-medium text-white/75">
        Optional
      </div>
    </div>
  );
}

function FlowHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Kiosk History"
      title="Kiosk History"
      onClick={onClick}
      className={`absolute right-[clamp(18px,3vw,32px)] top-[clamp(18px,3dvh,28px)] z-10 flex h-[clamp(54px,8dvh,74px)] w-[clamp(54px,8dvh,74px)] items-center justify-center rounded-[10px] border border-[#83b9f8] bg-[#eff6ff] text-[#1f6fcf] shadow-[0_10px_24px_rgba(31,111,207,0.2)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
    >
      <ClipboardList className="h-[clamp(30px,4.8dvh,44px)] w-[clamp(30px,4.8dvh,44px)]" />
    </button>
  );
}

function KioskHeaderReviewButton({
  onClick,
  compact = false,
  className = "",
}: {
  onClick: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Leave Review"
      title="Leave Review"
      onClick={onClick}
      className={`flex min-w-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#e2b322] bg-[linear-gradient(180deg,#fffdf4_0%,#fff6cf_100%)] shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS} ${
        compact
          ? "px-[clamp(2px,0.35vw,5px)]"
          : "px-[clamp(3px,0.55vw,8px)]"
      } ${className}`}
    >
      <Image
        src="/leave-review-button.png"
        alt=""
        aria-hidden="true"
        width={2172}
        height={724}
        draggable={false}
        className={`w-full select-none object-contain ${
          compact
            ? "h-[clamp(40px,5.6dvh,50px)]"
            : "h-[clamp(46px,6.8dvh,64px)]"
        }`}
      />
    </button>
  );
}

function FlowVisitorTypeButton({
  title,
  subtitle,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "blue" | "purple";
  onClick: () => void;
}) {
  const colors = {
    green: {
      border: "border-[#2fa24a]",
      text: "text-[#2fa24a]",
      shadow: "shadow-[0_18px_42px_rgba(47,162,74,0.14)]",
    },
    blue: {
      border: "border-[#1f6fcf]",
      text: "text-[#1f6fcf]",
      shadow: "shadow-[0_18px_42px_rgba(31,111,207,0.14)]",
    },
    purple: {
      border: "border-[#7b2cbf]",
      text: "text-[#7b2cbf]",
      shadow: "shadow-[0_18px_42px_rgba(123,44,191,0.14)]",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[clamp(190px,30dvh,280px)] w-full min-w-0 flex-col items-center justify-center rounded-[8px] border-[3px] bg-white px-[clamp(14px,2.4vw,32px)] ${KIOSK_BUTTON_TOUCH_CLASS} ${colors.border} ${colors.shadow}`}
    >
      <Icon className={`mb-[clamp(12px,2.4dvh,24px)] h-[clamp(52px,9dvh,84px)] w-[clamp(52px,9dvh,84px)] ${colors.text}`} />
      <div className="text-center text-[clamp(21px,3.7dvh,34px)] font-black leading-[1.05] text-[#06184a]">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-[clamp(7px,1.5dvh,14px)] text-center text-[clamp(15px,2.5dvh,22px)] font-medium leading-[1.1] text-[#5b6472]">
          {subtitle}
        </div>
      ) : null}
    </button>
  );
}

function FlowCheckActionButton({
  title,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "green" | "blue";
  onClick: () => void;
}) {
  const colors = {
    green: {
      border: "border-[#109314]",
      text: "text-[#109314]",
      shadow: "shadow-[0_18px_38px_rgba(16,147,20,0.16)]",
    },
    blue: {
      border: "border-[#1f6fcf]",
      text: "text-[#1f6fcf]",
      shadow: "shadow-[0_18px_38px_rgba(31,111,207,0.16)]",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[clamp(142px,23dvh,196px)] w-full min-w-0 flex-col items-center justify-center rounded-[10px] border-[3px] bg-white px-[clamp(18px,3vw,34px)] ${KIOSK_BUTTON_TOUCH_CLASS} ${colors.border} ${colors.shadow}`}
    >
      <Icon className={`mb-[clamp(12px,2.8dvh,24px)] h-[clamp(52px,9dvh,82px)] w-[clamp(52px,9dvh,82px)] ${colors.text}`} />
      <div className="text-center text-[clamp(23px,4dvh,34px)] font-black uppercase leading-none text-[#06184a]">
        {title}
      </div>
    </button>
  );
}

function FlowTextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  required = false,
  isLastField = false,
  completesRequiredFields = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  isLastField?: boolean;
  completesRequiredFields?: boolean;
}) {
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (type !== "tel") {
      onChange(event.target.value);
      return;
    }

    handlePhoneInputChange(event, onChange);
  };

  return (
    <label className="block">
      <span className="mb-[clamp(8px,1.6dvh,18px)] block text-[clamp(18px,3dvh,28px)] font-bold leading-[1.05] text-[#061033]">
        <KioskLabelText label={label} />
        {required ? " *" : ""}
      </span>
      <span className="relative block">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-[clamp(22px,3vw,32px)] top-1/2 h-[clamp(24px,4dvh,32px)] w-[clamp(24px,4dvh,32px)] -translate-y-1/2 text-[#061033]" />
        ) : null}
        <input
          data-kiosk-last-field={isLastField ? "true" : undefined}
          value={value}
          onChange={handleInputChange}
          onKeyDown={type === "tel" ? (event) => handlePhoneInputKeyDown(event, onChange) : undefined}
          type={type}
          inputMode={type === "tel" ? "numeric" : undefined}
          enterKeyHint={isLastField || completesRequiredFields ? "done" : "next"}
          autoComplete={type === "tel" ? "tel" : undefined}
          maxLength={type === "tel" ? 14 : undefined}
          required={required}
          placeholder={placeholder}
          className={`h-[clamp(56px,9dvh,90px)] w-full scroll-mb-[clamp(120px,24dvh,220px)] rounded-[8px] border border-[#c8cfdb] bg-white pr-[clamp(18px,3vw,32px)] text-[clamp(16px,2.35dvh,18px)] font-medium text-[#061033] outline-none [color-scheme:light] placeholder:text-[#9299aa] focus:border-[#83b9f8] focus:ring-4 focus:ring-[#dbeafe] ${
            Icon ? "pl-[clamp(64px,8vw,96px)]" : "pl-[clamp(20px,3vw,28px)]"
          }`}
          style={{ colorScheme: "light" }}
        />
      </span>
    </label>
  );
}

function FlowSelectField({
  label,
  value,
  onChange,
  placeholder,
  options,
  required = false,
  keepLabelOnOneLine = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  required?: boolean;
  keepLabelOnOneLine?: boolean;
}) {
  return (
    <label className="block">
      <span
        className={`mb-[clamp(8px,1.6dvh,18px)] block font-bold leading-[1.05] text-[#061033] ${
          keepLabelOnOneLine
            ? "whitespace-nowrap text-[clamp(16px,2.6dvh,24px)]"
            : "text-[clamp(18px,3dvh,28px)]"
        }`}
      >
        <KioskLabelText label={label} keepTogether={keepLabelOnOneLine} />
        {required ? " *" : ""}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          className="h-[clamp(56px,9dvh,90px)] w-full scroll-mb-[clamp(120px,24dvh,220px)] appearance-none rounded-[8px] border border-[#c8cfdb] bg-white pl-[clamp(20px,3vw,28px)] pr-[clamp(58px,7vw,78px)] text-[clamp(20px,3.4dvh,28px)] font-medium text-[#061033] outline-none [color-scheme:light] focus:border-[#83b9f8] focus:ring-4 focus:ring-[#dbeafe]"
          style={{ colorScheme: "light" }}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-[clamp(20px,3vw,32px)] top-1/2 h-[clamp(24px,4dvh,32px)] w-[clamp(24px,4dvh,32px)] -translate-y-1/2 text-[#061033]" />
      </span>
    </label>
  );
}

function Notice({
  message,
  onDone,
}: {
  message: string;
  onDone: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-6">
      <div className="w-full max-w-md rounded-[20px] bg-white px-8 py-8 text-center shadow-[0_32px_90px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef6ff] text-[#1d4f91]">
          <CheckCircle2 className="h-11 w-11" />
        </div>
        <h2 className="text-3xl font-bold text-[#111111]">{message}</h2>
        <button
          type="button"
          onClick={onDone}
          className={`mt-7 h-12 min-w-36 rounded-[8px] bg-[#111111] px-6 text-base font-bold text-white shadow-lg ${KIOSK_BUTTON_TOUCH_CLASS}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function KioskDatePickerModal({
  value,
  month,
  timeValue,
  onMonthChange,
  onSelect,
  onTimeSelect,
  onClose,
}: {
  value: string;
  month: Date;
  timeValue?: string;
  onMonthChange: (month: Date) => void;
  onSelect: (value: string) => void;
  onTimeSelect?: (value: string) => void;
  onClose: () => void;
}) {
  const showTimePicker = Boolean(onTimeSelect);
  const todayIso = getTodayIsoDate();
  const selectedIso = value || "";
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(month);
  const firstDayOfMonth = getCalendarMonthStart(month);
  const firstVisibleDate = new Date(firstDayOfMonth);
  firstVisibleDate.setDate(firstVisibleDate.getDate() - firstDayOfMonth.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDate);
    date.setDate(firstVisibleDate.getDate() + index);
    const isoDate = toIsoLocalDate(date);
    return {
      date,
      isoDate,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isDisabled: isoDate < todayIso,
      isSelected: isoDate === selectedIso,
      isToday: isoDate === todayIso,
    };
  });

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`w-full rounded-[18px] bg-white p-[clamp(18px,3dvh,28px)] text-[#061033] shadow-[0_32px_90px_rgba(0,0,0,0.36)] ${
        showTimePicker ? "max-w-[860px]" : "max-w-[540px]"
      }`}>
        <div className={`grid gap-[clamp(18px,2.6vw,28px)] ${showTimePicker ? "grid-cols-[minmax(0,540px)_minmax(210px,260px)]" : "grid-cols-1"}`}>
          <div className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => onMonthChange(addCalendarMonths(month, -1))}
                className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#d0d7e5] bg-white text-[#061033] shadow-sm ${KIOSK_BUTTON_TOUCH_CLASS}`}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <div className="min-w-0 flex-1 text-center text-[clamp(24px,3.6dvh,34px)] font-black leading-none text-[#06184a]">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => onMonthChange(addCalendarMonths(month, 1))}
                className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#d0d7e5] bg-white text-[#061033] shadow-sm ${KIOSK_BUTTON_TOUCH_CLASS}`}
                aria-label="Next month"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-sm font-black uppercase text-[#5b6472]">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {days.map((day) => (
                <button
                  key={day.isoDate}
                  type="button"
                  disabled={day.isDisabled}
                  onClick={() => onSelect(day.isoDate)}
                  className={`flex aspect-square min-h-[48px] items-center justify-center rounded-[10px] border text-[clamp(17px,2.4dvh,22px)] font-black ${KIOSK_BUTTON_TOUCH_CLASS} ${
                    day.isSelected
                      ? "border-[#1f6fcf] bg-[#1f6fcf] text-white shadow-[0_10px_22px_rgba(31,111,207,0.25)]"
                    : day.isDisabled
                        ? "cursor-not-allowed border-[#edf0f5] bg-[#f8fafc] text-[#c1c7d2]"
                        : day.isToday
                          ? "border-[#0bae2d] bg-[#f3fff4] text-[#0bae2d]"
                        : day.isCurrentMonth
                            ? "border-[#d0d7e5] bg-white text-[#061033]"
                            : "border-[#edf0f5] bg-[#fbfcff] text-[#a7afbd]"
                  }`}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
          </div>

          {showTimePicker ? (
            <div className="flex min-h-0 flex-col border-l border-[#d8deea] pl-[clamp(18px,2.4vw,24px)]">
              <div className="mb-4 flex items-center justify-center gap-2 text-center text-[clamp(22px,3.2dvh,30px)] font-black leading-none text-[#06184a]">
                <Clock className="h-[clamp(24px,3.4dvh,32px)] w-[clamp(24px,3.4dvh,32px)] shrink-0 text-black" />
                Time
              </div>
              <div data-kiosk-scrollable="true" className="grid max-h-[430px] grid-cols-1 gap-2 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
                {TOUR_TIME_OPTIONS.map((option) => {
                  const selected = option === timeValue;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onTimeSelect?.(option)}
                      className={`flex h-[clamp(46px,6.8dvh,58px)] items-center justify-center rounded-[10px] border text-[clamp(16px,2.35dvh,20px)] font-black ${KIOSK_BUTTON_TOUCH_CLASS} ${
                        selected
                          ? "border-[#1f6fcf] bg-[#1f6fcf] text-white shadow-[0_10px_22px_rgba(31,111,207,0.22)]"
                          : "border-[#d0d7e5] bg-white text-[#061033]"
                      }`}
                    >
                      {formatKioskTime(option)}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`h-12 rounded-[8px] border border-slate-300 px-6 text-base font-bold text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function KioskTimePickerModal({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-[560px] rounded-[18px] bg-white p-[clamp(18px,3dvh,28px)] text-[#061033] shadow-[0_32px_90px_rgba(0,0,0,0.36)]">
        <div className="mb-5 flex items-center justify-center gap-3 text-center text-[clamp(25px,3.6dvh,34px)] font-black leading-none text-[#06184a]">
          <Clock className="h-[clamp(27px,3.8dvh,36px)] w-[clamp(27px,3.8dvh,36px)] shrink-0 text-black" />
          Select a time
        </div>
        <div
          data-kiosk-scrollable="true"
          className="grid max-h-[min(62dvh,520px)] grid-cols-2 gap-3 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]"
        >
          {TOUR_TIME_OPTIONS.map((option) => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onSelect(option)}
                className={`flex h-[clamp(52px,7.2dvh,64px)] items-center justify-center rounded-[10px] border text-[clamp(17px,2.5dvh,22px)] font-black ${KIOSK_BUTTON_TOUCH_CLASS} ${
                  selected
                    ? "border-[#1f6fcf] bg-[#1f6fcf] text-white shadow-[0_10px_22px_rgba(31,111,207,0.22)]"
                    : "border-[#d0d7e5] bg-white text-[#061033]"
                }`}
              >
                {formatKioskTime(option)}
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`h-12 rounded-[8px] border border-slate-300 px-6 text-base font-bold text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function KioskScreen({
  pageId,
  pageTitle,
  businessName,
  pageUrl,
  logoUrl,
  profileOptions = [],
  variant = "connectFirst",
  kioskText,
  feedbackReviewUrl = null,
}: KioskScreenProps) {
  const defaultKioskStep: KioskFlowStep = variant === "checkInFirst" ? "welcome" : "home";
  const isCheckInFirst = variant === "checkInFirst";
  const hasHeaderIntakeButton = variant === "intakeForm";
  const showHeaderIntakeButton = hasHeaderIntakeButton && !kioskText?.hideIntakeFormButton;
  const showCheckInFirstIntakeButton = isCheckInFirst && !kioskText?.hideIntakeFormButton;
  const hasLegacyHeaderIntakeButton = variant === "legacyIntakeForm";
  const showLegacyIntakeButton =
    hasLegacyHeaderIntakeButton && !kioskText?.hideIntakeFormButton;
  const showLegacyCheckInOutButton =
    hasLegacyHeaderIntakeButton && !kioskText?.hideCheckInOutButton;
  const showReviewButton = !kioskText?.hideReviewButton;
  const actionHeaderButtonCount = Number(showHeaderIntakeButton) + Number(showReviewButton);
  const legacyHeaderActionCount =
    Number(showLegacyIntakeButton) + Number(showLegacyCheckInOutButton) + Number(showReviewButton);
  const hasLegacyHeaderButtons = legacyHeaderActionCount > 0;
  const showRoleSelectionHistoryButton =
    variant === "connectFirst" || hasHeaderIntakeButton || hasLegacyHeaderIntakeButton;
  const hasActionHubHome = variant === "connectFirst" || hasHeaderIntakeButton;
  const hasTallHeader = variant !== "checkInFirst";
  const kioskRouteName =
    variant === "checkInFirst"
      ? "kiosk2"
      : variant === "intakeForm"
        ? "kiosk3"
        : variant === "legacyIntakeForm"
          ? "kiosk4"
          : "kiosk";
  const displayPageName = kioskText?.displayPageName?.trim() || businessName;
  const welcomeTitle = kioskText?.welcomeTitle?.trim() || "Welcome!";
  const welcomeSubtitle =
    kioskText?.welcomeSubtitle?.trim() ||
    (isCheckInFirst ? "Please choose an option." : "Please select an option.");
  const scanTitle = kioskText?.scanTitle?.trim() || "Scan For:";
  const scanDescription = kioskText?.scanDescription?.trim() || "Virtual Tour and Information";
  const scanItems =
    kioskText?.scanItems && kioskText.scanItems.length > 0
      ? kioskText.scanItems
      : ["Virtual Tour", "Pricing", "Information"];
  const headerTitleSizing = getKioskHeaderTitleSizing(
    hasHeaderIntakeButton || hasLegacyHeaderIntakeButton,
    hasTallHeader,
    hasLegacyHeaderButtons,
  );
  const [actionHeaderTitleSize, setActionHeaderTitleSize] = useState(28);
  const [legacyHeaderTitleSize, setLegacyHeaderTitleSize] = useState(headerTitleSizing.maxFontSize);
  const [checkInFirstHeaderTitleSize, setCheckInFirstHeaderTitleSize] = useState(14);
  const handleActionHeaderTitleSizeChange = useCallback((nextFontSize: number) => {
    setActionHeaderTitleSize((currentFontSize) =>
      Math.abs(currentFontSize - nextFontSize) > HEADER_LOGO_SIZE_UPDATE_THRESHOLD
        ? nextFontSize
        : currentFontSize,
    );
  }, []);
  const handleLegacyHeaderTitleSizeChange = useCallback((nextFontSize: number) => {
    setLegacyHeaderTitleSize((currentFontSize) =>
      Math.abs(currentFontSize - nextFontSize) > HEADER_LOGO_SIZE_UPDATE_THRESHOLD
        ? nextFontSize
        : currentFontSize,
    );
  }, []);
  const handleCheckInFirstHeaderTitleSizeChange = useCallback((nextFontSize: number) => {
    setCheckInFirstHeaderTitleSize((currentFontSize) =>
      Math.abs(currentFontSize - nextFontSize) > HEADER_LOGO_SIZE_UPDATE_THRESHOLD
        ? nextFontSize
        : currentFontSize,
    );
  }, []);
  const fallbackProfile = useMemo<KioskProfileOption>(
    () => ({
      id: pageId,
      title: pageTitle,
      slug: "",
      label: pageTitle,
      pageUrl,
    }),
    [pageId, pageTitle, pageUrl],
  );
  const selectableProfiles = useMemo(
    () => (profileOptions.length >= 2 ? profileOptions : []),
    [profileOptions],
  );
  const hasProfileSelector = selectableProfiles.length >= 2;
  const [leadForm, setLeadForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [infoForm, setInfoForm] = useState<InfoFormState>(EMPTY_INFO_FORM);
  const [residentCheckForm, setResidentCheckForm] = useState<CheckFormState>(EMPTY_CHECK_FORM);
  const [checkedOutResidents, setCheckedOutResidents] = useState<CheckedOutResidentSuggestion[]>([]);
  const autoFilledResidentKeyRef = useRef<string | null>(null);
  const [familyCheckForm, setFamilyCheckForm] = useState<FamilyCheckFormState>(EMPTY_FAMILY_CHECK_FORM);
  const [vendorCheckForm, setVendorCheckForm] = useState<VendorCheckFormState>(EMPTY_VENDOR_CHECK_FORM);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(EMPTY_CHECKOUT_FORM);
  const [checkoutType, setCheckoutType] = useState<CheckoutType | null>(null);
  const [kioskStep, setKioskStep] = useState<KioskFlowStep>(defaultKioskStep);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackFormUrl, setFeedbackFormUrl] = useState<string | null>(null);
  const feedbackTransitionRef = useRef<number | null>(null);
  const feedbackRequestRef = useRef<AbortController | null>(null);
  const [checkAction, setCheckAction] = useState<CheckInAction>("check_in");
  const [infoOpen, setInfoOpen] = useState(false);
  const [overviewPromptOpen, setOverviewPromptOpen] = useState(false);
  const [overviewPassword, setOverviewPassword] = useState("");
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const openKioskHistory = useCallback(() => {
    setOverviewPromptOpen(true);
    setOverviewPassword("");
    setOverviewError(null);
  }, []);
  const openFeedbackPrompt = useCallback(() => {
    feedbackRequestRef.current?.abort();
    feedbackRequestRef.current = null;
    setFeedbackRating(null);
    setFeedbackFormUrl(null);
    setKioskStep("feedbackPrompt");
  }, []);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [tourCalendarOpen, setTourCalendarOpen] = useState(false);
  const [tourTimePickerOpen, setTourTimePickerOpen] = useState(false);
  const [tourCalendarMonth, setTourCalendarMonth] = useState(() =>
    getCalendarMonthStart(new Date()),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState(
    selectableProfiles.find((profile) => profile.id === pageId)?.id || selectableProfiles[0]?.id || pageId,
  );
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const kioskRootRef = useRef<HTMLElement>(null);

  const hasStartedLeadCapture = useMemo(
    () => Object.values(leadForm).some((value) => value.trim().length > 0),
    [leadForm],
  );
  const isCheckFlowActive =
    kioskStep === "leadForm" ||
    kioskStep === "visitorType" ||
    kioskStep === "residentForm" ||
    kioskStep === "familyForm" ||
    kioskStep === "vendorForm" ||
    kioskStep === "checkoutType" ||
    kioskStep === "checkoutForm";
  const isTemporaryCheckFlowHome = !isCheckInFirst && kioskStep === "welcome";
  const selectedProfile = useMemo(
    () => selectableProfiles.find((profile) => profile.id === selectedProfileId) || fallbackProfile,
    [fallbackProfile, selectableProfiles, selectedProfileId],
  );
  const uniquelyMatchedCheckedOutResident = useMemo(() => {
    if (checkAction !== "check_in") {
      return null;
    }

    const typedFirstName = normalizeResidentSuggestionValue(residentCheckForm.firstName);
    const typedLastName = normalizeResidentSuggestionValue(residentCheckForm.lastName);

    if (
      Math.max(typedFirstName.length, typedLastName.length) <
      RESIDENT_AUTOFILL_MIN_CHARACTERS
    ) {
      return null;
    }

    const matches = checkedOutResidents.filter((resident) => {
      const firstName = normalizeResidentSuggestionValue(resident.firstName);
      const lastName = normalizeResidentSuggestionValue(resident.lastName);

      return (
        (!typedFirstName || firstName.startsWith(typedFirstName)) &&
        (!typedLastName || lastName.startsWith(typedLastName))
      );
    });

    return matches.length === 1 ? matches[0] : null;
  }, [
    checkAction,
    checkedOutResidents,
    residentCheckForm.firstName,
    residentCheckForm.lastName,
  ]);
  const leadPageId = selectedProfile.id;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(selectedProfile.pageUrl)}`;
  const nurseAssessmentUrl = `${pageUrl.replace(/\/$/, "")}/nurse-assessment`;
  const nurseAssessmentQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(nurseAssessmentUrl)}`;
  const feedbackReviewQrUrl = feedbackReviewUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&qzone=4&data=${encodeURIComponent(feedbackReviewUrl)}`
    : null;
  const feedbackFormQrUrl = feedbackFormUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&ecc=H&qzone=4&data=${encodeURIComponent(feedbackFormUrl)}`
    : null;
  const timezone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Denver";

  const beginKioskSubmission = useCallback(() => {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    return true;
  }, []);

  const endKioskSubmission = useCallback(() => {
    submittingRef.current = false;
    setSubmitting(false);
  }, []);

  const resetKioskFlow = useCallback(() => {
    feedbackRequestRef.current?.abort();
    feedbackRequestRef.current = null;
    if (feedbackTransitionRef.current !== null) {
      window.clearTimeout(feedbackTransitionRef.current);
      feedbackTransitionRef.current = null;
    }
    setKioskStep(defaultKioskStep);
    setFeedbackRating(null);
    setFeedbackFormUrl(null);
    setCheckAction("check_in");
    setInfoOpen(false);
    setOverviewPromptOpen(false);
    setOverviewPassword("");
    setOverviewError(null);
    setOverviewLoading(false);
    setTourCalendarOpen(false);
    setTourTimePickerOpen(false);
    setNotice(null);
    setLeadForm(EMPTY_LEAD_FORM);
    setInfoForm(EMPTY_INFO_FORM);
    setResidentCheckForm(EMPTY_CHECK_FORM);
    autoFilledResidentKeyRef.current = null;
    setFamilyCheckForm(EMPTY_FAMILY_CHECK_FORM);
    setVendorCheckForm(EMPTY_VENDOR_CHECK_FORM);
    setCheckoutForm(EMPTY_CHECKOUT_FORM);
    setCheckoutType(null);
    setError(null);
    submittingRef.current = false;
    setSubmitting(false);
  }, [defaultKioskStep, setError]);

  const handleFeedbackRating = useCallback(async (rating: number, source: "lead" | "visitor" | "header") => {
    if (feedbackRating !== null) return;

    setFeedbackRating(rating);
    setFeedbackFormUrl(null);
    const controller = new AbortController();
    feedbackRequestRef.current?.abort();
    feedbackRequestRef.current = controller;
    const request = fetch("/api/kiosk/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: source === "lead" ? leadPageId : pageId,
        rating,
        source,
        action: source === "visitor" ? checkAction : source === "header" ? "review" : "connect",
      }),
      keepalive: true,
      signal: controller.signal,
    });

    const transitionTo = (step: KioskFlowStep) => {
      feedbackTransitionRef.current = window.setTimeout(() => {
        feedbackTransitionRef.current = null;
        setKioskStep(step);
      }, 350);
    };

    if (rating === 5) {
      void request.catch((feedbackError) => {
        if (!controller.signal.aborted) {
          console.error("Unable to submit kiosk feedback:", feedbackError);
        }
      });
      transitionTo(feedbackReviewUrl ? "feedbackReview" : "feedbackThanks");
      return;
    }

    try {
      const response = await request;
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.feedbackUrl !== "string") {
        throw new Error(result?.error || "Unable to prepare the feedback form.");
      }

      if (controller.signal.aborted) return;
      setFeedbackFormUrl(result.feedbackUrl);
      transitionTo("feedbackFormQr");
    } catch (feedbackError) {
      if (controller.signal.aborted) return;
      console.error("Unable to submit kiosk feedback:", feedbackError);
      transitionTo("feedbackThanks");
    } finally {
      if (feedbackRequestRef.current === controller) {
        feedbackRequestRef.current = null;
      }
    }
  }, [checkAction, feedbackRating, feedbackReviewUrl, leadPageId, pageId]);

  useEffect(() => {
    resetKioskFlow();
  }, [pageId, resetKioskFlow]);

  useEffect(() => {
    const root = kioskRootRef.current;
    const viewport = window.visualViewport;
    if (!root || !viewport) {
      return;
    }

    let animationFrame = 0;
    const updateVisibleViewport = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        root.style.setProperty("--kiosk-viewport-height", `${Math.round(viewport.height)}px`);
        root.style.setProperty(
          "--kiosk-viewport-top",
          `${Math.max(0, Math.round(viewport.offsetTop))}px`,
        );
      });
    };

    updateVisibleViewport();
    viewport.addEventListener("resize", updateVisibleViewport);
    viewport.addEventListener("scroll", updateVisibleViewport);
    window.addEventListener("orientationchange", updateVisibleViewport);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      viewport.removeEventListener("resize", updateVisibleViewport);
      viewport.removeEventListener("scroll", updateVisibleViewport);
      window.removeEventListener("orientationchange", updateVisibleViewport);
      root.style.removeProperty("--kiosk-viewport-height");
      root.style.removeProperty("--kiosk-viewport-top");
    };
  }, []);

  useEffect(() => {
    if (kioskStep !== "residentForm" || checkAction !== "check_in") {
      return;
    }

    let cancelled = false;
    setCheckedOutResidents([]);

    async function loadCheckedOutResidents() {
      try {
        const response = await fetch(`/api/kiosk/checkins?pageId=${encodeURIComponent(pageId)}`);
        const payload = (await response.json().catch(() => null)) as {
          residents?: CheckedOutResidentSuggestion[];
        } | null;

        if (!cancelled && response.ok) {
          setCheckedOutResidents(
            (payload?.residents || []).filter((resident) =>
              Boolean(resident.firstName && resident.lastName && resident.fullName),
            ),
          );
        }
      } catch (lookupError) {
        console.error("Kiosk checked-out resident suggestion lookup failed:", lookupError);
      }
    }

    void loadCheckedOutResidents();

    return () => {
      cancelled = true;
    };
  }, [checkAction, kioskStep, pageId]);

  useEffect(() => {
    if (!uniquelyMatchedCheckedOutResident) {
      return;
    }

    const residentKey = normalizeResidentSuggestionValue(uniquelyMatchedCheckedOutResident.fullName);
    if (!residentKey || autoFilledResidentKeyRef.current === residentKey) {
      return;
    }

    const currentFirstName = normalizeResidentSuggestionValue(residentCheckForm.firstName);
    const currentLastName = normalizeResidentSuggestionValue(residentCheckForm.lastName);
    const matchedFirstName = normalizeResidentSuggestionValue(uniquelyMatchedCheckedOutResident.firstName);
    const matchedLastName = normalizeResidentSuggestionValue(uniquelyMatchedCheckedOutResident.lastName);

    autoFilledResidentKeyRef.current = residentKey;
    if (currentFirstName === matchedFirstName && currentLastName === matchedLastName) {
      return;
    }

    setResidentCheckForm({
      firstName: uniquelyMatchedCheckedOutResident.firstName,
      lastName: uniquelyMatchedCheckedOutResident.lastName,
    });
  }, [
    residentCheckForm.firstName,
    residentCheckForm.lastName,
    uniquelyMatchedCheckedOutResident,
  ]);

  useEffect(() => {
    setSelectedProfileId(
      selectableProfiles.find((profile) => profile.id === pageId)?.id ||
        selectableProfiles[0]?.id ||
        pageId,
    );
  }, [pageId, selectableProfiles]);

  useEffect(() => {
    const { body, documentElement } = document;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyBackgroundColor: body.style.backgroundColor,
      bodyWebkitUserSelect: body.style.webkitUserSelect,
      bodyUserSelect: body.style.userSelect,
      htmlOverflow: documentElement.style.overflow,
      htmlHeight: documentElement.style.height,
      htmlBackgroundColor: documentElement.style.backgroundColor,
      htmlOverscrollBehavior: documentElement.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overscrollBehavior = "none";
    body.style.backgroundColor = "#050505";
    body.style.webkitUserSelect = "none";
    body.style.userSelect = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.height = "100%";
    documentElement.style.backgroundColor = "#050505";
    documentElement.style.overscrollBehavior = "none";

    const preventPagePan = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        return;
      }

      const isKioskInteraction = event.composedPath().some((target) => {
        if (!(target instanceof HTMLElement)) {
          return false;
        }

        return (
          target.dataset.kioskScrollable === "true" ||
          target.matches("button, input, textarea, select, a, [role='button']")
        );
      });

      if (isKioskInteraction) {
        return;
      }

      event.preventDefault();
    };

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("touchmove", preventPagePan, { passive: false });
    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.width = previous.bodyWidth;
      body.style.height = previous.bodyHeight;
      body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
      body.style.backgroundColor = previous.bodyBackgroundColor;
      body.style.webkitUserSelect = previous.bodyWebkitUserSelect;
      body.style.userSelect = previous.bodyUserSelect;
      documentElement.style.overflow = previous.htmlOverflow;
      documentElement.style.height = previous.htmlHeight;
      documentElement.style.backgroundColor = previous.htmlBackgroundColor;
      documentElement.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      document.removeEventListener("touchmove", preventPagePan);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, []);

  useEffect(() => {
    if (
      kioskStep !== "leadThankYou" &&
      kioskStep !== "thankYou" &&
      kioskStep !== "feedbackPrompt" &&
      kioskStep !== "feedbackThanks" &&
      kioskStep !== "feedbackReview" &&
      kioskStep !== "feedbackFormQr" &&
      kioskStep !== "nurseAssessmentQr"
    ) {
      return;
    }

    const timeoutDuration =
      kioskStep === "feedbackThanks"
        ? 5000
        : kioskStep === "feedbackReview" || kioskStep === "feedbackFormQr"
          ? 22000
          : kioskStep === "feedbackPrompt"
            ? 20000
            : kioskStep === "nurseAssessmentQr"
              ? 20000
              : kioskStep === "thankYou"
                ? 4000
                : 12000;
    const timeout = window.setTimeout(resetKioskFlow, timeoutDuration);
    return () => window.clearTimeout(timeout);
  }, [kioskStep, resetKioskFlow]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeout = window.setTimeout(resetKioskFlow, 5000);
    return () => window.clearTimeout(timeout);
  }, [notice, resetKioskFlow]);

  useEffect(() => {
    const popupOpen =
      infoOpen || overviewPromptOpen || tourCalendarOpen || tourTimePickerOpen;
    if (!popupOpen || submitting || overviewLoading) {
      return;
    }

    let timeout: number | undefined;
    const restartPopupTimer = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(resetKioskFlow, 20000);
    };

    restartPopupTimer();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, restartPopupTimer, { passive: true }));
    document.addEventListener("input", restartPopupTimer);

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      events.forEach((eventName) => window.removeEventListener(eventName, restartPopupTimer));
      document.removeEventListener("input", restartPopupTimer);
    };
  }, [
    infoOpen,
    overviewLoading,
    overviewPromptOpen,
    resetKioskFlow,
    submitting,
    tourCalendarOpen,
    tourTimePickerOpen,
  ]);

  useEffect(() => {
    const shouldResetActiveForm =
      !submitting &&
      !overviewLoading &&
      !notice &&
      kioskStep !== "thankYou" &&
      kioskStep !== "nurseAssessmentQr" &&
      (hasStartedLeadCapture || isCheckFlowActive || isTemporaryCheckFlowHome);

    if (!shouldResetActiveForm) {
      return;
    }

    let timeout: number | undefined;
    const restartActiveFormTimer = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(resetKioskFlow, 20000);
    };

    restartActiveFormTimer();

    const windowEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "touchmove",
      "wheel",
      "scroll",
    ];
    const documentEvents = ["input", "change", "focusin"];

    windowEvents.forEach((eventName) =>
      window.addEventListener(eventName, restartActiveFormTimer, { passive: true }),
    );
    documentEvents.forEach((eventName) =>
      document.addEventListener(eventName, restartActiveFormTimer),
    );

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      windowEvents.forEach((eventName) =>
        window.removeEventListener(eventName, restartActiveFormTimer),
      );
      documentEvents.forEach((eventName) =>
        document.removeEventListener(eventName, restartActiveFormTimer),
      );
    };
  }, [
    hasStartedLeadCapture,
    isCheckFlowActive,
    isTemporaryCheckFlowHome,
    kioskStep,
    notice,
    overviewLoading,
    resetKioskFlow,
    submitting,
  ]);

  useEffect(() => {
    const isShowingDefaultScreen =
      kioskStep === defaultKioskStep && !infoOpen && !overviewPromptOpen && !notice;

    if (isShowingDefaultScreen) {
      return;
    }

    let timeout: number | undefined;
    const restartTimer = () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(resetKioskFlow, 5 * 60 * 1000);
    };

    restartTimer();
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, restartTimer, { passive: true }));
    document.addEventListener("input", restartTimer);

    return () => {
      if (timeout) {
        window.clearTimeout(timeout);
      }
      events.forEach((eventName) => window.removeEventListener(eventName, restartTimer));
      document.removeEventListener("input", restartTimer);
    };
  }, [defaultKioskStep, infoOpen, kioskStep, notice, overviewPromptOpen, resetKioskFlow]);

  const handleOverviewSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (overviewLoading) {
        return;
      }

      const password = overviewPassword.trim();
      if (!password) {
        setOverviewError("Enter the kiosk overview password.");
        return;
      }

      setOverviewLoading(true);
      setOverviewError(null);

      try {
        const response = await fetch("/api/kiosk/overview-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            pageId,
            password,
            returnTo: kioskRouteName,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setOverviewError(payload?.error || "Unable to open kiosk overview.");
          return;
        }

        window.location.href = payload?.url || `/protected/kiosk-visitors?range=1d&pageId=${pageId}`;
      } catch {
        setOverviewError("Unable to open kiosk overview. Please try again.");
      } finally {
        setOverviewLoading(false);
      }
    },
    [kioskRouteName, overviewLoading, overviewPassword, pageId],
  );

  const setLeadValue = (field: keyof LeadFormState, value: string) => {
    setError(null);
    setLeadForm((current) => ({ ...current, [field]: value }));
  };

  const setInfoValue = (field: keyof InfoFormState, value: string) => {
    setError(null);
    setInfoForm((current) => ({ ...current, [field]: value }));
  };

  const openTourCalendar = () => {
    const startingDate = leadForm.tourDate ? parseIsoLocalDate(leadForm.tourDate) : new Date();
    setTourCalendarMonth(getCalendarMonthStart(startingDate));
    setTourCalendarOpen(true);
  };

  const openTourTimePicker = () => {
    setTourTimePickerOpen(true);
  };

  const selectTourDate = (value: string) => {
    setLeadValue("tourDate", value);
    if (!hasLegacyHeaderIntakeButton) {
      setTourCalendarOpen(false);
    }
  };

  const selectTourTime = (value: string) => {
    setLeadValue("tourTime", value);
    setTourCalendarOpen(false);
    setTourTimePickerOpen(false);
  };

  const validateLeadIdentity = (form: LeadFormState | InfoFormState) => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return "First name and last name are required.";
    }

    if (!form.phone.trim() || !isValidUsPhone(form.phone)) {
      return "Invalid phone number.";
    }

    if (form.email.trim() && !isValidEmail(form.email)) {
      return "Enter a valid email address.";
    }

    return null;
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const submittedForm = event.currentTarget;

    const identityError = validateLeadIdentity(leadForm);
    if (identityError) {
      setError(identityError);
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const hasVisitDate = Boolean(leadForm.tourDate);
      const requestedAtIso = buildTourRequestedAtIso(leadForm.tourDate, leadForm.tourTime);
      const visitDateNote = hasVisitDate
        ? `Preferred visit: ${formatKioskDate(leadForm.tourDate)}${
            leadForm.tourTime ? ` at ${formatKioskTime(leadForm.tourTime)}` : ""
          }`
        : "";
      const response = await fetch("/api/kiosk/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: leadPageId,
          requestType: hasVisitDate ? "schedule_tour" : "connect",
          firstName: leadForm.firstName,
          lastName: leadForm.lastName,
          phone: leadForm.phone,
          email: "",
          comments: visitDateNote,
          requestedAtIso,
          timezone,
          ...getAnalyticsIdentity(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit request.");
      }

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && submittedForm.contains(activeElement)) {
        activeElement.blur();
      }
      submittedForm.reset();
      setLeadForm({ ...EMPTY_LEAD_FORM });
      setTourCalendarOpen(false);
      setTourTimePickerOpen(false);
      setKioskStep("leadThankYou");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit request.");
    } finally {
      endKioskSubmission();
    }
  };

  const handleInfoSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const identityError = validateLeadIdentity(infoForm);
    if (identityError) {
      setError(identityError);
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const response = await fetch("/api/kiosk/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: leadPageId,
          requestType: "info_packet",
          firstName: infoForm.firstName,
          lastName: infoForm.lastName,
          phone: infoForm.phone,
          email: infoForm.email,
          comments: infoForm.request,
          timezone,
          ...getAnalyticsIdentity(),
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit request.");
      }

      setInfoForm(EMPTY_INFO_FORM);
      setInfoOpen(false);
      setNotice("Thank you! Your digital information packet has been sent to your phone.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit request.");
    } finally {
      endKioskSubmission();
    }
  };

  const submitCheckActivity = async (payload: {
    firstName: string;
    lastName: string;
    visitorType?: VisitorType;
    visitorTypeOther?: string | null;
    phone?: string | null;
    companyName?: string | null;
    visiting?: string | null;
    purpose?: string | null;
    responsibleParty?: string | null;
    checkoutDuration?: string | null;
    checkoutType?: string | null;
    checkingOut?: string | null;
    checkedOutFirstName?: string | null;
    checkedOutLastName?: string | null;
    checkedOutFullName?: string | null;
    metadata?: Record<string, string | null>;
    action?: RequestedCheckInAction;
  }): Promise<{ action: CheckInAction }> => {
    const requestedAction = payload.action || checkAction;
    const response = await fetch("/api/kiosk/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId,
        action: requestedAction,
        ...payload,
      }),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error("Failed to save kiosk activity.");
    }

    let result: { action?: unknown } = {};
    try {
      result = (await response.json()) as { action?: unknown };
    } catch {
      result = {};
    }

    if (result.action === "check_in" || result.action === "check_out") {
      return { action: result.action };
    }

    return {
      action: requestedAction === "check_out" ? "check_out" : "check_in",
    };
  };

  const handleResidentCheckSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!residentCheckForm.firstName.trim() || !residentCheckForm.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const result = await submitCheckActivity({
        firstName: residentCheckForm.firstName,
        lastName: residentCheckForm.lastName,
        visitorType: "Resident",
        action: checkAction,
        metadata: {
          kioskRole: "Resident",
          requestedAction: checkAction,
        },
      });
      setCheckAction(result.action);
      setResidentCheckForm(EMPTY_CHECK_FORM);
      setKioskStep("thankYou");
    } catch (submitError) {
      console.error("Kiosk resident activity save failed:", submitError);
      setResidentCheckForm(EMPTY_CHECK_FORM);
      setKioskStep("thankYou");
    } finally {
      endKioskSubmission();
    }
  };

  const handleFamilyCheckSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!familyCheckForm.firstName.trim() || !familyCheckForm.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const visitingFirstName = familyCheckForm.visitingFirstName.trim();
      const visitingLastName = familyCheckForm.visitingLastName.trim();
      const visiting = [visitingFirstName, visitingLastName].filter(Boolean).join(" ");
      const result = await submitCheckActivity({
        firstName: familyCheckForm.firstName,
        lastName: familyCheckForm.lastName,
        visitorType: "Current Patient Visitor",
        visiting: visiting || null,
        metadata: {
          kioskRole: "Family / Guest",
          visiting: visiting || null,
          visitingFirstName: visitingFirstName || null,
          visitingLastName: visitingLastName || null,
        },
      });
      setCheckAction(result.action);
      setFamilyCheckForm(EMPTY_FAMILY_CHECK_FORM);
      setKioskStep("thankYou");
    } catch (submitError) {
      console.error("Kiosk family activity save failed:", submitError);
      setFamilyCheckForm(EMPTY_FAMILY_CHECK_FORM);
      setKioskStep("thankYou");
    } finally {
      endKioskSubmission();
    }
  };

  const handleVendorCheckSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!vendorCheckForm.companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!vendorCheckForm.firstName.trim() || !vendorCheckForm.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const result = await submitCheckActivity({
        firstName: vendorCheckForm.firstName,
        lastName: vendorCheckForm.lastName,
        visitorType: "Vendor",
        companyName: vendorCheckForm.companyName,
        visiting: vendorCheckForm.visiting || null,
        metadata: {
          kioskRole: "Vendor / Service",
          companyName: vendorCheckForm.companyName,
          visiting: vendorCheckForm.visiting || null,
        },
      });
      setCheckAction(result.action);
      setVendorCheckForm(EMPTY_VENDOR_CHECK_FORM);
      setKioskStep("thankYou");
    } catch (submitError) {
      console.error("Kiosk vendor activity save failed:", submitError);
      setVendorCheckForm(EMPTY_VENDOR_CHECK_FORM);
      setKioskStep("thankYou");
    } finally {
      endKioskSubmission();
    }
  };

  const openCheckoutForm = (type: CheckoutType) => {
    setError(null);
    setCheckAction("check_out");
    setCheckoutType(type);
    setCheckoutForm(EMPTY_CHECKOUT_FORM);
    setKioskStep("checkoutForm");
  };

  const handleCheckoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!checkoutType) {
      setKioskStep("checkoutType");
      return;
    }

    if (!checkoutForm.firstName.trim() || !checkoutForm.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    if (checkoutType === "resident" && !checkoutForm.checkoutDuration.trim()) {
      setError("Duration of time is required.");
      return;
    }

    if (checkoutType === "family") {
      const hasResidentFirstName = Boolean(checkoutForm.checkedOutFirstName.trim());
      const hasResidentLastName = Boolean(checkoutForm.checkedOutLastName.trim());

      if (hasResidentFirstName !== hasResidentLastName) {
        setError("Enter both the resident's first and last name, or leave both blank.");
        return;
      }

      if (checkoutForm.phone.trim() && !isValidUsPhone(checkoutForm.phone)) {
        setError("Enter a valid phone number.");
        return;
      }
    }

    if (checkoutType === "vendor" && !checkoutForm.companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!beginKioskSubmission()) {
      return;
    }

    try {
      const checkoutDuration = checkoutForm.checkoutDuration.trim();
      const phone = checkoutForm.phone.trim();
      const checkedOutFirstName = checkoutForm.checkedOutFirstName.trim();
      const checkedOutLastName = checkoutForm.checkedOutLastName.trim();
      const checkedOutFullName = [checkedOutFirstName, checkedOutLastName].filter(Boolean).join(" ");
      const checkoutTypeLabel =
        checkoutType === "resident" ? "Resident" : checkoutType === "family" ? "Guest / Family" : "Vendor";
      const baseMetadata = {
        kioskRole: `${checkoutTypeLabel} Checkout`,
        checkoutType: checkoutTypeLabel,
        requestedAction: "check_out",
      };
      const checkoutPayload =
        checkoutType === "resident"
          ? {
              visitorType: "Resident" as VisitorType,
              checkoutDuration,
              checkoutType: checkoutTypeLabel,
              metadata: {
                ...baseMetadata,
                checkoutDuration,
              },
            }
          : checkoutType === "family"
            ? {
                visitorType: "Current Patient Visitor" as VisitorType,
                phone: phone || null,
                responsibleParty: checkedOutFullName || null,
                checkoutDuration: checkoutDuration || null,
                checkoutType: checkoutTypeLabel,
                checkingOut: checkedOutFullName || null,
                checkedOutFirstName: checkedOutFirstName || null,
                checkedOutLastName: checkedOutLastName || null,
                checkedOutFullName: checkedOutFullName || null,
                visiting: checkedOutFullName || null,
                metadata: {
                  ...baseMetadata,
                  phone: phone || null,
                  checkingOut: checkedOutFullName || null,
                  checkedOutFirstName: checkedOutFirstName || null,
                  checkedOutLastName: checkedOutLastName || null,
                  checkedOutFullName: checkedOutFullName || null,
                  checkoutDuration: checkoutDuration || null,
                },
              }
              : {
                  visitorType: "Vendor" as VisitorType,
                  companyName: checkoutForm.companyName.trim(),
                  checkoutType: checkoutTypeLabel,
                  metadata: {
                    ...baseMetadata,
                    companyName: checkoutForm.companyName.trim(),
                },
              };
      const result = await submitCheckActivity({
        firstName: checkoutForm.firstName,
        lastName: checkoutForm.lastName,
        action: "check_out",
        ...checkoutPayload,
      });
      setCheckAction(result.action);
    } catch (submitError) {
      console.error("Kiosk checkout save failed:", submitError);
    } finally {
      setCheckoutForm(EMPTY_CHECKOUT_FORM);
      setCheckoutType(null);
      setKioskStep("thankYou");
      endKioskSubmission();
    }
  };

  return (
    <main
      ref={kioskRootRef}
      className="fixed left-0 right-0 min-h-0 w-screen touch-manipulation overflow-hidden bg-[#050505] text-[#0f172a] [-webkit-tap-highlight-color:transparent]"
      style={{
        bottom: "auto",
        colorScheme: "light",
        height: "var(--kiosk-viewport-height, 100dvh)",
        top: "var(--kiosk-viewport-top, 0px)",
      }}
    >
      <div className="isolate mx-auto flex h-full max-w-[1448px] flex-col overflow-hidden rounded-[24px] border-[10px] border-[#050505] bg-[#050505] shadow-[0_28px_84px_rgba(0,0,0,0.34)] [backface-visibility:hidden] [transform:translateZ(0)] 2xl:rounded-[30px] 2xl:border-[14px]">
        {hasActionHubHome ? (
          <>
            <header className="flex h-[clamp(88px,12.6dvh,122px)] shrink-0 items-center justify-between gap-[clamp(10px,1.5vw,22px)] border-b-[3px] border-black bg-black pl-[clamp(2px,0.45vw,8px)] pr-[clamp(14px,1.8vw,26px)]">
              <div className="flex min-w-0 flex-1 items-center gap-[clamp(5px,0.65vw,10px)]">
                <KioskHeaderLogo textSize={actionHeaderTitleSize} />
                <span className="h-[clamp(38px,6.2dvh,66px)] w-[3px] shrink-0 bg-white/85" />
                <KioskHeaderTitle
                  title={displayPageName}
                  minFontSize={8}
                  maxFontSize={28}
                  className="flex-1 font-bold text-white"
                  onFontSizeChange={handleActionHeaderTitleSizeChange}
                />
              </div>
              {actionHeaderButtonCount > 0 ? (
                <div
                  className={`grid min-w-0 shrink-0 gap-[clamp(7px,0.9vw,12px)] ${
                    actionHeaderButtonCount === 2
                      ? "w-[clamp(400px,39vw,560px)] grid-cols-2"
                      : "w-[clamp(210px,22vw,300px)] grid-cols-1"
                  }`}
                >
                  {showHeaderIntakeButton ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setKioskStep("nurseAssessmentQr");
                      }}
                      className={`flex h-[clamp(58px,8.3dvh,82px)] min-w-0 items-center justify-center gap-[clamp(8px,1vw,14px)] whitespace-nowrap rounded-[8px] border border-[#cbd5e1] bg-white px-[clamp(10px,1.4vw,18px)] text-[clamp(15px,2.25dvh,24px)] font-black uppercase leading-none text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
                    >
                      <ClipboardList className="h-[clamp(28px,4dvh,40px)] w-[clamp(28px,4dvh,40px)] shrink-0 text-black" />
                      <span className="min-w-0 shrink">Intake Form</span>
                    </button>
                  ) : null}
                  {showReviewButton ? (
                    <KioskHeaderReviewButton
                      onClick={openFeedbackPrompt}
                      className="h-[clamp(58px,8.3dvh,82px)]"
                    />
                  ) : null}
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="h-[clamp(58px,8.3dvh,82px)] w-[clamp(210px,22vw,300px)] shrink-0"
                />
              )}
            </header>

            <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_3px_minmax(0,1fr)] bg-white">
	              <div
	                className={`relative flex min-h-0 items-center justify-center bg-white px-[clamp(34px,4.8vw,72px)] ${
	                  hasHeaderIntakeButton
	                    ? "pt-[clamp(24px,4dvh,52px)] pb-[clamp(300px,32dvh,350px)]"
	                    : "pt-[clamp(24px,4dvh,52px)] pb-[clamp(300px,32dvh,350px)]"
	                }`}
	              >
	                <div className="flex h-full w-full max-w-[720px] flex-col items-center text-center">
	                  <div
	                    className={
	                      hasHeaderIntakeButton
	                        ? "absolute left-0 right-0 top-0 flex h-[clamp(260px,40dvh,410px)] items-center justify-center overflow-hidden"
	                        : "absolute left-0 right-0 top-0 flex h-[clamp(260px,40dvh,410px)] items-center justify-center overflow-hidden"
	                    }
	                  >
	                    <KioskLogo
	                      logoUrl={logoUrl}
	                      businessName={businessName}
	                      width={720}
	                      height={340}
	                      sizes="(max-width: 1024px) 50vw, 720px"
	                      className={
	                        hasHeaderIntakeButton
	                          ? "max-h-full max-w-[clamp(360px,47vw,650px)]"
	                          : "max-h-full max-w-[clamp(360px,47vw,650px)]"
	                      }
	                      fallbackClassName="text-center text-[clamp(36px,5.6dvh,68px)] font-black tracking-normal text-[#06184a]"
	                      matteVariant="actionHub"
	                    />
	                  </div>
	                  <div
	                    className="absolute bottom-[clamp(250px,33dvh,330px)] left-0 right-0 top-[clamp(260px,40dvh,410px)] flex items-center justify-center"
	                  >
                    <h1 className="text-[clamp(38px,5.8dvh,68px)] font-black uppercase leading-none text-black">
                      {welcomeTitle}
                    </h1>
                  </div>
	                  <div
	                    className={`absolute ${KIOSK_BOTTOM_ACTION_OFFSET_CLASS} left-[clamp(34px,4.8vw,72px)] right-[clamp(34px,4.8vw,72px)] mx-auto grid w-auto max-w-[720px] gap-[clamp(14px,2.5dvh,26px)]`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setCheckAction("check_in");
                        setKioskStep("visitorType");
                      }}
                      className={`grid h-[clamp(94px,14.2dvh,132px)] grid-cols-[0.85fr_2px_1.2fr] items-center rounded-[8px] border border-[#50c776] bg-[linear-gradient(180deg,#fbfff9_0%,#f1fff4_100%)] px-[clamp(18px,3vw,34px)] text-black shadow-[0_18px_36px_rgba(22,163,74,0.12)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
                    >
                      <LogIn className="mx-auto h-[clamp(54px,8.2dvh,78px)] w-[clamp(54px,8.2dvh,78px)] text-[#0bae2d]" />
                      <span className="h-[clamp(54px,8.5dvh,82px)] w-[2px] bg-[#0bae2d]/45" />
                      <span className="text-[clamp(25px,4dvh,44px)] font-black uppercase leading-none">
                        Check In
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setCheckAction("check_out");
                        setCheckoutType(null);
                        setCheckoutForm(EMPTY_CHECKOUT_FORM);
                        setKioskStep("checkoutType");
                      }}
                      className={`grid h-[clamp(94px,14.2dvh,132px)] grid-cols-[0.85fr_2px_1.2fr] items-center rounded-[8px] border border-[#83b9f8] bg-[linear-gradient(180deg,#fbfdff_0%,#eff6ff_100%)] px-[clamp(18px,3vw,34px)] text-black shadow-[0_18px_36px_rgba(37,99,235,0.12)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
                    >
                      <LogOut className="mx-auto h-[clamp(54px,8.2dvh,78px)] w-[clamp(54px,8.2dvh,78px)] text-[#1f6fcf]" />
                      <span className="h-[clamp(54px,8.5dvh,82px)] w-[2px] bg-[#1f6fcf]/45" />
                      <span className="text-[clamp(25px,4dvh,44px)] font-black uppercase leading-none">
                        Check Out
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-black" />

	              <div
	                className={`relative flex min-h-0 items-center justify-center bg-white px-[clamp(28px,4.6vw,70px)] ${
	                  hasHeaderIntakeButton
	                    ? "pt-[clamp(22px,3.6dvh,46px)] pb-[clamp(170px,18dvh,190px)]"
	                    : "pt-[clamp(22px,3.6dvh,46px)] pb-[clamp(170px,18dvh,190px)]"
	                }`}
              >
                <div className="flex h-full w-full max-w-[660px] flex-col items-center text-center">
                  {hasProfileSelector ? (
                    <div className="mb-[clamp(22px,3dvh,34px)] w-full">
                      <KioskProfileSelector
                        profiles={selectableProfiles}
                        selectedProfileId={selectedProfile.id}
                        onSelect={setSelectedProfileId}
                      />
                    </div>
                  ) : null}

                  <div className={`shrink-0 font-black uppercase leading-none text-black ${
                    hasProfileSelector
                      ? "text-[clamp(44px,6.7dvh,72px)]"
                      : "text-[clamp(50px,7.6dvh,82px)]"
                  }`}>
                    {scanTitle}
                  </div>
                  {hasHeaderIntakeButton ? (
                    <KioskScanItemsInline items={scanItems} />
                  ) : (
                    <KioskScanDescriptionText text={scanDescription} />
                  )}

                  <div
                    className={
                      hasHeaderIntakeButton
                        ? hasProfileSelector
                          ? "flex min-h-0 flex-1 items-center justify-center py-[clamp(6px,1.2dvh,16px)]"
                          : "flex min-h-0 flex-1 items-center justify-center py-[clamp(12px,2.2dvh,28px)]"
                        : hasProfileSelector
                          ? "mt-[clamp(10px,1.8dvh,22px)]"
                          : "mt-[clamp(28px,4.6dvh,52px)]"
                    }
                  >
                    <div
                      className={`rounded-[8px] border border-[#c9cde0] bg-white p-[clamp(7px,1.1dvh,12px)] shadow-none ${
                        hasHeaderIntakeButton && hasProfileSelector
                          ? "translate-y-[clamp(16px,2.8dvh,24px)]"
                          : ""
                      }`}
                    >
                      <Image
                        src={qrUrl}
                        alt={`${selectedProfile.title} QR code`}
	                        width={430}
	                        height={430}
	                        className={
	                          hasProfileSelector
	                            ? "h-[clamp(230px,36dvh,380px)] w-[clamp(230px,36dvh,380px)]"
	                            : "h-[clamp(270px,41.5dvh,430px)] w-[clamp(270px,41.5dvh,430px)]"
	                        }
                        unoptimized
                      />
                    </div>
                  </div>

	                  <button
	                    type="button"
                    onClick={() => {
                      setError(null);
                      setLeadForm(EMPTY_LEAD_FORM);
                      setKioskStep("leadForm");
                    }}
	                    className={`absolute ${KIOSK_BOTTOM_ACTION_OFFSET_CLASS} left-[clamp(28px,4.6vw,70px)] right-[clamp(28px,4.6vw,70px)] mx-auto flex h-[clamp(94px,14.2dvh,132px)] w-auto max-w-[660px] min-w-0 items-center justify-center gap-[clamp(14px,2vw,24px)] whitespace-nowrap rounded-[8px] border border-[#7b2cbf] bg-[linear-gradient(180deg,#fffaff_0%,#f4ecff_100%)] px-[clamp(18px,2.6vw,30px)] text-[clamp(18px,2.6dvh,30px)] font-black uppercase leading-none tracking-normal text-black shadow-[0_18px_36px_rgba(123,44,191,0.12)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                  >
                    <Send className="h-[clamp(36px,5.8dvh,56px)] w-[clamp(36px,5.8dvh,56px)] shrink-0 -rotate-6 fill-[#7b2cbf] text-[#7b2cbf] stroke-[2.8]" />
                    Connect or Schedule Tour
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
	            <header
	              className={`grid shrink-0 border-b-[3px] border-black bg-black ${
	                hasTallHeader
	                  ? "h-[clamp(98px,13.6dvh,132px)]"
	                  : "h-[clamp(68px,8.8dvh,98px)]"
	              } ${
	                legacyHeaderActionCount >= 3
	                  ? "grid-cols-[minmax(0,1fr)_3px_minmax(580px,640px)]"
	                  : legacyHeaderActionCount === 2
	                    ? "grid-cols-[minmax(0,1fr)_3px_minmax(430px,520px)]"
	                    : legacyHeaderActionCount === 1
	                      ? "grid-cols-[minmax(0,1fr)_3px_minmax(220px,280px)]"
	                      : "grid-cols-[minmax(0,1.37fr)_3px_minmax(0,1fr)]"
	              }`}
	            >
              <div
                className={`flex min-w-0 pl-[clamp(2px,0.45vw,8px)] pr-[clamp(18px,2.35vw,34px)] [container-type:inline-size] ${
                  hasLegacyHeaderIntakeButton || isCheckInFirst
                    ? "items-center gap-[clamp(5px,0.65vw,10px)]"
                    : "flex-col justify-center"
                } ${
                  hasTallHeader ? "py-[clamp(10px,1.6dvh,18px)]" : "pt-[clamp(18px,2.55dvh,28px)]"
                }`}
              >
                <KioskHeaderLogo compact={!hasLegacyHeaderIntakeButton} textSize={legacyHeaderTitleSize} />
                {hasLegacyHeaderIntakeButton || isCheckInFirst ? (
                  <span aria-hidden="true" className="h-[clamp(38px,6.2dvh,66px)] w-[3px] shrink-0 bg-white/85" />
                ) : null}
                <KioskHeaderTitle
                  title={displayPageName}
                  minFontSize={headerTitleSizing.minFontSize}
                  maxFontSize={headerTitleSizing.maxFontSize}
                  className={`font-bold tracking-normal text-white ${
                    isCheckInFirst
                      ? "flex-1"
                      : hasLegacyHeaderIntakeButton
                        ? "flex-1"
                        : "mt-1 w-full font-black"
                  }`}
                  onFontSizeChange={handleLegacyHeaderTitleSizeChange}
                />
              </div>
              <div aria-hidden="true" />
	              <div
	                className={`flex min-w-0 items-center justify-start pl-0 ${
	                  hasLegacyHeaderButtons ? "pr-0" : "pr-[clamp(18px,3vw,36px)]"
	                }`}
	              >
	                {hasLegacyHeaderIntakeButton ? (
	                  hasLegacyHeaderButtons ? (
	                    <div
	                      className={`grid w-full min-w-0 justify-end gap-[clamp(7px,0.85vw,10px)] ${
	                        legacyHeaderActionCount >= 3
	                          ? "grid-cols-3"
	                          : legacyHeaderActionCount === 2
	                            ? "grid-cols-2"
	                            : "grid-cols-1"
	                      }`}
	                    >
	                      {showLegacyIntakeButton ? (
	                        <button
	                          type="button"
	                          onClick={() => {
	                            setError(null);
	                            setKioskStep("nurseAssessmentQr");
	                          }}
	                          className={`flex h-[clamp(56px,8.1dvh,76px)] min-w-0 items-center justify-center gap-[clamp(6px,0.8vw,10px)] whitespace-nowrap rounded-[8px] border border-[#cbd5e1] bg-white px-[clamp(8px,1vw,14px)] text-[clamp(9px,1.55dvh,14px)] font-black uppercase leading-none tracking-normal text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                        >
	                          <ClipboardList className="h-[clamp(22px,3.4dvh,32px)] w-[clamp(22px,3.4dvh,32px)] shrink-0 text-black" />
	                          <span className="min-w-0 shrink">Intake Form</span>
	                        </button>
	                      ) : null}
	                      {showLegacyCheckInOutButton ? (
	                        <button
	                          type="button"
	                          onClick={() => {
	                            setError(null);
	                            setKioskStep("welcome");
	                          }}
	                          className={`flex h-[clamp(56px,8.1dvh,76px)] min-w-0 items-center justify-center gap-[clamp(5px,0.7vw,8px)] whitespace-nowrap rounded-[9px] border border-[#bfe8c2] bg-[linear-gradient(180deg,#fbfff9_0%,#ecfaed_100%)] px-[clamp(5px,0.7vw,10px)] text-[clamp(8px,1.28dvh,12px)] font-black uppercase leading-none tracking-normal text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                        >
	                          <User className="h-[clamp(22px,3.2dvh,30px)] w-[clamp(22px,3.2dvh,30px)] shrink-0 text-black" />
	                          <span className="h-[clamp(24px,3.6dvh,34px)] w-[2px] shrink-0 bg-[#DFAF00]" />
	                          <span className="min-w-0 shrink">CHECK IN / CHECK OUT</span>
	                        </button>
	                      ) : null}
	                      {showReviewButton ? (
	                        <KioskHeaderReviewButton
	                          onClick={openFeedbackPrompt}
	                          compact
	                          className="h-[clamp(56px,8.1dvh,76px)]"
	                        />
	                      ) : null}
	                    </div>
	                  ) : null
	                ) : (
	                  <div className="flex w-full min-w-0 items-center justify-center">
	                    <button
	                      type="button"
	                      onClick={() => {
	                        setError(null);
	                        setKioskStep(isCheckInFirst && kioskStep === "home" ? defaultKioskStep : "welcome");
	                      }}
	                      className={`flex w-full min-w-0 items-center justify-center gap-[clamp(8px,1.3vw,18px)] whitespace-nowrap rounded-[9px] border border-[#bfe8c2] bg-[linear-gradient(180deg,#fbfff9_0%,#ecfaed_100%)] px-[clamp(10px,1.8vw,28px)] font-black uppercase leading-none tracking-normal text-[#0bae2d] shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS} ${
	                        hasTallHeader
	                          ? "h-[clamp(68px,9.6dvh,92px)] max-w-[485px] text-[clamp(14px,2.35dvh,28px)]"
	                          : "h-[clamp(48px,6.4dvh,72px)] max-w-[485px] text-[clamp(14px,2.05dvh,25px)]"
	                      }`}
	                    >
	                      <User className="h-[clamp(34px,5dvh,54px)] w-[clamp(34px,5dvh,54px)] shrink-0 text-[#0bae2d]" />
	                      <span className="h-[clamp(34px,5dvh,54px)] w-[2px] shrink-0 bg-[#DFAF00]" />
	                      <span className="min-w-0 shrink">CHECK IN / CHECK OUT</span>
	                    </button>
	                  </div>
	                )}
	              </div>
            </header>

            <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.37fr)_3px_minmax(0,1fr)] bg-white">
              <div className="relative flex min-h-0 items-stretch justify-center bg-white px-[clamp(28px,3.5vw,54px)]">
                <form
                  onSubmit={handleLeadSubmit}
                  noValidate
                  autoComplete="off"
                  data-kiosk-scrollable="true"
                  onKeyDown={handleKioskFormKeyDown}
                  onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
                  onFocusCapture={scrollKioskFieldIntoView}
                  className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} w-full max-w-[830px] pt-[clamp(54px,8dvh,96px)] pb-[clamp(28px,4dvh,44px)]`}
                >
	                  <div className="mb-[clamp(48px,6.6dvh,78px)] shrink-0 text-center font-serif">
                    <h1 className="text-[clamp(40px,6.25dvh,72px)] font-black leading-[0.94] tracking-normal text-black">
                      Let&apos;s Connect
                    </h1>
                    <div className="text-[clamp(37px,5.9dvh,68px)] font-black leading-[0.98] tracking-normal text-[#DFAF00]">
                      or Schedule a Tour.
                    </div>
                  </div>

                  <div
                    className="grid shrink-0 content-start grid-cols-2 gap-x-[clamp(24px,3.5vw,52px)] gap-y-[clamp(34px,5.7dvh,64px)] pr-1"
                  >
                    <KioskField
                      label="First Name"
                      icon={User}
                      value={leadForm.firstName}
                      onChange={(value) => setLeadValue("firstName", value)}
                      placeholder="Enter your first name"
                      size="large"
                      required
                    />
                    <KioskField
                      label="Last Name"
                      icon={User}
                      value={leadForm.lastName}
                      onChange={(value) => setLeadValue("lastName", value)}
                      placeholder="Enter your last name"
                      size="large"
                      required
                    />
                    <KioskField
                      label="Phone Number"
                      icon={Phone}
                      value={leadForm.phone}
                      onChange={(value) => setLeadValue("phone", value)}
                      placeholder="(555) 123-4567"
                      type="tel"
                      size="large"
                      isLastField
                      required
                    />
                    <div className="block">
                      <span className="mb-[clamp(7px,1.1dvh,13px)] block whitespace-nowrap text-[clamp(15px,2dvh,20px)] font-black leading-none text-[#050505]">
                        <KioskLabelText label="Schedule a Tour (Optional)" keepTogether />
                      </span>
                      <span className="relative block">
                        <CalendarDays className="pointer-events-none absolute left-[clamp(16px,1.8vw,26px)] top-1/2 z-10 h-[clamp(26px,3.8dvh,40px)] w-[clamp(26px,3.8dvh,40px)] -translate-y-1/2 text-black" />
                        <button
                          type="button"
                          onClick={openTourCalendar}
                          className={`relative flex h-[clamp(72px,10.2dvh,106px)] w-full min-w-0 items-center rounded-[8px] border border-[#c9cde0] bg-[#fbfcff] pl-[clamp(52px,5.1vw,84px)] pr-[clamp(12px,1.6vw,24px)] text-left text-[clamp(16px,2.15dvh,23px)] font-bold text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe] ${KIOSK_BUTTON_TOUCH_CLASS}`}
                        >
                          <span className="block min-w-0 flex-1 truncate whitespace-nowrap">
                            {formatKioskDate(leadForm.tourDate)}
                          </span>
                        </button>
                      </span>
                    </div>
                    <div className="col-span-2 min-h-[clamp(22px,3dvh,34px)]" aria-live="polite">
                      {error ? (
                        <p className="rounded-[8px] border border-[#f2c7c7] bg-[#fff5f5] px-[clamp(10px,1.5vw,18px)] py-[clamp(5px,0.8dvh,8px)] text-left text-[clamp(12px,1.65dvh,18px)] font-bold text-[#b42318]">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div data-kiosk-submit-area="true" className={`${KIOSK_FLOW_STICKY_ACTION_CLASS} flex w-full items-center justify-center`}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`flex h-[clamp(64px,9.3dvh,96px)] w-full items-center justify-center gap-[clamp(18px,2.5vw,32px)] rounded-[8px] border border-[#9fc3fb] bg-[linear-gradient(180deg,#f8fbff_0%,#dcecff_100%)] px-[clamp(24px,3vw,36px)] text-[clamp(30px,4.7dvh,48px)] font-black uppercase tracking-normal text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_rgba(37,99,235,0.14)] disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
                    >
                      <Send className="h-[clamp(30px,4.8dvh,50px)] w-[clamp(30px,4.8dvh,50px)] fill-black text-black" />
                      {submitting ? "SENDING..." : "SUBMIT"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-black" />

	              <div className="relative flex min-h-0 items-stretch justify-center bg-white px-[clamp(26px,4vw,62px)] pt-[clamp(22px,3.1dvh,40px)] pb-[clamp(112px,14dvh,152px)]">
                <div className="flex h-full w-full max-w-[560px] flex-col items-center text-center 2xl:max-w-[620px]">
                  {hasProfileSelector ? (
                    <div className="mb-[clamp(6px,1dvh,12px)] w-full">
                      <KioskProfileSelector
                        profiles={selectableProfiles}
                        selectedProfileId={selectedProfile.id}
                        onSelect={setSelectedProfileId}
                      />
                    </div>
                  ) : null}

                  <div className="mb-[clamp(10px,1.7dvh,20px)] flex w-full items-start justify-center">
                    <KioskLogo
                      logoUrl={logoUrl}
                      businessName={businessName}
                      width={300}
                      height={225}
                      sizes="(max-width: 1024px) 24vw, 292px"
	                      className={
	                        hasProfileSelector
	                          ? "max-h-[clamp(140px,20dvh,220px)] max-w-[clamp(210px,34vw,500px)]"
	                          : "max-h-[clamp(185px,24.5dvh,270px)] max-w-[clamp(230px,38vw,560px)]"
	                      }
                      fallbackClassName="text-center text-[clamp(28px,4.6dvh,46px)] font-black tracking-[0.08em] text-black"
                      matteVariant="legacyQr"
                    />
                  </div>

                  <div className={`whitespace-pre-line font-black uppercase leading-[1.08] tracking-normal text-black ${
                    hasProfileSelector
                      ? "text-[clamp(21px,3.05dvh,34px)]"
                      : "text-[clamp(24px,3.45dvh,40px)]"
                  }`}>
                    {scanDescription}
                  </div>

                  <div className={`rounded-[8px] border border-[#c9cde0] bg-white p-[clamp(7px,1.1dvh,12px)] shadow-none ${
                    hasProfileSelector ? "mt-[clamp(6px,1dvh,12px)]" : "mt-[clamp(10px,1.55dvh,18px)]"
                  }`}>
                    <Image
                      src={qrUrl}
                      alt={`${selectedProfile.title} QR code`}
                      width={310}
                      height={310}
                      className={
                        hasProfileSelector
                          ? "h-[clamp(150px,22dvh,270px)] w-[clamp(150px,22dvh,270px)]"
                          : "h-[clamp(172px,25dvh,310px)] w-[clamp(172px,25dvh,310px)]"
                      }
                      unoptimized
                    />
                  </div>

                  <div className={`font-black uppercase leading-none text-black ${
                    hasProfileSelector
                      ? "mt-[clamp(4px,0.65dvh,8px)] text-[clamp(20px,3dvh,30px)]"
                      : "mt-[clamp(6px,1dvh,12px)] text-[clamp(23px,3.5dvh,36px)]"
                  }`}>
                    Scan Me
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoOpen(true);
                    }}
                    className={`absolute ${KIOSK_BOTTOM_ACTION_OFFSET_CLASS} left-1/2 flex h-[clamp(64px,9.3dvh,96px)] w-full max-w-[380px] min-w-0 -translate-x-1/2 items-center justify-center gap-[clamp(8px,1.2dvh,16px)] whitespace-nowrap rounded-[8px] border border-[#7b2cbf] bg-[linear-gradient(180deg,#fffaff_0%,#f4ecff_100%)] px-[clamp(16px,2.2vw,28px)] text-[clamp(20px,3dvh,30px)] font-black uppercase leading-none tracking-normal text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_12px_rgba(123,44,191,0.14)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
                  >
                    <MessageCircle className="h-[clamp(26px,4dvh,40px)] w-[clamp(26px,4dvh,40px)] shrink-0 text-black" />
                    Text Me Info
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {tourCalendarOpen ? (
        <KioskDatePickerModal
          value={leadForm.tourDate}
          month={tourCalendarMonth}
          timeValue={hasLegacyHeaderIntakeButton ? leadForm.tourTime : undefined}
          onMonthChange={setTourCalendarMonth}
          onSelect={selectTourDate}
          onTimeSelect={hasLegacyHeaderIntakeButton ? selectTourTime : undefined}
          onClose={() => setTourCalendarOpen(false)}
        />
      ) : null}

      {tourTimePickerOpen ? (
        <KioskTimePickerModal
          value={leadForm.tourTime}
          onSelect={selectTourTime}
          onClose={() => setTourTimePickerOpen(false)}
        />
      ) : null}

      {overviewPromptOpen ? (
        <div className="absolute inset-0 z-[100] flex min-h-0 items-center justify-center overflow-hidden bg-black/55 p-6">
          <form
            onSubmit={handleOverviewSubmit}
            noValidate
            data-kiosk-scrollable="true"
            onKeyDown={handleKioskFormKeyDown}
            onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
            onFocusCapture={scrollKioskFieldIntoView}
            className="max-h-full w-full max-w-xl overflow-y-auto overscroll-contain rounded-[22px] bg-white p-7 shadow-[0_30px_90px_rgba(0,0,0,0.35)] [-webkit-overflow-scrolling:touch] [scroll-padding-bottom:120px]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#007AFF]">
                  Admin Access
                </p>
                <h2 className="mt-1 text-3xl font-black text-black">Overview of Kiosk</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOverviewPromptOpen(false);
                  setOverviewPassword("");
                  setOverviewError(null);
                }}
                className={`rounded-full bg-slate-100 p-2 text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block text-[17px] font-black text-black">Password</span>
              <input
                data-kiosk-last-field="true"
                value={overviewPassword}
                onChange={(event) => {
                  setOverviewPassword(event.target.value);
                  setOverviewError(null);
                }}
                type="password"
                enterKeyHint="done"
                autoFocus
                autoComplete="off"
                className="h-14 w-full scroll-mb-28 rounded-[10px] border border-[#cbd5e1] bg-[#fbfdff] px-4 text-[18px] font-bold text-black outline-none [color-scheme:light] placeholder:text-[#8794a8] focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]"
                style={{ colorScheme: "light" }}
              />
            </label>
            {overviewError ? (
              <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-bold text-red-700">
                {overviewError}
              </div>
            ) : null}
            <div data-kiosk-submit-area="true" className={`${KIOSK_STICKY_ACTION_CLASS} flex justify-end gap-3`}>
              <button
                type="button"
                onClick={() => {
                  setOverviewPromptOpen(false);
                  setOverviewPassword("");
                  setOverviewError(null);
                }}
                className={`h-12 rounded-[8px] border border-slate-300 px-6 text-base font-bold text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={overviewLoading}
                className={`h-12 rounded-[8px] bg-black px-8 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
              >
                {overviewLoading ? "Opening..." : "Open Overview"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {infoOpen ? (
        <div className="absolute inset-0 z-[60] flex min-h-0 items-center justify-center overflow-hidden bg-black/55 p-6">
          <form
            onSubmit={handleInfoSubmit}
            noValidate
            data-kiosk-scrollable="true"
            onKeyDown={handleKioskFormKeyDown}
            onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
            onFocusCapture={scrollKioskFieldIntoView}
            className="max-h-full w-full max-w-2xl overflow-y-auto overscroll-contain rounded-[22px] bg-white p-7 shadow-[0_30px_90px_rgba(0,0,0,0.35)] [-webkit-overflow-scrolling:touch] [scroll-padding-bottom:120px]"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-3xl font-black text-black">Text Me Info</h2>
              <button type="button" onClick={() => setInfoOpen(false)} className={`rounded-full bg-slate-100 p-2 text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <p className="mb-5 rounded-[12px] border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 text-[16px] font-semibold leading-relaxed text-[#1e3a8a]">
              We&apos;ll text you a digital information packet with everything you need to learn more about this community, including pricing, floor plans, amenities, photos, virtual tours, and additional community information.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <KioskField label="First Name" icon={User} value={infoForm.firstName} onChange={(value) => setInfoValue("firstName", value)} placeholder="First name" required />
              <KioskField label="Last Name" icon={User} value={infoForm.lastName} onChange={(value) => setInfoValue("lastName", value)} placeholder="Last name" required />
              <KioskField label="Phone Number" icon={Phone} value={infoForm.phone} onChange={(value) => setInfoValue("phone", value)} placeholder="(555) 123-4567" type="tel" completesRequiredFields required />
              <KioskField label="Email (Optional)" icon={Mail} value={infoForm.email} onChange={(value) => setInfoValue("email", value)} placeholder="Email address" type="email" />
              <label className="block md:col-span-2">
                <span className="mb-1.5 block text-[15px] font-bold text-[#111111]">
                  <KioskLabelText label="What information would you like us to send you? (Optional)" />
                </span>
                <textarea
                  data-kiosk-last-field="true"
                  enterKeyHint="done"
                  value={infoForm.request}
                  onChange={(event) => setInfoValue("request", event.target.value)}
                  placeholder="Any specific information you want included?"
                  className="min-h-[120px] w-full scroll-mb-28 resize-none rounded-[10px] border border-[#cbd5e1] bg-[#fbfdff] px-4 py-3 text-[16px] text-[#0f172a] outline-none [color-scheme:light] placeholder:text-[#8794a8] focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe]"
                  style={{ colorScheme: "light" }}
                />
              </label>
            </div>
            <div data-kiosk-submit-area="true" className={`${KIOSK_STICKY_ACTION_CLASS} flex justify-end gap-3`}>
              <button type="button" onClick={() => setInfoOpen(false)} className={`h-12 rounded-[8px] border border-slate-300 px-6 text-base font-bold text-slate-700 ${KIOSK_BUTTON_TOUCH_CLASS}`}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={`h-12 rounded-[8px] bg-black px-8 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {kioskStep !== "home" ? (
        <KioskFlowShell>
	          {kioskStep === "welcome" ? (
	            isCheckInFirst ? (
	              <div className="flex h-full min-h-0 flex-col bg-white text-center">
	                <header className="flex h-[clamp(88px,12.6dvh,122px)] shrink-0 items-center justify-between gap-[clamp(8px,1.1vw,14px)] border-b-[3px] border-black bg-black pl-[clamp(12px,1.6vw,22px)] pr-0">
	                  <div className="flex min-w-0 flex-1 items-center gap-[clamp(3px,0.35vw,5px)]">
		                    <KioskHeaderLogo compact textSize={checkInFirstHeaderTitleSize} />
	                    <span className="h-[clamp(24px,3.8dvh,38px)] w-[2px] shrink-0 bg-white/85" />
	                    <KioskHeaderTitle
	                      title={displayPageName}
		                      minFontSize={7}
		                      maxFontSize={14}
			                      className="flex-1 text-left font-bold text-white"
		                      onFontSizeChange={handleCheckInFirstHeaderTitleSizeChange}
		                    />
	                  </div>
	                  <div
	                    className={`grid min-w-0 justify-end gap-[clamp(7px,0.9vw,10px)] ${
	                      showCheckInFirstIntakeButton && showReviewButton
	                        ? "mr-[clamp(12px,1.5vw,20px)] flex-[0_0_clamp(650px,65vw,780px)] grid-cols-4"
	                        : showCheckInFirstIntakeButton
	                          ? "mr-[clamp(14px,2vw,24px)] flex-[0_0_clamp(640px,57vw,760px)] grid-cols-[minmax(180px,1fr)_minmax(230px,1.18fr)_minmax(180px,1fr)]"
	                          : showReviewButton
	                            ? "mr-[clamp(12px,1.5vw,20px)] flex-[0_0_clamp(500px,52vw,620px)] grid-cols-3"
	                            : "flex-[0_0_clamp(430px,42vw,520px)] grid-cols-2"
	                    }`}
	                  >
	                    {showCheckInFirstIntakeButton ? (
	                      <button
	                        type="button"
	                        onClick={() => {
	                          setError(null);
	                          setKioskStep("nurseAssessmentQr");
	                        }}
	                        className={`flex h-[clamp(50px,7dvh,68px)] min-w-0 items-center justify-center gap-[clamp(5px,0.65vw,8px)] whitespace-nowrap rounded-[8px] border border-[#cbd5e1] bg-white px-[clamp(6px,0.8vw,11px)] text-[clamp(11px,1.45dvh,15px)] font-black uppercase leading-none text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                      >
	                        <CalendarDays className="h-[clamp(20px,2.7dvh,26px)] w-[clamp(20px,2.7dvh,26px)] shrink-0 text-black" />
	                        <span className="min-w-0 shrink">Intake Form</span>
	                      </button>
	                    ) : null}
	                    <button
	                      type="button"
	                      onClick={() => {
	                        setError(null);
	                        setLeadForm(EMPTY_LEAD_FORM);
	                        setKioskStep("leadForm");
	                      }}
	                      className={`flex h-[clamp(50px,7dvh,68px)] min-w-0 items-center justify-center gap-[clamp(4px,0.55vw,7px)] whitespace-nowrap rounded-[8px] border border-[#cbd5e1] bg-white px-[clamp(5px,0.65vw,9px)] text-[clamp(9px,1.25dvh,13px)] font-black uppercase leading-none text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                    >
	                      <Send className="h-[clamp(20px,2.7dvh,26px)] w-[clamp(20px,2.7dvh,26px)] shrink-0 -rotate-6 fill-black text-black stroke-[2.8]" />
	                      <span className="min-w-0 shrink">Connect / Schedule</span>
	                    </button>
	                    {showReviewButton ? (
	                      <KioskHeaderReviewButton
	                        onClick={openFeedbackPrompt}
	                        compact
	                        className="h-[clamp(50px,7dvh,68px)]"
	                      />
	                    ) : null}
	                    <button
	                      type="button"
	                      onClick={openKioskHistory}
	                      className={`flex h-[clamp(50px,7dvh,68px)] min-w-0 items-center justify-center gap-[clamp(5px,0.65vw,8px)] whitespace-nowrap rounded-[8px] border border-[#cbd5e1] bg-white px-[clamp(6px,0.8vw,11px)] text-[clamp(11px,1.45dvh,15px)] font-black uppercase leading-none text-black shadow-[0_10px_22px_rgba(0,0,0,0.24)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                    >
	                      <History className="h-[clamp(20px,2.7dvh,26px)] w-[clamp(20px,2.7dvh,26px)] shrink-0 text-black" />
	                      <span className="min-w-0 shrink">Kiosk History</span>
	                    </button>
	                  </div>
	                </header>
		                <div className="relative flex min-h-0 flex-1 flex-col items-center px-[clamp(28px,5vw,54px)] pt-[clamp(18px,3dvh,28px)] pb-[clamp(18px,3dvh,30px)]">
		                  <KioskLogo
		                    logoUrl={logoUrl}
		                    businessName={businessName}
		                    className="absolute top-[clamp(10px,1.8dvh,20px)] max-h-[clamp(245px,34dvh,360px)] max-w-[clamp(500px,60vw,900px)]"
		                    width={640}
		                    height={270}
		                    sizes="(max-width: 1024px) 50vw, 640px"
		                    matteVariant="checkInFirst"
		                  />
		                  <div className="absolute bottom-[clamp(176px,29dvh,260px)] left-[clamp(28px,5vw,54px)] right-[clamp(28px,5vw,54px)] top-[clamp(255px,36dvh,380px)] flex items-center justify-center">
		                    <div className="text-[clamp(42px,6.6dvh,64px)] font-black leading-none text-[#06184a]">
		                      {welcomeTitle}
		                    </div>
		                  </div>
		                  <div className="absolute bottom-[clamp(34px,5.8dvh,64px)] left-[clamp(28px,5vw,54px)] right-[clamp(28px,5vw,54px)] grid w-auto grid-cols-2 gap-[clamp(28px,5vw,72px)]">
		                      <FlowCheckActionButton
		                        title="Check In"
		                        icon={LogIn}
		                        tone="green"
		                        onClick={() => {
		                          setError(null);
		                          setCheckAction("check_in");
		                          setKioskStep("visitorType");
		                        }}
		                      />
		                      <FlowCheckActionButton
		                        title="Check Out"
		                        icon={LogOut}
		                        tone="blue"
		                        onClick={() => {
		                          setError(null);
		                          setCheckAction("check_out");
		                          setCheckoutType(null);
		                          setCheckoutForm(EMPTY_CHECKOUT_FORM);
		                          setKioskStep("checkoutType");
		                        }}
		                      />
		                  </div>
		                </div>
	              </div>
	            ) : (
	              <div className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pt-[clamp(18px,3.4dvh,34px)] pb-[clamp(104px,15dvh,142px)] text-center">
	                <FlowBackButton
	                  onClick={() => {
	                    setError(null);
	                    setKioskStep("home");
	                  }}
	                  className="absolute left-[clamp(18px,3vw,32px)] top-[clamp(18px,3dvh,28px)]"
	                />
	                {hasLegacyHeaderIntakeButton ? <FlowHistoryButton onClick={openKioskHistory} /> : null}
	                <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(132px,24dvh,220px)] max-w-[clamp(330px,43vw,570px)]" />
	                <div className="mt-[clamp(24px,4.8dvh,46px)] text-[clamp(44px,7dvh,68px)] font-black leading-none text-[#06184a]">
	                  {welcomeTitle}
	                </div>
	                <div className="mt-[clamp(10px,2dvh,18px)] text-[clamp(24px,4dvh,36px)] font-medium leading-none text-[#4b5563]">
	                  {welcomeSubtitle}
	                </div>
	                <div className="mt-[clamp(34px,6dvh,66px)] grid w-full max-w-[1120px] grid-cols-2 gap-[clamp(28px,5vw,72px)]">
	                  <FlowCheckActionButton
	                    title="Check In"
	                    icon={LogIn}
	                    tone="green"
	                    onClick={() => {
	                      setError(null);
	                      setCheckAction("check_in");
	                      setKioskStep("visitorType");
	                    }}
	                  />
	                  <FlowCheckActionButton
	                    title="Check Out"
	                    icon={LogOut}
	                    tone="blue"
	                    onClick={() => {
	                      setError(null);
	                      setCheckAction("check_out");
	                      setCheckoutType(null);
	                      setCheckoutForm(EMPTY_CHECKOUT_FORM);
	                      setKioskStep("checkoutType");
	                    }}
	                  />
	                </div>
	              </div>
	            )
		          ) : null}
	
	          {kioskStep === "leadForm" ? (
	            <form
	              onSubmit={handleLeadSubmit}
	              noValidate
	              autoComplete="off"
	              data-kiosk-scrollable="true"
	              onKeyDown={handleKioskFormKeyDown}
	              onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
	              onFocusCapture={scrollKioskFieldIntoView}
	              className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} px-[clamp(42px,6vw,86px)] py-[clamp(24px,4dvh,42px)]`}
	            >
	              <button
	                type="button"
	                aria-label="Close"
	                onClick={resetKioskFlow}
	                className={`absolute right-[clamp(18px,3vw,32px)] top-[clamp(18px,3dvh,28px)] z-10 flex h-[clamp(48px,7dvh,66px)] w-[clamp(48px,7dvh,66px)] items-center justify-center rounded-full bg-white text-black shadow-[0_8px_22px_rgba(15,23,42,0.22)] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	              >
	                <X className="h-[clamp(24px,3.8dvh,34px)] w-[clamp(24px,3.8dvh,34px)]" />
	              </button>
	              <div className="flex justify-center">
	                <KioskLogo
	                  logoUrl={logoUrl}
	                  businessName={businessName}
	                  className="max-h-[clamp(76px,13dvh,140px)] max-w-[clamp(250px,32vw,430px)]"
	                />
	              </div>
	              <h2 className="mt-[clamp(18px,3dvh,30px)] text-center text-[clamp(34px,5.4dvh,54px)] font-black leading-none text-[#06184a]">
	                Connect or Schedule a Tour
	              </h2>
	              <div className="mx-auto mt-[clamp(24px,4dvh,40px)] grid w-full max-w-[980px] grid-cols-2 gap-x-[clamp(26px,4vw,52px)] gap-y-[clamp(18px,3dvh,30px)]">
	                <KioskField
	                  label="First Name"
	                  icon={User}
	                  value={leadForm.firstName}
	                  onChange={(value) => setLeadValue("firstName", value)}
	                  placeholder="Enter your first name"
	                  required
	                />
	                <KioskField
	                  label="Last Name"
	                  icon={User}
	                  value={leadForm.lastName}
	                  onChange={(value) => setLeadValue("lastName", value)}
	                  placeholder="Enter your last name"
	                  required
	                />
	                <div className="col-span-2">
	                  <KioskField
	                    label="Phone Number"
	                    icon={Phone}
	                    value={leadForm.phone}
	                    onChange={(value) => setLeadValue("phone", value)}
	                    placeholder="(555) 123-4567"
	                    type="tel"
	                    isLastField
	                    required
	                  />
	                </div>
	                <div className="col-span-2 flex items-center gap-[clamp(14px,2.2vw,28px)] pt-[clamp(4px,0.8dvh,8px)]">
	                  <span className="h-px flex-1 bg-[#06184a]/45" />
	                  <span className="whitespace-nowrap text-[clamp(15px,2.1dvh,22px)] font-black uppercase leading-none text-[#5b506d]">
	                    Schedule a Tour (Optional)
	                  </span>
	                  <span className="h-px flex-1 bg-[#06184a]/45" />
	                </div>
	                <div className="block">
	                  <span className="mb-[clamp(7px,1.1dvh,13px)] block text-[clamp(17px,2.55dvh,26px)] font-black leading-none text-[#050505]">
	                    Date
	                  </span>
	                  <span className="relative block">
	                    <CalendarDays className="pointer-events-none absolute left-[clamp(13px,1.6vw,24px)] top-1/2 z-10 h-[clamp(21px,3.35dvh,40px)] w-[clamp(21px,3.35dvh,40px)] -translate-y-1/2 text-black" />
	                    <button
	                      type="button"
	                      onClick={openTourCalendar}
	                      className={`relative flex h-[clamp(56px,7.2dvh,82px)] w-full min-w-0 items-center rounded-[8px] border border-[#c9cde0] bg-[#fbfcff] pl-[clamp(40px,4.6vw,86px)] pr-[clamp(10px,1.5vw,22px)] text-left text-[clamp(13px,1.82dvh,24px)] font-bold text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                    >
	                      <span className="block min-w-0 flex-1 truncate whitespace-nowrap">
	                        {leadForm.tourDate ? formatKioskDate(leadForm.tourDate) : "Select date"}
	                      </span>
	                    </button>
	                  </span>
	                </div>
	                <div className="block">
	                  <span className="mb-[clamp(7px,1.1dvh,13px)] block text-[clamp(17px,2.55dvh,26px)] font-black leading-none text-[#050505]">
	                    Time
	                  </span>
	                  <span className="relative block">
	                    <Clock className="pointer-events-none absolute left-[clamp(13px,1.6vw,24px)] top-1/2 z-10 h-[clamp(21px,3.35dvh,40px)] w-[clamp(21px,3.35dvh,40px)] -translate-y-1/2 text-black" />
	                    <button
	                      type="button"
	                      onClick={openTourTimePicker}
	                      className={`relative flex h-[clamp(56px,7.2dvh,82px)] w-full min-w-0 items-center rounded-[8px] border border-[#c9cde0] bg-[#fbfcff] pl-[clamp(40px,4.6vw,86px)] pr-[clamp(46px,5vw,70px)] text-left text-[clamp(13px,1.82dvh,24px)] font-bold text-black shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-[#dbeafe] ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                    >
	                      <span className="block min-w-0 flex-1 truncate whitespace-nowrap">
	                        {leadForm.tourTime ? formatKioskTime(leadForm.tourTime) : "Select time"}
	                      </span>
	                    </button>
	                    <ChevronDown className="pointer-events-none absolute right-[clamp(15px,2vw,24px)] top-1/2 h-[clamp(22px,3.2dvh,32px)] w-[clamp(22px,3.2dvh,32px)] -translate-y-1/2 text-black" />
	                  </span>
	                </div>
	                <div className="col-span-2 min-h-[clamp(26px,3.4dvh,38px)]" aria-live="polite">
	                  {error ? (
	                    <p className="rounded-[8px] border border-[#f2c7c7] bg-[#fff5f5] px-[clamp(10px,1.5vw,18px)] py-[clamp(6px,1dvh,10px)] text-left text-[clamp(13px,1.85dvh,18px)] font-bold text-[#b42318]">
	                      {error}
	                    </p>
	                  ) : null}
	                </div>
	              </div>
	              <div data-kiosk-submit-area="true" className={`${KIOSK_FLOW_STICKY_ACTION_CLASS} mx-auto flex w-full max-w-[980px] items-center justify-center`}>
	                <button
	                  type="submit"
	                  disabled={submitting}
	                  className={`flex h-[clamp(58px,8dvh,78px)] w-full items-center justify-center rounded-[8px] border border-[#9fc3fb] bg-[linear-gradient(180deg,#f8fbff_0%,#dcecff_100%)] px-[clamp(24px,3vw,36px)] text-[clamp(22px,3.5dvh,32px)] font-black uppercase tracking-normal text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
	                >
	                  {submitting ? "Submitting..." : "Submit"}
	                </button>
	              </div>
	            </form>
	          ) : null}
	
	          {kioskStep === "visitorType" ? (
            <div className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pt-[clamp(18px,3.4dvh,38px)] pb-[clamp(86px,12dvh,118px)] text-center">
              {showRoleSelectionHistoryButton ? <FlowHistoryButton onClick={openKioskHistory} /> : null}
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(140px,24dvh,235px)] max-w-[clamp(330px,43vw,570px)]" />
              <div className="mt-[clamp(24px,4.8dvh,48px)] text-[clamp(32px,5.8dvh,54px)] font-black leading-none text-[#06184a]">
                Please select who you are.
              </div>
              <div className="mt-[clamp(28px,5.4dvh,58px)] grid w-full max-w-[1240px] grid-cols-3 gap-[clamp(18px,3.2vw,42px)]">
                <FlowVisitorTypeButton
                  title="Resident"
                  subtitle="Living here"
                  icon={User}
                  tone="green"
                  onClick={() => {
                    setError(null);
                    setResidentCheckForm(EMPTY_CHECK_FORM);
                    setCheckedOutResidents([]);
                    autoFilledResidentKeyRef.current = null;
                    setKioskStep("residentForm");
                  }}
                />
                <FlowVisitorTypeButton
                  title="Family / Guest"
                  subtitle="Visiting"
                  icon={UsersRound}
                  tone="blue"
                  onClick={() => {
                    setError(null);
                    setKioskStep("familyForm");
                  }}
                />
                <FlowVisitorTypeButton
                  title="Vendor / Service"
                  subtitle="Providing a service"
                  icon={BriefcaseBusiness}
                  tone="purple"
                  onClick={() => {
                    setError(null);
                    setKioskStep("vendorForm");
                  }}
                />
              </div>
	              <FlowBackButton
	                onClick={() => {
	                  if (hasActionHubHome) {
	                    resetKioskFlow();
	                    return;
	                  }
	                  setKioskStep("welcome");
	                }}
	                className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]"
	              />
            </div>
	          ) : null}

          {kioskStep === "leadThankYou" ? (
            <div
              role="status"
              aria-live="polite"
              className="relative flex h-full flex-col items-center justify-center px-[clamp(28px,5vw,54px)] py-[clamp(24px,4.5dvh,56px)] text-center"
            >
              <KioskLogo
                logoUrl={logoUrl}
                businessName={businessName}
                className="max-h-[clamp(150px,25dvh,240px)] max-w-[clamp(340px,45vw,620px)]"
                width={560}
                height={240}
                sizes="(max-width: 1024px) 45vw, 620px"
              />
              <h2 className="mt-[clamp(34px,6dvh,58px)] text-[clamp(52px,8.8dvh,78px)] font-black leading-none text-[#06184a]">
                Thank you!
              </h2>
              <p className="mt-[clamp(18px,3.2dvh,30px)] max-w-[920px] text-[clamp(24px,4dvh,36px)] font-medium leading-[1.4] text-[#374151]">
                Your request has been received. Our team will be reaching out to you shortly.
              </p>
              <KioskFeedbackPrompt
                selectedRating={feedbackRating}
                onSelect={(rating) => handleFeedbackRating(rating, "lead")}
              />
              <FlowBackButton
                onClick={resetKioskFlow}
                className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]"
              />
            </div>
          ) : null}

          {kioskStep === "checkoutType" ? (
            <div className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pt-[clamp(18px,3.4dvh,38px)] pb-[clamp(86px,12dvh,118px)] text-center">
              {showRoleSelectionHistoryButton ? <FlowHistoryButton onClick={openKioskHistory} /> : null}
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(140px,24dvh,235px)] max-w-[clamp(330px,43vw,570px)]" />
              <div className="mt-[clamp(24px,4.8dvh,48px)] text-[clamp(32px,5.8dvh,54px)] font-black leading-none text-[#06184a]">
                Please select who you are.
              </div>
              <div className="mt-[clamp(28px,5.4dvh,58px)] grid w-full max-w-[1240px] grid-cols-3 gap-[clamp(18px,3.2vw,42px)]">
                <FlowVisitorTypeButton
                  title="Resident"
                  subtitle="(Self)"
                  icon={User}
                  tone="green"
                  onClick={() => openCheckoutForm("resident")}
                />
                <FlowVisitorTypeButton
                  title="Family / Guest"
                  subtitle="(Guest checking out resident)"
                  icon={UsersRound}
                  tone="blue"
                  onClick={() => openCheckoutForm("family")}
                />
                <FlowVisitorTypeButton
                  title="Vendor / Service"
                  subtitle="(Providing a service)"
                  icon={BriefcaseBusiness}
                  tone="purple"
                  onClick={() => openCheckoutForm("vendor")}
                />
              </div>
	              <FlowBackButton
	                onClick={() => {
	                  if (hasActionHubHome) {
	                    resetKioskFlow();
	                    return;
	                  }
	                  setKioskStep("welcome");
	                }}
	                className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]"
	              />
            </div>
          ) : null}

          {kioskStep === "residentForm" ? (
            <form
              onSubmit={handleResidentCheckSubmit}
              noValidate
              data-kiosk-scrollable="true"
              data-kiosk-submit-on-complete="true"
              onKeyDown={handleKioskFormKeyDown}
              onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
              onFocusCapture={scrollKioskFieldIntoView}
              className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} group/kiosk-form px-[clamp(48px,8vw,112px)] py-[clamp(24px,4dvh,48px)]`}
            >
              <div className="flex justify-center">
                <KioskLogo
                  logoUrl={logoUrl}
                  businessName={businessName}
                  className="max-h-[clamp(145px,27dvh,260px)] max-w-[clamp(330px,42vw,560px)] group-focus-within/kiosk-form:hidden"
                />
              </div>
              <h2 className="mt-[clamp(26px,5dvh,48px)] text-center text-[clamp(32px,5.8dvh,54px)] font-black leading-none text-[#06184a] group-focus-within/kiosk-form:mt-[clamp(18px,2.8dvh,26px)]">
                Please type your name.
              </h2>
              <div className="mx-auto mb-[clamp(24px,4dvh,40px)] mt-[clamp(28px,5dvh,52px)] grid w-full max-w-[1040px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)] group-focus-within/kiosk-form:mt-[clamp(20px,3dvh,28px)] group-focus-within/kiosk-form:[&_input]:h-[56px]">
                <FlowTextField
                  label="First Name"
                  value={residentCheckForm.firstName}
                  onChange={(value) => setResidentCheckForm((current) => ({ ...current, firstName: value }))}
                  placeholder="First Name"
                  required
                />
                <FlowTextField
                  label="Last Name"
                  value={residentCheckForm.lastName}
                  onChange={(value) => setResidentCheckForm((current) => ({ ...current, lastName: value }))}
                  placeholder="Last Name"
                  isLastField
                  required
                />
              </div>
              <div
                data-kiosk-submit-area="true"
                className={`${KIOSK_STICKY_ACTION_CLASS} flex items-center justify-between gap-[clamp(28px,5vw,56px)] group-focus-within/kiosk-form:fixed group-focus-within/kiosk-form:bottom-auto group-focus-within/kiosk-form:left-[clamp(48px,8vw,112px)] group-focus-within/kiosk-form:right-[clamp(48px,8vw,112px)] group-focus-within/kiosk-form:top-[32dvh] group-focus-within/kiosk-form:mt-0`}
              >
                <FlowBackButton onClick={() => setKioskStep("visitorType")} />
                <button
                  type="submit"
                  disabled={submitting}
                  onPointerDown={(event) => {
                    if (!isKioskTextEntryElement(document.activeElement)) {
                      return;
                    }

                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }}
                  className={`flex h-[clamp(54px,8dvh,74px)] min-w-[clamp(190px,22vw,280px)] items-center justify-center rounded-[8px] border border-[#2fa24a] bg-[#2fa24a] px-[clamp(22px,3vw,34px)] text-[clamp(21px,3.4dvh,27px)] font-black uppercase text-white shadow-[0_14px_30px_rgba(47,162,74,0.22)] disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          ) : null}

          {kioskStep === "familyForm" ? (
            <form
              onSubmit={handleFamilyCheckSubmit}
              noValidate
              data-kiosk-scrollable="true"
              onKeyDown={handleKioskFormKeyDown}
              onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
              onFocusCapture={scrollKioskFieldIntoView}
              className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} px-[clamp(48px,8vw,112px)] py-[clamp(24px,4dvh,48px)]`}
            >
              <h2 className="text-center text-[clamp(30px,5.2dvh,44px)] font-black leading-none text-[#06184a]">
                Please enter your information.
              </h2>
              <div className="mx-auto mt-[clamp(22px,4.5dvh,44px)] grid w-full max-w-[1040px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)]">
                <FlowTextField
                  label="First Name"
                  value={familyCheckForm.firstName}
                  onChange={(value) => setFamilyCheckForm((current) => ({ ...current, firstName: value }))}
                  placeholder="Enter first name"
                  required
                />
                <FlowTextField
                  label="Last Name"
                  value={familyCheckForm.lastName}
                  onChange={(value) => setFamilyCheckForm((current) => ({ ...current, lastName: value }))}
                  placeholder="Enter last name"
                  completesRequiredFields
                  required
                />
              </div>
              <h3 className="mt-[clamp(28px,5dvh,52px)] text-center text-[clamp(25px,4.2dvh,36px)] font-black leading-none text-[#061033]">
                Who Are You Visiting?
              </h3>
              <div className="mx-auto mt-[clamp(18px,3.5dvh,34px)] grid w-full max-w-[1040px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)]">
                <FlowTextField
                  label="First Name"
                  value={familyCheckForm.visitingFirstName}
                  onChange={(value) =>
                    setFamilyCheckForm((current) => ({ ...current, visitingFirstName: value }))
                  }
                  placeholder="Enter first name"
                />
                <FlowTextField
                  label="Last Name"
                  value={familyCheckForm.visitingLastName}
                  onChange={(value) =>
                    setFamilyCheckForm((current) => ({ ...current, visitingLastName: value }))
                  }
                  placeholder="Enter last name"
                  isLastField
                />
              </div>
              <div data-kiosk-submit-area="true" className={`${KIOSK_FLOW_STICKY_ACTION_CLASS} grid grid-cols-[minmax(150px,220px)_1fr] gap-[clamp(28px,5vw,56px)]`}>
                <FlowBackButton onClick={() => setKioskStep("visitorType")} />
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex h-[clamp(54px,8dvh,74px)] items-center justify-center rounded-[8px] border border-[#8bbdf4] bg-[#eff6ff] text-[clamp(21px,3.4dvh,27px)] font-black uppercase text-[#061033] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          ) : null}

          {kioskStep === "vendorForm" ? (
            <form
              onSubmit={handleVendorCheckSubmit}
              noValidate
              data-kiosk-scrollable="true"
              onKeyDown={handleKioskFormKeyDown}
              onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
              onFocusCapture={scrollKioskFieldIntoView}
              className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} px-[clamp(48px,6vw,92px)] py-[clamp(26px,4.5dvh,56px)]`}
            >
              <h2 className="text-center text-[clamp(30px,5.2dvh,44px)] font-black leading-none text-[#06184a]">
                Please enter your information.
              </h2>
              <div className="mt-[clamp(24px,5dvh,44px)] grid grid-cols-2 gap-x-[clamp(38px,5vw,56px)] gap-y-[clamp(18px,3.5dvh,40px)]">
                <FlowTextField
                  label="First Name"
                  value={vendorCheckForm.firstName}
                  onChange={(value) => setVendorCheckForm((current) => ({ ...current, firstName: value }))}
                  placeholder="Enter first name"
                  required
                />
                <FlowTextField
                  label="Last Name"
                  value={vendorCheckForm.lastName}
                  onChange={(value) => setVendorCheckForm((current) => ({ ...current, lastName: value }))}
                  placeholder="Enter last name"
                  required
                />
                <FlowTextField
                  label="Company Name"
                  value={vendorCheckForm.companyName}
                  onChange={(value) => setVendorCheckForm((current) => ({ ...current, companyName: value }))}
                  placeholder="Enter company name"
                  completesRequiredFields
                  required
                />
                <FlowTextField
                  label="Who You Are Visiting (Optional)"
                  value={vendorCheckForm.visiting}
                  onChange={(value) => setVendorCheckForm((current) => ({ ...current, visiting: value }))}
                  placeholder="Enter resident name"
                  isLastField
                />
              </div>
              <div data-kiosk-submit-area="true" className={`${KIOSK_FLOW_STICKY_ACTION_CLASS} grid grid-cols-[minmax(150px,220px)_1fr] gap-[clamp(28px,5vw,56px)]`}>
                <FlowBackButton onClick={() => setKioskStep("visitorType")} />
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex h-[clamp(54px,8dvh,74px)] items-center justify-center rounded-[8px] border border-[#8bbdf4] bg-[#eff6ff] text-[clamp(21px,3.4dvh,27px)] font-black uppercase text-[#061033] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          ) : null}

          {kioskStep === "checkoutForm" ? (
            <form
              onSubmit={handleCheckoutSubmit}
              noValidate
              data-kiosk-scrollable="true"
              onKeyDown={handleKioskFormKeyDown}
              onPointerDown={dismissKioskKeyboardOnOutsidePointerDown}
              onFocusCapture={scrollKioskFieldIntoView}
              className={`${KIOSK_FLOW_FORM_SCROLL_CLASS} px-[clamp(48px,8vw,112px)] py-[clamp(24px,4dvh,48px)]`}
            >
              <h2 className="text-center text-[clamp(30px,5.2dvh,44px)] font-black leading-none text-[#06184a]">
                Please enter your information.
              </h2>

              {checkoutType === "resident" ? (
                <div className="mx-auto mt-[clamp(34px,6dvh,64px)] grid w-full max-w-[1040px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)] gap-y-[clamp(22px,4dvh,42px)]">
                  <FlowTextField
                    label="First Name"
                    value={checkoutForm.firstName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, firstName: value }))}
                    placeholder="Enter first name"
                    required
                  />
                  <FlowTextField
                    label="Last Name"
                    value={checkoutForm.lastName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, lastName: value }))}
                    placeholder="Enter last name"
                    required
                  />
                  <div className="col-span-2">
                    <FlowSelectField
                      label="Duration of Time"
                      value={checkoutForm.checkoutDuration}
                      onChange={(value) => setCheckoutForm((current) => ({ ...current, checkoutDuration: value }))}
                      placeholder="Select duration"
                      options={CHECKOUT_DURATION_OPTIONS}
                      required
                    />
                  </div>
                </div>
              ) : null}

              {checkoutType === "family" ? (
                <div className="mx-auto mt-[clamp(24px,4.5dvh,44px)] grid w-full max-w-[1180px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)] gap-y-[clamp(16px,3dvh,30px)]">
                  <FlowTextField
                    label="Your First Name"
                    value={checkoutForm.firstName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, firstName: value }))}
                    placeholder="Enter your first name"
                    required
                  />
                  <FlowTextField
                    label="Your Last Name"
                    value={checkoutForm.lastName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, lastName: value }))}
                    placeholder="Enter your last name"
                    completesRequiredFields
                    required
                  />
                  <h3 className="col-span-2 mt-[clamp(4px,1dvh,10px)] text-center text-[clamp(24px,4.2dvh,36px)] font-black leading-none text-[#111827]">
                    Checking Out Resident (If Applicable)
                  </h3>
                  <FlowTextField
                    label="Resident First Name"
                    value={checkoutForm.checkedOutFirstName}
                    onChange={(value) =>
                      setCheckoutForm((current) => ({ ...current, checkedOutFirstName: value }))
                    }
                    placeholder="Enter resident first name"
                  />
                  <FlowTextField
                    label="Resident Last Name"
                    value={checkoutForm.checkedOutLastName}
                    onChange={(value) =>
                      setCheckoutForm((current) => ({ ...current, checkedOutLastName: value }))
                    }
                    placeholder="Enter resident last name"
                  />
                  <FlowTextField
                    label="Phone Number"
                    value={checkoutForm.phone}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, phone: value }))}
                    placeholder="Enter your phone number"
                    type="tel"
                    isLastField
                  />
                  <FlowSelectField
                    label="How long will you be gone?"
                    value={checkoutForm.checkoutDuration}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, checkoutDuration: value }))}
                    placeholder="Select duration"
                    options={CHECKOUT_DURATION_OPTIONS}
                    keepLabelOnOneLine
                  />
                </div>
              ) : null}

              {checkoutType === "vendor" ? (
                <div className="mx-auto mt-[clamp(34px,6dvh,64px)] grid w-full max-w-[1180px] grid-cols-2 gap-x-[clamp(38px,6vw,80px)] gap-y-[clamp(24px,4dvh,42px)]">
                  <FlowTextField
                    label="First Name"
                    value={checkoutForm.firstName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, firstName: value }))}
                    placeholder="Enter first name"
                    required
                  />
                  <FlowTextField
                    label="Last Name"
                    value={checkoutForm.lastName}
                    onChange={(value) => setCheckoutForm((current) => ({ ...current, lastName: value }))}
                    placeholder="Enter last name"
                    required
                  />
                  <div className="col-span-2">
                    <FlowTextField
                      label="Company Name"
                      value={checkoutForm.companyName}
                      onChange={(value) => setCheckoutForm((current) => ({ ...current, companyName: value }))}
                      placeholder="Enter company name"
                      isLastField
                      required
                    />
                  </div>
                </div>
              ) : null}

              <div data-kiosk-submit-area="true" className={`${KIOSK_FLOW_STICKY_ACTION_CLASS} grid grid-cols-[minmax(150px,220px)_1fr] gap-[clamp(28px,5vw,56px)]`}>
                <FlowBackButton onClick={() => setKioskStep("checkoutType")} />
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex h-[clamp(54px,8dvh,74px)] items-center justify-center rounded-[8px] border border-[#8bbdf4] bg-[#eff6ff] text-[clamp(21px,3.4dvh,27px)] font-black uppercase text-[#061033] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${KIOSK_BUTTON_TOUCH_CLASS}`}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          ) : null}

          {kioskStep === "thankYou" || kioskStep === "feedbackPrompt" ? (
            <div className="relative flex h-full flex-col items-center justify-center px-[clamp(28px,5vw,40px)] py-[clamp(24px,4.5dvh,56px)] text-center">
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(180px,30dvh,280px)] max-w-[clamp(360px,46vw,620px)]" />
              <div className="mt-[clamp(34px,6dvh,56px)] text-[clamp(52px,8.8dvh,78px)] font-black leading-none text-[#06184a]">Thank you!</div>
              <div className="mt-[clamp(16px,3dvh,28px)] text-[clamp(24px,4dvh,34px)] font-medium leading-none text-[#4b5563]">
                {kioskStep === "feedbackPrompt"
                  ? "We value your feedback."
                  : `You have been successfully ${checkAction === "check_in" ? "checked in" : "checked out"}.`}
              </div>
              <KioskFeedbackPrompt
                selectedRating={feedbackRating}
                onSelect={(rating) =>
                  handleFeedbackRating(rating, kioskStep === "feedbackPrompt" ? "header" : "visitor")
                }
              />
              <FlowBackButton onClick={resetKioskFlow} className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]" />
            </div>
          ) : null}

          {kioskStep === "feedbackThanks" ? (
            <div role="status" aria-live="polite" className="relative flex h-full flex-col items-center justify-center px-[clamp(28px,5vw,54px)] py-[clamp(24px,4.5dvh,56px)] text-center">
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(170px,28dvh,270px)] max-w-[clamp(350px,46vw,620px)]" />
              <div className="mt-[clamp(34px,6dvh,58px)] text-[clamp(52px,8.8dvh,78px)] font-black leading-none text-[#06184a]">Thank you!</div>
              <div className="mt-[clamp(18px,3.2dvh,30px)] text-[clamp(25px,4.2dvh,38px)] font-medium leading-[1.35] text-[#4b5563]">
                We appreciate your feedback!
              </div>
              <FlowBackButton onClick={resetKioskFlow} className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]" />
            </div>
          ) : null}

          {kioskStep === "feedbackReview" && feedbackReviewQrUrl ? (
            <div role="status" aria-live="polite" className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pb-[clamp(86px,12dvh,118px)] pt-[clamp(18px,3dvh,34px)] text-center">
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(100px,16dvh,170px)] max-w-[clamp(270px,38vw,500px)]" />
              <div className="mt-[clamp(18px,3dvh,30px)] text-[clamp(42px,7dvh,66px)] font-black leading-none text-[#06184a]">Thank you!</div>
              <div className="mt-[clamp(12px,2dvh,20px)] max-w-[980px] text-[clamp(20px,3.3dvh,31px)] font-medium leading-[1.35] text-[#374151]">
                Scan the QR code to leave us a Google review.
              </div>
              <div className="relative mt-[clamp(16px,2.6dvh,26px)] rounded-[12px] border border-[#c9cde0] bg-white p-[clamp(8px,1.4dvh,14px)] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                <Image
                  src={feedbackReviewQrUrl}
                  alt={`${businessName} feedback and review QR code`}
                  width={420}
                  height={420}
                  className="h-[clamp(220px,35dvh,380px)] w-[clamp(220px,35dvh,380px)]"
                  unoptimized
                />
                <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14%] bg-white p-[1.5%] shadow-[0_0_0_3px_white]">
                  <Image
                    src="/google-review-logo.png"
                    alt=""
                    aria-hidden="true"
                    width={225}
                    height={225}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="mt-[clamp(12px,2dvh,20px)] max-w-[980px] text-[clamp(18px,2.8dvh,27px)] font-medium leading-[1.4] text-[#4b5563]">
                It only takes a minute, and your support means so much to our team.
              </div>
              <FlowBackButton onClick={resetKioskFlow} className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]" />
            </div>
          ) : null}

          {kioskStep === "feedbackFormQr" && feedbackFormQrUrl ? (
            <div role="status" aria-live="polite" className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pb-[clamp(86px,12dvh,118px)] pt-[clamp(18px,3dvh,34px)] text-center">
              <KioskLogo logoUrl={logoUrl} businessName={businessName} className="max-h-[clamp(100px,16dvh,170px)] max-w-[clamp(270px,38vw,500px)]" />
              <div className="mt-[clamp(18px,3dvh,30px)] text-[clamp(42px,7dvh,66px)] font-black leading-none text-[#06184a]">Thank you!</div>
              <div className="mt-[clamp(12px,2dvh,20px)] max-w-[980px] text-[clamp(20px,3.3dvh,31px)] font-medium leading-[1.35] text-[#374151]">
                Scan the QR code to share your {feedbackRating}-star feedback.
              </div>
              <div className="relative mt-[clamp(16px,2.6dvh,26px)] rounded-[12px] border border-[#c9cde0] bg-white p-[clamp(8px,1.4dvh,14px)] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                <Image
                  src={feedbackFormQrUrl}
                  alt={`${businessName} private feedback form QR code`}
                  width={420}
                  height={420}
                  className="h-[clamp(220px,35dvh,380px)] w-[clamp(220px,35dvh,380px)]"
                  unoptimized
                />
              </div>
              <div className="mt-[clamp(12px,2dvh,20px)] max-w-[980px] text-[clamp(18px,2.8dvh,27px)] font-medium leading-[1.4] text-[#4b5563]">
                It only takes a minute, and your feedback helps our team improve.
              </div>
              <FlowBackButton onClick={resetKioskFlow} className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]" />
            </div>
          ) : null}

          {kioskStep === "nurseAssessmentQr" ? (
            <div className="relative flex h-full flex-col items-center px-[clamp(28px,5vw,54px)] pt-[clamp(18px,3dvh,34px)] pb-[clamp(86px,12dvh,118px)] text-center">
              <KioskLogo
                logoUrl={logoUrl}
                businessName={businessName}
                className="max-h-[clamp(110px,18dvh,190px)] max-w-[clamp(280px,38vw,500px)]"
              />
              <div className="mt-[clamp(22px,4dvh,42px)] text-[clamp(36px,6dvh,58px)] font-black leading-none text-black">
                Welcome Outside Providers!
              </div>
              <div className="mt-[clamp(12px,2dvh,22px)] text-[clamp(22px,3.8dvh,34px)] font-medium leading-none text-black">
                Please scan the QR code to fill our form out
              </div>
              <div className="mt-[clamp(22px,4dvh,42px)] rounded-[8px] border border-[#c9cde0] bg-white p-[clamp(8px,1.4dvh,14px)] shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
                <Image
                  src={nurseAssessmentQrUrl}
                  alt={`${businessName} nurse assessment QR code`}
                  width={420}
                  height={420}
                  className="h-[clamp(230px,38dvh,420px)] w-[clamp(230px,38dvh,420px)]"
                  unoptimized
                />
              </div>
              <div className="mt-[clamp(22px,4dvh,40px)] text-[clamp(21px,3.6dvh,32px)] font-serif italic leading-none text-black">
                Thank you for serving our community.
              </div>
              <div className="mt-[clamp(8px,1.4dvh,14px)] flex items-center gap-3 text-[#8a947d]">
                <span className="h-px w-[clamp(70px,9vw,120px)] bg-[#cfd4c9]" />
                <span className="text-[clamp(20px,3dvh,28px)] leading-none">&hearts;</span>
                <span className="h-px w-[clamp(70px,9vw,120px)] bg-[#cfd4c9]" />
              </div>
	              <FlowBackButton
	                onClick={() => {
	                  if (hasHeaderIntakeButton || hasLegacyHeaderIntakeButton) {
	                    resetKioskFlow();
	                    return;
	                  }
                  setKioskStep("thankYou");
                }}
                className="absolute bottom-[clamp(18px,3dvh,28px)] left-[clamp(18px,3vw,32px)]"
              />
            </div>
          ) : null}
        </KioskFlowShell>
      ) : null}

      {notice ? <Notice message={notice} onDone={resetKioskFlow} /> : null}
    </main>
  );
}
