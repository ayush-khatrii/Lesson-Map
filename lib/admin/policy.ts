export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_IDLE_MS = 30 * 60 * 1000;
export const ADMIN_FRESH_MS = 5 * 60 * 1000;

export type AdminSessionState = {
  createdAt: Date;
  expiresAt: Date;
  verifiedAt: Date | null;
  lastActivityAt: Date | null;
  verifiedVersion: number | null;
};

export function sessionIsVerified(
  session: AdminSessionState,
  access: {
    active: boolean;
    securityVersion: number;
    totpEnabledAt: Date | null;
  },
  now = Date.now(),
) {
  return (
    access.active &&
    access.totpEnabledAt !== null &&
    session.expiresAt.getTime() > now &&
    session.createdAt.getTime() + ADMIN_SESSION_SECONDS * 1000 > now &&
    session.verifiedAt !== null &&
    session.verifiedAt.getTime() <= now &&
    session.verifiedVersion === access.securityVersion &&
    session.lastActivityAt !== null &&
    session.lastActivityAt.getTime() <= now &&
    session.lastActivityAt.getTime() + ADMIN_IDLE_MS > now
  );
}

export function verificationIsFresh(verifiedAt: Date | null, now = Date.now()) {
  return (
    verifiedAt !== null &&
    verifiedAt.getTime() <= now &&
    verifiedAt.getTime() + ADMIN_FRESH_MS > now
  );
}
