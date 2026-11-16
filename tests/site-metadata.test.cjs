const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(env = {}) {
  const cache = {};
  function load(file) {
    if (cache[file]) return cache[file];
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      module, exports: module.exports, process: { env }, URL, console,
      require(id) {
        if (id === '@/lib/site') return load('lib/site.ts');
        if (id === '@/constants/email') return { SUPPORT_EMAIL: 'support@lessonmap.org' };
        if (id === '@/lib/prisma') return { db: { course: { findMany: async () => [{ shareSlug: 'python basics', updatedAt: new Date('2026-11-01') }] } } };
        if (id === 'next/cache') return { cacheLife() {}, cacheTag() {} };
        if (id === 'next/font/local') return { __esModule: true, default: () => ({ className: 'font' }) };
        if (id === 'react/jsx-runtime') return require(id);
        if (id === '@/app/globals.css' || id.startsWith('@/components/')) return {};
        throw new Error(`Unexpected import ${id}`);
      },
    });
    return cache[file] = module.exports;
  }
  return { load };
}

test('default and retired origins resolve to lessonmap.org', () => {
  for (const NEXT_PUBLIC_BASE_URL of [undefined, '', 'https://lessonmap.vercel.app', 'https://www.lessonmap.org', 'invalid', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    const { load } = fixture({ NEXT_PUBLIC_BASE_URL });
    const site = load('lib/site.ts');
    assert.equal(site.SITE_URL, 'https://lessonmap.org');
    assert.equal(site.absoluteUrl('/pricing'), 'https://lessonmap.org/pricing');
  }
});
test('explicit development and custom deployment origins are supported', () => {
  const { load } = fixture({ NEXT_PUBLIC_BASE_URL: 'http://localhost:3000/path' });
  assert.equal(load('lib/site.ts').SITE_URL, 'http://localhost:3000');
});
test('root and home metadata consistently describe LessonMap on the new domain', () => {
  const { load } = fixture();
  const root = load('app/layout.tsx').metadata;
  const home = load('app/(root)/page.tsx').metadata;
  assert.equal(root.metadataBase.origin, 'https://lessonmap.org');
  assert.equal(root.openGraph.url, 'https://lessonmap.org');
  assert.equal(home.alternates.canonical, '/');
  assert.equal(home.title.absolute, root.title.default);
  assert.equal(root.description, home.description);
  assert.equal(home.openGraph.title, home.title.absolute);
  assert.equal(root.twitter.card, 'summary_large_image');
});
test('robots and sitemap advertise the new domain, including public course links', async () => {
  const { load } = fixture({ DATABASE_URL: 'test-only-placeholder' });
  const robots = load('app/robots.ts').default();
  assert.equal(robots.host, 'https://lessonmap.org');
  assert.equal(robots.sitemap, 'https://lessonmap.org/sitemap.xml');
  const sitemap = await load('app/sitemap.ts').default();
  assert.ok(sitemap.every(entry => entry.url.startsWith('https://lessonmap.org/')));
  assert.ok(sitemap.some(entry => entry.url === 'https://lessonmap.org/p/python%20basics'));
  assert.ok(!sitemap.some(entry => entry.url.includes('/dashboard')));
});
test('old deployment and www redirect permanently while preserving paths', async () => {
  const rules = await fixture().load('next.config.ts').default.redirects();
  for (const host of ['lessonmap.vercel.app', 'www.lessonmap.org']) {
    const rule = rules.find(rule => rule.has.some(condition => condition.value === host));
    assert.equal(rule.source, '/:path*');
    assert.equal(rule.destination, 'https://lessonmap.org/:path*');
    assert.equal(rule.permanent, true);
  }
});
test('auth destinations remain local after the domain migration', () => {
  const { getAuthRedirect } = fixture().load('lib/auth-redirect.ts');
  assert.equal(getAuthRedirect('/pricing?upgrade=true'), '/pricing?upgrade=true');
  for (const destination of ['https://lessonmap.org/pricing', '//evil.example', '/api/auth/sign-in', '/sign-in']) {
    assert.equal(getAuthRedirect(destination), '/dashboard');
  }
});
test('storage CORS permits the production domain', () => {
  const policies = JSON.parse(fs.readFileSync('cors.json', 'utf8'));
  assert.ok(policies.some(policy => policy.AllowedOrigins.includes('https://lessonmap.org')));
});
