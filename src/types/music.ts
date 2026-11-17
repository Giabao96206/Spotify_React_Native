export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string | null;
  duration: number;
  streamUrl: string | null;
  source: string;
  isPlayable: boolean;
  lyrics?: string;
};
export type RepeatMode = "off" | "all" | "one";
