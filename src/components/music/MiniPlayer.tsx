import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronUp, Pause, Play, SkipForward } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { Equalizer } from "./Equalizer";

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
  const swipe = Gesture.Pan()
    .minDistance(24)
    .onEnd((e) => {
      if (e.translationY < -35) runOnJS(onOpen)();
      else if (e.translationX < -65) runOnJS(onNext)();
    });
  if (!current) return null;
  return (
    <GestureDetector gesture={swipe}>
      <Pressable onPress={onOpen} style={styles.wrap}>
        <LinearGradient
          colors={["#25382D", "#171C19"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
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
          <Pressable onPress={onPlay} hitSlop={12} style={styles.action}>
            {isPlaying ? (
              <Pause size={18} color={colors.white} fill={colors.white} />
            ) : (
              <Play size={18} color={colors.white} fill={colors.white} />
            )}
          </Pressable>
          <Pressable onPress={onNext} hitSlop={12} style={styles.action}>
            <SkipForward size={18} color={colors.white} fill={colors.white} />
          </Pressable>
          <ChevronUp size={18} color={colors.muted} />
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
      </Pressable>
    </GestureDetector>
  );
}
const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginBottom: 6 },
  card: {
    height: 64,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  art: { width: 44, height: 44, borderRadius: 9 },
  blank: { backgroundColor: colors.elevated },
  info: { flex: 1, gap: 3 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: colors.white, fontWeight: "700", fontSize: 13 },
  artist: { color: colors.muted, fontSize: 11 },
  action: { padding: 5 },
  progress: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: "#ffffff18",
  },
  progressFill: { height: 2, backgroundColor: colors.green },
});
