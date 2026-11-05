import assert from "node:assert/strict";
import { test } from "node:test";
import {
  sessionIsVerified,
  verificationIsFresh,
  ADMIN_IDLE_MS,
} from "../lib/admin/policy";
import {
  acceptedCounter,
  authenticator,
  encryptSecret,
  decryptSecret,
  newAuthenticator,
  newRecoveryCodes,
  hashRecoveryCode,
} from "../lib/admin/crypto";

import {
  dateKey,
  reportRange,
  percentageChange,
  userQuery,
  queryValues,
} from "../lib/admin/filters";
import { summarizeFinancials, minorUnitFactor } from "../lib/admin/financial";

const now = new Date("2026-11-05T06:00:00Z");
test("admin sessions require current membership, enrollment, verification and activity", () => {
  const session = {
    createdAt: new Date(now.getTime() - 3600000),
    expiresAt: new Date(now.getTime() + 3600000),
    verifiedAt: now,
    lastActivityAt: now,
    verifiedVersion: 2,
  };
  const access = { active: true, securityVersion: 2, totpEnabledAt: now };
  assert.equal(sessionIsVerified(session, access, now.getTime()), true);
  for (const change of [
    { verifiedAt: null },
    { lastActivityAt: null },
    { lastActivityAt: new Date(now.getTime() - ADMIN_IDLE_MS) },
    { expiresAt: now },
    { createdAt: new Date(now.getTime() - 8 * 3600000) },
    { verifiedVersion: 1 },
    { verifiedAt: new Date(now.getTime() + 1) },
  ]) {
    assert.equal(
      sessionIsVerified({ ...session, ...change }, access, now.getTime()),
      false,
    );
  }
  assert.equal(
    sessionIsVerified(session, { ...access, active: false }, now.getTime()),
    false,
  );
  assert.equal(
    sessionIsVerified(
      session,
      { ...access, totpEnabledAt: null },
      now.getTime(),
    ),
    false,
  );
  assert.equal(
    verificationIsFresh(new Date(now.getTime() - 5 * 60000), now.getTime()),
    false,
  );
});

test("TOTP encryption binds secrets to the user; accepted counters reject replay", () => {
  process.env.ADMIN_TOTP_ENCRYPTION_KEY = "ab".repeat(32);
  const { secret } = newAuthenticator("test@example.com");
  const encrypted = encryptSecret(secret, "admin-1");
  assert.equal(decryptSecret(encrypted, "admin-1"), secret);
  assert.throws(() => decryptSecret(encrypted, "admin-2"));
  assert.notEqual(encrypted, encryptSecret(secret, "admin-1"));
  const token = authenticator(secret).generate({ timestamp: now.getTime() });
  const counter = acceptedCounter(secret, token, null, now.getTime());
  assert.notEqual(counter, null);
  assert.equal(acceptedCounter(secret, token, counter, now.getTime()), null);
  assert.equal(acceptedCounter(secret, "invalid", null, now.getTime()), null);
  const codes = newRecoveryCodes();
  assert.equal(new Set(codes).size, 10);
  assert.notEqual(
    hashRecoveryCode(codes[0], "a"),
    hashRecoveryCode(codes[0], "b"),
  );
  assert.equal(
    hashRecoveryCode(codes[0].toLowerCase(), "a"),
    hashRecoveryCode(codes[0], "a"),
  );
});

test("report periods use exclusive boundaries, Kolkata dates and safe query validation", () => {
  const range = reportRange(
    new URLSearchParams("period=custom&from=2026-11-01&to=2026-11-02"),
    now,
  );
  assert.equal(range.from.toISOString(), "2026-10-31T18:30:00.000Z");
  assert.equal(range.to.toISOString(), "2026-11-02T18:30:00.000Z");
  assert.equal(
    range.from.getTime() - range.previousFrom!.getTime(),
    range.to.getTime() - range.from.getTime(),
  );
  assert.equal(dateKey("2026-11-01T20:00:00Z"), "2026-11-02");
  assert.throws(() =>
    reportRange(new URLSearchParams("period=custom&from=2026-02-30"), now),
  );
  assert.throws(() =>
    reportRange(
      new URLSearchParams("period=custom&from=2026-12-01&to=2026-11-01"),
      now,
    ),
  );
  assert.equal(percentageChange(10, 0), "new");
  assert.equal(percentageChange(0, 0), 0);
  assert.equal(percentageChange(5, 10), -50);
  assert.equal(
    userQuery.safeParse({ sort: 'name;DROP TABLE "user"' }).success,
    false,
  );
  assert.deepEqual(
    queryValues(new URLSearchParams("period=all&plan=all&paid=all&q=")),
    { period: "all" },
  );
});

test("financial totals separate currencies and include booked refunds against older purchases", () => {
  const range = reportRange(
    new URLSearchParams("period=custom&from=2026-11-01&to=2026-11-02"),
    now,
  );
  const base = {
    name: "Test",
    email: "test@example.com",
    plan: "CREATOR" as const,
    currency: "USD",
    status: "succeeded",
  };
  const report = summarizeFinancials(
    {
      payments: [
        {
          ...base,
          id: "previous",
          createdAt: new Date(range.from.getTime() - 1).toISOString(),
          amount: 500,
        },
        {
          ...base,
          id: "current",
          createdAt: range.from.toISOString(),
          amount: 1200,
        },
        {
          ...base,
          id: "failed",
          createdAt: range.from.toISOString(),
          amount: 1200,
          status: "failed",
        },
        {
          ...base,
          id: "pending",
          createdAt: range.from.toISOString(),
          amount: 1200,
          status: "processing",
        },
        {
          ...base,
          id: "eur",
          createdAt: range.from.toISOString(),
          amount: 9999,
          currency: "EUR",
        },
        { ...base, id: "end", createdAt: range.to.toISOString(), amount: 9999 },
      ],
      refunds: [
        {
          id: "refund-old-purchase",
          createdAt: range.from.toISOString(),
          amount: 200,
          currency: "USD",
          plan: "CREATOR",
        },
      ],
    },
    range,
  );
  assert.equal(report.current.gross, 1200);
  assert.equal(report.current.refunds, 200);
  assert.equal(report.current.net, 1000);
  assert.equal(report.current.successRate, 50);
  assert.equal(report.current.averagePayment, 1200);
  assert.equal(report.trend.length, 2);
  assert.equal(report.trend[1].collected, 0);
  assert.equal(report.previous?.gross, 500);
  assert.deepEqual(report.currencies, ["EUR", "USD"]);
  assert.equal(minorUnitFactor("USD"), 100);
  assert.equal(minorUnitFactor("JPY"), 1);
  assert.equal(minorUnitFactor("KWD"), 1000);
});
