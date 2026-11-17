export type LyricLine = { text: string; start: number | null; end?: number };
export type Lyrics = { lines: LyricLine[]; synchronized: boolean };
export function parseLyrics(data: unknown): Lyrics {
  const raw = data as
    | {
        sentences?: {
          words?: { data?: string; startTime?: number; endTime?: number }[];
        }[];
        lyric?: string;
      }
    | string
    | null;
  let lines: LyricLine[] = [];
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray(raw.sentences) &&
    raw.sentences.length
  ) {
    lines = raw.sentences.map((line) => {
      const words = line.words || [];
      const starts = words
        .map((w) => w.startTime)
        .filter((v): v is number => typeof v === "number" && v >= 0);
      const ends = words
        .map((w) => w.endTime)
        .filter((v): v is number => typeof v === "number");
      return {
        text: words
          .map((w) => w.data || "")
          .join(" ")
          .trim(),
        start: starts.length ? Math.min(...starts) / 1000 : null,
        end: ends.length ? Math.max(...ends) / 1000 : undefined,
      };
    });
  } else {
    const text = typeof raw === "string" ? raw : raw?.lyric || "";
    let offset = 0;
    const offsetMatch = text.match(/\[offset:([+-]?\d+)\]/i);
    if (offsetMatch) offset = Number(offsetMatch[1]) / 1000;
    for (const row of text.split(/\r?\n/)) {
      const times = [...row.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      const content = row.replace(/\[[^\]]*\]/g, "").trim();
      if (!content) continue;
      if (times.length)
        times.forEach((m) =>
          lines.push({
            text: content,
            start: Math.max(0, Number(m[1]) * 60 + Number(m[2]) + offset),
          }),
        );
      else lines.push({ text: content, start: null });
    }
  }
  lines = lines.filter((l) => l.text);
  const synchronized = lines.some((l) => l.start !== null);
  if (synchronized)
    lines = lines
      .filter((l) => l.start !== null)
      .sort((a, b) => a.start! - b.start!);
  return { lines, synchronized };
}
export function activeLyricIndex(lines: LyricLine[], seconds: number): number {
  let low = 0,
    high = lines.length - 1,
    result = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const time = lines[mid].start;
    if (time === null) return -1;
    if (time <= seconds) {
      result = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return result;
}
