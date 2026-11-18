import React, { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ChevronDown, Maximize2, LocateFixed } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/services/api/client";
import { audioEngine } from "@/services/audio/engine";
import { usePlayerStore } from "@/stores/player";
import { useActiveMotion } from "@/hooks/useActiveMotion";
import { colors } from "@/theme/tokens";
import { useArtworkTheme } from "@/hooks/useArtworkTheme";
import { ArtworkBackdrop } from "@/components/music/ArtworkBackdrop";
import { activeLyricIndex, LyricLine } from "./model";
const Line = memo(function Line({
  line,
  active,
  synchronized,
  onSeek,
}: {
  line: LyricLine;
  active: boolean;
  synchronized: boolean;
  onSeek: (time: number) => void;
}) {
  const motion = useActiveMotion();
  const opacity = useSharedValue(active || !synchronized ? 1 : 0.34);
  const scale = useSharedValue(active ? 1 : 0.96);
  useEffect(() => {
    opacity.value = withTiming(active || !synchronized ? 1 : 0.34, {
      duration: motion ? 220 : 0,
    });
    scale.value = withTiming(active ? 1 : 0.96, { duration: motion ? 220 : 0 });
  }, [active, synchronized, motion]);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      disabled={line.start === null}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: line.start === null }}
      accessibilityLabel={
        line.text +
        (line.start === null
          ? ""
          : ", seek to " + Math.floor(line.start) + " seconds")
      }
      onPress={() => line.start !== null && onSeek(line.start)}
    >
      <Animated.Text style={[styles.line, style]}>{line.text}</Animated.Text>
    </Pressable>
  );
});
export function LyricsPanel() {
  const track = usePlayerStore((s) => s.current);
  const [expanded, setExpanded] = useState(false);
  const theme = useArtworkTheme(track?.artwork);
  if (!track) return null;
  return (
    <>
      <View style={[styles.compact, { backgroundColor: theme.top }]}>
        <Pressable
          accessibilityLabel="Expand lyrics"
          onPress={() => setExpanded(true)}
          style={styles.heading}
        >
          <Text style={styles.label}>Lyrics</Text>
          <Maximize2 color={theme.accent} size={18} />
        </Pressable>
        <LyricsBody
          key={track.id + "-compact"}
          id={track.id}
          expanded={false}
        />
      </View>
      <Modal
        visible={expanded}
        animationType="slide"
        onRequestClose={() => setExpanded(false)}
      >
        <FullLyrics onClose={() => setExpanded(false)} />
      </Modal>
    </>
  );
}
function FullLyrics({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const track = usePlayerStore((s) => s.current);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.ink,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ArtworkBackdrop uri={track?.artwork} />
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label} numberOfLines={1}>
            {track?.title}
          </Text>
          <Text style={{ color: colors.muted, marginTop: 5 }}>
            {track?.artist}
          </Text>
        </View>
        <Pressable accessibilityLabel="Close lyrics" onPress={onClose}>
          <ChevronDown color={colors.white} size={28} />
        </Pressable>
      </View>
      {track && <LyricsBody key={track.id + "-full"} id={track.id} expanded />}
    </View>
  );
}
function LyricsBody({ id, expanded }: { id: string; expanded: boolean }) {
  const result = useQuery({
    queryKey: ["lyrics", id],
    queryFn: ({ signal }) => api.lyric(id, signal),
    staleTime: Infinity,
  });
  const position = usePlayerStore((s) => s.position);
  const follow = usePlayerStore((s) => s.lyricsAutoFollow);
  const active = activeLyricIndex(result.data?.lines || [], position);
  const list = useRef<FlatList<LyricLine>>(null);
  const offsets = useRef(new Map<number, number>());
  const [viewport, setViewport] = useState(0);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const motion = useActiveMotion();

  useEffect(() => {
    usePlayerStore.setState({ activeLyricIndex: active });
  }, [active, expanded]);
  useEffect(() => {
    if (!follow || active < 0 || !viewport) return;
    const offset = Array.from(
      { length: active },
      (_, i) => offsets.current.get(i) ?? 72,
    ).reduce((a, b) => a + b, expanded ? 70 : 8);
    if (offsets.current.has(active))
      list.current?.scrollToOffset({
        offset: Math.max(0, offset - viewport * 0.4),
        animated: motion,
      });
    else
      list.current?.scrollToIndex({
        index: active,
        viewPosition: 0.4,
        animated: motion,
      });
  }, [active, follow, viewport, layoutEpoch, motion]);
  if (result.isLoading)
    return <ActivityIndicator color={colors.green} style={{ margin: 24 }} />;
  if (result.isError)
    return (
      <Pressable onPress={() => result.refetch()} style={{ padding: 20 }}>
        <Text style={styles.message}>{result.error.message}</Text>
        <Text style={{ color: colors.mint, marginTop: 10 }}>Try again</Text>
      </Pressable>
    );
  if (!result.data?.lines.length)
    return (
      <Text style={styles.message}>Lyrics are unavailable for this song.</Text>
    );
  return (
    <View
      onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
      style={{
        flex: expanded ? 1 : undefined,
        height: expanded ? undefined : 165,
      }}
    >
      <FlatList
        ref={list}
        data={result.data.lines}
        keyExtractor={(_, i) => String(i)}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: expanded ? 70 : 8,
          paddingBottom: expanded ? viewport * 0.5 : 60,
        }}
        onScrollBeginDrag={() =>
          usePlayerStore.setState({ lyricsAutoFollow: false })
        }
        onScrollToIndexFailed={(info) => {
          list.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
        }}
        renderItem={({ item, index }) => (
          <View
            onLayout={(e) => {
              const old = offsets.current.get(index);
              offsets.current.set(index, e.nativeEvent.layout.height);
              if (index === active && old !== e.nativeEvent.layout.height)
                setLayoutEpoch((v) => v + 1);
            }}
          >
            <Line
              line={item}
              active={active === index}
              synchronized={result.data!.synchronized}
              onSeek={(time) => {
                void audioEngine.seek(time);
                usePlayerStore.setState({
                  activeLyricIndex: index,
                  lyricsAutoFollow: true,
                });
              }}
            />
          </View>
        )}
        ListHeaderComponent={
          !result.data.synchronized ? (
            <Text style={styles.message}>Lyrics without timestamps</Text>
          ) : undefined
        }
      />
      {!follow && result.data.synchronized && (
        <Pressable
          accessibilityLabel="Back to current lyrics"
          onPress={() => usePlayerStore.setState({ lyricsAutoFollow: true })}
          style={styles.follow}
        >
          <LocateFixed size={15} color={colors.ink} />
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12 }}>
            Back to current lyrics
          </Text>
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  compact: {
    backgroundColor: "#183724",
    borderRadius: 20,
    marginTop: 16,
    overflow: "hidden",
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    gap: 20,
  },
  label: { color: colors.white, fontWeight: "800", fontSize: 17 },
  line: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 38,
    paddingVertical: 13,
  },
  message: { color: colors.muted, padding: 16, lineHeight: 22 },
  follow: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.mint,
  },
});
