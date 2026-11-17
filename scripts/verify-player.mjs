import fs from "node:fs/promises";
import assert from "node:assert/strict";
import ts from "typescript";
const values = new Map();
globalThis.__testStorage = {
  getItem: async (k) => values.get(k) || null,
  setItem: async (k, v) => values.set(k, v),
  removeItem: async (k) => values.delete(k),
};
function compile(source) {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
}
const importJs = (code) =>
  import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
let storeCode = await fs.readFile("src/stores/player.ts", "utf8");
storeCode = storeCode.replace(
  /import AsyncStorage from [^;]+;/,
  "const AsyncStorage = globalThis.__testStorage;",
);
storeCode = compile(storeCode).replace(
  /from "(zustand(?:\/middleware)?)"/g,
  (_, name) => "from " + JSON.stringify(import.meta.resolve(name)),
);
const { usePlayerStore: store } = await importJs(storeCode);
globalThis.__testStore = store;
await store.persist.rehydrate();
const instances = [];
class FakePlaylist {
  listeners = {};
  sources = [];
  currentIndex = 0;
  playing = false;
  currentTime = 0;
  loop = "none";
  metadata = null;
  constructor() {
    instances.push(this);
  }
  addListener(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return {
      remove: () => {
        this.listeners[event] = this.listeners[event].filter((x) => x !== fn);
      },
    };
  }
  emit(event, data) {
    this.listeners[event]?.forEach((fn) => fn(data));
  }
  status() {
    this.emit("playlistStatusUpdate", {
      currentIndex: this.currentIndex,
      currentTime: this.currentTime,
      duration: 200,
      playing: this.playing,
      isLoaded: !!this.sources.length,
      isBuffering: false,
      didJustFinish: false,
    });
  }
  clear() {
    this.sources = [];
  }
  add(source) {
    this.sources.push(source);
  }
  skipTo(index) {
    const previousIndex = this.currentIndex;
    this.currentIndex = index;
    this.currentTime = 0;
    this.emit("trackChanged", { previousIndex, currentIndex: index });
  }
  next() {
    if (this.currentIndex + 1 < this.sources.length)
      this.skipTo(this.currentIndex + 1);
    this.status();
  }
  previous() {
    if (this.currentIndex > 0) this.skipTo(this.currentIndex - 1);
    this.status();
  }
  seekTo(value) {
    this.currentTime = value;
    return Promise.resolve();
  }
  play() {
    this.playing = true;
    this.status();
  }
  pause() {
    this.playing = false;
    this.status();
  }
  setActiveForLockScreen(active, metadata) {
    this.activations = (this.activations || 0) + 1;
    this.metadata = metadata;
  }
  updateLockScreenMetadata(metadata) {
    this.metadata = metadata;
    this.metadataUpdates = (this.metadataUpdates || 0) + 1;
  }
  clearLockScreenControls() {}
  destroy() {
    this.destroyed = true;
  }
}
globalThis.__audio = {
  createAudioPlaylist: () => new FakePlaylist(),
  setAudioModeAsync: async () => {},
};
globalThis.__api = { stream: async (id) => "https://audio.test/" + id };
let engineCode = await fs.readFile("src/services/audio/engine.ts", "utf8");
engineCode = engineCode.replace(
  /import\s*\{[\s\S]*?\}\s*from "expo-audio";/,
  "const { createAudioPlaylist, setAudioModeAsync } = globalThis.__audio; type AudioPlaylist = any;",
);
engineCode = engineCode
  .replace(/import \{ api \} from [^;]+;/, "const api = globalThis.__api;")
  .replace(
    /import \{ usePlayerStore \} from [^;]+;/,
    "const usePlayerStore = globalThis.__testStore;",
  );
const { audioEngine: engine } = await importJs(compile(engineCode));
const flush = async () => {
  for (let i = 0; i < 20; i++)
    await new Promise((resolve) => setImmediate(resolve));
};
const track = (id) => ({
  id,
  title: id,
  artist: "Test",
  album: "Test",
  artwork: null,
  duration: 200,
  streamUrl: null,
  source: "test",
  isPlayable: true,
});
const a = track("a"),
  b = track("b");
store.getState().enqueue([a, b]);
store.getState().setCurrent(a);
let cleanup = engine.start();
await flush();
assert.equal(instances.length, 1);
assert.equal(
  instances[0].playing,
  false,
  "restored selection must not autoplay",
);
store.getState().setCurrent(a);
await flush();
assert.equal(instances[0].playing, true);
engine.next();
assert.equal(store.getState().current.id, "b");
assert.equal(instances[0].metadata.title, "b");
assert.equal(
  instances[0].activations,
  1,
  "Track changes must not recreate the MediaSession",
);
assert.ok(instances[0].metadataUpdates > 0);
engine.previous();
assert.equal(store.getState().current.id, "a");
await engine.seek(65);
assert.equal(instances[0].currentTime, 65);
engine.toggle();
assert.equal(instances[0].playing, false);
cleanup();
assert.equal(instances[0].destroyed, true);
// Selection changed while URL resolution was pending: stale source must never win.
let releaseA;
globalThis.__api.stream = (id) =>
  id === "a"
    ? new Promise((resolve) => {
        releaseA = resolve;
      })
    : Promise.resolve("https://audio.test/" + id);
store.getState().enqueue([a]);
store.getState().setCurrent(a);
cleanup = engine.start();
store.getState().enqueue([b]);
store.getState().setCurrent(b);
await flush();
releaseA("https://audio.test/stale-a");
await flush();
assert.equal(instances[1].sources[0].uri, "https://audio.test/b");
assert.equal(store.getState().current.id, "b");
cleanup();
console.log(
  "PASS: single instance, silent restore, transport, metadata, seek, pause, cleanup, stale URL race.",
);
