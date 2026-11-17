import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { TrackRow } from "@/components/music/TrackRow";
export default function Artist() {
  const { alias } = useLocalSearchParams<{ alias: string }>();
  const query = useQuery({
    queryKey: ["artist", alias],
    queryFn: ({ signal }) => api.artist(alias, signal),
  });
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24 }}>
      <Pressable onPress={() => router.back()}>
        <ArrowLeft color={colors.white} />
      </Pressable>
      <FlatList
        data={query.data?.tracks || []}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View style={{ marginVertical: 24 }}>
            {query.data?.artwork && (
              <Image
                source={{ uri: query.data.artwork }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  alignSelf: "center",
                }}
              />
            )}
            <Text
              style={{
                color: colors.white,
                fontWeight: "800",
                fontSize: 30,
                marginTop: 20,
              }}
            >
              {query.data?.name || alias}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 8 }}>
              Songs and releases
            </Text>
            {query.isLoading && <ActivityIndicator color={colors.green} />}
            {query.isError && (
              <Text style={{ color: colors.coral }}>{query.error.message}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TrackRow
            track={item}
            onMore={() => {}}
            onPress={() => {
              const s = usePlayerStore.getState();
              s.enqueue(query.data?.tracks || []);
              s.setCurrent(item);
              router.push("/player");
            }}
          />
        )}
      />
    </View>
  );
}
