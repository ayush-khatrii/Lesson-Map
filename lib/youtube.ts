export class YouTubeImportError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = "YouTubeImportError";
  }
}

// Never return Google's raw messages: they can contain project or credential details.
export function youtubeApiError(status: number, body: unknown) {
  const payload = body as {
    error?: { errors?: { reason?: string }[]; details?: { reason?: string }[] };
  } | null;
  const reasons = [
    ...(payload?.error?.errors ?? []),
    ...(payload?.error?.details ?? []),
  ].map((item) => item.reason);
  const has = (...values: string[]) =>
    values.some((value) => reasons.includes(value));
  if (has("quotaExceeded", "dailyLimitExceeded", "QUOTA_EXCEEDED"))
    return new YouTubeImportError(
      "LessonMap's YouTube API quota has been exhausted. Try again later or contact support to restore import capacity.",
      "YOUTUBE_QUOTA_EXCEEDED",
      503,
    );
  if (status === 429 || has("rateLimitExceeded", "userRateLimitExceeded"))
    return new YouTubeImportError(
      "YouTube is receiving too many requests. Wait a minute and try importing again.",
      "YOUTUBE_RATE_LIMITED",
      429,
    );
  if (has("accessNotConfigured", "SERVICE_DISABLED"))
    return new YouTubeImportError(
      "YouTube imports are unavailable because YouTube Data API v3 is disabled for this app. Contact support to enable it.",
      "YOUTUBE_API_DISABLED",
      503,
    );
  if (has("keyInvalid", "API_KEY_INVALID", "API_KEY_EXPIRED") || status === 401)
    return new YouTubeImportError(
      "The app's YouTube API key is invalid or expired. Contact support to update it.",
      "YOUTUBE_KEY_INVALID",
      503,
    );
  if (
    has(
      "ipRefererBlocked",
      "API_KEY_HTTP_REFERRER_BLOCKED",
      "API_KEY_IP_ADDRESS_BLOCKED",
      "API_KEY_SERVICE_BLOCKED",
      "ACCESS_DENIED",
    )
  )
    return new YouTubeImportError(
      "Google denied this app access to YouTube. Contact support to check the API key permissions and restrictions.",
      "YOUTUBE_ACCESS_DENIED",
      503,
    );
  if (status === 404 || has("playlistNotFound"))
    return new YouTubeImportError(
      "Playlist not found or private. Check the link and make sure the playlist is public.",
      "YOUTUBE_PLAYLIST_NOT_FOUND",
      404,
    );
  if (has("playlistItemsNotAccessible", "playlistForbidden"))
    return new YouTubeImportError(
      "YouTube does not allow access to this playlist. Make it public or choose another playlist.",
      "YOUTUBE_PLAYLIST_PRIVATE",
      403,
    );
  if (status === 403)
    return new YouTubeImportError(
      "YouTube denied access. Check that the playlist is public. If other public playlists also fail, contact support to check the app's API permissions.",
      "YOUTUBE_FORBIDDEN",
      503,
    );
  return new YouTubeImportError(
    "YouTube could not complete the request. Try again shortly. If it continues, contact support.",
    "YOUTUBE_UPSTREAM_ERROR",
    502,
  );
}

export function playlistIdFromUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid YouTube playlist URL.");
  }
  if (
    url.protocol !== "https:" ||
    !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)
  ) {
    throw new Error("Enter a YouTube playlist URL.");
  }
  const id = url.searchParams.get("list");
  if (!id || !/^[\w-]{10,100}$/.test(id))
    throw new Error("Enter a YouTube playlist URL containing a list ID.");
  return id;
}

export async function fetchPlaylist(playlistId: string) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key)
    throw new YouTubeImportError(
      "YouTube imports are not configured. Contact support to enable them.",
      "YOUTUBE_NOT_CONFIGURED",
      503,
    );
  async function get(path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, key: key! });
    let response: Response;
    let body;
    try {
      response = await fetch(
        `https://www.googleapis.com/youtube/v3/${path}?${query}`,
        { cache: "no-store", signal: AbortSignal.timeout(10000) },
      );
      body = await response.json().catch(() => null);
    } catch (error) {
      const timeout =
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name);
      throw new YouTubeImportError(
        timeout
          ? "YouTube took too long to respond. Please try importing again."
          : "LessonMap could not connect to YouTube. Please try again shortly.",
        timeout ? "YOUTUBE_TIMEOUT" : "YOUTUBE_NETWORK_ERROR",
        timeout ? 504 : 502,
      );
    }
    if (!response.ok) throw youtubeApiError(response.status, body);
    if (!body || !Array.isArray(body.items))
      throw new YouTubeImportError(
        "YouTube returned an unexpected response. Please try again.",
        "YOUTUBE_INVALID_RESPONSE",
        502,
      );
    return body;
  }
  const details = await get("playlists", { part: "snippet", id: playlistId });
  if (!details.items?.length) throw youtubeApiError(404, null);
  const videos: { title: string; description: string; videoId: string }[] = [];
  let pageToken = "";
  let skipped = 0;
  do {
    const page = await get("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      pageToken,
    });
    for (const item of page.items ?? []) {
      const videoId = item.contentDetails?.videoId;
      const snippet = item.snippet;
      if (
        !videoId ||
        !snippet ||
        ["Private video", "Deleted video"].includes(snippet.title)
      ) {
        skipped++;
        continue;
      }
      videos.push({
        title: snippet.title,
        description: snippet.description ?? "",
        videoId,
      });
    }
    pageToken = page.nextPageToken ?? "";
    if (videos.length + skipped > 500)
      throw new YouTubeImportError(
        "Please use a playlist with 500 videos or fewer.",
        "YOUTUBE_PLAYLIST_TOO_LARGE",
        400,
      );
  } while (pageToken);
  if (!videos.length)
    throw new YouTubeImportError(
      "This playlist has no available videos.",
      "YOUTUBE_PLAYLIST_EMPTY",
      400,
    );
  return {
    title: details.items[0].snippet.title as string,
    description: details.items[0].snippet.description as string,
    videos,
    skipped,
  };
}
