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
