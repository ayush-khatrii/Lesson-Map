const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const mod = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    module: mod, exports: mod.exports, console, Request, Response, Headers, URL, process, AbortSignal, Buffer,
    require(id) {
      if (id.startsWith('.')) id = '@/' + path.posix.normalize(path.posix.join(path.posix.dirname(file), id));
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('@/')) return load(id.slice(2) + '.ts', mocks);
      return require(id);
    },
  });
  return mod.exports;
}
const policy = load('lib/r2/upload-policy.ts');
const formats = [
  ['notes.doc', 'Document', 'application/msword'],
  ['notes.docx', 'Document', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['workbook.xls', 'Spreadsheet', 'application/vnd.ms-excel'],
  ['workbook.xlsx', 'Spreadsheet', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['data.csv', 'Spreadsheet', 'text/csv'],
  ['notes.pdf', 'PDF', 'application/pdf'],
  ['diagram.png', 'Image', 'image/png'],
];
function fixture({ signedIn = true, ownsLesson = true, readable = true } = {}) {
  const calls = { signed: [], saved: [], reads: [], invalidated: [] };
  let resource;
  const object = { ContentLength: 123, ContentType: '', Metadata: { uploader: 'owner', lesson: 'lesson', size: '123' }, LastModified: new Date() };
  const allocation = { key: 'lesson-resources/owner/file', userId: 'owner', lessonId: 'lesson', size: 123, createdAt: new Date(), savedAt: null };
  const db = {
    lesson: { findFirst: async () => ownsLesson ? { id: 'lesson' } : null },
    resource: {
      findFirst: async (query) => query.where.key ? resource || null : readable ? { id: 'resource', key: 'lesson-resources/owner/file', filename: 'Résumé.xlsx', name: 'Workbook', type: 'Spreadsheet' } : null,
      create: async ({ data }) => { calls.saved.push(data); return resource = { id: 'resource', ...data }; },
    },
    uploadAllocation: {
      findUnique: async () => allocation,
      update: async ({ data }) => Object.assign(allocation, data),
    },
    $transaction: async (work) => work({ resource: db.resource, uploadAllocation: db.uploadAllocation, $executeRaw: async () => {} }),
  };
  const mocks = {
    '@/lib/auth': { auth: { api: { getSession: async () => signedIn ? { session: { userId: 'owner' } } : null } } },
    '@/lib/prisma': { db },
    '@/lib/course-cache': { userCoursesTag: (id) => id },
    'next/headers': { headers: async () => new Headers() },
    'next/cache': { revalidateTag: (...args) => calls.invalidated.push(args) },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init), redirect: (url, init) => new Response(null, { ...init, headers: { ...init?.headers, Location: url } }) } },
    '@/lib/r2/cleanup': { deleteUnreferencedFile: async () => {} },
    '@/lib/r2/generatePresignedUrl': {
      UploadLimitError: class extends Error {},
      getUploadStorage: async () => ({ usedBytes: 123, limitBytes: policy.UPLOAD_LIMITS.FREE.storageBytes }),
      generatePresignedUrl: async (...args) => { calls.signed.push(args); return { uploadUrl: 'https://storage.example/upload', key: 'lesson-resources/owner/file' }; },
    },
    '@/lib/r2/r2-client': { getR2: () => ({ send: async () => object }), getR2Bucket: () => 'bucket', R2NotConfiguredError: class extends Error {} },
    '@aws-sdk/client-s3': { HeadObjectCommand: class { constructor(input) { this.input = input; } }, GetObjectCommand: class { constructor(input) { this.input = input; } } },
    '@aws-sdk/s3-request-presigner': { getSignedUrl: async (_, command) => { calls.reads.push(command.input); return 'https://storage.example/download'; } },
  };
  const post = (file, body) => load(file, mocks).POST(new Request('https://lessonmap.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
  return { calls, object, mocks, post };
}
for (const [filename, type, contentType] of formats) {
  test(`${filename}: upload, persist, retry without duplicates`, async () => {
    const f = fixture();
    const data = { filename, type, contentType, name: 'Lesson attachment', size: 123, lessonId: 'lesson' };
    assert.equal((await f.post('app/api/upload/route.ts', data)).status, 200);
    assert.equal(f.calls.signed[0][1], contentType);
    f.object.ContentType = contentType;
    const saved = await f.post('app/complete-upload/route.ts', { ...data, key: 'lesson-resources/owner/file' });
    assert.equal(saved.status, 201);
    assert.equal((await saved.json()).type, type);
    assert.equal(f.calls.saved[0].url, null);
    assert.equal(f.calls.invalidated.length, 1);
    assert.equal((await f.post('app/complete-upload/route.ts', { ...data, key: 'lesson-resources/owner/file' })).status, 200);
    assert.equal(f.calls.saved.length, 1);
  });
}
test('Office extension fallback accepts absent/generic MIME and CSV aliases; rejects conflicting types and macros', () => {
  for (const [filename, type, mime] of formats.slice(0, 5)) {
    assert.equal(policy.normalizeUploadContentType(filename.toUpperCase(), ''), mime);
    assert.equal(policy.normalizeUploadContentType(filename, 'application/octet-stream'), mime);
    assert.equal(policy.matchesUploadResource(type, filename, mime), true);
    assert.equal(policy.normalizeUploadContentType(filename, 'text/html'), null);
  }
  assert.equal(policy.normalizeUploadContentType('data.csv', 'application/vnd.ms-excel'), 'text/csv');
  assert.equal(policy.normalizeUploadContentType('file.docm', 'application/octet-stream'), null);
  assert.equal(policy.normalizeUploadContentType('file.exe', formats[1][2]), null);
  assert.equal(policy.matchesUploadResource('Document', 'file.xlsx', formats[3][2]), false);
});
test('presigning rejects unsupported files, empty/oversized uploads, unauthorized users and other creators lessons', async () => {
  const valid = { filename: 'notes.docx', contentType: '', size: 123, lessonId: 'lesson' };
  assert.equal((await fixture().post('app/api/upload/route.ts', valid)).status, 200);
  for (const overrides of [{ size: 0 }, { size: policy.MAX_UPLOAD_BYTES + 1 }, { filename: 'app.exe' }, { contentType: 'text/html' }]) {
    const f = fixture();
    assert.equal((await f.post('app/api/upload/route.ts', { ...valid, ...overrides })).status, 400);
    assert.equal(f.calls.signed.length, 0);
  }
  assert.equal((await fixture({ signedIn: false }).post('app/api/upload/route.ts', valid)).status, 401);
  assert.equal((await fixture({ ownsLesson: false }).post('app/api/upload/route.ts', valid)).status, 404);
});
test('completion rejects wrong ownership, lesson, category, size, type, expired and missing objects', async () => {
  const data = { name: 'Workbook', filename: 'book.xlsx', type: 'Spreadsheet', contentType: formats[3][2], size: 123, lessonId: 'lesson', key: 'lesson-resources/owner/file' };
  for (const mutate of [
    f => { f.object.Metadata.uploader = 'other'; },
    f => { f.object.Metadata.lesson = 'other'; },
    f => { f.object.ContentLength = 124; },
    f => { f.object.ContentType = 'text/html'; },
    f => { f.object.LastModified = new Date(Date.now() - policy.UPLOAD_SAVE_WINDOW_MS - 1000); },
  ]) {
    const f = fixture(); f.object.ContentType = data.contentType; mutate(f);
    assert.equal((await f.post('app/complete-upload/route.ts', data)).status, 400);
    assert.equal(f.calls.saved.length, 0);
  }
  const f = fixture(); f.object.ContentType = data.contentType;
  assert.equal((await f.post('app/complete-upload/route.ts', { ...data, type: 'Document' })).status, 400);
  assert.equal((await f.post('app/complete-upload/route.ts', { ...data, key: 'lesson-resources/other/file' })).status, 400);
  assert.equal((await fixture({ ownsLesson: false }).post('app/complete-upload/route.ts', data)).status, 404);
  const missing = fixture();
  missing.mocks['@/lib/r2/r2-client'].getR2 = () => ({ send: async () => { throw { $metadata: { httpStatusCode: 404 } }; } });
  assert.equal((await missing.post('app/complete-upload/route.ts', data)).status, 400);
});
test('learner downloads use authorized lookup, short-lived signed URL and original filename', async () => {
  for (const signedIn of [false, true]) {
    const f = fixture({ signedIn });
    const response = await load('app/api/resource/[resourceId]/open/route.ts', f.mocks).GET(new Request('https://example.com'), { params: Promise.resolve({ resourceId: 'resource' }) });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.match(f.calls.reads[0].ResponseContentDisposition, /^attachment;/);
    assert.match(f.calls.reads[0].ResponseContentDisposition, /R%C3%A9sum%C3%A9.xlsx/);
  }
  const denied = fixture({ signedIn: false, readable: false });
  assert.equal((await load('app/api/resource/[resourceId]/open/route.ts', denied.mocks).GET(new Request('https://example.com'), { params: Promise.resolve({ resourceId: 'resource' }) })).status, 404);
  assert.equal(denied.calls.reads.length, 0);
});
test('PDF and image opening remains inline and filenames cannot inject response headers', async () => {
  for (const type of ['PDF', 'Image']) {
    const f = fixture();
    f.mocks['@/lib/prisma'].db.resource.findFirst = async () => ({ type, key: 'existing-file' });
    await load('app/api/resource/[resourceId]/open/route.ts', f.mocks).GET(new Request('https://example.com'), { params: Promise.resolve({ resourceId: 'resource' }) });
    assert.equal(f.calls.reads[0].ResponseContentDisposition, 'inline');
  }
  const disposition = policy.resourceDownloadDisposition('bad"\r\nfile.docx');
  assert.equal(/[\r\n]/.test(disposition), false);
});
test('file resources cannot bypass verified upload or be relabeled after saving', async () => {
  for (const type of ['Document', 'Spreadsheet']) {
    const f = fixture();
    assert.equal((await f.post('app/api/resource/route.ts', { name: 'Bypass', type, lessonId: 'lesson' })).status, 400);
    assert.equal(f.calls.saved.length, 0);
  }
  const f = fixture();
  const route = load('app/api/resource/[resourceId]/route.ts', f.mocks);
  const put = (body) => route.PUT(new Request('https://example.com', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { params: Promise.resolve({ resourceId: 'resource' }) });
  assert.equal((await put({ type: 'Note' })).status, 400);
  assert.equal((await put({ filename: 'replacement.xlsx' })).status, 400);
  f.mocks['@/lib/prisma'].db.resource.findFirst = async () => ({ id: 'resource', type: 'Note', key: null });
  assert.equal((await put({ type: 'Document' })).status, 400);
});

test('completion requires an unexpired account/lesson/size reservation', async () => {
  const data = { name: 'PDF', filename: 'notes.pdf', type: 'PDF', contentType: 'application/pdf', size: 123, lessonId: 'lesson', key: 'lesson-resources/owner/file' };
  for (const reservation of [
    null,
    { userId: 'other', lessonId: 'lesson', size: 123, createdAt: new Date() },
    { userId: 'owner', lessonId: 'other', size: 123, createdAt: new Date() },
    { userId: 'owner', lessonId: 'lesson', size: 124, createdAt: new Date() },
    { userId: 'owner', lessonId: 'lesson', size: 123, createdAt: new Date(0) },
  ]) {
    const f = fixture();
    f.mocks['@/lib/prisma'].db.uploadAllocation.findUnique = async () => reservation;
    assert.equal((await f.post('app/complete-upload/route.ts', data)).status, 400);
    assert.equal(f.calls.saved.length, 0);
  }
});

async function quotaFixture({ legacyBytes = 0, plan = 'FREE', status = null } = {}) {
  const { PGlite } = require('@electric-sql/pglite');
  const pg = new PGlite();
  await pg.exec(`
    CREATE TABLE "user" ("id" TEXT PRIMARY KEY, "plan" TEXT, "subscriptionStatus" TEXT,
      "subscriptionCancelAtPeriodEnd" BOOLEAN DEFAULT false, "subscriptionCurrentPeriodEnd" TIMESTAMP);
    CREATE TABLE "Course" ("id" TEXT PRIMARY KEY, "userId" TEXT);
    CREATE TABLE "Module" ("id" TEXT PRIMARY KEY, "courseId" TEXT);
    CREATE TABLE "Lesson" ("id" TEXT PRIMARY KEY, "moduleId" TEXT);
    CREATE TABLE "Resource" ("id" TEXT PRIMARY KEY, "key" TEXT, "url" TEXT, "size" INTEGER, "type" TEXT,
      "lessonId" TEXT, "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE "rateLimit" ("id" TEXT PRIMARY KEY, "key" TEXT UNIQUE, "count" INTEGER, "lastRequest" BIGINT);
    INSERT INTO "Course" VALUES ('course', 'owner');
    INSERT INTO "Module" VALUES ('module', 'course');
    INSERT INTO "Lesson" VALUES ('lesson', 'module');
  `);
  await pg.query('INSERT INTO "user" ("id", "plan", "subscriptionStatus") VALUES ($1,$2,$3), ($4,$5,$6)',
    ['owner', plan, status, 'other', 'FREE', null]);
  if (legacyBytes) await pg.query('INSERT INTO "Resource" ("id","key","size","type","lessonId") VALUES ($1,$2,$3,$4,$5)',
    ['legacy', 'lesson-resources/owner/legacy', legacyBytes, 'PDF', 'lesson']);
  await pg.exec(fs.readFileSync(path.join(__dirname, '../prisma/migrations/20261118000000_upload_storage_quota/migration.sql'), 'utf8'));
  const calls = { signed: 0, objects: [], locks: 0 };
  let signFailure = false;
  let deleteFailure = false;
  let objectExists = false;
  function adapter(client) {
    const raw = async (strings, ...values) => {
      const sql = strings.reduce((text, part, i) => text + (i ? '$' + i : '') + part, '');
      if (sql.includes('FOR UPDATE')) calls.locks++;
      return (await client.query(sql, values.map(v => typeof v === 'bigint' ? v.toString() : v))).rows;
    };
    return {
      $queryRaw: raw,
      // PGlite serializes transactions and does not implement advisory locks.
      $executeRaw: async () => {},
      user: { findUnique: async ({ where }) => (await client.query('SELECT * FROM "user" WHERE "id"=$1', [where.id])).rows[0] || null },
      uploadAllocation: {
        create: async ({ data }) => (await client.query(
          'INSERT INTO "UploadAllocation" ("key","userId","lessonId","size") VALUES ($1,$2,$3,$4) RETURNING *',
          [data.key, data.userId, data.lessonId, data.size])).rows[0],
        findUnique: async ({ where }) => (await client.query('SELECT * FROM "UploadAllocation" WHERE "key"=$1', [where.key])).rows[0] || null,
        deleteMany: async ({ where }) => client.query('DELETE FROM "UploadAllocation" WHERE "key"=$1', [where.key]),
        findMany: async ({ where, take }) => (await client.query(
          'SELECT "key" FROM "UploadAllocation" WHERE "savedAt" IS NULL AND "createdAt"<$1 AND "key">$2 ORDER BY "key" LIMIT $3',
          [where.createdAt.lt.toISOString(), where.key?.gt || '', take])).rows,
      },
      resource: {
        count: async ({ where }) => Number((await client.query(
          'SELECT COUNT(*) FROM "Resource" WHERE "key"=$1 OR "url"=$1', [where.OR[0].key])).rows[0].count),
      },
    };
  }
  const db = adapter(pg);
  db.$transaction = work => pg.transaction(tx => work(adapter(tx)));
  const mocks = {
    '@/lib/prisma': { db },
    '@aws-sdk/client-s3': Object.fromEntries(['PutObjectCommand', 'HeadObjectCommand', 'DeleteObjectCommand', 'ListObjectsV2Command'].map(name => [name, class {
      constructor(input) { this.input = input; this.kind = name; }
    }])),
    '@/lib/r2/r2-client': {
      getR2Bucket: () => 'bucket',
      R2NotConfiguredError: class extends Error {},
      getR2: () => ({ send: async command => {
        calls.objects.push(command.kind);
        if (command.kind === 'ListObjectsV2Command') return { Contents: [], IsTruncated: false };
        if (command.kind === 'HeadObjectCommand') {
          if (!objectExists) throw { $metadata: { httpStatusCode: 404 } };
          return { LastModified: new Date() };
        }
        if (deleteFailure) throw Error('R2 unavailable');
        return {};
      } }),
    },
    '@aws-sdk/s3-request-presigner': { getSignedUrl: async () => {
      calls.signed++;
      if (signFailure) throw Error('Cannot sign');
      return 'https://storage.example/upload';
    } },
  };
  const signing = load('lib/r2/generatePresignedUrl.ts', mocks);
  mocks['@/lib/r2/generatePresignedUrl'] = signing;
  const issue = (user = 'owner', size = 123) => signing.generatePresignedUrl('notes.pdf', 'application/pdf', user, 'lesson', size);
  return { pg, calls, mocks, signing, issue, close: () => pg.close(),
    setSignFailure: value => { signFailure = value; },
    setDeleteFailure: value => { deleteFailure = value; },
    setObjectExists: value => { objectExists = value; },
  };
}

test('database-backed upload throttling is per account, resets, and uses active paid limits', async () => {
  const f = await quotaFixture();
  try {
    await Promise.all(Array.from({ length: 5 }, () => f.issue()));
    await assert.rejects(f.issue(), error => error.status === 429 && error.retryAfter > 0);
    assert.equal(f.calls.signed, 5);
    await f.issue('other');
    await f.pg.exec('UPDATE "rateLimit" SET "lastRequest" = "lastRequest" - 61000');
    await f.issue();
    assert.equal(f.calls.locks, 8);
    await f.pg.exec('DELETE FROM "rateLimit"');
    await f.pg.exec('UPDATE "user" SET "plan"=\'CREATOR\', "subscriptionStatus"=\'active\' WHERE "id"=\'owner\'');
    await Promise.all(Array.from({ length: 10 }, () => f.issue()));
    await assert.rejects(f.issue(), error => error.status === 429);
    assert.equal((await f.signing.getUploadStorage('owner')).limitBytes, policy.UPLOAD_LIMITS.CREATOR.storageBytes);
    await f.pg.exec('UPDATE "user" SET "subscriptionStatus"=\'canceled\' WHERE "id"=\'owner\'');
    assert.equal((await f.signing.getUploadStorage('owner')).limitBytes, policy.UPLOAD_LIMITS.FREE.storageBytes);
  } finally { await f.close(); }
});

test('migration counts existing files once and concurrent uploads cannot claim the same remaining space', async () => {
  const freeQuota = policy.UPLOAD_LIMITS.FREE.storageBytes;
  const f = await quotaFixture({ legacyBytes: freeQuota - 20 * 1024 * 1024 });
  try {
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, freeQuota - 20 * 1024 * 1024);
    const outcomes = await Promise.allSettled([f.issue('owner', 15 * 1024 * 1024), f.issue('owner', 15 * 1024 * 1024)]);
    assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(outcomes.find(r => r.status === 'rejected').reason.code, 'STORAGE_QUOTA_EXCEEDED');
    assert.equal(f.calls.signed, 1);
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, freeQuota - 5 * 1024 * 1024);
    await f.issue('owner', 5 * 1024 * 1024);
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, freeQuota);
    await assert.rejects(f.issue('owner', 1), error => error.code === 'STORAGE_QUOTA_EXCEEDED');
    assert.equal((await f.pg.query('SELECT COUNT(*) FROM "Resource"')).rows[0].count, 1);
    // Unknown keyless legacy files count conservatively too.
    await f.pg.exec('INSERT INTO "Resource" ("id","type","lessonId") VALUES (\'unknown\',\'PDF\',\'lesson\')');
    await assert.rejects(f.issue(), error => error.status === 403);
  } finally { await f.close(); }
});

test('failed signing releases its allocation but cannot reset the rate allowance', async () => {
  const f = await quotaFixture();
  try {
    f.setSignFailure(true);
    for (let i = 0; i < 5; i++) await assert.rejects(f.issue(), /Cannot sign/);
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, 0);
    await assert.rejects(f.issue(), error => error.status === 429);
  } finally { await f.close(); }
});

test('cleanup keeps fresh/referenced bytes charged and releases abandoned bytes only after storage deletion', async () => {
  const f = await quotaFixture();
  try {
    const result = await f.issue();
    const cleanup = load('lib/r2/cleanup.ts', f.mocks);
    assert.equal(await cleanup.deleteUnreferencedFile(result.key), false);
    assert.equal(f.calls.objects.length, 0);
    await f.pg.exec('UPDATE "UploadAllocation" SET "createdAt" = CURRENT_TIMESTAMP - INTERVAL \'2 days\'');
    f.setObjectExists(true);
    assert.equal(await cleanup.deleteUnreferencedFile(result.key), false);
    f.setObjectExists(false);
    f.setDeleteFailure(true);
    await assert.rejects(cleanup.deleteUnreferencedFile(result.key));
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, 123);
    f.setDeleteFailure(false);
    await f.pg.query('INSERT INTO "Resource" ("id","key","size","type","lessonId") VALUES ($1,$2,$3,$4,$5)',
      ['saved', result.key, 123, 'PDF', 'lesson']);
    assert.equal(await cleanup.deleteUnreferencedFile(result.key), false);
    await f.pg.exec('DELETE FROM "Resource"');
    assert.equal(await cleanup.deleteUnreferencedFile(result.key), true);
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, 0);
  } finally { await f.close(); }
});

test('upload API returns private usage and actionable quota/rate errors without signing rejected uploads', async () => {
  const f = fixture();
  const { UploadLimitError } = load('lib/r2/generatePresignedUrl.ts', { '@/lib/prisma': { db: {} }, '@aws-sdk/client-s3': {}, '@aws-sdk/s3-request-presigner': {}, '@/lib/r2/r2-client': {} });
  f.mocks['@/lib/r2/generatePresignedUrl'].UploadLimitError = UploadLimitError;
  const route = load('app/api/upload/route.ts', f.mocks);
  const usage = await route.GET();
  assert.equal(usage.status, 200);
  assert.equal(usage.headers.get('Cache-Control'), 'private, no-store');
  const valid = { filename: 'notes.pdf', contentType: 'application/pdf', size: 123, lessonId: 'lesson' };
  for (const status of [403, 429]) {
    f.mocks['@/lib/r2/generatePresignedUrl'].generatePresignedUrl = async () => {
      throw new UploadLimitError(status, 'LIMIT', 'Limit reached', status === 429 ? 30 : undefined);
    };
    const response = await f.post('app/api/upload/route.ts', valid);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, 'Limit reached');
    if (status === 429) assert.equal(response.headers.get('Retry-After'), '30');
  }
  assert.equal((await load('app/api/upload/route.ts', fixture({ signedIn: false }).mocks).GET()).status, 401);
});

test('the scheduled cleanup also reclaims expired reservations absent from the R2 listing', async () => {
  const f = await quotaFixture();
  const previousSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'upload-cleanup-test';
  try {
    await f.issue();
    await f.pg.exec('UPDATE "UploadAllocation" SET "createdAt" = CURRENT_TIMESTAMP - INTERVAL \'2 days\'');
    const route = load('app/api/cron/cleanup-uploads/route.ts', {
      ...f.mocks,
      'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    });
    const response = await route.GET(new Request('https://lessonmap.org/api/cron/cleanup-uploads', {
      headers: { Authorization: 'Bearer upload-cleanup-test' },
    }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).removed, 1);
    assert.equal((await f.signing.getUploadStorage('owner')).usedBytes, 0);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    await f.close();
  }
});
