const assert = require("node:assert/strict"),
  { test } = require("node:test");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function fixture() {
  const store = new Map(),
    writes = [],
    logs = [];
  let ambiguous = false;
  const products = [
    { id: "pdt_creator", plan: "CREATOR" },
    { id: "pdt_pro", plan: "PROFESSIONAL" },
  ];
  const client = {
    discounts: {
      retrieve: async (id) => store.get(id),
      retrieveByCode: async (code) => {
        const value = [...store.values()].find((v) => v.code === code);
        if (value) return value;
        throw Object.assign(new Error("Not found"), { status: 404 });
      },
      create: async (body) => {
        const value = {
          ...body,
          discount_id: `dis_${store.size}`,
          times_used: 0,
        };
        store.set(value.discount_id, value);
        writes.push(body);
        if (ambiguous) throw new Error("Timeout after write");
        return value;
      },
      update: async (id, body) => {
        const value = { ...store.get(id), ...body };
        store.set(id, value);
        writes.push(body);
        return value;
      },
      list: () => ({
        async *[Symbol.asyncIterator]() {
          for (const value of store.values()) yield value;
        },
      }),
    },
  };
  const AdminError = class extends Error {
    constructor(status, code, message) {
      super(message);
      this.status = status;
      this.code = code;
    }
  };
  const file = path.resolve(__dirname, "../lib/admin/discounts.ts"),
    module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      Date,
      Set,
      console,
      require(id) {
        if (id === "server-only") return {};
        if (id === "./billing")
          return {
            adminDodo: () => ({ client, products, environment: "test_mode" }),
          };
        if (id === "./coupon-policy")
          return require("../lib/admin/coupon-policy.ts");
        if (id === "./guard") return { AdminError };
        if (id === "./http")
          return {
            throttle: async () => {},
            audit: async (...args) => logs.push(args),
          };
        throw new Error(`Unexpected import: ${id}`);
      },
    },
  );
  return {
    ...module.exports,
    store,
    writes,
    logs,
    products,
    ambiguous: () => {
      ambiguous = true;
    },
  };
}
const input = {
  name: "Launch",
  code: "SAVE54",
  percentage: 5.4,
  plans: ["CREATOR"],
};
test("coupon creation uses basis points, explicit products, and safe recurring defaults", async () => {
  const h = fixture();
  const created = await h.mutateDiscount("owner", input);
  const body = h.writes[0];
  assert.equal(body.amount, 540);
  assert.equal(body.type, "percentage");
  assert.equal(body.restricted_to.join(","), "pdt_creator");
  assert.equal(body.subscription_cycles, 1);
  assert.equal(body.per_customer_usage_limit, 1);
  assert.equal(body.preserve_on_plan_change, false);
  assert.equal(created.data.state, "active");
  assert.ok(h.logs.some((log) => log[1] === "COUPON_CREATED"));
  await assert.rejects(
    h.mutateDiscount("owner", input),
    (error) => error.code === "DUPLICATE_CODE",
  );
  assert.equal(h.writes.length, 1);
});
test("ambiguous creates reconcile the same code instead of issuing another coupon", async () => {
  const h = fixture();
  h.ambiguous();
  const result = await h.mutateDiscount("owner", input);
  assert.equal(result.data.code, input.code);
  assert.equal(h.store.size, 1);
  assert.equal(h.writes.length, 1);
});
test("redeemed terms are immutable and unrelated products cannot be edited", async () => {
  const h = fixture();
  const created = await h.mutateDiscount("owner", input);
  h.store.get(created.data.id).times_used = 1;
  await assert.rejects(
    h.mutateDiscount("owner", { ...input, percentage: 30 }, created.data.id),
    (error) => error.code === "COUPON_USED",
  );
  await h.mutateDiscount(
    "owner",
    { ...input, name: "Renamed" },
    created.data.id,
  );
  assert.equal(h.store.get(created.data.id).name, "Renamed");
  h.store.get(created.data.id).restricted_to = ["other-product"];
  await assert.rejects(
    h.mutateDiscount("owner", input, created.data.id),
    (error) => error.status === 404,
  );
});
test("scheduled coupons can end immediately and both-plan targeting requires configured products", async () => {
  const h = fixture();
  const created = await h.mutateDiscount("owner", {
    ...input,
    startsAt: "2099-01-01T00:00:00Z",
  });
  const ended = await h.mutateDiscount(
    "owner",
    { action: "end" },
    created.data.id,
  );
  assert.equal(ended.data.state, "expired");
  assert.equal(h.writes.at(-1).starts_at, null);
  h.products.pop();
  await assert.rejects(
    h.mutateDiscount("owner", { ...input, plans: ["CREATOR", "PROFESSIONAL"] }),
    (error) => error.code === "PLAN_NOT_CONFIGURED",
  );
});
