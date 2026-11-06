const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { z } = require('zod');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const schemaModule = { exports: {} };
vm.runInNewContext(compile('lib/ai/schema.ts'), {
  module: schemaModule, exports: schemaModule.exports, require, Date,
});
function fixture({ plan = 'FREE', status = 'active', cancelled = false, end = null, signedIn = true, ownsCourse = true } = {}) {
  const writes = [];
  const module = { exports: {} };
  vm.runInNewContext(compile('lib/actions.ts'), {
    module, exports: module.exports, console,
    require(id) {
      if (id === 'zod') return require('zod');
      if (id === '@/lib/validation') return new Proxy({}, { get: () => z.object({}).passthrough() });
      if (id === '@/lib/auth') return { auth: { api: { getSession: async () => signedIn ? { session: { userId: 'owner' } } : null } } };
      if (id === '@/lib/prisma') return { db: {
        user: {
          findUnique: async () => ({ plan, subscriptionStatus: status, subscriptionCancelAtPeriodEnd: cancelled, subscriptionCurrentPeriodEnd: end }),
          update: async args => { writes.push(args); return args.data; },
        },
        course: {
          findFirst: async () => ownsCourse ? { id: 'course', shareSlug: 'slug' } : null,
          update: async args => { writes.push(args); return args.data; },
        },
      } };
      if (id === 'next/headers') return { headers: async () => ({}) };
      if (id === 'next/cache') return { updateTag() {}, revalidatePath() {} };
      if (id === '@/lib/course-cache') return { userCoursesTag: id => id };
      if (id === '@/lib/ai/schema') return schemaModule.exports;
      if (id === '@/lib/course-access' || id === '@/lib/plans') return {};
      throw new Error(id);
    },
  });
  return { actions: module.exports, writes };
}
for (const options of [
  { plan: 'FREE' },
  { plan: 'CREATOR', status: 'expired' },
  { plan: 'CREATOR', cancelled: true, end: new Date(0) },
  { signedIn: false },
]) {
  test(`social mutations reject unavailable paid access: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal((await f.actions.updateSocialLinksAction({ socialWebsite: 'https://example.com' })).success, false);
    assert.equal((await f.actions.updateCourseSocialLinksAction('course', true)).success, false);
    assert.equal(f.writes.length, 0);
  });
}
for (const options of [
  { plan: 'CREATOR' },
  { plan: 'PROFESSIONAL' },
  { plan: 'CREATOR', cancelled: true, end: new Date(Date.now() + 86400000) },
]) {
  test(`active paid access can save and toggle links: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    assert.equal((await f.actions.updateSocialLinksAction({ socialWebsite: 'https://example.com' })).success, true);
    assert.equal((await f.actions.updateCourseSocialLinksAction('course', true)).success, true);
    assert.equal(f.writes.length, 2);
  });
}
test('paid users still cannot change another creator’s social visibility', async () => {
  const f = fixture({ plan: 'CREATOR', ownsCourse: false });
  assert.equal((await f.actions.updateCourseSocialLinksAction('course', true)).success, false);
  assert.equal(f.writes.length, 0);
});
