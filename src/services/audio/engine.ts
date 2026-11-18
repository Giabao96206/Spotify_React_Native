import {
  createAudioPlaylist,
  setAudioModeAsync,
  type AudioPlaylist,
} from "expo-audio";
import { api } from "@/services/api/client";
import { usePlayerStore } from "@/stores/player";
import { Track } from "@/types/music";
import { originIsland } from "../../../modules/origin-island";
class AudioEngine {
  private player: AudioPlaylist | null = null;
  private cancel?: AbortController;
  private tracks: Track[] = [];
  private sequence = 0;
  private ready = false;
  private mediaActive = false;
  private syncing = false;
  private watchdog?: ReturnType<typeof setTimeout>;
  start() {
    if (this.player) return () => {};
    const player = (this.player = createAudioPlaylist({ updateInterval: 500 }));
    const statusSubscription = player.addListener(
      "playlistStatusUpdate",
      (status) => {
        if (!this.ready) return;
        const ended =
          status.didJustFinish &&
          status.currentIndex === this.tracks.length - 1 &&
          usePlayerStore.getState().repeat === "off";
        usePlayerStore.setState({
          position: status.currentTime,
          duration:
            status.duration || this.tracks[status.currentIndex]?.duration || 0,
          isPlaying: status.playing,
          status: status.isBuffering
            ? "buffering"
            : !status.isLoaded
              ? "loading"
              : status.playing
                ? "playing"
                : ended
                  ? "ended"
                  : "paused",
        });
        if (
          status.currentIndex >= 0 &&
          this.tracks[status.currentIndex]?.id !==
            usePlayerStore.getState().current?.id
        ) {
          this.syncing = true;
          usePlayerStore
            .getState()
            .setCurrent(this.tracks[status.currentIndex]);
          this.syncing = false;
          this.publish(this.tracks[status.currentIndex]);
        }
        if (status.isLoaded) {
          clearTimeout(this.watchdog);
          this.watchdog = undefined;
        } else if (!this.watchdog)
          this.watchdog = setTimeout(
            () =>
              this.fail(
                new Error(
                  "Audio did not load. Tap play to refresh the stream.",
                ),
              ),
            20000,
          );
      },
    );
    const trackSubscription = player.addListener(
      "trackChanged",
      ({ currentIndex }) => {
        if (!this.ready) return;
        const track = this.tracks[currentIndex];
        if (!track) return;
        this.syncing = true;
        usePlayerStore.getState().setCurrent(track);
        this.syncing = false;
        this.publish(track);
      },
    );
    const unsubscribe = usePlayerStore.subscribe((s, previous) => {
      if (this.syncing || !usePlayerStore.persist.hasHydrated()) return;
      if (s.current !== previous.current) {
        if (!s.current) {
          this.stop();
          return;
        }
        const index = this.tracks.findIndex((t) => t.id === s.current?.id);
        if (this.ready && index >= 0) {
          player.skipTo(index);
          void player.seekTo(0);
          player.play();
          this.publish(this.tracks[index]);
        } else void this.load(true);
      } else if (s.queue !== previous.queue || s.shuffle !== previous.shuffle)
        void this.load(s.isPlaying, s.position);
      if (s.repeat !== previous.repeat)
        player.loop =
          s.repeat === "one" ? "single" : s.repeat === "all" ? "all" : "none";
    });
    const hydration = usePlayerStore.persist.onFinishHydration(() => {
      if (usePlayerStore.getState().current) void this.load(false);
    });
    if (
      usePlayerStore.persist.hasHydrated() &&
      usePlayerStore.getState().current
    )
      void this.load(false);
    return () => {
      this.sequence++;
      this.cancel?.abort();
      clearTimeout(this.watchdog);
      hydration();
      unsubscribe();
      statusSubscription.remove();
      trackSubscription.remove();
      player.clearLockScreenControls();
      player.destroy();
      this.player = null;
      originIsland.clearQueueMetadata();
      this.mediaActive = false;
      this.ready = false;
    };
  }
  private publish(track: Track) {
    if (!this.player) return;
    const metadata = {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.artwork || undefined,
    };
    try {
      if (!this.mediaActive) {
        this.player.setActiveForLockScreen(true, metadata, {
          showNextTrack: true,
          showPreviousTrack: true,
        });
        this.mediaActive = true;
      } else this.player.updateLockScreenMetadata(metadata);
      usePlayerStore.setState({ mediaError: null });
    } catch (error) {
      this.mediaActive = false;
      usePlayerStore.setState({
        mediaError:
          "System media controls unavailable: " +
          (error instanceof Error ? error.message : String(error)),
      });
    }
  }

  private fail(error: unknown) {
    this.player?.pause();
    this.ready = false;
    this.player?.clearLockScreenControls();
    this.mediaActive = false;
    clearTimeout(this.watchdog);
    this.watchdog = undefined;
    usePlayerStore.setState({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
      isPlaying: false,
    });
  }
  private async load(autoplay: boolean, position = 0) {
    const s = usePlayerStore.getState();
    if (!this.player || !s.current) return;
    const selected = s.current;
    const token = ++this.sequence;
    this.cancel?.abort();
    this.cancel = new AbortController();
    const signal = this.cancel.signal;
    this.ready = false;
    this.player.pause();
    clearTimeout(this.watchdog);
    this.watchdog = undefined;
    usePlayerStore.setState({
      status: "loading",
      error: null,
      isPlaying: false,
    });
    try {
      if (!selected.isPlayable)
        throw new Error("This track is unavailable from its source.");
      const queue = [
        selected,
        ...s.queue.filter((t) => t.id !== selected.id && t.isPlayable),
      ];
      const resolved: { track: Track; uri: string }[] = [];
      // Bounded concurrent resolution, no persisted or guessed streaming URLs.
      let cursor = 0;
      await Promise.all(
        Array.from({ length: Math.min(4, queue.length) }, async () => {
          while (cursor < queue.length && !signal.aborted) {
            const track = queue[cursor++];
            try {
              resolved.push({ track, uri: await api.stream(track.id, signal) });
            } catch (error) {
              if (track.id === selected.id) throw error;
            }
          }
        }),
      );
      if (token !== this.sequence || !this.player) return;
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
      });
      if (token !== this.sequence || !this.player) return;
      let order = s.queue.some((t) => t.id === selected.id)
        ? [...s.queue]
        : [selected, ...s.queue];
      if (s.shuffle) {
        const rest = order.filter((t) => t.id !== selected.id);
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        order = [selected, ...rest];
      }
      const urls = new Map(resolved.map((r) => [r.track.id, r.uri]));
      this.tracks = order.filter((t) => urls.has(t.id));
      if (!this.tracks.length)
        throw new Error("No playable streams were returned.");
      this.player.clear();
      originIsland.setQueueMetadata(
        this.tracks.map((track) => ({
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
          artworkUrl: track.artwork || null,
        })),
      );
      this.tracks.forEach((t) =>
        this.player!.add({ uri: urls.get(t.id)!, name: t.title }),
      );
      this.player.loop =
        s.repeat === "one" ? "single" : s.repeat === "all" ? "all" : "none";
      this.player.skipTo(this.tracks.findIndex((t) => t.id === selected.id));
      this.ready = true;
      this.publish(selected);
      if (position) await this.player.seekTo(position);
      if (autoplay) this.player.play();
      else usePlayerStore.setState({ status: "paused" });
    } catch (error) {
      if (token === this.sequence) this.fail(error);
    }
  }
  toggle = () => {
    const s = usePlayerStore.getState();
    if (!this.player) return;
    if (s.status === "loading") {
      this.stop();
      usePlayerStore.setState({ status: "paused", isPlaying: false });
      return;
    }
    if (s.isPlaying) this.player.pause();
    else if (!this.ready || s.status === "error") void this.load(true);
    else {
      if (s.current && !this.mediaActive) this.publish(s.current);
      if (s.status === "ended") void this.player.seekTo(0);
      this.player.play();
    }
  };
  stop = () => {
    this.sequence++;
    this.cancel?.abort();
    this.ready = false;
    clearTimeout(this.watchdog);
    this.watchdog = undefined;
    this.player?.pause();
    this.player?.clearLockScreenControls();
    this.player?.clear();
    this.tracks = [];
    this.mediaActive = false;
    originIsland.clearQueueMetadata();
    usePlayerStore.setState({
      isPlaying: false,
      status: "idle",
      position: 0,
      duration: 0,
    });
  };
  seek = async (seconds: number) => {
    try {
      const target = Math.max(
        0,
        Math.min(usePlayerStore.getState().duration || seconds, seconds),
      );
      await this.player?.seekTo(target);
      usePlayerStore.setState({ position: target });
    } catch (error) {
      this.fail(error);
    }
  };
  next = () => {
    if (this.ready) this.player?.next();
  };
  previous = () => {
    if ((this.player?.currentTime || 0) > 3) void this.seek(0);
    else if (this.ready) this.player?.previous();
  };
}
export const audioEngine = new AudioEngine();
