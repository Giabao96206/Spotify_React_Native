import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pause, Play, SkipForward } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Equalizer } from "./Equalizer";
import { useArtworkTheme } from "@/hooks/useArtworkTheme";

export function MiniPlayer({
  onOpen,
  onPlay,
  onNext,
}: {
  onOpen: () => void;
  onPlay: () => void;
  onNext: () => void;
}) {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const status = usePlayerStore((s) => s.status);
  const theme = useArtworkTheme(current?.artwork);
  const swipe = Gesture.Pan()
    .minDistance(24)
    .onEnd((e) => {
      if (e.translationY < -35) runOnJS(onOpen)();
      else if (e.translationX < -65) runOnJS(onNext)();
    });
  if (!current) return null;
  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.wrap}>
        <LinearGradient
          colors={[theme.mini, theme.middle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={`Mở trình phát: ${current.title}, ${current.artist}`}
            style={styles.open}
          >
            {current.artwork ? (
              <Image source={{ uri: current.artwork }} style={styles.art} />
            ) : (
              <View style={[styles.art, styles.blank]} />
            )}
            <View style={styles.info}>
              <View style={styles.titleLine}>
                <Text numberOfLines={1} style={styles.title}>
                  {current.title}
                </Text>
                <Equalizer active={isPlaying} compact />
              </View>
              <Text numberOfLines={1} style={styles.artist}>
                {current.artist}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Tạm dừng" : "Phát nhạc"}
            onPress={onPlay}
            style={styles.action}
          >
            {status === "buffering" || status === "loading" ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : isPlaying ? (
              <Pause size={23} color={colors.white} fill={colors.white} />
            ) : (
              <Play size={23} color={colors.white} fill={colors.white} />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bài tiếp theo"
            onPress={onNext}
            style={styles.action}
          >
            <SkipForward size={18} color={colors.white} fill={colors.white} />
          </Pressable>
          <View style={styles.progress}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${duration ? Math.min(100, (position / duration) * 100) : 0}%`,
                },
              ]}
            />
          </View>
        </LinearGradient>
      </View>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  wrap: { marginHorizontal: 8, marginBottom: 4 },
  open: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  card: {
    height: 64,
    borderRadius: 8,
    paddingLeft: 8,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    overflow: "hidden",
  },
  art: { width: 44, height: 44, borderRadius: 4 },
  blank: { backgroundColor: colors.elevated },
  info: { flex: 1, gap: 3 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.white, fontWeight: "700", fontSize: 14 },
  artist: { color: "#ffffffcf", fontSize: 12 },
  action: {
    width: 48,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  progress: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 0,
    height: 3,
    backgroundColor: "#ffffff18",
  },
  progressFill: { height: 3, backgroundColor: colors.white },
});
