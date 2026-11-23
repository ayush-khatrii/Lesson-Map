import "server-only";
import { createHash } from "node:crypto";
import { Resend } from "resend";
import { render } from "@react-email/render";
import {
  EMAIL_ACTIONS,
  EMAIL_REPLY_TO,
  BILLING_REMINDER_LATE_SUBJECT,
} from "@/constants/email";
import { emailContent } from "./templates";
import type { EmailEvent, EmailResult } from "./types";

function failed(
  event: EmailEvent,
  reason: Extract<EmailResult, { status: "failed" }>["reason"],
): EmailResult {
  // Provider/network messages can contain recipients, content, or reset tokens.
  console.error("Email action failed", { action: event.action, reason });
  return { status: "failed", reason };
}

export async function sendEmailAction(
  event: EmailEvent,
  attachments?: { filename: string; content: Buffer; contentType: string }[],
): Promise<EmailResult> {
  if (!Object.hasOwn(EMAIL_ACTIONS, event.action))
    return failed(event, "invalid_event");
  const config = EMAIL_ACTIONS[event.action];
  if (!config.enabled) return { status: "skipped", reason: "disabled" };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { status: "skipped", reason: "not_configured" };

  if (
    event.action === "PAYMENT_RECEIPT" &&
    !attachments?.some(
      (file) =>
        file.contentType === "application/pdf" && file.content.length > 0,
    )
  )
    return failed(event, "invalid_event");
  let content: { html: string; text: string };
  try {
    const origin = new URL(
      process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000",
    );
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      (process.env.NODE_ENV === "production" &&
        !process.env.NEXT_PUBLIC_BASE_URL?.trim()) ||
      !event.to ||
      !event.eventId
    )
      return failed(event, "invalid_event");
    if (event.action === "PASSWORD_RESET_REQUESTED") {
      const resetUrl = new URL(event.resetUrl);
      if (
        resetUrl.origin !== origin.origin ||
        resetUrl.username ||
        resetUrl.password
      ) {
        return failed(event, "invalid_event");
      }
    }
    const template = emailContent(event, origin.origin);
    content = { html: await render(template.react), text: template.text };
  } catch {
    return failed(event, "render_error");
  }

  // Hashing also prevents reset tokens from appearing in request headers/logs.
  const idempotencyKey = `${event.action.toLowerCase()}/${createHash("sha256").update(event.eventId).digest("hex")}`;
  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: config.from,
        to: [event.to],
        subject:
          (event.action === "PLAN_RENEWAL_REMINDER" ||
            event.action === "PLAN_EXPIRY_REMINDER") &&
          new Date(event.periodEnd).getTime() - Date.now() < 2 * 86400000
            ? BILLING_REMINDER_LATE_SUBJECT
            : config.subject,
        replyTo: EMAIL_REPLY_TO,
        ...content,
        ...(attachments ? { attachments } : {}),
      },
      { idempotencyKey, signal: AbortSignal.timeout(10_000) },
    );
    if (error || !data?.id) return failed(event, "provider_error");
    return { status: "sent", id: data.id };
  } catch {
    // Only thrown transport/SDK failures reach here; API errors are checked above.
    return failed(event, "transport_error");
  }
}
