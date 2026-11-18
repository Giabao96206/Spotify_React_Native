import { Image } from "expo-image";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { colorFromBlurhash, themeFromArtworkColor } from "@/theme/artwork";

export function useArtworkTheme(uri: string | null | undefined) {
  const result = useQuery({
    queryKey: ["artwork-color", uri ?? null],
    queryFn: async () => {
      const image = await Image.loadAsync(uri!, {
        maxWidth: 48,
        maxHeight: 48,
      });
      try {
        // The DC component contains the average color of real image pixels.
        return colorFromBlurhash(
          await Image.generateBlurhashAsync(image, [1, 1]),
        );
      } finally {
        image.release();
      }
    },
    enabled: !!uri && Platform.OS !== "web",
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  // A new URI has its own query: a slow previous cover cannot color the new song.
  return themeFromArtworkColor(result.data ?? null);
}
