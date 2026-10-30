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
    module: mod, exports: mod.exports, console, Request, Response, Headers, URL, process,
    require(id) {
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
  const db = {
    lesson: { findFirst: async () => ownsLesson ? { id: 'lesson' } : null },
    resource: {
      findFirst: async (query) => query.where.key ? resource || null : readable ? { id: 'resource', key: 'lesson-resources/owner/file', filename: 'Résumé.xlsx', name: 'Workbook', type: 'Spreadsheet' } : null,
      create: async ({ data }) => { calls.saved.push(data); return resource = { id: 'resource', ...data }; },
    },
    $transaction: async (work) => work({ resource: db.resource, $executeRaw: async () => {} }),
  };
  const mocks = {
    '@/lib/auth': { auth: { api: { getSession: async () => signedIn ? { session: { userId: 'owner' } } : null } } },
    '@/lib/prisma': { db },
    '@/lib/course-cache': { userCoursesTag: (id) => id },
    'next/headers': { headers: async () => new Headers() },
    'next/cache': { revalidateTag: (...args) => calls.invalidated.push(args) },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init), redirect: (url, init) => new Response(null, { ...init, headers: { ...init?.headers, Location: url } }) } },
    '@/lib/r2/cleanup': { deleteUnreferencedFile: async () => {} },
    '@/lib/r2/generatePresignedUrl': { generatePresignedUrl: async (...args) => { calls.signed.push(args); return { uploadUrl: 'https://storage.example/upload', key: 'lesson-resources/owner/file' }; } },
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
