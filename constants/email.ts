// Only these application actions may send email. Set enabled to false to stop
// an individual action without changing authentication or billing behavior.
export const EMAIL_ACTIONS = {
  WELCOME: {
    enabled: true,
    from: "LessonMap <welcome@lessonmap.org>",
    subject: "Welcome to LessonMap",
  },
  PURCHASE_ACTIVATED: {
    enabled: true,
    from: "LessonMap Accounts <accounts@lessonmap.org>",
    subject: "Your LessonMap plan is active",
  },
  PLAN_RENEWED: {
    enabled: true,
    from: "LessonMap Accounts <accounts@lessonmap.org>",
    subject: "Your LessonMap plan has renewed",
  },
  PASSWORD_RESET_REQUESTED: {
    enabled: true,
    from: "LessonMap Accounts <accounts@lessonmap.org>",
    subject: "Reset your LessonMap password",
  },
  PASSWORD_RESET_COMPLETED: {
    enabled: true,
    from: "LessonMap Accounts <accounts@lessonmap.org>",
    subject: "Your LessonMap password was reset",
  },
} satisfies Record<string, { enabled: boolean; from: string; subject: string }>;

export type EmailAction = keyof typeof EMAIL_ACTIONS;
export const SUPPORT_EMAIL = "support@lessonmap.org";
export const EMAIL_REPLY_TO = SUPPORT_EMAIL;
