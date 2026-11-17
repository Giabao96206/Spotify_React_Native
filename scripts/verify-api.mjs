import fs from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
process.env.EXPO_PUBLIC_API_BASE_URL ||= "http://127.0.0.1:5555";
let source = await fs.readFile("src/services/api/client.ts", "utf8");
source = source.replace(/import \{ getServerUrl \} from "\.\/server";/, "const getServerUrl = async () => process.env.EXPO_PUBLIC_API_BASE_URL;");
const modelJS = ts.transpileModule(
  await fs.readFile("src/features/lyrics/model.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
source = source.replace(
  '"@/features/lyrics/model"',
  JSON.stringify(
    "data:text/javascript;base64," + Buffer.from(modelJS).toString("base64"),
  ),
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { api, parseCatalog } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const report = {
  checkedAt: new Date().toISOString(),
  health: false,
  homeTracks: 0,
  playlists: 0,
  searchTracks: 0,
  charts: 0,
  playlistTracks: 0,
  streamReachable: false,
  lyrics: false,
};
report.health =
  (await (await fetch(process.env.EXPO_PUBLIC_API_BASE_URL + "/health")).json())
    .ok === true;
assert(report.health);
const home = await api.home();
const search = await api.search("son tung");
const charts = await api.trending();
report.homeTracks = home.tracks.length;
report.playlists = home.playlists.length;
report.searchTracks = search.tracks.length;
report.charts = charts.tracks.length;
assert(search.tracks.length > 0, "Search must return real songs");
assert(home.playlists.length > 0, "Home must return real playlists");
assert(charts.tracks.length > 0);
assert(search.tracks.every((t) => t.id && t.title && t.duration > 0));
const playlist = await api.playlist(home.playlists[0].id);
report.playlistTracks = playlist.tracks.length;
assert(playlist.tracks.length > 0);
const candidate = search.tracks.find((t) => t.isPlayable);
assert(candidate);
try {
  const url = await api.stream(candidate.id);
  const media = await fetch(url, {
    headers: { Range: "bytes=0-1023" },
    signal: AbortSignal.timeout(15000),
  });
  report.streamReachable =
    media.ok &&
    /audio|octet-stream/.test(media.headers.get("content-type") || "");
  await media.body?.cancel();
} catch (error) {
  report.streamError = error.message;
}
try {
  report.lyrics = (await api.lyric(candidate.id)).lines.length > 0;
} catch (error) {
  report.lyricError = error.message;
}
assert.equal(
  parseCatalog({
    data: { items: [{ title: "Not a song", encodeId: "not-song" }] },
  }).tracks.length,
  0,
  "Non-song cards must not become playable tracks",
);
await fs.mkdir("docs", { recursive: true });
await fs.writeFile(
  "docs/api-verification.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
