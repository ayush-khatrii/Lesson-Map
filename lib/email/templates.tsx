import { BRAND_COLORS } from "@/constants/brand";
import * as React from "react";
import { EMAIL_REPLY_TO } from "@/constants/email";
import type { EmailEvent } from "./types";

// Both versions share the same copy and destination. React escapes names and
// other variable content rather than interpolating them into raw HTML.
export function emailContent(event: EmailEvent, origin: string) {
  const greeting = `Hi ${event.name.trim() || "there"},`;
  let heading: string;
  let message: string;
  let button = "Open LessonMap";
  let href = new URL("/dashboard", origin).href;
  switch (event.action) {
    case "WELCOME":
      heading = "Welcome to LessonMap";
      message =
        "Your account is ready. Start planning your first course and turn your knowledge into a clear learning path.";
      break;
    case "PURCHASE_ACTIVATED":
      heading = "Your plan is active";
      message = `Your LessonMap ${event.plan === "CREATOR" ? "Creator" : "paid"} subscription is active. Your plan features are ready to use.`;
      href = new URL("/settings", origin).href;
      button = "Manage your subscription";
      break;
    case "PLAN_RENEWED":
      heading = "Your plan has renewed";
      message = `Your LessonMap ${event.plan === "CREATOR" ? "Creator" : "paid"} subscription has renewed. Keep building and sharing your courses.`;
      href = new URL("/settings", origin).href;
      button = "Manage your subscription";
      break;
    case "PAYMENT_RECEIPT":
      heading = "Your payment was successful";
      message = `Thank you for your LessonMap payment. Your invoice PDF is attached. Payment reference: ${event.paymentId}.`;
      href = new URL("/settings", origin).href;
      button = "Manage billing";
      break;
    case "CANCELLATION_SCHEDULED":
    case "PLAN_RENEWAL_REMINDER":
    case "PLAN_EXPIRY_REMINDER":
    case "PLAN_ACCESS_ENDED": {
      const end = new Date(event.periodEnd);
      if (Number.isNaN(end.getTime())) throw new Error("Invalid billing date");
      const date =
        end.toLocaleString("en-US", {
          timeZone: "UTC",
          dateStyle: "long",
          timeStyle: "short",
        }) + " UTC";
      heading =
        event.action === "CANCELLATION_SCHEDULED"
          ? "Your cancellation is scheduled"
          : event.action === "PLAN_RENEWAL_REMINDER"
            ? "Your next renewal is approaching"
            : event.action === "PLAN_EXPIRY_REMINDER"
              ? "Your paid access is ending soon"
              : "Your paid access has ended";
      message =
        event.action === "CANCELLATION_SCHEDULED"
          ? `Future renewal is cancelled. You can continue using your paid features until ${date}. Your account switches to Free then.`
          : event.action === "PLAN_RENEWAL_REMINDER"
            ? `Your LessonMap plan is scheduled to renew on ${date}. You can manage your subscription in billing settings.`
            : event.action === "PLAN_EXPIRY_REMINDER"
              ? `Your LessonMap paid access ends on ${date}. Renewal is cancelled. You can use your paid features until that time.`
              : `Your paid period ended on ${date}. Your LessonMap account is now on the Free plan. Your saved courses and resources are still available.`;
      href = new URL("/settings", origin).href;
      button = "Manage your subscription";
      break;
    }
    case "PASSWORD_RESET_REQUESTED":
      heading = "Reset your password";
      message =
        "We received a request to reset your LessonMap password. This link expires in one hour. If you did not request this, you can ignore this email.";
      href = event.resetUrl;
      button = "Reset your password";
      break;
    case "PASSWORD_RESET_COMPLETED":
      heading = "Your password was reset";
      message =
        "Your LessonMap password was successfully reset. If you did not make this change, contact support@lessonmap.org immediately.";
      href = new URL("/sign-in", origin).href;
      button = "Sign in to LessonMap";
      break;
  }

  return {
    text: `${heading}\n\n${greeting}\n\n${message}\n\n${button}: ${href}\n\nNeed help? ${EMAIL_REPLY_TO}\nLessonMap`,
    react: (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="color-scheme" content="light dark" />
          <meta name="supported-color-schemes" content="light dark" />
          <title>{heading}</title>
          <style>{`
            :root { color-scheme: light dark; }
            .email-button, .email-button span {
              color: #171717 !important;
              -webkit-text-fill-color: #171717 !important;
            }
            @media (prefers-color-scheme: dark) {
              .email-body { color: #f5f5f5 !important; }
              .email-brand { color: ${BRAND_COLORS.primary} !important; }
              .email-footer { color: #d4d4d4 !important; }
              .email-support { color: #93c5fd !important; }
            }
            [data-ogsc] .email-body { color: #f5f5f5 !important; }
            [data-ogsc] .email-brand { color: ${BRAND_COLORS.primary} !important; }
            [data-ogsc] .email-footer { color: #d4d4d4 !important; }
            [data-ogsc] .email-support { color: #93c5fd !important; }
          `}</style>
        </head>
        <body
          className="email-body"
          style={{
            margin: 0,
            backgroundColor: "transparent",
            color: "#171717",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <main
            style={{
              maxWidth: 560,
              margin: "32px auto",
              padding: 32,
              backgroundColor: "transparent",
              borderRadius: 12,
            }}
          >
            <p
              className="email-brand"
              style={{ fontWeight: 700, color: BRAND_COLORS.ink }}
            >
              LessonMap
            </p>
            <h1 style={{ fontSize: 26 }}>{heading}</h1>
            <p>{greeting}</p>
            <p style={{ lineHeight: 1.6 }}>{message}</p>
            <p style={{ margin: "28px 0" }}>
              <a
                className="email-button"
                href={href}
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: BRAND_COLORS.primary,
                  // The solid gradient helps preserve yellow in clients that
                  // automatically recolor backgrounds for dark mode.
                  backgroundImage: `linear-gradient(${BRAND_COLORS.primary}, ${BRAND_COLORS.primary})`,
                  color: "#171717",
                  WebkitTextFillColor: "#171717",
                  fontWeight: 700,
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                <span
                  style={{ color: "#171717", WebkitTextFillColor: "#171717" }}
                >
                  {button}
                </span>
              </a>
            </p>
            <p
              className="email-footer"
              style={{ fontSize: 13, color: "#525252" }}
            >
              Need help?{" "}
              <a className="email-support" href={`mailto:${EMAIL_REPLY_TO}`}>
                {EMAIL_REPLY_TO}
              </a>
            </p>
          </main>
        </body>
      </html>
    ),
  };
}
