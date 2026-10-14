import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { generateCourse } from "../lib/ai/deepseek";
import { AiError } from "../lib/ai/http";
import { AI_GENERATION_TIMEOUT_MS } from "../lib/ai/timing";

const input = {
  requestId: "11111111-1111-4111-8111-111111111111", type: "course" as const,
  topic: "Algorithms", audience: "Beginners", moduleCount: 25, lessonsPerModule: 5,
};
const skeleton = Array.from({ length: 25 }, (_, index) => ({
  moduleName: `Module ${index + 1}`, description: `Learning objectives for module ${index + 1}.`,
}));
const outline = {
  courseName: "Algorithms for beginners", description: "A complete introduction to algorithms for beginners.",
  modules: skeleton,
};
function envelope(value: unknown) {
  return Response.json({
    choices: [{ finish_reason: "stop", message: { content: JSON.stringify(value) } }],
    usage: { prompt_tokens: 20, completion_tokens: 40 },
  });
}
function configureProvider(t: TestContext) {
  const previous = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-placeholder";
  t.after(() => {
    if (previous === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = previous;
  });
}

test("25 modules × 5 lessons use bounded batches and preserve module/lesson associations", async (t) => {
  configureProvider(t);
  let active = 0;
  let peak = 0;
  const batches: number[] = [];
  const lessons = (name: string) => Array.from({ length: 5 }, (_, index) => ({ lessonName: `${name}: lesson ${index + 1}` }));
  const fetch = t.mock.method(globalThis, "fetch", async (_url: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
    const { messages } = JSON.parse(String(init?.body));
    const data = JSON.parse(messages[1].content);
    if (!Array.isArray(data)) return envelope(outline);
    batches.push(data.length);
    active++;
    peak = Math.max(peak, active);
    await setImmediate();
    active--;
    // Providers sometimes reorder their response; titles must stay with their module.
    return envelope({ modules: data.map((module: { moduleName: string }) => ({
      moduleName: module.moduleName, lessons: lessons(module.moduleName),
    })).reverse() });
  });
  const result = await generateCourse(input);
  assert.deepEqual(result.course, {
    ...outline, modules: skeleton.map(module => ({ ...module, lessons: lessons(module.moduleName) })),
  });
  assert.deepEqual(batches, [4, 4, 4, 4, 4, 4, 1]);
  assert.equal(peak, 3);
  assert.equal(fetch.mock.callCount(), 8);
  assert.deepEqual(result.usage, { prompt_tokens: 160, completion_tokens: 320 });
});

test("the overall generation deadline cancels in-flight batches and prevents queued calls", async (t) => {
  configureProvider(t);
  const deadline = new AbortController();
  const originalTimeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", (ms: number) => ms === AI_GENERATION_TIMEOUT_MS
    ? deadline.signal : originalTimeout(ms));
  const signals: AbortSignal[] = [];
  const fetch = t.mock.method(globalThis, "fetch", async (_url: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
    const { messages } = JSON.parse(String(init?.body));
    if (!Array.isArray(JSON.parse(messages[1].content))) return envelope(outline);
    const signal = init!.signal!;
    signals.push(signal);
    return new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      if (signals.length === 3) deadline.abort(new DOMException("Generation deadline", "TimeoutError"));
    });
  });
  await assert.rejects(generateCourse(input), error => {
    assert.ok(error instanceof AiError);
    assert.equal(error.status, 504);
    return true;
  });
  await setImmediate();
  assert.equal(fetch.mock.callCount(), 4); // Outline + first three batches only.
  assert.ok(signals.every(signal => signal.aborted));
});

test("a deadline while reading the provider response body is reported as a timeout", async (t) => {
  configureProvider(t);
  const deadline = new AbortController();
  const originalTimeout = AbortSignal.timeout;
  t.mock.method(AbortSignal, "timeout", (ms: number) => ms === AI_GENERATION_TIMEOUT_MS
    ? deadline.signal : originalTimeout(ms));
  t.mock.method(globalThis, "fetch", async (_url: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
    const signal = init!.signal!;
    const body = new ReadableStream({ start(controller) {
      signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
    } });
    void setImmediate().then(() => deadline.abort(new DOMException("Generation deadline", "TimeoutError")));
    return new Response(body);
  });
  await assert.rejects(generateCourse(input), error => {
    assert.ok(error instanceof AiError);
    assert.equal(error.status, 504);
    return true;
  });
});
