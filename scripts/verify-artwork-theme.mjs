import fs from "node:fs/promises";
import assert from "node:assert/strict";
import ts from "typescript";

const code = ts.transpileModule(
  await fs.readFile("src/theme/artwork.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { colorFromBlurhash, themeFromArtworkColor } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);
// Real BlurHash DC values are encoded RGB, not colors derived from a song ID.
const digits =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
function hash(color) {
  let value = parseInt(color.slice(1), 16),
    dc = "";
  for (let i = 0; i < 4; i++) {
    dc = digits[value % 83] + dc;
    value = Math.floor(value / 83);
  }
  return "00" + dc;
}
function luminance(color) {
  const rgb = [1, 3, 5]
    .map((start) => parseInt(color.slice(start, start + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
for (const color of ["#ff0000", "#0000ff", "#ffffff", "#000000", "#9a703a"]) {
  assert.equal(colorFromBlurhash(hash(color)), color);
}
assert.equal(colorFromBlurhash(null), null);
assert.equal(colorFromBlurhash("bad"), null);
assert.equal(colorFromBlurhash("00!!!!"), null);
assert.deepEqual(themeFromArtworkColor("invalid"), themeFromArtworkColor(null));
for (let r = 0; r <= 255; r += 51)
  for (let g = 0; g <= 255; g += 51)
    for (let b = 0; b <= 255; b += 51) {
      const color =
        "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
      const theme = themeFromArtworkColor(colorFromBlurhash(hash(color)));
      for (const surface of [
        theme.top,
        theme.middle,
        theme.bottom,
        theme.mini,
      ]) {
        assert.ok(
          contrast("#f6f7f4", surface) >= 4.5,
          `White text contrast on ${surface}`,
        );
        assert.ok(
          contrast("#dddddd", surface) >= 4.5,
          `Secondary text contrast on ${surface}`,
        );
      }
      assert.ok(
        contrast(theme.accent, theme.mini) >= 4.5,
        `Accent contrast on ${theme.mini}`,
      );
    }
console.log(
  "PASS: real-image DC colors, invalid/missing artwork fallback, 216 palettes with accessible text/accent contrast.",
);
