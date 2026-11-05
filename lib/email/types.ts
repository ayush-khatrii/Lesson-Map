type Recipient = {
  to: string;
  name: string;
  // Stable identifier of the action occurrence, never a password or API key.
  eventId: string;
};

export type EmailEvent = Recipient &
  (
    | { action: "WELCOME" }
    | {
        action: "PURCHASE_ACTIVATED" | "PLAN_RENEWED";
        plan: "CREATOR" | "PROFESSIONAL";
      }
    | { action: "PASSWORD_RESET_REQUESTED"; resetUrl: string }
    | { action: "PASSWORD_RESET_COMPLETED" }
  );

export type EmailResult =
  | { status: "sent"; id: string }
  | { status: "skipped"; reason: "disabled" | "not_configured" }
  | {
      status: "failed";
      reason:
        "invalid_event" | "provider_error" | "transport_error" | "render_error";
    };

export type SendEmailAction = (event: EmailEvent) => Promise<EmailResult>;
