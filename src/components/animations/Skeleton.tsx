import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useActiveMotion } from "@/hooks/useActiveMotion";
export function Skeleton() {
  const motion = useActiveMotion();
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    if (motion)
      opacity.value = withRepeat(withTiming(0.8, { duration: 900 }), -1, true);
    else cancelAnimation(opacity);
    return () => cancelAnimation(opacity);
  }, [motion]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityLabel="Loading music"
      style={[{ flexDirection: "row", gap: 14, paddingVertical: 18 }, style]}
    >
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            width: 138,
            height: 165,
            backgroundColor: "#282828",
            borderRadius: 16,
          }}
        />
      ))}
    </Animated.View>
  );
}
