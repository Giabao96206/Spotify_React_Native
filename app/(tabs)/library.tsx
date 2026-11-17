import { ServerSettings } from "@/features/settings/ServerSettings";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Heart, Plus, ListMusic } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { TrackRow } from "@/components/music/TrackRow";
export default function Library() {
  const favorites = usePlayerStore((s) => s.favorites);
  const playlists = usePlayerStore((s) => s.playlists);
  const recent = usePlayerStore((s) => s.recent);
  const [name, setName] = useState("");
  const [filter, setFilter] = useState("Liked songs");
  const tracks = filter === "Recently played" ? recent : favorites;
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
        Your library
      </Text>
      <ServerSettings />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>
        {["Liked songs", "Recently played", "Playlists"].map((t) => (
          <Pressable
            key={t}
            onPress={() => setFilter(t)}
            style={{
              padding: 10,
              borderRadius: 24,
              backgroundColor: filter === t ? colors.green : colors.surface,
            }}
          >
            <Text
              style={{
                color: filter === t ? colors.ink : colors.muted,
                fontSize: 12,
              }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      {filter === "Playlists" ? (
        <View>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TextInput
              accessibilityLabel="New playlist name"
              value={name}
              onChangeText={setName}
              placeholder="Name a new playlist"
              placeholderTextColor={colors.dim}
              style={{
                backgroundColor: colors.surface,
                color: colors.white,
                flex: 1,
                padding: 14,
                borderRadius: 12,
              }}
            />
            <Pressable
              accessibilityLabel="Create playlist"
              onPress={() => {
                if (!name.trim()) return;
                usePlayerStore.getState().createPlaylist(name.trim());
                setName("");
              }}
            >
              <Plus color={colors.green} size={26} />
            </Pressable>
          </View>
          {playlists.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({
                  pathname: "/playlist/[id]",
                  params: { id: p.id },
                })
              }
              style={{
                flexDirection: "row",
                gap: 14,
                alignItems: "center",
                paddingVertical: 20,
              }}
            >
              <ListMusic color={colors.mint} />
              <View>
                <Text style={{ color: colors.white, fontWeight: "700" }}>
                  {p.title}
                </Text>
                <Text style={{ color: colors.dim, marginTop: 4 }}>
                  {p.tracks.length} songs
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              onPress={() => {
                const s = usePlayerStore.getState();
                s.enqueue(tracks);
                s.setCurrent(item);
                router.push("/player");
              }}
              onMore={() => usePlayerStore.getState().toggleFavorite(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 80 }}>
              <Heart color={colors.green} size={38} />
              <Text
                style={{
                  color: colors.white,
                  fontSize: 20,
                  fontWeight: "700",
                  marginTop: 20,
                }}
              >
                Make room for your favorites
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 10,
                }}
              >
                Like a song from its menu or the player.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
