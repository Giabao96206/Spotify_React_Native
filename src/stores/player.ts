import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { RepeatMode, Track } from "@/types/music";
export type PlaybackState =
  "idle" | "loading" | "buffering" | "playing" | "paused" | "ended" | "error";
export type LocalPlaylist = { id: string; title: string; tracks: Track[] };
type State = {
  activeLyricIndex: number;
  lyricsAutoFollow: boolean;
  mediaError: string | null;
  current: Track | null;
  queue: Track[];
  recent: Track[];
  searches: string[];
  playlists: LocalPlaylist[];
  favorites: Track[];
  isPlaying: boolean;
  status: PlaybackState;
  error: string | null;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  setCurrent: (track: Track | null) => void;
  setPlaying: (value: boolean) => void;
  setProgress: (position: number, duration?: number) => void;
  toggleFavorite: (track: Track) => void;
  enqueue: (tracks: Track[]) => void;
  next: () => Track | null;
  previous: () => Track | null;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  move: (index: number, direction: number) => void;
  remove: (id: string) => void;
  addSearch: (q: string) => void;
  createPlaylist: (title: string) => string;
  addToPlaylist: (id: string, track: Track) => void;
};
const storageCache = new Map<string, string>();
const storage = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    if (value) storageCache.set(key, value);
    return value;
  },
  setItem: async (key: string, value: string) => {
    if (storageCache.get(key) === value) return;
    storageCache.set(key, value);
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    storageCache.delete(key);
    await AsyncStorage.removeItem(key);
  },
};
export const usePlayerStore = create<State>()(
  persist(
    (set, get) => ({
      activeLyricIndex: -1,
      lyricsAutoFollow: true,
      mediaError: null,
      current: null,
      queue: [],
      recent: [],
      searches: [],
      playlists: [],
      favorites: [],
      isPlaying: false,
      status: "idle",
      error: null,
      position: 0,
      duration: 0,
      shuffle: false,
      repeat: "off",
      setCurrent: (current) =>
        set((s) => ({
          activeLyricIndex: -1,
          lyricsAutoFollow: true,
          current: current ? { ...current } : null,
          position: 0,
          duration: current?.duration || 0,
          error: null,
          status: current ? "loading" : "idle",
          recent: current
            ? [current, ...s.recent.filter((t) => t.id !== current.id)].slice(
                0,
                40,
              )
            : s.recent,
        })),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setProgress: (position, duration) =>
        set((s) => ({ position, duration: duration ?? s.duration })),
      toggleFavorite: (track) =>
        set((s) => ({
          favorites: s.favorites.some((t) => t.id === track.id)
            ? s.favorites.filter((t) => t.id !== track.id)
            : [track, ...s.favorites],
        })),
      enqueue: (queue) => set({ queue }),
      next: () => {
        const s = get();
        const index = s.queue.findIndex((t) => t.id === s.current?.id);
        const candidates = s.queue.filter(
          (t) => t.isPlayable && t.id !== s.current?.id,
        );
        const track = s.shuffle
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : s.queue.slice(index + 1).find((t) => t.isPlayable) ||
            (s.repeat === "all" ? s.queue.find((t) => t.isPlayable) : null);
        if (track) get().setCurrent(track);
        else set({ isPlaying: false, status: "ended" });
        return track || null;
      },
      previous: () => {
        const s = get();
        const index = s.queue.findIndex((t) => t.id === s.current?.id);
        const track =
          s.queue
            .slice(0, index)
            .reverse()
            .find((t) => t.isPlayable) || s.queue[0];
        if (track) get().setCurrent(track);
        return track || null;
      },
      toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
      cycleRepeat: () =>
        set((s) => ({
          repeat:
            s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off",
        })),
      move: (index, direction) =>
        set((s) => {
          const queue = [...s.queue];
          const target = index + direction;
          if (target < 0 || target >= queue.length) return {};
          [queue[index], queue[target]] = [queue[target], queue[index]];
          return { queue };
        }),
      remove: (id) =>
        set((s) => ({ queue: s.queue.filter((t) => t.id !== id) })),
      addSearch: (q) =>
        set((s) => ({
          searches: [q, ...s.searches.filter((x) => x !== q)].slice(0, 12),
        })),
      createPlaylist: (title) => {
        const id = "local-" + Date.now();
        set((s) => ({
          playlists: [...s.playlists, { id, title, tracks: [] }],
        }));
        return id;
      },
      addToPlaylist: (id, track) =>
        set((s) => ({
          playlists: s.playlists.map((p) =>
            p.id === id && !p.tracks.some((t) => t.id === track.id)
              ? { ...p, tracks: [...p.tracks, track] }
              : p,
          ),
        })),
    }),
    {
      name: "nightwave-player-v2",
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({
        current: s.current,
        queue: s.queue.map((t) => ({ ...t, streamUrl: null })),
        recent: s.recent,
        favorites: s.favorites,
        playlists: s.playlists,
        searches: s.searches,
        shuffle: s.shuffle,
        repeat: s.repeat,
      }),
    },
  ),
);
