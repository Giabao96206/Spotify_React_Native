import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { ArrowLeft, Play } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { Track } from "@/types/music";
import { TrackRow } from "@/components/music/TrackRow";
export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const local = usePlayerStore((s) => s.playlists.find((p) => p.id === id));
  const query = useQuery({
    queryKey: ["playlist", id],
    queryFn: ({ signal }) => api.playlist(id, signal),
    enabled: !!id && !id.startsWith("local-"),
  });
  const tracks = local?.tracks || query.data?.tracks || [];
  const title = local?.title || query.data?.title || "Playlist";
  const artwork = tracks[0]?.artwork || query.data?.artwork;
  const play = (track?: Track) => {
    if (!track) return;
    const s = usePlayerStore.getState();
    s.enqueue(tracks);
    s.setCurrent(track);
    router.push("/player");
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24 }}>
      <Pressable onPress={() => router.back()}>
        <ArrowLeft color={colors.white} />
      </Pressable>
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View style={{ paddingVertical: 24 }}>
            {artwork ? (
              <Image
                source={{ uri: artwork }}
                style={{
                  height: 220,
                  width: 220,
                  borderRadius: 20,
                  alignSelf: "center",
                }}
              />
            ) : (
              <View
                style={{
                  height: 160,
                  backgroundColor: colors.glow,
                  borderRadius: 20,
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 70,
                    color: colors.mint,
                    textAlign: "center",
                  }}
                >
                  ♪
                </Text>
              </View>
            )}
            <Text
              style={{
                color: colors.white,
                fontSize: 30,
                fontWeight: "800",
                marginTop: 24,
              }}
            >
              {title}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              {tracks.length} songs ·{" "}
              {Math.round(tracks.reduce((n, t) => n + t.duration, 0) / 60)} min
            </Text>
            <Pressable
              onPress={() => play(tracks[0])}
              style={{
                backgroundColor: colors.green,
                borderRadius: 30,
                padding: 16,
                alignSelf: "flex-end",
              }}
            >
              <Play color={colors.ink} fill={colors.ink} />
            </Pressable>
            {query.isLoading && <ActivityIndicator color={colors.green} />}
            {query.isError && (
              <Text style={{ color: colors.coral }}>{query.error.message}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            onPress={() => play(item)}
            onMore={() => usePlayerStore.getState().toggleFavorite(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.muted }}>
            Add songs from a track's menu in Home or Search.
          </Text>
        }
      />
    </View>
  );
}
