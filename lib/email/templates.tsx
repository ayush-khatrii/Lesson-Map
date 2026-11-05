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
      message = `Your LessonMap ${event.plan === "CREATOR" ? "Creator" : "Professional"} subscription is active. Your plan features are ready to use.`;
      href = new URL("/settings", origin).href;
      button = "Manage your subscription";
      break;
    case "PLAN_RENEWED":
      heading = "Your plan has renewed";
      message = `Your LessonMap ${event.plan === "CREATOR" ? "Creator" : "Professional"} subscription has renewed. Keep building and sharing your courses.`;
      href = new URL("/settings", origin).href;
      button = "Manage your subscription";
      break;
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
          <title>{heading}</title>
        </head>
        <body
          style={{
            margin: 0,
            backgroundColor: "#f5f5f5",
            color: "#171717",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <main
            style={{
              maxWidth: 560,
              margin: "32px auto",
              padding: 32,
              backgroundColor: "#ffffff",
              borderRadius: 12,
            }}
          >
            <p style={{ fontWeight: 700, color: "#6d28d9" }}>LessonMap</p>
            <h1 style={{ fontSize: 26 }}>{heading}</h1>
            <p>{greeting}</p>
            <p style={{ lineHeight: 1.6 }}>{message}</p>
            <p style={{ margin: "28px 0" }}>
              <a
                href={href}
                style={{
                  display: "inline-block",
                  padding: "12px 20px",
                  backgroundColor: "#6d28d9",
                  color: "#ffffff",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                {button}
              </a>
            </p>
            <p style={{ fontSize: 13, color: "#525252" }}>
              Need help?{" "}
              <a href={`mailto:${EMAIL_REPLY_TO}`}>{EMAIL_REPLY_TO}</a>
            </p>
          </main>
        </body>
      </html>
    ),
  };
}
