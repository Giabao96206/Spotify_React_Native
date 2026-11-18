import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Music2, Search, X, Clock3 } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { TrackRow, showActions } from "@/components/music/TrackRow";

const genres = [
  { title: "Nhạc Việt", query: "nhạc Việt", color: "#A92768" },
  { title: "Chill một chút", query: "chill", color: "#24675D" },
  { title: "Pop", query: "pop", color: "#654498" },
  { title: "Hip-hop", query: "rap Việt", color: "#A94821" },
  { title: "Acoustic", query: "acoustic", color: "#856028" },
  { title: "Không lời", query: "không lời", color: "#3C658A" },
  { title: "Indie", query: "indie", color: "#876092" },
  { title: "Năng lượng mới", query: "dance", color: "#284DA5" },
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [value, setValue] = useState(params.q ?? "");
  const [query, setQuery] = useState("");
  const recent = usePlayerStore((s) => s.searches);
  const currentId = usePlayerStore((s) => s.current?.id);
  useEffect(() => {
    if (params.q !== undefined) setValue(params.q);
  }, [params.q]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value]);
  const result = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => api.search(query, signal),
    enabled: query.length > 1,
  });
  const home = useQuery({
    queryKey: ["home"],
    queryFn: ({ signal }) => api.home(signal),
    staleTime: 60000,
  });
  const browsing = !value.trim();
  const waiting =
    !browsing &&
    (value.trim() !== query || (query.length > 1 && result.isPending));
  return (
    <View style={styles.screen}>
      <View style={styles.titleRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>N</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Tìm kiếm
        </Text>
      </View>
      <View style={styles.searchBox}>
        <Search color={colors.ink} size={25} accessible={false} />
        <TextInput
          accessibilityLabel="Tìm bài hát, nghệ sĩ hoặc playlist"
          value={value}
          onChangeText={setValue}
          placeholder="Bạn muốn nghe gì?"
          placeholderTextColor="#585858"
          returnKeyType="search"
          autoCorrect={false}
          onSubmitEditing={() => {
            setQuery(value.trim());
            if (value.trim().length > 1)
              usePlayerStore.getState().addSearch(value.trim());
          }}
          style={styles.input}
        />
        {!!value && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Xóa tìm kiếm"
            onPress={() => setValue("")}
            style={styles.clear}
          >
            <X color={colors.ink} size={21} />
          </Pressable>
        )}
      </View>
      {browsing ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.browse}
        >
          {recent.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.heading}>Tìm kiếm gần đây</Text>
              <View style={styles.recentChips}>
                {recent.slice(0, 5).map((term) => (
                  <Pressable
                    key={term}
                    accessibilityRole="button"
                    onPress={() => setValue(term)}
                    style={({ pressed }) => [
                      styles.recentChip,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Clock3 size={16} color={colors.muted} />
                    <Text style={styles.recentText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <Text accessibilityRole="header" style={styles.heading}>
            Khám phá theo tâm trạng
          </Text>
          <View style={styles.grid}>
            {genres.map((genre, index) => {
              const artwork = home.data?.tracks[index]?.artwork;
              return (
                <Pressable
                  key={genre.query}
                  accessibilityRole="button"
                  accessibilityLabel={`Tìm ${genre.title}`}
                  onPress={() => setValue(genre.query)}
                  style={({ pressed }) => [
                    styles.genre,
                    { backgroundColor: genre.color },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.genreTitle}>{genre.title}</Text>
                  {artwork ? (
                    <Image
                      source={{ uri: artwork }}
                      contentFit="cover"
                      style={styles.genreArt}
                    />
                  ) : (
                    <View style={[styles.genreArt, styles.genreBlank]}>
                      <Music2 size={36} color="#ffffffb0" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : waiting ? (
        <ActivityIndicator
          accessibilityLabel="Đang tìm nhạc"
          color={colors.green}
          style={styles.loading}
        />
      ) : query.length < 2 ? (
        <Text style={styles.message}>Nhập ít nhất 2 ký tự để tìm nhạc.</Text>
      ) : result.isError ? (
        <View style={styles.error}>
          <Text style={styles.heading}>Chưa tìm được nhạc</Text>
          <Text style={styles.secondary}>Kiểm tra kết nối rồi thử lại.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => result.refetch()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={result.data?.tracks ?? []}
          keyExtractor={(track) => track.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.results}
          ListHeaderComponent={
            <Text style={styles.heading}>Kết quả cho “{query}”</Text>
          }
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              active={currentId === item.id}
              onMore={() => showActions(item)}
              onPress={() => {
                const state = usePlayerStore.getState();
                state.addSearch(query);
                state.enqueue(result.data?.tracks ?? []);
                state.setCurrent(item);
                router.push("/player");
              }}
            />
          )}
          ListEmptyComponent={
            !result.data?.artists.length && !result.data?.playlists.length ? (
              <Text style={styles.secondary}>
                Không có kết quả. Thử tên bài hát hoặc nghệ sĩ khác.
              </Text>
            ) : undefined
          }
          ListFooterComponent={
            <View>
              {!!result.data?.artists.length && (
                <Text style={[styles.heading, styles.resultHeading]}>
                  Nghệ sĩ
                </Text>
              )}
              {result.data?.artists.map((artist) => (
                <Pressable
                  key={artist.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/artist/[alias]",
                      params: { alias: artist.alias },
                    })
                  }
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed && styles.pressed,
                  ]}
                >
                  {artist.artwork ? (
                    <Image
                      source={{ uri: artist.artwork }}
                      style={[styles.resultArt, { borderRadius: 28 }]}
                    />
                  ) : (
                    <Music2 color={colors.muted} size={30} />
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{artist.name}</Text>
                    <Text style={styles.secondary}>Nghệ sĩ</Text>
                  </View>
                </Pressable>
              ))}
              {!!result.data?.playlists.length && (
                <Text style={[styles.heading, styles.resultHeading]}>
                  Playlist
                </Text>
              )}
              {result.data?.playlists.map((playlist) => (
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
                    styles.resultRow,
                    pressed && styles.pressed,
                  ]}
                >
                  {playlist.artwork ? (
                    <Image
                      source={{ uri: playlist.artwork }}
                      style={styles.resultArt}
                    />
                  ) : (
                    <Music2 color={colors.muted} size={30} />
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{playlist.title}</Text>
                    <Text style={styles.secondary}>Playlist</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    paddingTop: 20,
    paddingBottom: 26,
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
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.6,
  },
  searchBox: {
    marginHorizontal: 16,
    paddingLeft: 14,
    backgroundColor: colors.white,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
    minHeight: 54,
    paddingVertical: 12,
  },
  clear: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  browse: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 24 },
  heading: {
    color: colors.white,
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 27,
    marginBottom: 16,
    letterSpacing: -0.4,
  },
  recentSection: { marginBottom: 28 },
  recentChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.elevated,
    borderRadius: 24,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  recentText: { color: colors.white, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  genre: {
    width: "47%",
    flexGrow: 1,
    minHeight: 128,
    borderRadius: 8,
    padding: 14,
    overflow: "hidden",
  },
  genreTitle: {
    color: colors.white,
    fontWeight: "800",
    fontSize: 21,
    lineHeight: 27,
    maxWidth: "70%",
    zIndex: 1,
  },
  genreArt: {
    position: "absolute",
    right: -14,
    bottom: -8,
    width: 82,
    height: 82,
    borderRadius: 5,
    transform: [{ rotate: "22deg" }],
  },
  genreBlank: {
    backgroundColor: "#ffffff18",
    alignItems: "center",
    justifyContent: "center",
  },
  results: { padding: 16, paddingTop: 24, paddingBottom: 28 },
  loading: { marginTop: 48 },
  message: { color: colors.muted, fontSize: 15, padding: 24 },
  secondary: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  error: { padding: 24 },
  retry: { minHeight: 48, justifyContent: "center", alignSelf: "flex-start" },
  retryText: { color: colors.green, fontSize: 15, fontWeight: "700" },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    minHeight: 76,
  },
  resultArt: { width: 56, height: 56, borderRadius: 5 },
  resultInfo: { flex: 1, gap: 4 },
  resultTitle: { color: colors.white, fontWeight: "700", fontSize: 16 },
  resultHeading: { marginTop: 26 },
  pressed: { opacity: 0.7 },
});
