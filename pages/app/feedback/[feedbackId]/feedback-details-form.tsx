"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { Send, Star } from "lucide-react";

type FeedbackDetailsFormProps = {
  feedbackId: string;
  token: string;
  rating: number;
  businessName: string;
  logoUrl: string | null;
  initialPositiveFeedback: string;
  initialImprovementFeedback: string;
  initiallySubmitted: boolean;
};

function FacilityIdentity({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  return logoUrl ? (
    <Image
      src={logoUrl}
      alt={`${businessName} logo`}
      width={320}
      height={150}
      className="mx-auto max-h-28 w-auto max-w-[76vw] object-contain"
      unoptimized
      priority
    />
  ) : (
    <div className="text-center text-2xl font-black leading-tight text-[#06184a]">{businessName}</div>
  );
}

export function FeedbackDetailsForm({
  feedbackId,
  token,
  rating,
  businessName,
  logoUrl,
  initialPositiveFeedback,
  initialImprovementFeedback,
  initiallySubmitted,
}: FeedbackDetailsFormProps) {
  const [positiveFeedback, setPositiveFeedback] = useState(initialPositiveFeedback);
  const [improvementFeedback, setImprovementFeedback] = useState(initialImprovementFeedback);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(initiallySubmitted);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/kiosk/feedback-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId,
          token,
          positiveFeedback,
          improvementFeedback,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Unable to submit your feedback.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main
        className="min-h-dvh bg-white px-5 py-8 text-[#0f172a] [color-scheme:light]"
        style={{ colorScheme: "light" }}
      >
        <div className="mx-auto flex min-h-[78dvh] w-full max-w-lg flex-col items-center justify-center text-center">
          <FacilityIdentity businessName={businessName} logoUrl={logoUrl} />
          <h1 className="mt-10 text-5xl font-black leading-none text-[#06184a]">Thank you!</h1>
          <p className="mt-5 text-xl font-medium leading-8 text-[#475569]">
            We appreciate your feedback!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-dvh bg-[#f5f8fc] px-4 py-6 text-[#0f172a] [color-scheme:light] sm:px-6 sm:py-10"
      style={{ colorScheme: "light" }}
    >
      <div className="mx-auto w-full max-w-xl rounded-[24px] border border-[#dbe3ef] bg-white px-5 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.10)] sm:px-9 sm:py-10">
        <FacilityIdentity businessName={businessName} logoUrl={logoUrl} />

        <div className="mt-7 flex justify-center gap-2" aria-label={`${rating} out of 5 stars`}>
          {Array.from({ length: 5 }, (_, index) => {
            const selected = index < rating;
            return (
              <Star
                key={index}
                aria-hidden="true"
                className={`h-8 w-8 ${selected ? "fill-[#f5b301] text-[#f5b301]" : "text-[#cbd5e1]"}`}
                strokeWidth={2.2}
              />
            );
          })}
        </div>

        <h1 className="mt-5 text-center text-3xl font-black leading-tight text-[#06184a] sm:text-4xl">
          You rated us {rating} {rating === 1 ? "star" : "stars"}. We value your feedback.
        </h1>
        <p className="mt-3 text-center text-base leading-7 text-[#64748b]">
          Both questions are optional. Share as much or as little as you would like.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <label className="block">
            <span className="mb-2 block text-base font-bold leading-6 text-[#0f172a]">
              What are some things we are doing right?
              <span className="ml-2 font-medium text-[#64748b]">(Optional)</span>
            </span>
            <textarea
              value={positiveFeedback}
              onChange={(event) => setPositiveFeedback(event.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Share what is going well"
              className="w-full resize-y rounded-[12px] border border-[#cbd5e1] bg-white px-4 py-3 text-[17px] leading-7 text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-base font-bold leading-6 text-[#0f172a]">
              What opportunities do we have to improve?
              <span className="ml-2 font-medium text-[#64748b]">(Optional)</span>
            </span>
            <textarea
              value={improvementFeedback}
              onChange={(event) => setImprovementFeedback(event.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Share how we can improve"
              className="w-full resize-y rounded-[12px] border border-[#cbd5e1] bg-white px-4 py-3 text-[17px] leading-7 text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>

          {error ? (
            <div role="alert" className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-bold leading-6 text-[#991b1b]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[12px] border border-[#8bbdf4] bg-[#dbeafe] px-5 py-4 text-lg font-black uppercase text-[#06184a] shadow-sm transition-colors hover:bg-[#bfdbfe] focus:outline-none focus:ring-4 focus:ring-[#bfdbfe] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-5 w-5" aria-hidden="true" />
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </main>
  );
}
