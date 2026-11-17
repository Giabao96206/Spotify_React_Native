import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search, X } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { TrackRow } from "@/components/music/TrackRow";
export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [value, setValue] = useState(params.q || "");
  const [query, setQuery] = useState("");
  const recent = usePlayerStore((s) => s.searches);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value.trim()), 350);
    return () => clearTimeout(timer);
  }, [value]);
  const result = useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) => api.search(query, signal),
    enabled: query.length > 1,
  });
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24 }}>
      <Text
        style={{
          color: colors.white,
          fontSize: 28,
          fontWeight: "800",
          marginVertical: 20,
        }}
      >
        Find your frequency
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          paddingHorizontal: 16,
          gap: 10,
        }}
      >
        <Search color={colors.muted} size={20} />
        <TextInput
          accessibilityLabel="Search music"
          value={value}
          onChangeText={setValue}
          placeholder="Songs, artists, albums"
          placeholderTextColor={colors.dim}
          style={{ flex: 1, height: 54, color: colors.white, fontSize: 15 }}
        />
        {!!value && (
          <Pressable onPress={() => setValue("")}>
            <X color={colors.muted} size={20} />
          </Pressable>
        )}
      </View>
      {!query ? (
        <View style={{ marginTop: 28 }}>
          <Text
            style={{ color: colors.white, fontSize: 18, fontWeight: "700" }}
          >
            Recent searches
          </Text>
          {recent.length ? (
            recent.map((q) => (
              <Pressable
                key={q}
                onPress={() => setValue(q)}
                style={{ paddingVertical: 14 }}
              >
                <Text style={{ color: colors.muted }}>{q}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: colors.muted, marginTop: 12 }}>
              Search the catalog to find your next repeat.
            </Text>
          )}
        </View>
      ) : result.isLoading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : result.isError ? (
        <View style={{ marginTop: 40 }}>
          <Text style={{ color: colors.white }}>Search unavailable</Text>
          <Text style={{ color: colors.muted, marginTop: 10 }}>
            {result.error.message}
          </Text>
          <Pressable onPress={() => result.refetch()}>
            <Text style={{ color: colors.green, marginTop: 12 }}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={{ marginTop: 20 }}
          data={result.data?.tracks || []}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              onPress={() => {
                const s = usePlayerStore.getState();
                s.addSearch(query);
                s.enqueue(result.data?.tracks || []);
                s.setCurrent(item);
                router.push("/player");
              }}
              onMore={() => usePlayerStore.getState().toggleFavorite(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, marginTop: 40 }}>
              No songs found. Try another title or artist.
            </Text>
          }
          ListFooterComponent={
            <View>
              {result.data?.artists.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() =>
                    router.push({
                      pathname: "/artist/[alias]",
                      params: { alias: a.alias },
                    })
                  }
                  style={{ paddingVertical: 16 }}
                >
                  <Text style={{ color: colors.white, fontWeight: "700" }}>
                    {a.name}
                  </Text>
                  <Text style={{ color: colors.dim, marginTop: 4 }}>
                    Artist
                  </Text>
                </Pressable>
              ))}
              {result.data?.playlists.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() =>
                    router.push({
                      pathname: "/playlist/[id]",
                      params: { id: p.id },
                    })
                  }
                  style={{ paddingVertical: 15 }}
                >
                  <Text style={{ color: colors.white }}>{p.title}</Text>
                  <Text style={{ color: colors.dim }}>Playlist</Text>
                </Pressable>
              ))}
            </View>
          }
        />
      )}
    </View>
  );
}
