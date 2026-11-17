import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { router } from "expo-router";
import { colors } from "@/theme/tokens";
import { usePlayerStore } from "@/stores/player";
import { QueueItem } from "@/components/music/QueueItem";
export default function Queue() {
  const queue = usePlayerStore((s) => s.queue);
  return (
    <View style={{ flex: 1, backgroundColor: colors.ink, padding: 24 }}>
      <Pressable onPress={() => router.back()}>
        <ArrowLeft color={colors.white} />
      </Pressable>
      <Text
        style={{
          color: colors.white,
          fontSize: 28,
          fontWeight: "800",
          marginVertical: 24,
        }}
      >
        Your queue
      </Text>
      <Text style={{ color: colors.muted, marginBottom: 18 }}>
        Hold to reorder. Swipe to remove.
      </Text>
      <FlatList
        data={queue}
        keyExtractor={(t) => t.id}
        ListEmptyComponent={
          <Text style={{ color: colors.muted }}>
            Play a song to start a queue.
          </Text>
        }
        renderItem={({ item, index }) => (
          <QueueItem track={item} index={index} />
        )}
      />
    </View>
  );
}
