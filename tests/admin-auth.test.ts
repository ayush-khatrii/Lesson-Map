import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { adminAuthOptions } from "../lib/admin/auth-options";

const origin = "http://localhost:3000",
  password = "a long existing password 123!";
function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
async function fixture() {
  const database: Record<string, any[]> = {
    user: [],
    account: [],
    session: [],
    verification: [],
    adminSession: [],
    adminVerification: [],
    adminRateLimit: [],
  };
  const adapter = memoryAdapter(database);
  const publicAuth = betterAuth({
    baseURL: origin,
    secret: "public-test-secret-long-enough-for-auth",
    database: adapter,
    emailAndPassword: { enabled: true },
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
  const post = (
    auth: { handler: (request: Request) => Promise<Response> },
    path: string,
    body: unknown,
    cookie = "",
  ) =>
    auth.handler(
      new Request(
        `${origin}${auth === publicAuth ? "/api/auth" : "/api/admin/auth"}/${path}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: origin,
            cookie,
          },
          body: JSON.stringify(body),
        },
      ),
    );
  await post(publicAuth, "sign-up/email", {
    name: "Owner",
    email: "owner@example.com",
    password,
  });
  await post(publicAuth, "sign-up/email", {
    name: "Ordinary",
    email: "ordinary@example.com",
    password,
  });
  const approved = new Set([
    database.user.find((u) => u.email === "owner@example.com").id,
  ]);
  const auth = betterAuth({
    baseURL: origin,
    secret: "separate-admin-test-secret-long-enough",
    database: adapter,
    ...adminAuthOptions(async (id) => approved.has(id)),
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
  return { database, publicAuth, auth, approved, post };
}
test("admin email sign-in reuses identities but creates isolated cookies and sessions", async () => {
  const h = await fixture();
  const publicLogin = await h.post(h.publicAuth, "sign-in/email", {
    email: "owner@example.com",
    password,
  });
  const publicCookie = cookies(publicLogin);
  assert.equal(
    await h.auth.api.getSession({
      headers: new Headers({ cookie: publicCookie }),
    }),
    null,
  );
  const login = await h.post(h.auth, "sign-in/email", {
    email: " OWNER@EXAMPLE.COM ",
    password,
  });
  assert.equal(login.status, 200);
  const cookie = cookies(login);
  assert.ok(cookie.includes("lessonmap-admin.session_token="));
  assert.equal(h.database.adminSession.length, 1);
  assert.equal(h.database.session.length, 3); // two signup sessions and one public login
  assert.ok(await h.auth.api.getSession({ headers: new Headers({ cookie }) }));
  assert.equal(
    await h.publicAuth.api.getSession({ headers: new Headers({ cookie }) }),
    null,
  );
});

test("ordinary, revoked and unknown accounts cannot create admin sessions or register", async () => {
  const h = await fixture();
  assert.equal(
    (
      await h.post(h.auth, "sign-in/email", {
        email: "ordinary@example.com",
        password,
      })
    ).status,
    403,
  );
  h.approved.clear();
  assert.equal(
    (
      await h.post(h.auth, "sign-in/email", {
        email: "owner@example.com",
        password,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await h.post(h.auth, "sign-in/email", {
        email: "unknown@example.com",
        password,
      })
    ).status,
    401,
  );
  const before = h.database.user.length;
  assert.equal(
    (
      await h.post(h.auth, "sign-up/email", {
        name: "Intruder",
        email: "new@example.com",
        password,
      })
    ).status,
    400,
  );
  assert.equal(h.database.user.length, before);
  assert.equal(h.database.adminSession.length, 0);
});
test("admin authentication rejects social sign-in and account linking", async () => {
  const h = await fixture();
  const before = structuredClone(h.database.account);
  for (const path of ["sign-in/social", "link-social"]) {
    const response = await h.post(h.auth, path, {
      provider: "google",
      callbackURL: "/dashboard/admin/verify",
    });
    assert.equal(response.status, 404);
  }
  assert.deepEqual(h.database.account, before);
  assert.equal(h.database.adminSession.length, 0);
});
