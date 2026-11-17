import { getServerUrl } from "./server";
import { parseLyrics } from "@/features/lyrics/model";
import { Track } from "@/types/music";
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || ""
).replace(/\/$/, "");
type Raw = Record<string, any>;
export type CatalogPlaylist = {
  id: string;
  title: string;
  artwork: string | null;
  description: string;
};
export type Artist = {
  id: string;
  name: string;
  alias: string;
  artwork: string | null;
};
export type Catalog = {
  artists: Artist[];
  tracks: Track[];
  playlists: CatalogPlaylist[];
};
export async function request<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const baseUrl = await getServerUrl();
  if (!/^https?:\/\//.test(baseUrl))
    throw new Error(
      "Set EXPO_PUBLIC_API_BASE_URL to your backend address in .env.",
    );
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, 12000);
  try {
    const response = await fetch(baseUrl + path, {
      signal: controller.signal,
    });
    if (!response.ok)
      throw new Error("Backend returned HTTP " + response.status);
    const body = await response.json();
    if (typeof body.err === "number" && body.err !== 0)
      throw new Error(body.msg || "Catalog request was rejected.");
    return body as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        signal?.aborted
          ? "Request cancelled."
          : "Backend did not respond within 12 seconds.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export const normalizeTrack = (raw: Raw): Track => ({
  id: String(raw.encodeId || ""),
  title: String(raw.title || "Untitled"),
  artist: String(raw.artistsNames || "Unknown artist"),
  album: String(raw.album?.title || "Single"),
  artwork: raw.thumbnailM || raw.thumbnail || null,
  duration: Number(raw.duration) || 0,
  streamUrl: null,
  source: "zingmp3",
  isPlayable:
    raw.streamingStatus === 1 &&
    !raw.isPrivate &&
    !raw.preRelease &&
    !raw.isWorldWideBlocked &&
    raw.hasOwnProperty("encodeId"),
});
export function parseCatalog(data: Raw): Catalog {
  const tracks = new Map<string, Track>();
  const playlists = new Map<string, CatalogPlaylist>();
  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    const item = value as Raw;
    if (item.encodeId && item.title && typeof item.duration === "number")
      tracks.set(item.encodeId, normalizeTrack(item));
    else if (
      (item.encodeId || item.id) &&
      item.title &&
      (item.song ||
        item.link?.includes("/playlist/") ||
        item.link?.includes("/album/"))
    )
      playlists.set(item.encodeId || item.id, {
        id: item.encodeId || item.id,
        title: item.title,
        artwork: item.thumbnailM || item.thumbnail || null,
        description: item.sortDescription || item.artistsNames || "",
      });
    for (const key of [
      "data",
      "items",
      "songs",
      "song",
      "sections",
      "newRelease",
      "RTChart",
      "playlists",
      "all",
      "vPop",
      "others",
      "top",
    ])
      if (item[key]) walk(item[key]);
  }
  walk(data);
  return {
    artists: (data.data?.artists || [])
      .filter((a: Raw) => a.id && a.alias)
      .map((a: Raw) => ({
        id: a.id,
        name: a.name,
        alias: a.alias,
        artwork: a.thumbnailM || a.thumbnail || null,
      })),
    tracks: [...tracks.values()],
    playlists: [...playlists.values()],
  };
}
export const api = {
  artist: async (alias: string, signal?: AbortSignal) => {
    const r = await request<Raw>(
      "/api/artist?name=" + encodeURIComponent(alias),
      signal,
    );
    return {
      ...parseCatalog(r),
      name: String(r.data?.name || alias),
      artwork: r.data?.thumbnailM || r.data?.thumbnail || null,
    };
  },
  home: async (signal?: AbortSignal) =>
    parseCatalog(await request<Raw>("/api/home", signal)),
  trending: async (signal?: AbortSignal) =>
    parseCatalog(await request<Raw>("/api/chart-home", signal)),
  search: async (q: string, signal?: AbortSignal) =>
    parseCatalog(
      await request<Raw>("/api/search?q=" + encodeURIComponent(q), signal),
    ),
  playlist: async (id: string, signal?: AbortSignal) => {
    const r = await request<Raw>(
      "/api/detail-playlist?id=" + encodeURIComponent(id),
      signal,
    );
    return {
      ...parseCatalog(r),
      title: String(r.data?.title || "Playlist"),
      artwork: r.data?.thumbnailM || r.data?.thumbnail || null,
    };
  },
  stream: async (id: string, signal?: AbortSignal) => {
    const r = await request<Raw>(
      "/api/song?id=" + encodeURIComponent(id),
      signal,
    );
    const url = r.data?.["128"];
    if (typeof url !== "string" || !/^https?:\/\//.test(url))
      throw new Error("This track is unavailable for streaming.");
    return url;
  },
  lyric: async (id: string, signal?: AbortSignal) => {
    const r = await request<Raw>(
      "/api/lyric?id=" + encodeURIComponent(id),
      signal,
    );
    return parseLyrics(r.data);
  },
};
