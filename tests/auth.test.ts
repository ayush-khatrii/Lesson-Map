import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { emailAuthOptions } from "../lib/auth-email";

function fixture() {
  const database: Record<string, any[]> = { user: [], account: [], session: [], verification: [] };
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-only-auth-secret-with-at-least-32-characters",
    database: memoryAdapter(database),
    ...emailAuthOptions(async (email) => database.user.find(
      (user) => user.email.toLowerCase() === email,
    ) ?? null),
    rateLimit: { enabled: false },
    logger: { disabled: true },
  });
  const post = (path: string, body: Record<string, unknown>, headers: Record<string, string> = {}) => auth.handler(new Request(
    `http://localhost:3000/api/auth/${path}`,
    { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...headers }, body: JSON.stringify(body) },
  ));
  return { auth, database, post };
}

const password = "a long test password 123!";

async function passwordFixture() {
  const context = fixture();
  const email = "password-test@example.com";
  await context.post("sign-up/email", { name: "Password Test", email, password });
  const login = await context.post("sign-in/email", { email, password });
  const cookie = login.headers.get("set-cookie")!.split(";")[0];
  return { ...context, email, cookie };
}

test("password changes reject unauthenticated and cross-origin requests", async () => {
  const { database, post, cookie } = await passwordFixture();
  const before = structuredClone(database.account);
  const body = { currentPassword: password, newPassword: "another long password 456!" };
  assert.equal((await post("change-password", body)).status, 401);
  assert.equal((await post("change-password", body, { cookie, Origin: "https://untrusted.example" })).status, 403);
  assert.deepEqual(database.account, before);
});

test("an incorrect current password leaves credentials and sessions unchanged", async () => {
  const { database, post, cookie } = await passwordFixture();
  const before = structuredClone({ accounts: database.account, sessions: database.session });
  const response = await post("change-password", {
    currentPassword: "incorrect current password",
    newPassword: "another long password 456!",
    revokeOtherSessions: true,
  }, { cookie });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_PASSWORD");
  assert.deepEqual({ accounts: database.account, sessions: database.session }, before);
});

test("the server enforces the existing 12–128 character password policy", async () => {
  const { database, post, cookie } = await passwordFixture();
  const before = structuredClone(database.account);
  for (const [newPassword, code] of [["too short", "PASSWORD_TOO_SHORT"], ["x".repeat(129), "PASSWORD_TOO_LONG"]]) {
    const response = await post("change-password", { currentPassword: password, newPassword }, { cookie });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, code);
  }
  assert.deepEqual(database.account, before);
});

test("password updates persist a hash, replace the session, and only affect the signed-in user", async () => {
  const { auth, database, post, email, cookie } = await passwordFixture();
  const otherEmail = "another-user@example.com";
  await post("sign-up/email", { name: "Another User", email: otherEmail, password });
  const otherLogin = await post("sign-in/email", { email: otherEmail, password });
  const otherCookie = otherLogin.headers.get("set-cookie")!.split(";")[0];
  const otherAccount = structuredClone(database.account.find((account) => account.userId !== database.user[0].id));
  const secondLogin = await post("sign-in/email", { email, password });
  const secondCookie = secondLogin.headers.get("set-cookie")!.split(";")[0];
  const oldHash = database.account[0].password;
  const newPassword = "  a fresh passphrase 456!  ";
  const response = await post("change-password", {
    currentPassword: password, newPassword, revokeOtherSessions: true,
    // The endpoint must use the session, never a caller-supplied user ID.
    userId: otherAccount.userId,
  }, { cookie });
  assert.equal(response.status, 200);
  assert.notEqual(database.account[0].password, oldHash);
  assert.notEqual(database.account[0].password, newPassword);
  assert.deepEqual(database.account.find((account) => account.id === otherAccount.id), otherAccount);

  for (const oldCookie of [cookie, secondCookie]) {
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: oldCookie }) }), null);
  }
  const updatedCookie = response.headers.get("set-cookie")!.split(";")[0];
  assert.ok(await auth.api.getSession({ headers: new Headers({ cookie: updatedCookie }) }));
  assert.ok(await auth.api.getSession({ headers: new Headers({ cookie: otherCookie }) }));
  assert.equal((await post("sign-in/email", { email, password })).status, 401);
  assert.equal((await post("sign-in/email", { email, password: newPassword })).status, 200);
});

test("provider-only users cannot change a password or create credentials through this endpoint", async () => {
  const { database, post, cookie } = await passwordFixture();
  database.account[0].providerId = "google";
  delete database.account[0].password;
  const before = structuredClone(database.account);
  const response = await post("change-password", {
    currentPassword: password, newPassword: "another long password 456!",
  }, { cookie });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "CREDENTIAL_ACCOUNT_NOT_FOUND");
  assert.deepEqual(database.account, before);
});

test("signup persists a hashed password; subsequent login creates a usable session", async () => {
  const { auth, database, post } = fixture();
  const signup = await post("sign-up/email", { name: "Test User", email: "  New.User@Example.com  ", password });
  assert.equal(signup.status, 200);
  assert.equal((await signup.json()).token, null);
  assert.equal(database.session.length, 0);
  assert.equal(database.user[0].email, "new.user@example.com");
  assert.equal(database.account[0].providerId, "credential");
  assert.ok(database.account[0].password);
  assert.notEqual(database.account[0].password, password);

  const login = await post("sign-in/email", { email: " NEW.USER@Example.com ", password, callbackURL: "/dashboard" });
  assert.equal(login.status, 200);
  const data = await login.json();
  assert.equal(data.user.id, database.user[0].id);
  assert.equal(data.url, "/dashboard");
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie?.includes("better-auth.session_token="));
  const session = await auth.api.getSession({ headers: new Headers({ cookie: cookie!.split(";")[0] }) });
  assert.equal(session?.user.id, data.user.id);

  const wrongPassword = await post("sign-in/email", { email: "new.user@example.com", password: "wrong password" });
  assert.equal(wrongPassword.status, 401);
});

for (const provider of ["credential", "google", "github"]) {
  test(`signup rejects an existing ${provider} email without changing the account`, async () => {
    const { database, post } = fixture();
    if (provider === "credential") {
      assert.equal((await post("sign-up/email", { name: "Original", email: "existing@example.com", password })).status, 200);
    } else {
      database.user.push({ id: "existing", name: "Original", email: "Existing@Example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() });
      database.account.push({ id: "social-account", userId: "existing", providerId: provider, accountId: "provider-user" });
    }
    const before = structuredClone(database);
    const duplicate = await post("sign-up/email", { name: "Replacement", email: " EXISTING@example.com ", password: "a different password 456!" });
    assert.equal(duplicate.status, 422);
    assert.equal((await duplicate.json()).code, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
    assert.deepEqual(database, before);
    if (provider === "credential") {
      assert.equal((await post("sign-in/email", { email: "existing@example.com", password })).status, 200);
    }
  });
}

test("Better Auth's own duplicate check also rejects instead of returning synthetic success", async () => {
  const database = { user: [], account: [], session: [], verification: [] };
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-only-auth-secret-with-at-least-32-characters",
    database: memoryAdapter(database),
    ...emailAuthOptions(async () => null),
    logger: { disabled: true },
  });
  const body = { name: "Original", email: "race@example.com", password };
  await auth.api.signUpEmail({ body });
  await assert.rejects(auth.api.signUpEmail({ body }), (error: any) => {
    assert.equal(error.body.code, "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL");
    return true;
  });
});
