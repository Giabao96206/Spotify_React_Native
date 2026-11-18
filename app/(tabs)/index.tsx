import React, { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Music2 } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { usePlayerStore } from "@/stores/player";
import { colors } from "@/theme/tokens";
import { Track } from "@/types/music";
import { TrackRow, showActions } from "@/components/music/TrackRow";
import { Skeleton } from "@/components/animations/Skeleton";

type Filter = "Tất cả" | "Bài hát" | "Playlist";
export default function Home() {
  const [filter, setFilter] = useState<Filter>("Tất cả");
  const [refreshing, setRefreshing] = useState(false);
  const current = usePlayerStore((s) => s.current);
  const recent = usePlayerStore((s) => s.recent);
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(180, Math.max(144, width * 0.42));
  const home = useQuery({
    queryKey: ["home"],
    queryFn: ({ signal }) => api.home(signal),
    retry: 1,
  });
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: ({ signal }) => api.trending(signal),
    retry: 1,
  });
  const tracks = home.data?.tracks.length
    ? home.data.tracks
    : (trending.data?.tracks ?? []);
  const shortcuts = (recent.length ? recent : tracks).slice(0, 6);
  const artists = home.data?.artists.length
    ? home.data.artists
    : (trending.data?.artists ?? []);
  const playlists = home.data?.playlists ?? [];
  const play = (track: Track, queue = tracks) => {
    const state = usePlayerStore.getState();
    state.enqueue(queue.length ? queue : [track]);
    state.setCurrent(track);
    router.push("/player");
  };
  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([home.refetch(), trending.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.avatar} accessible accessibilityLabel="Nightwave">
          <Text style={styles.avatarText}>N</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(["Tất cả", "Bài hát", "Playlist"] as Filter[]).map((label) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === label }}
              onPress={() => setFilter(label)}
              style={({ pressed }) => [
                styles.chip,
                filter === label && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filter === label && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.green}
            colors={[colors.green]}
          />
        }
        contentContainerStyle={styles.content}
      >
        {filter !== "Playlist" && shortcuts.length > 0 && (
          <View style={styles.shortcuts}>
            {shortcuts.map((track) => (
              <Pressable
                key={track.id}
                onPress={() => play(track, recent.length ? recent : tracks)}
                accessibilityRole="button"
                accessibilityLabel={`Phát ${track.title}`}
                style={({ pressed }) => [
                  styles.shortcut,
                  { width: (width - 40) / 2 },
                  pressed && styles.pressed,
                ]}
              >
                <Cover uri={track.artwork} size={52} />
                <Text numberOfLines={2} style={styles.shortcutTitle}>
                  {track.title}
                </Text>
                {current?.id === track.id && <View style={styles.playingDot} />}
              </Pressable>
            ))}
          </View>
        )}
        {home.isLoading && !tracks.length && <Skeleton />}
        {home.isError && !tracks.length && (
          <View style={styles.message}>
            <Text style={styles.sectionTitle}>Chưa tải được nhạc</Text>
            <Text style={styles.secondary}>
              Kiểm tra kết nối và địa chỉ máy chủ trong Thư viện.
            </Text>
            <Pressable
              onPress={refresh}
              accessibilityRole="button"
              style={styles.retry}
            >
              <Text style={styles.link}>Thử lại</Text>
            </Pressable>
          </View>
        )}
        {filter !== "Playlist" && recent.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="Nghe gần đây" />
            {recent.slice(0, 3).map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                active={current?.id === track.id}
                onPress={() => play(track, recent)}
                onMore={() => showActions(track)}
              />
            ))}
          </View>
        )}
        {filter !== "Playlist" && tracks.length > 0 && (
          <View style={styles.section}>
            <SectionHeading
              title={
                recent.length ? "Thêm một chút hợp gu" : "Bắt đầu nghe nhạc"
              }
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {tracks.slice(0, 10).map((track) => (
                <Pressable
                  key={track.id}
                  onPress={() => play(track)}
                  accessibilityRole="button"
                  accessibilityLabel={`Phát ${track.title}`}
                  style={({ pressed }) => [
                    { width: cardWidth },
                    pressed && styles.pressed,
                  ]}
                >
                  <Cover uri={track.artwork} size={cardWidth} />
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {track.title}
                  </Text>
                  <Text numberOfLines={2} style={styles.cardDescription}>
                    {track.artist}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {filter !== "Bài hát" && playlists.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="Một playlist cho hôm nay" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {playlists.slice(0, 10).map((playlist) => (
                <Pressable
                  key={playlist.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/playlist/[id]",
                      params: { id: playlist.id },
                    })
                  }
                  style={({ pressed }) => [
                    { width: cardWidth },
                    pressed && styles.pressed,
                  ]}
                >
                  <Cover uri={playlist.artwork} size={cardWidth} />
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {playlist.title}
                  </Text>
                  {!!playlist.description && (
                    <Text numberOfLines={2} style={styles.cardDescription}>
                      {playlist.description}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {filter === "Playlist" && !home.isLoading && !playlists.length && (
          <View style={styles.message}>
            <Text style={styles.sectionTitle}>Playlist của bạn ở đây</Text>
            <Text style={styles.secondary}>
              Mở Thư viện để nghe hoặc tạo playlist riêng.
            </Text>
            <Pressable
              onPress={() => router.push("/library")}
              style={styles.retry}
            >
              <Text style={styles.link}>Mở Thư viện</Text>
            </Pressable>
          </View>
        )}
        {filter === "Tất cả" && artists.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="Khám phá nghệ sĩ" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {artists.slice(0, 8).map((artist) => (
                <Pressable
                  key={artist.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Nghe ${artist.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/artist/[alias]",
                      params: { alias: artist.alias },
                    })
                  }
                  style={({ pressed }) => [
                    { width: cardWidth },
                    pressed && styles.pressed,
                  ]}
                >
                  <Cover uri={artist.artwork} size={cardWidth} round />
                  <Text
                    numberOfLines={2}
                    style={[styles.cardTitle, styles.artistName]}
                  >
                    {artist.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        {filter !== "Playlist" && tracks.length > 0 && (
          <View style={styles.section}>
            <SectionHeading title="Đang được nghe nhiều" />
            {(trending.data?.tracks.length ? trending.data.tracks : tracks)
              .slice(0, 6)
              .map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  active={current?.id === track.id}
                  onPress={() => play(track, trending.data?.tracks ?? tracks)}
                  onMore={() => showActions(track)}
                />
              ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {title}
    </Text>
  );
}
function Cover({
  uri,
  size,
  round = false,
}: {
  uri: string | null;
  size: number;
  round?: boolean;
}) {
  const style = {
    width: size,
    height: size,
    borderRadius: round ? size / 2 : 5,
  };
  return uri ? (
    <Image source={{ uri }} style={style} contentFit="cover" transition={180} />
  ) : (
    <View style={[style, styles.coverBlank]}>
      <Music2 size={Math.min(32, size / 2)} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingVertical: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#C2A4D8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 21, fontWeight: "800", color: colors.ink },
  filters: { gap: 8, paddingRight: 16 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.elevated,
  },
  chipActive: { backgroundColor: colors.green },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.white },
  chipTextActive: { color: colors.ink },
  content: { paddingTop: 4, paddingBottom: 24 },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderRadius: 5,
    overflow: "hidden",
    minHeight: 60,
    paddingRight: 8,
    gap: 9,
  },
  shortcutTitle: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    flex: 1,
  },
  playingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  section: { marginBottom: 30, paddingHorizontal: 16 },
  heading: {
    color: colors.white,
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sectionTitle: { color: colors.white, fontSize: 21, fontWeight: "700" },
  rail: { gap: 16, paddingBottom: 2 },
  cardTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 10,
  },
  cardDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  artistName: { textAlign: "center" },
  coverBlank: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.elevated,
  },
  message: { marginHorizontal: 16, paddingVertical: 24, gap: 12 },
  secondary: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  retry: {
    minHeight: 48,
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingRight: 16,
  },
  link: { color: colors.green, fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
