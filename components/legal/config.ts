/**
 * Single source of truth for the legal pages. Update these values once and
 * every policy page picks them up.
 *
 * TODO(before launch): replace the placeholders below with your real business
 * details. The refund window especially should be confirmed with your Dodo
 * Payments merchant settings (`DODO_PAYMENTS_ENVIRONMENT=live_mode`).
 */

export const LEGAL_EFFECTIVE_DATE = "September 24, 2026";

/** TODO: point this at a real support inbox you actually monitor. */
export const LEGAL_CONTACT_EMAIL = "support@lessonmap.vercel.app";

/** TODO: your registered business or trading name. */
export const LEGAL_ENTITY = "LessonMap";

/** TODO: confirm your governing jurisdiction. */
export const LEGAL_JURISDICTION = "India";

/** TODO: confirm this matches your Dodo Payments refund settings. */
export const REFUND_WINDOW_DAYS = 14;

/** The public app origin, shown in policy copy. */
export const LEGAL_SITE_URL = "https://lessonmap.vercel.app";

export const POLICY_LINKS = [
  { href: "/privacy", label: "Privacy Policy", key: "privacy" },
  { href: "/terms", label: "Terms of Service", key: "terms" },
  { href: "/refund", label: "Refund Policy", key: "refund" },
] as const;

export type PolicyKey = (typeof POLICY_LINKS)[number]["key"];
