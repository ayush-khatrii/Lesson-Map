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
  const googleIdentity = { email: "owner@example.com" };
  const auth = betterAuth({
    baseURL: origin,
    secret: "separate-admin-test-secret-long-enough",
    database: adapter,
    ...adminAuthOptions(async (id) => approved.has(id)),
    rateLimit: { enabled: false },
    logger: { disabled: true },
    socialProviders: {
      google: {
        clientId: "test-google-client",
        clientSecret: "test-google-secret",
        disableSignUp: true,
        getUserInfo: async () => ({
          user: {
            id: `google-${googleIdentity.email}`,
            name: "Google User",
            email: googleIdentity.email,
            emailVerified: true,
          },
          data: {},
        }),
      },
    },
  });
  return { database, publicAuth, auth, approved, post, googleIdentity };
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

test("Google callback admits an approved existing user and refuses account creation", async () => {
  const h = await fixture();
  h.database.user.find((u) => u.email === "owner@example.com").emailVerified =
    true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    assert.ok(url.startsWith("https://oauth2.googleapis.com/token"));
    return Response.json({
      access_token: "test-google-token",
      token_type: "Bearer",
      expires_in: 3600,
    });
  };
  async function flow() {
    const start = await h.post(h.auth, "sign-in/social", {
      provider: "google",
      callbackURL: "/dashboard/admin/verify",
      errorCallbackURL: "/dashboard/admin/login",
    });
    const { url } = await start.json();
    const state = new URL(url).searchParams.get("state");
    return h.auth.handler(
      new Request(
        `${origin}/api/admin/auth/callback/google?code=test-code&state=${state}`,
        { headers: { cookie: cookies(start) } },
      ),
    );
  }
  try {
    const success = await flow();
    assert.equal(success.status, 302);
    assert.equal(
      new URL(success.headers.get("location")!, origin).pathname,
      "/dashboard/admin/verify",
    );
    assert.equal(h.database.adminSession.length, 1);
    assert.ok(cookies(success).includes("lessonmap-admin.session_token="));
    const usersBefore = h.database.user.length;
    h.googleIdentity.email = "unknown-google@example.com";
    const denied = await flow();
    assert.equal(denied.status, 302);
    assert.ok(
      denied.headers.get("location")?.includes("/dashboard/admin/login"),
    );
    assert.equal(h.database.user.length, usersBefore);
    assert.equal(h.database.adminSession.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
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
test("admin OAuth offers Google only and uses the isolated callback and state store", async () => {
  const h = await fixture();
  const google = await h.post(h.auth, "sign-in/social", {
    provider: "google",
    callbackURL: "/dashboard/admin/verify",
  });
  assert.equal(google.status, 200);
  const data = await google.json();
  assert.equal(
    new URL(data.url).searchParams.get("redirect_uri"),
    `${origin}/api/admin/auth/callback/google`,
  );
  assert.equal(
    (
      await h.post(h.auth, "sign-in/social", {
        provider: "github",
        callbackURL: "/dashboard/admin",
      })
    ).status,
    404,
  );
  assert.equal(h.database.adminSession.length, 0);
});
