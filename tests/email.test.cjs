const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createHash } = require("node:crypto");
const { EMAIL_ACTIONS } = require("../constants/email.ts");
const { emailContent } = require("../lib/email/templates.tsx");

const welcome = {
  action: "WELCOME",
  to: "delivered@resend.dev",
  name: "<script>alert('test')</script>",
  eventId: "user-1",
};

function fixture(options = {}) {
  const calls = [];
  const logs = [];
  let clients = 0;
  const actions = structuredClone(EMAIL_ACTIONS);
  if (options.disabled) actions[options.disabled].enabled = false;
  const module = { exports: {} };
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../lib/email/send.ts"), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    URL,
    AbortSignal,
    process: {
      env: {
        RESEND_API_KEY: "test-only-placeholder",
        NEXT_PUBLIC_BASE_URL: "https://lessonmap.org",
        NODE_ENV: "production",
        ...options.env,
      },
    },
    console: { error: (...args) => logs.push(args) },
    require(id) {
      if (id === "server-only") return {};
      if (id === "node:crypto") return { createHash };
      if (id === "@/constants/email")
        return {
          EMAIL_ACTIONS: actions,
          EMAIL_REPLY_TO: "support@lessonmap.org",
        };
      if (id === "./templates") return { emailContent };
      if (id === "@react-email/render")
        return options.renderThrows
          ? {
              render: async () => {
                throw new Error("render failed");
              },
            }
          : require("@react-email/render");
      if (id === "resend")
        return {
          Resend: class {
            constructor() {
              clients++;
            }
            emails = {
              send: async (message, sendOptions) => {
                calls.push({ message, sendOptions });
                if (options.throws)
                  throw new Error("sensitive-provider-message");
                return (
                  options.response ?? { data: { id: "email-1" }, error: null }
                );
              },
            };
          },
        };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return {
    calls,
    logs,
    clients: () => clients,
    send: async (event = welcome) =>
      JSON.parse(JSON.stringify(await module.exports.sendEmailAction(event))),
  };
}

test("imports and missing credentials never create a client or send", async () => {
  const f = fixture({ env: { RESEND_API_KEY: "  " } });
  assert.equal(f.clients(), 0);
  assert.deepEqual(await f.send(), {
    status: "skipped",
    reason: "not_configured",
  });
  assert.equal(f.clients(), 0);
  assert.equal(f.calls.length, 0);
});

test("disabled and unregistered actions cannot send", async () => {
  const f = fixture({ disabled: "WELCOME" });
  assert.deepEqual(await f.send(), { status: "skipped", reason: "disabled" });
  assert.deepEqual(await f.send({ ...welcome, action: "CANCELLATION" }), {
    status: "failed",
    reason: "invalid_event",
  });
  assert.deepEqual(await f.send({ ...welcome, action: "__proto__" }), {
    status: "failed",
    reason: "invalid_event",
  });
  assert.equal(f.clients(), 0);
});

test("all registered actions select fixed senders, subjects, replyTo and escaped HTML", async () => {
  const f = fixture();
  for (const action of Object.keys(EMAIL_ACTIONS)) {
    const event = {
      ...welcome,
      action,
      plan: "CREATOR",
      resetUrl:
        "https://lessonmap.org/api/auth/reset-password/test-token?callbackURL=%2Ffuture-reset",
    };
    assert.deepEqual(await f.send(event), { status: "sent", id: "email-1" });
    const { message, sendOptions } = f.calls.at(-1);
    assert.equal(message.from, EMAIL_ACTIONS[action].from);
    assert.equal(message.subject, EMAIL_ACTIONS[action].subject);
    assert.equal(message.replyTo, "support@lessonmap.org");
    assert.equal(message.to[0], "delivered@resend.dev");
    assert.ok(message.html.includes("&lt;script&gt;"));
    assert.ok(!message.html.includes("<script>"));
    assert.ok(message.text.includes(welcome.name));
    assert.ok(message.text.includes("support@lessonmap.org"));
    assert.ok(message.html.includes("https://lessonmap.org/"));
    assert.equal(message.idempotencyKey, undefined);
    assert.equal(
      sendOptions.idempotencyKey,
      `${action.toLowerCase()}/${createHash("sha256").update(event.eventId).digest("hex")}`,
    );
    assert.ok(sendOptions.signal instanceof AbortSignal);
  }
});

test("idempotency keys remain stable per action occurrence, distinct per renewal, and hide tokens", async () => {
  const f = fixture();
  const event = {
    ...welcome,
    action: "PASSWORD_RESET_REQUESTED",
    resetUrl: "https://lessonmap.org/api/auth/reset-password/sensitive-token",
    eventId: "sensitive-token",
  };
  await f.send(event);
  await f.send(event);
  assert.equal(
    f.calls[0].sendOptions.idempotencyKey,
    f.calls[1].sendOptions.idempotencyKey,
  );
  assert.ok(!f.calls[0].sendOptions.idempotencyKey.includes("sensitive-token"));
  await f.send({
    ...welcome,
    action: "PLAN_RENEWED",
    plan: "CREATOR",
    eventId: "renewal-1",
  });
  await f.send({
    ...welcome,
    action: "PLAN_RENEWED",
    plan: "CREATOR",
    eventId: "renewal-2",
  });
  assert.notEqual(
    f.calls[2].sendOptions.idempotencyKey,
    f.calls[3].sendOptions.idempotencyKey,
  );
});

test("reset destinations and application origins are validated before sending", async () => {
  const f = fixture();
  for (const resetUrl of [
    "javascript:alert(1)",
    "https://untrusted.example/reset",
    "https://user:password@lessonmap.org/reset",
  ]) {
    assert.equal(
      (
        await f.send({
          ...welcome,
          action: "PASSWORD_RESET_REQUESTED",
          resetUrl,
        })
      ).status,
      "failed",
    );
  }
  assert.equal(f.calls.length, 0);
  for (const NEXT_PUBLIC_BASE_URL of [
    "",
    "javascript:alert(1)",
    "https://user:password@lessonmap.org",
  ]) {
    const invalid = fixture({ env: { NEXT_PUBLIC_BASE_URL } });
    assert.equal((await invalid.send()).status, "failed");
    assert.equal(invalid.calls.length, 0);
  }
});

test("SDK error responses and thrown transport errors return failures without leaking provider details", async () => {
  for (const options of [
    {
      response: {
        data: null,
        error: {
          name: "validation_error",
          message: "sensitive-provider-message",
        },
      },
    },
    { response: { data: null, error: null } },
    { throws: true },
    { renderThrows: true },
  ]) {
    const f = fixture(options);
    const result = await f.send();
    assert.equal(result.status, "failed");
    assert.equal(
      result.reason,
      options.throws
        ? "transport_error"
        : options.renderThrows
          ? "render_error"
          : "provider_error",
    );
    assert.ok(!JSON.stringify(f.logs).includes("sensitive-provider-message"));
    assert.ok(!JSON.stringify(f.logs).includes(welcome.to));
    assert.ok(!JSON.stringify(f.logs).includes(welcome.name));
    assert.equal(f.logs.length, 1);
    assert.equal(f.calls.length, options.renderThrows ? 0 : 1);
  }
});
