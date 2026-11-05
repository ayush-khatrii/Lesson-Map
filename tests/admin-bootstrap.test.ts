import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { bootstrapAdmin } from "../lib/admin/bootstrap";
import { adminAuthOptions } from "../lib/admin/auth-options";

const password = "a new owner passphrase 123!";
const oldPassword = "the old account password 456!";

async function fixture() {
  const now = new Date();
  const oldHash = await hashPassword(oldPassword);
  const database: Record<string, any[]> = {
    user: ["owner", "other"].map((id) => ({
      id,
      name: id,
      email: `${id}@example.com`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    })),
    account: ["owner", "other"].map((id) => ({
      id: `password-${id}`,
      userId: id,
      accountId: id,
      providerId: "credential",
      password: oldHash,
      createdAt: now,
      updatedAt: now,
    })),
    session: [
      { id: "public-owner", userId: "owner" },
      { id: "public-other", userId: "other" },
    ],
    adminSession: [
      { id: "admin-owner", userId: "owner" },
      { id: "admin-other", userId: "other" },
    ],
    adminAccess: [],
    adminAuditLog: [],
    verification: [],
    adminVerification: [],
    adminRateLimit: [],
  };
  function matches(row: any, where: any) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "email" && typeof value === "object" && value !== null)
        return row.email.toLowerCase() === (value as { equals: string }).equals;
      return row[key] === value;
    });
  }
  function model(table: string) {
    return {
      findFirst: async ({ where }: any) =>
        database[table].find((r) => matches(r, where)) ?? null,
      findMany: async ({ where }: any) =>
        database[table].filter((r) => matches(r, where)),
      create: async ({ data }: any) => {
        database[table].push(data);
        return data;
      },
      updateMany: async ({ where, data }: any) => {
        const rows = database[table].filter((r) => matches(r, where));
        rows.forEach((row) => Object.assign(row, data));
        return { count: rows.length };
      },
      deleteMany: async ({ where }: any) => {
        database[table] = database[table].filter((r) => !matches(r, where));
      },
      upsert: async ({ where, create, update }: any) => {
        const row = database[table].find((r) => matches(r, where));
        if (row) Object.assign(row, update);
        else database[table].push({ active: true, ...create });
      },
    };
  }
  const tx: Record<string, any> = Object.fromEntries(
    Object.keys(database).map((name) => [name, model(name)]),
  );
  tx.$queryRaw = async () => [];
  const db = {
    $transaction: async (run: (tx: any) => Promise<unknown>) => run(tx),
  } as unknown as Parameters<typeof bootstrapAdmin>[0];
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "admin-bootstrap-test-secret-long-enough",
    database: memoryAdapter(database),
    ...adminAuthOptions(async (userId) =>
      database.adminAccess.some((a) => a.userId === userId && a.active),
    ),
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
  const signIn = (value: string) =>
    auth.handler(
      new Request("http://localhost:3000/api/admin/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email: "owner@example.com", password: value }),
      }),
    );
  return { database, db, signIn };
}

test("granting admin access preserves the existing password and explains available methods", async () => {
  const { database, db, signIn } = await fixture();
  const before = structuredClone(database.account);
  assert.deepEqual(await bootstrapAdmin(db, " OWNER@EXAMPLE.COM "), {
    hasPassword: true,
  });
  assert.deepEqual(database.account, before);
  assert.equal((await signIn(oldPassword)).status, 200);
  await bootstrapAdmin(db, "owner@example.com");
  assert.equal(database.adminAccess.length, 1);
  assert.equal(
    database.adminAuditLog.filter(
      (a) => a.action === "SUPER_ADMIN_BOOTSTRAPPED",
    ).length,
    1,
  );
});

test("explicit password setup replaces only the owner's hash and revokes both kinds of owner session", async () => {
  const { database, db, signIn } = await fixture();
  const otherAccount = structuredClone(database.account[1]);
  database.account.push({
    id: "google-owner",
    providerId: "google",
    accountId: "google-id",
    userId: "owner",
  });
  const googleAccount = structuredClone(database.account[2]);
  await bootstrapAdmin(db, "owner@example.com", password);
  const credential = database.account.find((a) => a.id === "password-owner");
  assert.notEqual(credential.password, password);
  assert.ok(await verifyPassword({ hash: credential.password, password }));
  assert.deepEqual(
    database.account.find((a) => a.userId === "other"),
    otherAccount,
  );
  assert.deepEqual(
    database.account.find((a) => a.providerId === "google"),
    googleAccount,
  );
  assert.deepEqual(
    database.session.map((s) => s.userId),
    ["other"],
  );
  assert.deepEqual(
    database.adminSession.map((s) => s.userId),
    ["other"],
  );
  assert.equal(database.user[0].emailVerified, false);
  assert.equal(
    database.adminAuditLog.filter((a) => a.action === "ADMIN_PASSWORD_SET")
      .length,
    1,
  );
  assert.equal((await signIn(oldPassword)).status, 401);
  assert.equal((await signIn(password)).status, 200);
});

test("an account with no password can set one for its first email sign-in", async () => {
  const { database, db, signIn } = await fixture();
  database.account = database.account.filter((a) => a.userId !== "owner");
  assert.deepEqual(await bootstrapAdmin(db, "owner@example.com"), {
    hasPassword: false,
  });
  assert.equal((await signIn(password)).status, 401);
  assert.deepEqual(await bootstrapAdmin(db, "owner@example.com", password), {
    hasPassword: true,
  });
  const response = await signIn(password);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, "owner");
});

test("password setup refuses unknown users and replacing a different super admin", async () => {
  const { database, db } = await fixture();
  database.adminAccess.push({
    userId: "other",
    role: "SUPER_ADMIN",
    active: true,
  });
  const before = structuredClone(database);
  await assert.rejects(
    bootstrapAdmin(db, "unknown@example.com", password),
    /existing LessonMap user/,
  );
  await assert.rejects(
    bootstrapAdmin(db, "owner@example.com", password),
    /different super admin/,
  );
  assert.deepEqual(database, before);
});

test("invalid setup passwords are rejected before touching the database", async () => {
  const db = {
    $transaction: () => {
      assert.fail("Database must not be touched");
    },
  } as unknown as Parameters<typeof bootstrapAdmin>[0];
  for (const value of ["", "too short", "x".repeat(129)])
    await assert.rejects(
      bootstrapAdmin(db, "owner@example.com", value),
      /12–128/,
    );
});
