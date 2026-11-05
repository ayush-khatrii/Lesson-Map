const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const ts = require("typescript");
const { PGlite } = require("@electric-sql/pglite");
const { Prisma } = require("../app/generated/prisma/client.ts");

function load(relative, overrides = {}, cache = {}) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache[file]) return cache[file].exports;
  const module = { exports: {} };
  cache[file] = module;
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      process,
      URL,
      URLSearchParams,
      Headers,
      Request,
      Response,
      Date,
      BigInt,
      Map,
      Set,
      Buffer,
      crypto: globalThis.crypto,
      console,
      require(id) {
        if (id in overrides) return overrides[id];
        if (id === "server-only") return {};
        if (id === "@/app/generated/prisma/client") return { Prisma };
        if (id.startsWith("@/"))
          return load(`${id.slice(2)}.ts`, overrides, cache);
        if (id.startsWith("."))
          return load(
            path.relative(
              path.resolve(__dirname, ".."),
              path.resolve(path.dirname(file), `${id}.ts`),
            ),
            overrides,
            cache,
          );
        return require(id);
      },
    },
    { filename: file },
  );
  return module.exports;
}

test("dashboard migration and reporting queries run against PostgreSQL semantics", async () => {
  const sql = new PGlite();
  try {
    const directory = path.resolve(__dirname, "../prisma/migrations");
    for (const name of fs
      .readdirSync(directory)
      .filter((name) =>
        fs.existsSync(path.join(directory, name, "migration.sql")),
      )
      .sort())
      await sql.exec(
        fs.readFileSync(path.join(directory, name, "migration.sql"), "utf8"),
      );
    await sql.exec(`INSERT INTO "user" (id,name,email,"updatedAt",plan,"subscriptionStatus","subscriptionCancelAtPeriodEnd","subscriptionCurrentPeriodEnd") VALUES
      ('u1','Owner','owner@example.com',now(),'CREATOR','active',true,now()+interval '1 day'),
      ('u2','Free User','free@example.com',now(),'FREE',NULL,false,NULL),
      ('u3','Expired','expired@example.com',now(),'PROFESSIONAL','active',true,now()-interval '1 day');
      INSERT INTO "Course" (id,"courseName",description,"userId","isPublished","updatedAt") VALUES ('c1','First course','Description','u1',true,now()),('c2','Second course','Description','u1',false,now());
      INSERT INTO "Module" (id,"moduleName",description,"order","courseId","updatedAt") VALUES ('m1','Module','Description',0,'c1',now()),('m2','Module','Description',1,'c1',now());
      INSERT INTO "Lesson" (id,"lessonName","order","moduleId","updatedAt") VALUES ('l1','Lesson',0,'m1',now()),('l2','Lesson',1,'m1',now()),('l3','Lesson',0,'m2',now());
      INSERT INTO "AdminAccess" (id,"userId",role,"updatedAt") VALUES ('a1','u1','SUPER_ADMIN',now());`);
    await assert.rejects(
      sql.exec(
        `INSERT INTO "AdminAccess" (id,"userId",role,"updatedAt") VALUES ('a2','u2','SUPER_ADMIN',now())`,
      ),
      /unique/i,
    );
    const db = {
      $queryRaw: (strings, ...values) => {
        const query = Prisma.sql(strings, ...values);
        return sql
          .query(
            query.text,
            query.values.map((v) => (v instanceof Date ? v.toISOString() : v)),
          )
          .then((result) => result.rows);
      },
      $transaction: (queries) => Promise.all(queries),
    };
    const { usersData, contentData } = load("lib/admin/data.ts", {
      "@/lib/prisma": { db },
    });
    const all = await usersData(new URLSearchParams("sort=name&direction=asc"));
    assert.equal(all.total, 3);
    const owner = all.data.find((row) => row.email === "owner@example.com");
    assert.equal(owner.courses, 2);
    assert.equal(owner.modules, 2);
    assert.equal(owner.lessons, 3);
    assert.equal(owner.publishedCourses, 1);
    assert.equal(owner.isPaid, true);
    assert.equal(owner.isCreator, true);
    for (const [key, value] of Object.entries(owner))
      if (!["id", "name", "email"].includes(key))
        assert.ok(typeof value === "number" || typeof value === "boolean", key);
    assert.equal(
      all.data.find((row) => row.email === "expired@example.com").isFree,
      true,
    );
    const paid = await usersData(
      new URLSearchParams("paid=true&minCourses=2&active=true"),
    );
    assert.equal(paid.total, 1);
    const empty = await usersData(new URLSearchParams("q=nobody&page=2"));
    assert.equal(empty.total, 0);
    assert.equal(empty.data.length, 0);
    assert.equal((await usersData(new URLSearchParams("plan=FREE"))).total, 2);
    assert.equal(
      (await usersData(new URLSearchParams("q=';DROP TABLE user;--"))).total,
      0,
    );
    const content = await contentData(
      new URLSearchParams("published=true&sort=lessons"),
    );
    assert.equal(content.total, 1);
    assert.equal(content.data[0].modules, 2);
    assert.equal(content.data[0].lessons, 3);
    assert.equal(
      (await contentData(new URLSearchParams("public=true"))).total,
      0,
    );
    const { throttle } = load("lib/admin/http.ts", {
      "@/lib/prisma": { db },
      "./guard": {
        AdminError: class extends Error {
          constructor(status, code, message) {
            super(message);
            this.status = status;
            this.code = code;
          }
        },
      },
      "next/server": {
        NextResponse: { json: (body, init) => Response.json(body, init) },
      },
    });
    await Promise.all(
      Array.from({ length: 5 }, () => throttle("concurrent-attempts")),
    );
    await assert.rejects(
      throttle("concurrent-attempts"),
      (error) => error.status === 429,
    );
  } finally {
    await sql.close();
  }
});

test("authenticator enrollment, concurrent replay protection and single-use recovery are enforced", async () => {
  process.env.ADMIN_TOTP_ENCRYPTION_KEY = "cd".repeat(32);
  const cryptoFunctions = load("lib/admin/crypto.ts");
  const access = {
    id: "a1",
    userId: "u1",
    active: true,
    totpEnabledAt: null,
    totpSecret: null,
    pendingSecret: null,
    pendingExpiresAt: null,
    lastCounter: null,
    securityVersion: 0,
  };
  const session = {
    id: "s1",
    userId: "u1",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    verifiedAt: null,
    lastActivityAt: null,
    verifiedVersion: null,
  };
  const sessions = new Map([[session.id, session]]),
    codes = [],
    logs = [];
  const apply = (object, patch) => {
    for (const [key, value] of Object.entries(patch))
      object[key] =
        value && typeof value === "object" && "increment" in value
          ? object[key] + value.increment
          : value;
    return object;
  };
  let queue = Promise.resolve();
  const db = {
    $queryRaw: async () => [{ count: 1 }],
    adminAccess: {
      findUnique: async () => ({ ...access }),
      update: async ({ data }) => apply(access, data),
      updateMany: async ({ where, data }) => {
        if (where.totpEnabledAt === null && access.totpEnabledAt)
          return { count: 0 };
        apply(access, data);
        return { count: 1 };
      },
    },
    adminSession: {
      findUnique: async ({ where }) => sessions.get(where.id) ?? null,
      update: async ({ where, data }) => apply(sessions.get(where.id), data),
      updateMany: async ({ where, data }) => {
        const value = sessions.get(where.id);
        if (value) apply(value, data);
        return { count: value ? 1 : 0 };
      },
      deleteMany: async () => {
        const count = sessions.size;
        sessions.clear();
        return { count };
      },
    },
    adminRecoveryCode: {
      deleteMany: async ({ where }) => {
        for (let i = codes.length - 1; i >= 0; i--)
          if (where.usedAt === undefined || codes[i].usedAt == null)
            codes.splice(i, 1);
        return { count: 0 };
      },
      createMany: async ({ data }) => {
        codes.push(...data.map((c) => ({ ...c, usedAt: null })));
        return { count: data.length };
      },
      updateMany: async ({ where, data }) => {
        const value = codes.find(
          (c) =>
            c.accessId === where.accessId &&
            c.hash === where.hash &&
            c.usedAt === null,
        );
        if (!value) return { count: 0 };
        apply(value, data);
        return { count: 1 };
      },
    },
    adminAuditLog: {
      create: async ({ data }) => {
        logs.push(data);
        return data;
      },
    },
    $transaction: (fn) => {
      const result = queue.then(() => fn(db));
      queue = result.catch(() => {});
      return result;
    },
  };
  const AdminError = class extends Error {
    constructor(status, code, message) {
      super(message);
      this.status = status;
      this.code = code;
    }
  };
  const { securityAction } = load("lib/admin/security.ts", {
    "@/lib/prisma": { db },
    "./guard": { AdminError },
    "next/server": {
      NextResponse: { json: (body, init) => Response.json(body, init) },
    },
  });
  const admin = {
    user: { id: "u1", email: "owner@example.com" },
    session,
    access,
  };
  const request = (code) =>
    new Request("http://localhost:3000/api/admin/security/verify", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });
  const setup = await securityAction("enroll", request(""), admin);
  assert.ok(setup.qrCode.startsWith("data:image/png"));
  assert.notEqual(access.pendingSecret, setup.secret);
  const token = cryptoFunctions.authenticator(setup.secret).generate();
  const enrolled = await securityAction("confirm", request(token), admin);
  assert.equal(enrolled.recoveryCodes.length, 10);
  assert.equal(codes.length, 10);
  assert.ok(session.verifiedAt);
  assert.ok(!JSON.stringify(codes).includes(enrolled.recoveryCodes[0]));
  await assert.rejects(
    securityAction("verify", request(token), admin),
    (error) => error.code === "INVALID_CODE",
  );
  const next = cryptoFunctions
    .authenticator(setup.secret)
    .generate({ timestamp: Date.now() + 30000 });
  const attempts = await Promise.allSettled([
    securityAction("verify", request(next), admin),
    securityAction("verify", request(next), admin),
  ]);
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
  await assert.rejects(
    securityAction("enroll", request(""), admin),
    (error) => error.status === 403,
  );
  const result = await securityAction(
    "recover",
    request(enrolled.recoveryCodes[0]),
    admin,
  );
  assert.equal(result.signInRequired, true);
  assert.equal(sessions.size, 0);
  assert.equal(access.totpSecret, null);
  assert.equal(access.securityVersion, 1);
  assert.ok(logs.some((log) => log.action === "AUTHENTICATOR_RECOVERED"));
  sessions.set(session.id, session);
  await assert.rejects(
    securityAction("recover", request(enrolled.recoveryCodes[0]), admin),
    (error) => error.code === "INVALID_CODE",
  );
});

test("all admin endpoints deny missing sessions, missing membership, revoked and unverified admins", async () => {
  const now = new Date(),
    session = {
      id: "s1",
      userId: "u1",
      createdAt: now,
      expiresAt: new Date(now.getTime() + 3600000),
      verifiedAt: now,
      lastActivityAt: now,
      verifiedVersion: 0,
    };
  let identity = null,
    access = null;
  process.env.ADMIN_AUTH_SECRET = "test-only-admin-secret";
  const db = {
    adminSession: {
      findUnique: async () => session,
      updateMany: async () => ({ count: 1 }),
    },
    adminAccess: { findUnique: async () => access },
  };
  const guards = load("lib/admin/guard.ts", {
    "@/lib/prisma": { db },
    "./auth": {
      getAdminAuth: () => ({ api: { getSession: async () => identity } }),
    },
    "next/headers": { headers: async () => new Headers() },
    "next/navigation": {
      redirect: () => {
        throw new Error("redirect");
      },
    },
  });
  const { adminEndpoint } = load("lib/admin/http.ts", {
    "@/lib/prisma": { db },
    "./guard": guards,
    "@/lib/admin/guard": guards,
    "next/server": {
      NextResponse: { json: (body, init) => Response.json(body, init) },
    },
  });
  const endpoint = adminEndpoint(async () => ({ secretBusinessData: true }));
  const request = () => new Request("http://localhost:3000/api/admin/users");
  assert.equal((await endpoint(request())).status, 401);
  identity = { user: { id: "u1" }, session: { id: "s1" } };
  assert.equal((await endpoint(request())).status, 401);
  access = {
    id: "a1",
    active: false,
    role: "ADMIN",
    securityVersion: 0,
    totpEnabledAt: now,
  };
  assert.equal((await endpoint(request())).status, 401);
  access.active = true;
  session.verifiedAt = null;
  const locked = await endpoint(request());
  assert.equal(locked.status, 403);
  assert.equal((await locked.json()).code, "VERIFICATION_REQUIRED");
  session.verifiedAt = now;
  const allowed = await endpoint(request());
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get("cache-control"), /no-store/);
  const ownerOnly = adminEndpoint(async () => ({ ok: true }), {
    superAdmin: true,
  });
  assert.equal((await ownerOnly(request())).status, 403);
  const freshOnly = adminEndpoint(async () => ({ ok: true }), { fresh: true });
  session.verifiedAt = new Date(now.getTime() - 6 * 60000);
  assert.equal((await freshOnly(request())).status, 403);
  const crossOrigin = new Request("http://localhost:3000/api/admin/users", {
    method: "POST",
    headers: { Origin: "https://untrusted.example" },
    body: "{}",
  });
  assert.equal((await endpoint(crossOrigin)).status, 403);
});

test("billing reads all SDK pages, deduplicates payments, attributes older refunds, and never caches partial reads", async () => {
  process.env.DODO_PAYMENTS_API_KEY = "test-key";
  process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
  process.env.DODO_PRODUCT_CREATOR = "creator";
  process.env.DODO_PRODUCT_PROFESSIONAL = "professional";
  let fail = false,
    cached = null,
    reads = 0;
  const payment = {
    payment_id: "p1",
    created_at: "2026-11-02T00:00:00Z",
    customer: { name: "Owner", email: "owner@example.com" },
    total_amount: 1200,
    currency: "USD",
    status: "succeeded",
  };
  const provider = {
    payments: {
      list: (query) => ({
        async *[Symbol.asyncIterator]() {
          reads++;
          if (query.product_id === "creator") {
            yield payment;
            if (fail) throw new Error("Page two failed");
            yield { ...payment, payment_id: "p2" };
          }
        },
      }),
      retrieve: async () => ({ subscription_id: "old-sub" }),
    },
    subscriptions: { retrieve: async () => ({ product_id: "creator" }) },
    refunds: {
      list: () => ({
        async *[Symbol.asyncIterator]() {
          yield {
            refund_id: "r1",
            payment_id: "older-payment",
            created_at: "2026-11-02T00:00:00Z",
            status: "succeeded",
            amount: 200,
            currency: "USD",
          };
        },
      }),
    },
  };
  const db = {
    adminReportCache: {
      findUnique: async () => cached,
      upsert: async ({ create }) => {
        cached = create;
        return cached;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };
  const { billingReport } = load("lib/admin/billing.ts", {
    "@/lib/prisma": { db },
    "@/lib/payments/dodopayments": { createDodoPayments: () => provider },
  });
  const params = new URLSearchParams(
    "period=custom&from=2026-11-01&to=2026-11-03",
  );
  const result = await billingReport(params);
  assert.equal(result.available, true);
  assert.equal(result.current.gross, 2400);
  assert.equal(result.current.refunds, 200);
  assert.equal(result.current.net, 2200);
  assert.equal(reads, 2);
  fail = true;
  params.set("refresh", "true");
  const stale = await billingReport(params);
  assert.equal(stale.stale, true);
  assert.equal(stale.current.gross, 2400);
  cached = null;
  const unavailable = await billingReport(params);
  assert.equal(unavailable.available, false);
  assert.equal(unavailable.current, null);
  assert.equal(cached, null);
});
