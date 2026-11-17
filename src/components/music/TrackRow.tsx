import React, { memo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MoreVertical, Play } from "lucide-react-native";
import { colors, spacing } from "@/theme/tokens";
import { Track } from "@/types/music";
import { Equalizer } from "./Equalizer";
import { usePlayerStore } from "@/stores/player";

function TrackRowComponent({
  track,
  active,
  onPress,
  onMore,
}: {
  track: Track;
  active?: boolean;
  onPress: () => void;
  onMore?: () => void;
}) {
  return (
    <Pressable
      onLongPress={() => showActions(track)}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Play ${track.title}`}
    >
      <View style={styles.artWrap}>
        {track.artwork ? (
          <Image source={{ uri: track.artwork }} style={styles.art} />
        ) : (
          <View style={[styles.art, styles.blank]}>
            <Play size={17} color={colors.muted} />
          </View>
        )}
        {active && (
          <View style={styles.activeDot}>
            <Equalizer compact />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, active && styles.active]}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist} · {track.album}
        </Text>
      </View>
      {onMore ? (
        <Pressable
          accessibilityLabel={"Actions for " + track.title}
          onPress={() => showActions(track)}
          hitSlop={10}
        >
          <MoreVertical size={20} color={colors.muted} />
        </Pressable>
      ) : (
        <Text style={styles.duration}>
          {track.duration
            ? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, "0")}`
            : "—"}
        </Text>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  pressed: { opacity: 0.7 },
  artWrap: { width: 52, height: 52 },
  art: { width: 52, height: 52, borderRadius: 10 },
  blank: {
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.panel,
    borderRadius: 8,
    padding: 3,
  },
  info: { flex: 1, gap: 4 },
  title: { color: colors.white, fontSize: 15, fontWeight: "600" },
  active: { color: colors.green },
  artist: { color: colors.muted, fontSize: 12 },
  duration: { color: colors.dim, fontSize: 12 },
});

export const TrackRow = memo(TrackRowComponent);
export function showActions(track: Track) {
  const state = usePlayerStore.getState();
  Alert.alert(track.title, track.artist, [
    {
      text: state.favorites.some((t) => t.id === track.id)
        ? "Remove from liked songs"
        : "Like song",
      onPress: () => state.toggleFavorite(track),
    },
    {
      text: "Add to queue",
      onPress: () =>
        state.enqueue([...state.queue.filter((t) => t.id !== track.id), track]),
    },
    {
      text: "Add to playlist",
      onPress: () => {
        const lists = usePlayerStore.getState().playlists;
        if (!lists.length) {
          Alert.alert(
            "Create a playlist first",
            "Open Library → Playlists to create one.",
          );
          return;
        }
        Alert.alert("Choose a playlist", undefined, [
          ...lists.slice(0, 8).map((p) => ({
            text: p.title,
            onPress: () => state.addToPlaylist(p.id, track),
          })),
          { text: "Cancel", style: "cancel" },
        ]);
      },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
