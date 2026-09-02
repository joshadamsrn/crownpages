'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  CheckCircle2,
  Handshake,
  Plus,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ContactLeadForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note: string;
}

interface MeetingAttendeeForm {
  fullName: string;
  email: string;
  phone: string;
}

interface PageEngagementActionsProps {
  pageId: string;
  pageTitle: string;
  includeInstaConnect: boolean;
  includeScheduleMeeting: boolean;
  forceMobileLayout?: boolean;
}

interface ConnectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
}

const EMPTY_CONNECT_PERSON: ContactLeadForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  note: '',
};

const EMPTY_GUEST: MeetingAttendeeForm = {
  fullName: '',
  email: '',
  phone: '',
};

const MODAL_FORM_SCROLL_CLASS =
  'flex-1 space-y-5 overflow-y-auto px-6 pt-2 pb-0 scroll-pb-32 [overscroll-behavior:contain] [-webkit-overflow-scrolling:touch] md:px-8';

const MODAL_ACTION_FOOTER_CLASS =
  'sticky bottom-0 z-20 -mx-6 flex flex-col gap-3 border-t border-[#eef2f7] bg-white/95 px-6 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:-mx-8 md:flex-row md:px-8';

const VISITOR_ID_KEY = 'crownpages_visitor_id';
const ANONYMOUS_VISITOR_ID_KEY = 'crownpages_anonymous_visitor_id';
const SESSION_ID_KEY = 'crownpages_session_id';
const TRACKING_CODE_KEY = 'crownpages_tl';
const ATTRIBUTION_MODE_KEY = 'crownpages_attribution_mode';
const NAMED_ATTRIBUTION_KEY = 'crownpages_named_attribution';

function buildMeetingSlots() {
  const slots: string[] = [];
  for (let hour = 9; hour <= 16; hour += 1) {
    for (const minute of [0, 30]) {
      if (hour === 16 && minute === 30) {
        continue;
      }
      const hourLabel = hour > 12 ? hour - 12 : hour;
      const amPm = hour >= 12 ? 'PM' : 'AM';
      const minuteLabel = minute === 0 ? '00' : '30';
      slots.push(`${String(hour).padStart(2, '0')}:${minuteLabel}|${hourLabel}:${minuteLabel} ${amPm}`);
    }
  }
  return slots;
}

function isValidUsPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

function getTodayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
}

function isWeekend(dateValue: string) {
  const localDate = new Date(`${dateValue}T12:00:00`);
  const day = localDate.getDay();
  return day === 0 || day === 6;
}

function combineLocalDateAndTime(dateValue: string, timeValue: string) {
  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

function formatSelectedMeeting(dateValue: string, timeValue: string, timezone: string) {
  if (!dateValue || !timeValue) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(combineLocalDateAndTime(dateValue, timeValue)));
}

function formatDateFieldValue(dateValue: string) {
  if (!dateValue) {
    return 'Select a date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${dateValue}T12:00:00`));
}

function generateTempId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getAttributionMode() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.location.pathname.startsWith('/share/')) {
    return 'quick_share';
  }

  try {
    const mode = sessionStorage.getItem(ATTRIBUTION_MODE_KEY);
    return mode === 'anonymous' || mode === 'quick_share' || mode === 'contact' ? mode : null;
  } catch {
    return null;
  }
}

function getAnalyticsIdentity() {
  if (typeof window === 'undefined') {
    return { visitorId: null, sessionId: null };
  }

  let visitorId: string | null = null;
  let sessionId: string | null = null;
  const attributionMode = getAttributionMode();
  const usesAnonymousVisitor = attributionMode === 'anonymous' || attributionMode === 'quick_share';

  try {
    visitorId = usesAnonymousVisitor
      ? sessionStorage.getItem(ANONYMOUS_VISITOR_ID_KEY)
      : localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateTempId(usesAnonymousVisitor ? 'unknown' : 'visitor');
      if (usesAnonymousVisitor) {
        sessionStorage.setItem(ANONYMOUS_VISITOR_ID_KEY, visitorId);
      } else {
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
      }
    }
  } catch {
    visitorId = generateTempId(usesAnonymousVisitor ? 'unknown' : 'visitor');
  }

  try {
    sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = generateTempId('session');
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
  } catch {
    sessionId = generateTempId('session');
  }

  return { visitorId, sessionId };
}

function getTrackingCode() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (getAttributionMode() === 'quick_share') {
    return null;
  }

  try {
    const sessionMode = getAttributionMode();
    const sessionTrackingCode = sessionStorage.getItem(TRACKING_CODE_KEY);

    if (sessionTrackingCode) {
      return sessionTrackingCode;
    }

    const storedAttribution = localStorage.getItem(NAMED_ATTRIBUTION_KEY);
    if (!storedAttribution) {
      return null;
    }

    const parsed = JSON.parse(storedAttribution) as { trackingCode?: unknown };
    return typeof parsed.trackingCode === 'string' ? parsed.trackingCode : null;
  } catch {
    return null;
  }
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  fullWidth = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  const buttonStyle: CSSProperties = {
    borderColor: '#0f4fb3',
    background: 'linear-gradient(180deg, #ffffff 0%, #edf4ff 100%)',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={buttonStyle}
      className={`flex min-h-[56px] items-center justify-center gap-2.5 rounded-full border-2 px-4 py-3 text-left shadow-[0_1px_6px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(15,23,42,0.10)] ${fullWidth ? 'w-full' : 'w-full md:w-auto md:min-w-[210px]'}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#0f4fb3]">
        <Icon className="block" />
      </span>
      <span className="min-w-0 text-[15px] font-semibold leading-none text-[#1b2431]">
        {label}
      </span>
    </button>
  );
}

function SubmissionNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[999998] flex items-center justify-center px-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-none absolute inset-0 bg-black/20" />
      <div className="relative w-full max-w-sm rounded-[28px] bg-white px-6 py-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.38)]">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full bg-[#f3f4f6] p-2 text-[#6b7280] transition hover:bg-[#e5e7eb]"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef4ff] text-[#1d4f91]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="text-lg font-semibold text-[#111827]">Request Sent</div>
        <div className="mt-2 text-sm leading-6 text-[#4b5563]">{message}</div>
      </div>
    </div>
  );
}

function Field({
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#1d4f91] focus:ring-2 focus:ring-[#bfdbfe]"
    />
  );
}

function SmsConsentNotice({
  checked,
  onCheckedChange,
  businessLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  businessLabel: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-[#d7dbe4] bg-[#fbfcfe] p-4">
      <label className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5 h-5 w-5 rounded border-[#9ca3af] data-[state=checked]:border-[#1d4f91] data-[state=checked]:bg-[#1d4f91]"
        />
        <div className="text-sm leading-6 text-[#374151]">
          <span>
            I agree to receive SMS text messages from {businessLabel}.
          </span>{' '}
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="font-semibold text-[#1d4f91] underline underline-offset-2"
          >
            {isExpanded ? 'View Less' : 'View More'}
          </button>
          {isExpanded ? (
            <div className="mt-3">
              via Crown Pages about my inquiry and scheduling updates at the phone number
              provided. Consent is not a condition of purchase or use of the service. Message
              frequency varies. Message & data rates may apply. Reply STOP to opt out and HELP for
              help. View our{' '}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#1d4f91] underline underline-offset-2"
              >
                Privacy Policy
              </a>{' '}
              and{' '}
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#1d4f91] underline underline-offset-2"
              >
                Terms & Conditions
              </a>
              .
            </div>
          ) : null}
        </div>
      </label>
    </div>
  );
}

function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      documentElement.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

function useVisualViewportModalStyle(isActive: boolean): CSSProperties | undefined {
  const [viewportStyle, setViewportStyle] = useState<CSSProperties | undefined>();

  useEffect(() => {
    if (!isActive || typeof window === 'undefined' || !window.visualViewport) {
      setViewportStyle(undefined);
      return;
    }

    const visualViewport = window.visualViewport;

    const syncViewport = () => {
      setViewportStyle({
        top: visualViewport.offsetTop,
        left: visualViewport.offsetLeft,
        right: 'auto',
        bottom: 'auto',
        width: visualViewport.width,
        height: visualViewport.height,
      });
    };

    syncViewport();
    visualViewport.addEventListener('resize', syncViewport);
    visualViewport.addEventListener('scroll', syncViewport);

    return () => {
      visualViewport.removeEventListener('resize', syncViewport);
      visualViewport.removeEventListener('scroll', syncViewport);
    };
  }, [isActive]);

  return viewportStyle;
}

export function ConnectRequestModal({
  isOpen,
  onClose,
  pageId,
  pageTitle,
}: ConnectRequestModalProps) {
  const modalBodyRef = useRef<HTMLFormElement | null>(null);
  const [connectLeads, setConnectLeads] = useState<ContactLeadForm[]>([
    { ...EMPTY_CONNECT_PERSON },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasSmsConsent, setHasSmsConsent] = useState(false);
  const modalViewportStyle = useVisualViewportModalStyle(isOpen);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [isOpen]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const closeModal = () => {
    setErrorMessage(null);
    onClose();
  };

  const handleConnectChange = (
    index: number,
    field: keyof ContactLeadForm,
    value: string
  ) => {
    setConnectLeads((current) =>
      current.map((lead, currentIndex) =>
        currentIndex === index ? { ...lead, [field]: value } : lead
      )
    );
  };

  const handleConnectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (
      connectLeads.some(
        (lead) =>
          !lead.firstName.trim() ||
          !lead.lastName.trim() ||
          !lead.phone.trim() ||
          !isValidUsPhone(lead.phone)
      )
    ) {
      setErrorMessage('Each person must include first name, last name, and a valid phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const identity = getAnalyticsIdentity();
      const trackingCode = getTrackingCode();
      const response = await fetch('/api/instaconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          leads: connectLeads,
          ...identity,
          trackingCode,
          smsConsent: hasSmsConsent,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit your request.');
      }

      setConnectLeads([{ ...EMPTY_CONNECT_PERSON }]);
      setHasSmsConsent(false);
      closeModal();
      setSuccessMessage('Your request was sent.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const modalMarkup = (
    <>
      {successMessage && (
        <SubmissionNotice
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
      {isOpen ? (
        <div
          className="fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/55 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:items-center md:py-8"
          style={{ ...modalViewportStyle, zIndex: 2147483646 }}
        >
          <div
            className="relative my-auto flex max-h-[90vh] max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]"
            style={{ zIndex: 2147483647 }}
          >
            <div className="sticky top-0 z-20 flex justify-end bg-white/96 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm md:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-[#f3f4f6] p-2 text-[#6b7280] transition hover:bg-[#e5e7eb]"
                aria-label="Close connect form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              ref={modalBodyRef}
              onSubmit={handleConnectSubmit}
              className={MODAL_FORM_SCROLL_CLASS}
            >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#1d4f91]">
                <Handshake className="h-9 w-9" />
              </div>
              <h2 className="text-2xl font-semibold text-[#111827]">Let&apos;s Connect</h2>
              <p className="mt-2 max-w-lg text-sm text-[#6b7280]">
                Enter contact information below and we&apos;ll send it directly to {pageTitle}.
              </p>
            </div>

            {connectLeads.map((lead, index) => (
              <div key={`connect-person-${index}`} className="space-y-3 rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4">
                {connectLeads.length > 1 && (
                  <div className="text-sm font-semibold text-[#1f2937]">Person {index + 1}</div>
                )}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field
                    value={lead.firstName}
                    onChange={(value) => handleConnectChange(index, 'firstName', value)}
                    placeholder="First Name"
                    required
                  />
                  <Field
                    value={lead.lastName}
                    onChange={(value) => handleConnectChange(index, 'lastName', value)}
                    placeholder="Last Name"
                    required
                  />
                </div>
                <Field
                  value={lead.email}
                  onChange={(value) => handleConnectChange(index, 'email', value)}
                  placeholder="Email Address (Optional)"
                  type="email"
                />
                <Field
                  value={lead.phone}
                  onChange={(value) => handleConnectChange(index, 'phone', value)}
                  placeholder="Phone Number"
                  type="tel"
                  required
                />
                <textarea
                  value={lead.note}
                  onChange={(event) => handleConnectChange(index, 'note', event.target.value)}
                  placeholder="Note (Optional)"
                  className="min-h-20 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#1d4f91] focus:ring-2 focus:ring-[#bfdbfe]"
                />
              </div>
            ))}

            {errorMessage && (
              <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                {errorMessage}
              </div>
            )}

            <SmsConsentNotice
              checked={hasSmsConsent}
              onCheckedChange={setHasSmsConsent}
              businessLabel={pageTitle}
            />

            <div className={MODAL_ACTION_FOOTER_CLASS}>
              <button
                type="button"
                onClick={() =>
                  setConnectLeads((current) => [...current, { ...EMPTY_CONNECT_PERSON }])
                }
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#1d4f91] bg-white px-4 py-3 font-semibold text-[#1d4f91] transition hover:bg-[#f8fbff]"
              >
                <UserRoundPlus className="h-5 w-5" />
                Add Person
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-[#1d4f91] px-4 py-3 font-semibold text-white transition hover:bg-[#173f74] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );

  if (typeof document === 'undefined') {
    return modalMarkup;
  }

  return createPortal(modalMarkup, document.body);
}

export function PageEngagementActions({
  pageId,
  pageTitle,
  includeInstaConnect,
  includeScheduleMeeting,
  forceMobileLayout = false,
}: PageEngagementActionsProps) {
  const activeModalBodyRef = useRef<HTMLFormElement | null>(null);
  const [activeModal, setActiveModal] = useState<'connect' | 'schedule' | null>(null);
  const [connectLeads, setConnectLeads] = useState<ContactLeadForm[]>([
    { ...EMPTY_CONNECT_PERSON },
  ]);
  const [meetingPrimary, setMeetingPrimary] = useState<MeetingAttendeeForm>({
    ...EMPTY_GUEST,
  });
  const [meetingGuests, setMeetingGuests] = useState<MeetingAttendeeForm[]>([]);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectHasSmsConsent, setConnectHasSmsConsent] = useState(false);
  const [meetingHasSmsConsent, setMeetingHasSmsConsent] = useState(false);
  const meetingDateInputRef = useRef<HTMLInputElement | null>(null);
  const modalViewportStyle = useVisualViewportModalStyle(activeModal !== null);

  useBodyScrollLock(activeModal !== null);

  const timezone =
    typeof window !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'America/Denver';
  const meetingSlots = useMemo(() => buildMeetingSlots(), []);
  const hasButtons = includeInstaConnect || includeScheduleMeeting;
  const buttonCount = Number(includeInstaConnect) + Number(includeScheduleMeeting);

  useEffect(() => {
    if (!activeModal) return;

    requestAnimationFrame(() => {
      activeModalBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [activeModal]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  if (!hasButtons) {
    return null;
  }

  const closeModal = () => {
    setActiveModal(null);
    setErrorMessage(null);
  };

  const resetConnectForm = () => {
    setConnectLeads([{ ...EMPTY_CONNECT_PERSON }]);
    setConnectHasSmsConsent(false);
  };

  const resetMeetingForm = () => {
    setMeetingPrimary({ ...EMPTY_GUEST });
    setMeetingGuests([]);
    setMeetingDate('');
    setMeetingTime('');
    setMeetingHasSmsConsent(false);
  };

  const handleConnectChange = (
    index: number,
    field: keyof ContactLeadForm,
    value: string
  ) => {
    setConnectLeads((current) =>
      current.map((lead, currentIndex) =>
        currentIndex === index ? { ...lead, [field]: value } : lead
      )
    );
  };

  const handleGuestChange = (
    index: number,
    field: keyof MeetingAttendeeForm,
    value: string
  ) => {
    setMeetingGuests((current) =>
      current.map((guest, currentIndex) =>
        currentIndex === index ? { ...guest, [field]: value } : guest
      )
    );
  };

  const handleConnectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (
      connectLeads.some(
        (lead) =>
          !lead.firstName.trim() ||
          !lead.lastName.trim() ||
          !lead.phone.trim() ||
          !isValidUsPhone(lead.phone)
      )
    ) {
      setErrorMessage('Each person must include first name, last name, and a valid phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const identity = getAnalyticsIdentity();
      const trackingCode = getTrackingCode();
      const response = await fetch('/api/instaconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          leads: connectLeads,
          ...identity,
          trackingCode,
          smsConsent: connectHasSmsConsent,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit your request.');
      }

      resetConnectForm();
      closeModal();
      setSuccessMessage('Your request was sent.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!meetingPrimary.fullName.trim()) {
      setErrorMessage('Please enter the primary attendee’s name.');
      return;
    }

    if (!meetingPrimary.phone.trim() || !isValidUsPhone(meetingPrimary.phone)) {
      setErrorMessage('Please enter a valid phone number for the primary attendee.');
      return;
    }

    if (!meetingDate || !meetingTime) {
      setErrorMessage('Please select a weekday date and time between 9:00 AM and 4:00 PM.');
      return;
    }

    if (isWeekend(meetingDate)) {
      setErrorMessage('Weekend meeting requests are not available.');
      return;
    }

    if (
      meetingGuests.some(
        (guest) =>
          !guest.fullName.trim() || (guest.phone.trim() && !isValidUsPhone(guest.phone))
      )
    ) {
      setErrorMessage('Each guest must include a name. Any guest phone number entered must be valid.');
      return;
    }

    setSubmitting(true);
    try {
      const requestedTimeLabel = formatSelectedMeeting(meetingDate, meetingTime, timezone);
      const identity = getAnalyticsIdentity();
      const trackingCode = getTrackingCode();
      const response = await fetch('/api/schedule-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId,
          timezone,
          requestedAtIso: combineLocalDateAndTime(meetingDate, meetingTime),
          attendees: [meetingPrimary, ...meetingGuests],
          ...identity,
          trackingCode,
          smsConsent: meetingHasSmsConsent,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit the meeting request.');
      }

      resetMeetingForm();
      closeModal();
      setSuccessMessage(`Meeting request submitted for ${requestedTimeLabel}.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to submit the meeting request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="max-w-5xl px-4 pt-1 pb-4">
        <div
          className={
            forceMobileLayout
              ? "grid grid-cols-2 gap-3"
              : "grid grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-4"
          }
        >
          {includeInstaConnect && (
            <ActionButton
              fullWidth={buttonCount > 1}
              icon={Handshake}
              label="Connect"
              onClick={() => setActiveModal('connect')}
            />
          )}
          {includeScheduleMeeting && (
            <ActionButton
              fullWidth={buttonCount > 1}
              icon={CalendarDays}
              label="Visit"
              onClick={() => setActiveModal('schedule')}
            />
          )}
        </div>
      </section>

      {successMessage && (
        <SubmissionNotice
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}

      {activeModal && (
        <div
          className="fixed inset-0 z-[999997] flex items-start justify-center overflow-y-auto bg-black/55 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:items-center md:py-8"
          style={modalViewportStyle}
        >
          <div className="relative my-auto flex max-h-[90vh] max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
            <div className="sticky top-0 z-20 flex justify-end bg-white/96 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 backdrop-blur-sm md:px-6">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-[#f3f4f6] p-2 text-[#6b7280] transition hover:bg-[#e5e7eb]"
                aria-label={activeModal === 'connect' ? 'Close connect form' : 'Close schedule visit form'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeModal === 'connect' ? (
              <form
                ref={activeModalBodyRef}
                onSubmit={handleConnectSubmit}
                className={MODAL_FORM_SCROLL_CLASS}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#1d4f91]">
                    <Handshake className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-semibold text-[#111827]">Let&apos;s Connect</h2>
                  <p className="mt-2 max-w-lg text-sm text-[#6b7280]">
                    Enter contact information below and we&apos;ll send it directly to {pageTitle}.
                  </p>
                </div>

                {connectLeads.map((lead, index) => (
                  <div key={`connect-person-${index}`} className="space-y-3 rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4">
                    {connectLeads.length > 1 && (
                      <div className="text-sm font-semibold text-[#1f2937]">Person {index + 1}</div>
                    )}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field
                        value={lead.firstName}
                        onChange={(value) => handleConnectChange(index, 'firstName', value)}
                        placeholder="First Name"
                        required
                      />
                      <Field
                        value={lead.lastName}
                        onChange={(value) => handleConnectChange(index, 'lastName', value)}
                        placeholder="Last Name"
                        required
                      />
                    </div>
                    <Field
                      value={lead.email}
                      onChange={(value) => handleConnectChange(index, 'email', value)}
                      placeholder="Email Address (Optional)"
                      type="email"
                    />
                    <Field
                      value={lead.phone}
                      onChange={(value) => handleConnectChange(index, 'phone', value)}
                      placeholder="Phone Number"
                      type="tel"
                      required
                    />
                    <textarea
                      value={lead.note}
                      onChange={(event) => handleConnectChange(index, 'note', event.target.value)}
                      placeholder="Note (Optional)"
                      className="min-h-20 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 py-3 text-[15px] text-[#111827] outline-none transition focus:border-[#1d4f91] focus:ring-2 focus:ring-[#bfdbfe]"
                    />
                  </div>
                ))}

                {errorMessage && (
                  <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                    {errorMessage}
                  </div>
                )}

                <SmsConsentNotice
                  checked={connectHasSmsConsent}
                  onCheckedChange={setConnectHasSmsConsent}
                  businessLabel={pageTitle}
                />

                <div className={MODAL_ACTION_FOOTER_CLASS}>
                  <button
                    type="button"
                    onClick={() =>
                      setConnectLeads((current) => [...current, { ...EMPTY_CONNECT_PERSON }])
                    }
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#1d4f91] bg-white px-4 py-3 font-semibold text-[#1d4f91] transition hover:bg-[#f8fbff]"
                  >
                    <UserRoundPlus className="h-5 w-5" />
                    Add Person
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-[#1d4f91] px-4 py-3 font-semibold text-white transition hover:bg-[#173f74] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            ) : (
              <form
                ref={activeModalBodyRef}
                onSubmit={handleScheduleSubmit}
                className={MODAL_FORM_SCROLL_CLASS}
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef4ff] text-[#1d4f91]">
                    <CalendarDays className="h-9 w-9" />
                  </div>
                  <h2 className="text-2xl font-semibold text-[#111827]">Schedule Visit</h2>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#111827]">Date</span>
                    <div className="relative h-12 w-full">
                      <div className="flex h-12 w-full items-center rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#111827] outline-none transition">
                        <span className={meetingDate ? 'text-[#111827]' : 'text-[#6b7280]'}>
                          {formatDateFieldValue(meetingDate)}
                        </span>
                      </div>
                      <input
                        ref={meetingDateInputRef}
                        type="date"
                        min={getTodayIsoDate()}
                        value={meetingDate}
                        onChange={(event) => setMeetingDate(event.target.value)}
                        className="absolute inset-0 h-12 w-full cursor-pointer opacity-0"
                      />
                    </div>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[#111827]">Time</span>
                    <select
                      value={meetingTime}
                      onChange={(event) => setMeetingTime(event.target.value)}
                      className="h-12 w-full rounded-xl border border-[#d7dbe4] bg-white px-4 text-[15px] text-[#111827] outline-none transition focus:border-[#1d4f91] focus:ring-2 focus:ring-[#bfdbfe]"
                    >
                      <option value="">Select a time</option>
                      {meetingSlots.map((slot) => {
                        const [value, label] = slot.split('|');
                        return (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>

                <div className="rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4">
                  <div className="space-y-3">
                    <Field
                      value={meetingPrimary.fullName}
                      onChange={(value) => setMeetingPrimary((current) => ({ ...current, fullName: value }))}
                      placeholder="Full Name"
                      required
                    />
                    <Field
                      value={meetingPrimary.email}
                      onChange={(value) => setMeetingPrimary((current) => ({ ...current, email: value }))}
                      placeholder="Email Address (Optional)"
                      type="email"
                    />
                    <Field
                      value={meetingPrimary.phone}
                      onChange={(value) => setMeetingPrimary((current) => ({ ...current, phone: value }))}
                      placeholder="Phone Number"
                      type="tel"
                      required
                    />
                  </div>
                </div>

                {meetingGuests.map((guest, index) => (
                  <div key={`meeting-guest-${index}`} className="space-y-3 rounded-2xl border border-[#edf0f5] bg-[#fbfcfe] p-4">
                    <div className="text-sm font-semibold text-[#1f2937]">Guest {index + 1}</div>
                    <Field
                      value={guest.fullName}
                      onChange={(value) => handleGuestChange(index, 'fullName', value)}
                      placeholder="Guest Name"
                      required
                    />
                    <Field
                      value={guest.email}
                      onChange={(value) => handleGuestChange(index, 'email', value)}
                      placeholder="Email Address (Optional)"
                      type="email"
                    />
                    <Field
                      value={guest.phone}
                      onChange={(value) => handleGuestChange(index, 'phone', value)}
                      placeholder="Phone Number (Optional)"
                      type="tel"
                    />
                  </div>
                ))}

                {errorMessage && (
                  <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                    {errorMessage}
                  </div>
                )}

                <SmsConsentNotice
                  checked={meetingHasSmsConsent}
                  onCheckedChange={setMeetingHasSmsConsent}
                  businessLabel={pageTitle}
                />

                {meetingDate && meetingTime && (
                  <div className="text-center text-sm text-[#6b7280]">
                    Requested time: {formatSelectedMeeting(meetingDate, meetingTime, timezone)}
                  </div>
                )}

                <div className={MODAL_ACTION_FOOTER_CLASS}>
                  <button
                    type="button"
                    onClick={() => setMeetingGuests((current) => [...current, { ...EMPTY_GUEST }])}
                    className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#1d4f91] bg-white px-4 py-3 font-semibold text-[#1d4f91] transition hover:bg-[#f8fbff]"
                  >
                    <Plus className="h-5 w-5" />
                    Add Guest
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex min-h-[52px] flex-1 items-center justify-center rounded-xl bg-[#1d4f91] px-4 py-3 font-semibold text-white transition hover:bg-[#173f74] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
