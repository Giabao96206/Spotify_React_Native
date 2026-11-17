import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  Heart,
  Play,
  SlidersHorizontal,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { usePlayerStore } from "@/stores/player";
import { colors, radii, spacing } from "@/theme/tokens";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/music/TrackRow";
import { Skeleton } from "@/components/animations/Skeleton";
import { MusicCapsule } from "@/components/music/MusicCapsule";
import { MiniPlayer } from "@/components/music/MiniPlayer";

export default function Home() {
  const [tab, setTab] = useState("home");
  const [refreshing, setRefreshing] = useState(false);
  const current = usePlayerStore((s) => s.current);
  const setCurrent = usePlayerStore((s) => s.setCurrent);
  const enqueue = usePlayerStore((s) => s.enqueue);
  const query = useQuery({
    queryKey: ["home"],
    queryFn: ({ signal }) => api.home(signal),
    retry: 1,
  });
  const trending = useQuery({
    queryKey: ["trending"],
    queryFn: ({ signal }) => api.trending(signal),
    retry: 1,
  });
  const tracks = useMemo(
    () =>
      query.data?.tracks.length
        ? query.data.tracks
        : trending.data?.tracks || [],
    [query.data, trending.data],
  );

  const play = (track: Track) => {
    if (!track) return;
    enqueue(tracks);
    setCurrent(track);
    router.push("/player");
  };
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([query.refetch(), trending.refetch()]);
    setRefreshing(false);
  };
  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.green}
          />
        }
        contentContainerStyle={styles.content}
      >
        <MusicCapsule />
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Your daily listening space</Text>
            <Text style={styles.greeting}>Good evening</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>NW</Text>
            </View>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <View style={[styles.chip, styles.chipActive]}>
            <Text style={styles.chipActiveText}>All music</Text>
          </View>
          {["Chill", "Focus", "New releases"].map((label) => (
            <Pressable
              key={label}
              onPress={() =>
                router.push({ pathname: "/search", params: { q: label } })
              }
              style={styles.chip}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroEyebrow}>THE NIGHTWAVE EDIT</Text>
          <Text style={styles.heroTitle}>Soundtrack the{`\n`}quiet hours.</Text>
          <Text style={styles.heroCopy}>
            Find a new favorite in today's catalog.
          </Text>
          <Pressable
            disabled={!tracks.length}
            onPress={() => play(tracks[0])}
            style={styles.heroButton}
          >
            <Play size={16} color={colors.ink} fill={colors.ink} />
            <Text style={styles.heroButtonText}>Play selection</Text>
          </Pressable>
        </View>
        {query.isLoading && <Skeleton />}
        {query.isError && (
          <View style={{ paddingVertical: 18 }}>
            <Text style={{ color: colors.white }}>Catalog unavailable</Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {query.error.message}
            </Text>
            <Pressable onPress={() => query.refetch()}>
              <Text style={{ color: colors.green, marginTop: 12 }}>
                Try again
              </Text>
            </Pressable>
          </View>
        )}
        <SectionTitle title="Discover tracks" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.albumRail}
        >
          {tracks.slice(0, 5).map((track, i) => (
            <Pressable
              key={track.id}
              onPress={() => play(track)}
              style={styles.albumCard}
            >
              {track.artwork ? (
                <Image
                  source={{ uri: track.artwork }}
                  style={styles.albumArt}
                />
              ) : (
                <View
                  style={[
                    styles.albumArt,
                    styles.artPlaceholder,
                    { backgroundColor: i % 2 ? "#273B4D" : "#3C2B45" },
                  ]}
                >
                  <Text style={styles.placeholderLetter}>{track.title[0]}</Text>
                </View>
              )}
              <Text numberOfLines={1} style={styles.albumTitle}>
                {track.title}
              </Text>
              <Text numberOfLines={1} style={styles.albumArtist}>
                {track.artist}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View>
          {query.data?.playlists.slice(0, 4).map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: "/playlist/[id]",
                  params: { id: p.id },
                })
              }
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ color: colors.white, fontWeight: "700" }}>
                {p.title}
              </Text>
              <Text style={{ color: colors.dim }}>Explore playlist</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular right now</Text>
          <Pressable onPress={() => router.push("/search")}>
            <Text style={styles.seeAll}>Search more</Text>
          </Pressable>
        </View>
        <View>
          {tracks.slice(0, 6).map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              active={current?.id === track.id}
              onPress={() => play(track)}
              onMore={() => usePlayerStore.getState().toggleFavorite(track)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ChevronRight size={20} color={colors.dim} />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 30 },
  header: {
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kicker: { color: colors.dim, fontSize: 12, marginBottom: 6 },
  greeting: {
    color: colors.white,
    fontSize: 27,
    letterSpacing: -0.7,
    fontWeight: "700",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.ink, fontWeight: "800", fontSize: 11 },
  chips: { gap: 9, paddingVertical: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.green },
  chipText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  chipActiveText: { color: colors.ink, fontWeight: "800", fontSize: 13 },
  hero: {
    height: 212,
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#173125",
    marginBottom: 28,
  },
  heroGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -50,
    top: -90,
    backgroundColor: "#2B8A58",
    opacity: 0.35,
  },
  heroEyebrow: {
    color: colors.mint,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.6,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 29,
    lineHeight: 31,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 12,
  },
  heroCopy: { color: "#C1D5C5", fontSize: 12, marginTop: 8 },
  heroButton: {
    marginTop: 18,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.mint,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroButtonText: { color: colors.ink, fontWeight: "800", fontSize: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  seeAll: { color: colors.green, fontWeight: "700", fontSize: 12 },
  albumRail: { gap: 14, paddingBottom: 30 },
  albumCard: { width: 138 },
  albumArt: { width: 138, height: 138, borderRadius: 16, marginBottom: 9 },
  artPlaceholder: { alignItems: "center", justifyContent: "center" },
  placeholderLetter: { color: "#ffffff99", fontSize: 46, fontWeight: "800" },
  albumTitle: { color: colors.white, fontWeight: "700", fontSize: 13 },
  albumArtist: { color: colors.muted, fontSize: 12, marginTop: 3 },
  bottom: {
    height: 72,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.ink,
  },
  bottomItem: { padding: 16, minWidth: 80, alignItems: "center" },
  bottomText: { color: colors.dim, fontSize: 12, fontWeight: "700" },
  bottomActive: { color: colors.white },
});
