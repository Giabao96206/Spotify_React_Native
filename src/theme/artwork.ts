const BASE83 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

export function colorFromBlurhash(hash: string | null): string | null {
  if (!hash || hash.length < 6) return null;
  let value = 0;
  for (const char of hash.slice(2, 6)) {
    const digit = BASE83.indexOf(char);
    if (digit < 0) return null;
    value = value * 83 + digit;
  }
  if (value > 0xffffff) return null;
  return `#${value.toString(16).padStart(6, "0")}`;
}

function tint(color: string, factor: number, white = 0): string {
  return (
    "#" +
    [1, 3, 5]
      .map((start) =>
        Math.round(
          parseInt(color.slice(start, start + 2), 16) * factor + 255 * white,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Shades remain dark enough for white text, including an entirely white cover. */
export function themeFromArtworkColor(color: string | null) {
  const source = color && /^#[\da-f]{6}$/i.test(color) ? color : "#55585c";
  return {
    source,
    top: tint(source, 0.37),
    middle: tint(source, 0.22),
    bottom: tint(source, 0.07),
    mini: tint(source, 0.32),
    accent: tint(source, 0.45, 0.55),
  };
}
