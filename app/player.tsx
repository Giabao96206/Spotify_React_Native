import { LyricsPanel } from "@/features/lyrics/LyricsPanel";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  ArrowDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useActiveMotion } from "@/hooks/useActiveMotion";
import Slider from "@react-native-community/slider";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FloatingArtwork } from "@/components/music/FloatingArtwork";
import { colors } from "@/theme/tokens";
import { api } from "@/services/api/client";
import { audioEngine } from "@/services/audio/engine";
import { usePlayerStore } from "@/stores/player";
export default function Player() {
  const current = usePlayerStore((s) => s.current);
  const playing = usePlayerStore((s) => s.isPlaying);
  const status = usePlayerStore((s) => s.status);
  const error = usePlayerStore((s) => s.error);
  const mediaError = usePlayerStore((s) => s.mediaError);
  const favorites = usePlayerStore((s) => s.favorites);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const motion = useActiveMotion();
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  if (!current)
    return (
      <View style={styles.screen}>
        <Pressable onPress={() => router.back()}>
          <ArrowDown color={colors.white} />
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing playing</Text>
          <Text style={styles.emptyCopy}>
            Choose a track from Home or Search.
          </Text>
        </View>
      </View>
    );
  const size = Math.min(width - 48, height * 0.37, 400);
  const liked = favorites.some((t) => t.id === current.id);
  return (
    <LinearGradient
      colors={["#183E2A", "#101A14", colors.ink]}
      style={styles.screen}
    >
      {current.artwork && (
        <Image
          source={{ uri: current.artwork }}
          blurRadius={80}
          style={[
            { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
            { opacity: 0.22 },
          ]}
        />
      )}
      <ScrollView
        style={styles.safe}
        contentContainerStyle={{ paddingBottom: 36 }}
        nestedScrollEnabled
      >
        <View style={styles.top}>
          <Pressable
            accessibilityLabel="Close player"
            onPress={() => router.back()}
          >
            <ArrowDown size={25} color={colors.white} />
          </Pressable>
          <Text style={styles.now}>NOW PLAYING</Text>
          <Pressable
            accessibilityLabel="Open queue"
            onPress={() => router.push("/queue")}
          >
            <ListMusic size={23} color={colors.white} />
          </Pressable>
        </View>
        <Animated.View
          key={current.id}
          entering={motion ? FadeIn.duration(320) : undefined}
          style={[styles.artWrap, { marginTop: 30, marginBottom: 30 }]}
        >
          <FloatingArtwork uri={current.artwork} size={size} />
        </Animated.View>
        <View style={styles.meta}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={styles.title}>
              {current.title}
            </Text>
            <Text numberOfLines={1} style={styles.artist}>
              {current.artist}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={liked ? "Unlike song" : "Like song"}
            onPress={() => usePlayerStore.getState().toggleFavorite(current)}
          >
            <Heart
              size={25}
              color={liked ? colors.green : colors.white}
              fill={liked ? colors.green : "transparent"}
            />
          </Pressable>
        </View>
        <Progress />
        <View style={styles.controls}>
          <Pressable
            accessibilityLabel="Toggle shuffle"
            onPress={usePlayerStore.getState().toggleShuffle}
          >
            <Shuffle size={20} color={shuffle ? colors.green : colors.white} />
          </Pressable>
          <Pressable
            accessibilityLabel="Previous track"
            onPress={audioEngine.previous}
          >
            <SkipBack size={27} color={colors.white} fill={colors.white} />
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? "Pause" : "Play"}
            onPress={audioEngine.toggle}
            style={styles.play}
          >
            {playing ? (
              <Pause size={25} color={colors.ink} fill={colors.ink} />
            ) : (
              <Play size={25} color={colors.ink} fill={colors.ink} />
            )}
          </Pressable>
          <Pressable accessibilityLabel="Next track" onPress={audioEngine.next}>
            <SkipForward size={27} color={colors.white} fill={colors.white} />
          </Pressable>
          <Pressable
            accessibilityLabel={"Repeat " + repeat}
            onPress={usePlayerStore.getState().cycleRepeat}
          >
            <Repeat
              size={20}
              color={repeat !== "off" ? colors.green : colors.white}
            />
            {repeat === "one" && (
              <Text
                style={{
                  color: colors.green,
                  fontSize: 9,
                  textAlign: "center",
                }}
              >
                1
              </Text>
            )}
          </Pressable>
        </View>
        <Text style={[styles.hint, { textAlign: "center", marginTop: 20 }]}>
          {error ||
            mediaError ||
            (status === "loading"
              ? "Preparing stream…"
              : status === "buffering"
                ? "Buffering…"
                : "Zing MP3")}
        </Text>
        <LyricsPanel />
      </ScrollView>
    </LinearGradient>
  );
}
function Progress() {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const [drag, setDrag] = useState<number | null>(null);
  return (
    <View style={{ marginTop: 22 }}>
      <Slider
        accessibilityLabel="Seek playback"
        minimumValue={0}
        maximumValue={duration || 1}
        value={drag ?? position}
        minimumTrackTintColor={colors.green}
        maximumTrackTintColor="#ffffff30"
        thumbTintColor={colors.white}
        onSlidingStart={setDrag}
        onValueChange={setDrag}
        onSlidingComplete={(v) => {
          void audioEngine.seek(v);
          setDrag(null);
        }}
      />
      <View style={styles.time}>
        <Text style={styles.timeText}>{format(drag ?? position)}</Text>
        <Text style={styles.timeText}>
          −{format(Math.max(0, duration - (drag ?? position)))}
        </Text>
      </View>
    </View>
  );
}
function format(value: number) {
  return (
    Math.floor(value / 60) +
    ":" +
    String(Math.floor(value % 60)).padStart(2, "0")
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  safe: { flex: 1, paddingHorizontal: 22, paddingTop: 12 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  now: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "800",
  },
  artWrap: { alignItems: "center", marginTop: 48, marginBottom: 42 },
  art: { width: 320, height: 320, borderRadius: 18 },
  artBlank: {
    backgroundColor: "#3D294A",
    alignItems: "center",
    justifyContent: "center",
  },
  artLetter: { color: "#ffffff88", fontSize: 110, fontWeight: "800" },
  meta: { flexDirection: "row", alignItems: "center", gap: 18 },
  title: {
    color: colors.white,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.7,
  },
  artist: { color: colors.muted, fontSize: 15, marginTop: 6 },
  slider: {
    height: 4,
    backgroundColor: "#ffffff24",
    borderRadius: 4,
    marginTop: 35,
  },
  sliderFill: { height: 4, backgroundColor: colors.white, borderRadius: 4 },
  time: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 },
  timeText: { color: colors.dim, fontSize: 11 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 34,
  },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomHint: { alignItems: "center", marginTop: 46 },
  hint: { color: colors.dim, fontSize: 11 },
  empty: { alignItems: "center", marginTop: 180 },
  emptyTitle: { color: colors.white, fontSize: 24, fontWeight: "800" },
  emptyCopy: { color: colors.muted, marginTop: 8 },
});
