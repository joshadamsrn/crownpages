import { NextRequest, NextResponse } from "next/server";

import { createKioskFeedbackAccessToken } from "@/lib/kiosk-feedback-access";
import {
  formatKioskFeedbackDate,
  getKioskFeedbackText,
  resolveKioskFeedbackNotification,
  type KioskFeedbackPage,
} from "@/lib/kiosk-feedback-server";
import { sendEmailMessage } from "@/lib/page-engagement-server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type FeedbackBody = {
  pageId?: string;
  rating?: number;
  source?: string;
  action?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as FeedbackBody | null;
    const pageId = getKioskFeedbackText(body?.pageId);
    const rating = body?.rating;

    if (!pageId || !Number.isInteger(rating) || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "A valid page and rating from 1 to 5 are required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: pageData, error: pageError } = await admin
      .from("pages")
      .select("id, title, business_id, created_by, content")
      .eq("id", pageId)
      .eq("is_active", true)
      .eq("is_published", true)
      .maybeSingle();

    if (pageError || !pageData) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    const page = pageData as KioskFeedbackPage;
    const source = getKioskFeedbackText(body?.source)?.slice(0, 80) || null;
    const action = getKioskFeedbackText(body?.action)?.slice(0, 80) || null;
    const { data: feedback, error: insertError } = await admin
      .from("kiosk_feedback")
      .insert({
        business_id: page.business_id,
        page_id: page.id,
        rating,
        source,
        action,
        user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
      })
      .select("id")
      .single();

    if (insertError || !feedback) {
      console.error("Kiosk feedback insert failed:", insertError?.message || "No feedback record returned.");
      return NextResponse.json({ error: "Unable to save feedback." }, { status: 500 });
    }

    if (rating < 5) {
      const token = createKioskFeedbackAccessToken(feedback.id);
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, "");
      const feedbackUrl = `${siteUrl}/feedback/${feedback.id}?token=${encodeURIComponent(token)}`;

      return NextResponse.json({ success: true, feedbackUrl });
    }

    const { recipient, facilityName } = await resolveKioskFeedbackNotification(page);

    if (recipient) {
      const detailLines = [
        `New kiosk feedback for ${facilityName}`,
        `Rating: ${rating} out of 5 stars`,
        `Page: ${page.title}`,
        `Submitted: ${formatKioskFeedbackDate()}`,
        "Source: Kiosk",
        "Action: Please Review",
      ].filter(Boolean);

      try {
        await sendEmailMessage({
          to: recipient,
          subject: `Kiosk feedback - ${rating} / 5 Star Review Feedback`,
          text: detailLines.join("\n"),
        });
      } catch (emailError) {
        console.error("Kiosk feedback email failed:", emailError instanceof Error ? emailError.message : emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Kiosk feedback submission failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to submit feedback." }, { status: 500 });
  }
}
