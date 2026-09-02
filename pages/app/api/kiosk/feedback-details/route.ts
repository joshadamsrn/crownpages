import { NextRequest, NextResponse } from "next/server";

import { verifyKioskFeedbackAccessToken } from "@/lib/kiosk-feedback-access";
import {
  formatKioskFeedbackDate,
  getKioskFeedbackText,
  resolveKioskFeedbackNotification,
  type KioskFeedbackPage,
} from "@/lib/kiosk-feedback-server";
import { sendEmailMessage } from "@/lib/page-engagement-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_RESPONSE_LENGTH = 4000;

type FeedbackDetailsBody = {
  feedbackId?: string;
  token?: string;
  positiveFeedback?: string;
  improvementFeedback?: string;
};

type FeedbackRecord = {
  id: string;
  page_id: string;
  rating: number;
  source: string | null;
  action: string | null;
  positive_feedback: string | null;
  improvement_feedback: string | null;
  details_submitted_at: string | null;
  details_email_sent_at: string | null;
};

function cleanResponse(value: unknown) {
  return (getKioskFeedbackText(value) || "").slice(0, MAX_RESPONSE_LENGTH);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as FeedbackDetailsBody | null;
    const feedbackId = getKioskFeedbackText(body?.feedbackId);
    const token = getKioskFeedbackText(body?.token);

    if (!feedbackId || !verifyKioskFeedbackAccessToken(token, feedbackId)) {
      return NextResponse.json({ error: "This feedback link is invalid or has expired." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: recordData, error: recordError } = await admin
      .from("kiosk_feedback")
      .select(
        "id, page_id, rating, source, action, positive_feedback, improvement_feedback, details_submitted_at, details_email_sent_at",
      )
      .eq("id", feedbackId)
      .maybeSingle();

    if (recordError || !recordData) {
      return NextResponse.json({ error: "Feedback request not found." }, { status: 404 });
    }

    let record = recordData as FeedbackRecord;
    if (record.rating < 1 || record.rating > 4) {
      return NextResponse.json({ error: "This feedback form is not available." }, { status: 400 });
    }

    if (record.details_email_sent_at) {
      return NextResponse.json({ success: true, alreadySubmitted: true });
    }

    if (!record.details_submitted_at) {
      const positiveFeedback = cleanResponse(body?.positiveFeedback);
      const improvementFeedback = cleanResponse(body?.improvementFeedback);
      const submittedAt = new Date().toISOString();
      const { data: updatedData, error: updateError } = await admin
        .from("kiosk_feedback")
        .update({
          positive_feedback: positiveFeedback || null,
          improvement_feedback: improvementFeedback || null,
          details_submitted_at: submittedAt,
        })
        .eq("id", feedbackId)
        .is("details_submitted_at", null)
        .select(
          "id, page_id, rating, source, action, positive_feedback, improvement_feedback, details_submitted_at, details_email_sent_at",
        )
        .maybeSingle();

      if (updateError) {
        console.error("Detailed kiosk feedback update failed:", updateError.message);
        return NextResponse.json({ error: "Unable to save your feedback." }, { status: 500 });
      }

      if (updatedData) {
        record = updatedData as FeedbackRecord;
      } else {
        const { data: latestData } = await admin
          .from("kiosk_feedback")
          .select(
            "id, page_id, rating, source, action, positive_feedback, improvement_feedback, details_submitted_at, details_email_sent_at",
          )
          .eq("id", feedbackId)
          .maybeSingle();

        if (!latestData) {
          return NextResponse.json({ error: "Unable to save your feedback." }, { status: 500 });
        }
        record = latestData as FeedbackRecord;
      }
    }

    const { data: pageData, error: pageError } = await admin
      .from("pages")
      .select("id, title, business_id, created_by, content")
      .eq("id", record.page_id)
      .maybeSingle();

    if (pageError || !pageData) {
      return NextResponse.json({ error: "The facility page could not be found." }, { status: 404 });
    }

    const page = pageData as KioskFeedbackPage;
    const { recipient, facilityName } = await resolveKioskFeedbackNotification(page);

    if (recipient) {
      const contextLines = [
        `New kiosk feedback for ${facilityName}`,
        `Rating: ${record.rating} out of 5 stars`,
        `Page: ${page.title}`,
        `Submitted: ${formatKioskFeedbackDate(
          record.details_submitted_at ? new Date(record.details_submitted_at) : new Date(),
        )}`,
        "Source: Kiosk",
        "Action: Please Review",
      ].filter(Boolean);
      const detailLines = [
        ...contextLines,
        "",
        "What are some things we are doing right?",
        record.positive_feedback || "No response provided.",
        "",
        "What opportunities do we have to improve?",
        record.improvement_feedback || "No response provided.",
      ];

      try {
        await sendEmailMessage({
          to: recipient,
          subject: `Kiosk feedback - ${record.rating} / 5 Star Review Feedback`,
          text: detailLines.join("\n"),
        });

        await admin
          .from("kiosk_feedback")
          .update({ details_email_sent_at: new Date().toISOString() })
          .eq("id", feedbackId)
          .is("details_email_sent_at", null);
      } catch (emailError) {
        console.error(
          "Detailed kiosk feedback email failed:",
          emailError instanceof Error ? emailError.message : emailError,
        );
        return NextResponse.json(
          { error: "Your feedback was saved, but the notification could not be sent. Please try again." },
          { status: 502 },
        );
      }
    } else {
      console.error(`Detailed kiosk feedback ${feedbackId} has no configured recipient.`);
      await admin
        .from("kiosk_feedback")
        .update({ details_email_sent_at: new Date().toISOString() })
        .eq("id", feedbackId)
        .is("details_email_sent_at", null);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Detailed kiosk feedback submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to submit your feedback." }, { status: 500 });
  }
}
