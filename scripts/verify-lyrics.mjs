import fs from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
const source = await fs.readFile("src/features/lyrics/model.ts", "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { parseLyrics, activeLyricIndex } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const lrc = parseLyrics(
  "[offset:-100]\n[00:01.50][00:04.25]Hello\n[00:02.00]World",
);
assert.deepEqual(
  lrc.lines.map((l) => l.start),
  [1.4, 1.9, 4.15],
);
assert.equal(activeLyricIndex(lrc.lines, 0), -1);
assert.equal(activeLyricIndex(lrc.lines, 1.9), 1);
assert.equal(activeLyricIndex(lrc.lines, 5), 2);
assert.equal(
  activeLyricIndex(lrc.lines, 1.5),
  0,
  "Seeking backwards must immediately select an earlier line",
);
const upstream = parseLyrics({
  sentences: [
    {
      words: [
        { data: "Hello", startTime: 1000, endTime: 1800 },
        { data: "world", startTime: 1800, endTime: 2200 },
      ],
    },
  ],
});
assert.equal(upstream.lines[0].text, "Hello world");
assert.equal(upstream.lines[0].start, 1);
assert.equal(upstream.lines[0].end, 2.2);
assert.equal(parseLyrics("One\nTwo").synchronized, false);
assert.equal(parseLyrics(null).lines.length, 0);
assert.equal(parseLyrics({ sentences: [] }).lines.length, 0);
console.log(
  "PASS: backend word timings, LRC multi timestamps/offset, binary lookup, seek backwards, unsynced/missing lyrics.",
);
