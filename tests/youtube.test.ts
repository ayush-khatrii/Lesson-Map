import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchPlaylist,
  playlistIdFromUrl,
  youtubeApiError,
  YouTubeImportError,
} from "../lib/youtube";

test("Google failures have actionable classifications without leaking raw details", () => {
  for (const [reason, code, status] of [
    ["quotaExceeded", "YOUTUBE_QUOTA_EXCEEDED", 503],
    ["SERVICE_DISABLED", "YOUTUBE_API_DISABLED", 503],
    ["API_KEY_INVALID", "YOUTUBE_KEY_INVALID", 503],
    ["ACCESS_DENIED", "YOUTUBE_ACCESS_DENIED", 503],
    ["API_KEY_HTTP_REFERRER_BLOCKED", "YOUTUBE_ACCESS_DENIED", 503],
    ["playlistNotFound", "YOUTUBE_PLAYLIST_NOT_FOUND", 404],
    ["playlistItemsNotAccessible", "YOUTUBE_PLAYLIST_PRIVATE", 403],
    ["rateLimitExceeded", "YOUTUBE_RATE_LIMITED", 429],
  ] as const) {
    const error = youtubeApiError(403, {
      error: { message: "secret", details: [{ reason }] },
    });
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    assert.ok(!error.message.includes("secret"));
  }
  assert.equal(youtubeApiError(502, null).status, 502);
});

test("malformed URLs get a useful validation error", () => {
  assert.throws(
    () => playlistIdFromUrl("broken"),
    /valid YouTube playlist URL/,
  );
  assert.throws(
    () => playlistIdFromUrl("https://example.com/?list=abcdefghijk"),
    /YouTube playlist URL/,
  );
});

test("fetchPlaylist handles provider errors, transport failures, and successful imports", async (t) => {
  const previous = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous;
  });
  const mock = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        error: {
          errors: [{ reason: "forbidden" }],
          details: [{ reason: "ACCESS_DENIED" }],
        },
      },
      { status: 403 },
    ),
  );
  await assert.rejects(
    fetchPlaylist("abcdefghijk"),
    (e: unknown) =>
      e instanceof YouTubeImportError && e.code === "YOUTUBE_ACCESS_DENIED",
  );
  mock.mock.mockImplementation(async () => {
    throw new DOMException("timeout", "TimeoutError");
  });
  await assert.rejects(
    fetchPlaylist("abcdefghijk"),
    (e: unknown) => e instanceof YouTubeImportError && e.status === 504,
  );
  mock.mock.mockImplementation(async () => {
    throw new TypeError("fetch failed with secret");
  });
  await assert.rejects(
    fetchPlaylist("abcdefghijk"),
    (e: unknown) =>
      e instanceof YouTubeImportError &&
      e.code === "YOUTUBE_NETWORK_ERROR" &&
      !e.message.includes("secret"),
  );
  mock.mock.mockImplementation(
    async () => new Response("gateway error", { status: 502 }),
  );
  await assert.rejects(
    fetchPlaylist("abcdefghijk"),
    (e: unknown) => e instanceof YouTubeImportError && e.status === 502,
  );
  let calls = 0;
  mock.mock.mockImplementation(async () =>
    Response.json(
      calls++ === 0
        ? { items: [{ snippet: { title: "Course", description: "Intro" } }] }
        : {
            items: [
              {
                snippet: { title: "Lesson" },
                contentDetails: { videoId: "video" },
              },
              {
                snippet: { title: "Private video" },
                contentDetails: { videoId: "private" },
              },
            ],
          },
    ),
  );
  const playlist = await fetchPlaylist("abcdefghijk");
  assert.equal(playlist.title, "Course");
  assert.equal(playlist.videos.length, 1);
  assert.equal(playlist.skipped, 1);
});

test("duration lookup batches unique IDs, preserves duplicates/order, and matches unordered results", async (t) => {
  const previous = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous;
  });
  const ids = [
    ...Array.from({ length: 102 }, (_, i) => `video-${i}`),
    "video-0",
    "video-1",
  ];
  const batches: string[][] = [];
  const signals: AbortSignal[] = [];
  let active = 0;
  let maxActive = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlists"))
        return Response.json({
          items: [{ snippet: { title: "Course", description: "" } }],
        });
      if (url.pathname.endsWith("/playlistItems")) {
        const offset = Number(url.searchParams.get("pageToken") || 0);
        return Response.json({
          items: ids.slice(offset, offset + 50).map((id) => ({
            contentDetails: { videoId: id },
            snippet: { title: id },
          })),
          ...(offset + 50 < ids.length
            ? { nextPageToken: String(offset + 50) }
            : {}),
        });
      }
      assert.equal(url.searchParams.get("part"), "contentDetails");
      const batch = url.searchParams.get("id")!.split(",");
      batches.push(batch);
      signals.push(options!.signal!);
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return Response.json({
        items: batch
          .slice()
          .reverse()
          .filter((id) => id !== "video-2")
          .map((id) => ({
            id,
            contentDetails: {
              duration:
                id === "video-3"
                  ? "PT0S"
                  : id === "video-4"
                    ? "invalid"
                    : "PT1M5S",
            },
          })),
      });
    },
  );
  const playlist = await fetchPlaylist("abcdefghijk");
  assert.deepEqual(
    playlist.videos.map((video) => video.videoId),
    ids,
  );
  assert.equal(batches.length, 3);
  assert.ok(batches.every((batch) => batch.length <= 50));
  assert.equal(new Set(batches.flat()).size, 102);
  assert.equal(maxActive, 3);
  assert.ok(signals.every((signal) => signal === signals[0]));
  assert.deepEqual(
    playlist.videos.slice(0, 6).map((video) => video.videoDurationSeconds),
    [65, 65, null, null, null, 65],
  );
  assert.equal(playlist.videos[102].videoDurationSeconds, 65);
});

test("duration failures and the shared budget leave successful playlist imports intact", async (t) => {
  const previous = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous;
  });
  const controllers: AbortController[] = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 10000);
    const controller = new AbortController();
    controllers.push(controller);
    return controller.signal;
  });
  let durationCalls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, options?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlists"))
        return Response.json({
          items: [{ snippet: { title: "Course", description: "" } }],
        });
      if (url.pathname.endsWith("/playlistItems"))
        return Response.json({
          items: Array.from({ length: 200 }, (_, i) => ({
            contentDetails: { videoId: `v${i}` },
            snippet: { title: `Lesson ${i}` },
          })),
        });
      durationCalls++;
      const pending = new Promise<Response>((_, reject) =>
        options!.signal!.addEventListener(
          "abort",
          () => reject(new DOMException("timeout", "AbortError")),
          { once: true },
        ),
      );
      if (durationCalls === 3) controllers.at(-1)!.abort();
      return pending;
    },
  );
  const playlist = await fetchPlaylist("abcdefghijk");
  assert.equal(durationCalls, 3);
  assert.equal(controllers.length, 3);
  assert.equal(playlist.videos.length, 200);
  assert.ok(
    playlist.videos.every((video) => video.videoDurationSeconds === null),
  );
});

test("a duration request error still imports the lesson with no guessed time", async (t) => {
  const previous = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-key";
  t.after(() => {
    if (previous === undefined) delete process.env.YOUTUBE_API_KEY;
    else process.env.YOUTUBE_API_KEY = previous;
  });
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/playlists"))
      return Response.json({
        items: [{ snippet: { title: "Course", description: "" } }],
      });
    if (url.pathname.endsWith("/playlistItems"))
      return Response.json({
        items: [
          { contentDetails: { videoId: "one" }, snippet: { title: "One" } },
        ],
      });
    throw new TypeError("network failure");
  });
  const playlist = await fetchPlaylist("abcdefghijk");
  assert.equal(playlist.videos[0].videoDurationSeconds, null);
});
