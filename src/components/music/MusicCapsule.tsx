import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { router } from "expo-router";
import { usePlayerStore } from "@/stores/player";
import { Equalizer } from "./Equalizer";
import { colors } from "@/theme/tokens";
import { useActiveMotion } from "@/hooks/useActiveMotion";
export function MusicCapsule() {
  const current = usePlayerStore((s) => s.current);
  const playing = usePlayerStore((s) => s.isPlaying);
  const [expanded, setExpanded] = useState(false);
  const motion = useActiveMotion();
  if (!current) return null;
  return (
    <Animated.View
      layout={motion ? LinearTransition.springify() : undefined}
      style={{
        backgroundColor: "#17271E",
        borderRadius: 30,
        alignSelf: "center",
        marginTop: 16,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={() => (expanded ? router.push("/player") : setExpanded(true))}
        onLongPress={() => setExpanded(false)}
        style={{
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Equalizer active={playing} compact />
        <Text
          numberOfLines={1}
          style={{
            color: colors.mint,
            fontSize: 12,
            maxWidth: expanded ? 250 : 130,
          }}
        >
          {expanded ? current.title + " · " + current.artist : "Listening now"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
