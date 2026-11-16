export function playlistIdFromUrl(value: string) {
  const url = new URL(value);
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
  if (!key) throw new Error("YouTube import is not configured yet.");
  async function get(path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, key: key! });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/${path}?${query}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      throw new Error(
        "YouTube could not load this playlist. Check that it is public, or try again later.",
      );
    return response.json();
  }
  const details = await get("playlists", { part: "snippet", id: playlistId });
  if (!details.items?.length)
    throw new Error("Playlist not found. Check that it is public.");
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
      throw new Error("Please use a playlist with 500 videos or fewer.");
  } while (pageToken);
  if (!videos.length) throw new Error("This playlist has no available videos.");
  return {
    title: details.items[0].snippet.title as string,
    description: details.items[0].snippet.description as string,
    videos,
    skipped,
  };
}
