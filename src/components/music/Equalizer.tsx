import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "@/theme/tokens";
import { useActiveMotion } from "@/hooks/useActiveMotion";
function Bar({
  animate,
  index,
  compact,
}: {
  animate: boolean;
  index: number;
  compact: boolean;
}) {
  const height = useSharedValue(0.35 + index * 0.15);
  useEffect(() => {
    if (animate)
      height.value = withRepeat(
        withSequence(
          withTiming(0.95, { duration: 350 + index * 90 }),
          withTiming(0.25, { duration: 400 + index * 60 }),
        ),
        -1,
      );
    else cancelAnimation(height);
    return () => cancelAnimation(height);
  }, [animate]);
  const style = useAnimatedStyle(() => ({
    height: (compact ? 12 : 18) * height.value,
  }));
  return (
    <Animated.View
      style={[
        {
          width: 3,
          minHeight: 3,
          borderRadius: 3,
          backgroundColor: colors.green,
        },
        style,
      ]}
    />
  );
}
export function Equalizer({
  active = true,
  compact = false,
}: {
  active?: boolean;
  compact?: boolean;
}) {
  const motion = useActiveMotion();
  return (
    <View
      accessibilityLabel={active ? "Playing" : "Paused"}
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        height: compact ? 14 : 20,
        gap: 3,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Bar key={i} index={i} compact={compact} animate={motion && active} />
      ))}
    </View>
  );
}
