import React, { useEffect } from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useActiveMotion } from "@/hooks/useActiveMotion";
import { usePlayerStore } from "@/stores/player";
export function FloatingArtwork({
  uri,
  size,
}: {
  uri: string | null;
  size: number;
}) {
  const motion = useActiveMotion();
  const playing = usePlayerStore((s) => s.isPlaying);
  const offset = useSharedValue(0);
  useEffect(() => {
    if (motion && playing)
      offset.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 2600 }),
          withTiming(0, { duration: 2600 }),
        ),
        -1,
      );
    else cancelAnimation(offset);
    return () => cancelAnimation(offset);
  }, [motion, playing]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));
  return (
    <Animated.View style={style}>
      {uri ? (
        <Image
          accessibilityLabel="Album artwork"
          source={{ uri }}
          transition={motion ? 300 : 0}
          contentFit="cover"
          style={{ width: size, height: size, borderRadius: 20 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: 20,
            backgroundColor: "#263A2E",
            justifyContent: "center",
          }}
        >
          <Text style={{ textAlign: "center", fontSize: 90, color: "#A9FFB8" }}>
            ♪
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
