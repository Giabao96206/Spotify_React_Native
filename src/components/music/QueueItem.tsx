import React from "react";
import { Pressable, View } from "react-native";
import { ArrowUp, ArrowDown, X } from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Track } from "@/types/music";
import { usePlayerStore } from "@/stores/player";
import { colors } from "@/theme/tokens";
import { TrackRow } from "./TrackRow";
export function QueueItem({ track, index }: { track: Track; index: number }) {
  const currentId = usePlayerStore((s) => s.current?.id);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const remove = () => usePlayerStore.getState().remove(track.id);
  const move = (distance: number) =>
    usePlayerStore.getState().move(index, Math.round(distance / 72));
  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      x.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 90) runOnJS(remove)();
    })
    .onFinalize(() => {
      x.value = withSpring(0);
    });
  const drag = Gesture.Pan()
    .activateAfterLongPress(300)
    .onUpdate((e) => {
      y.value = e.translationY;
    })
    .onEnd((e) => runOnJS(move)(e.translationY))
    .onFinalize(() => {
      y.value = withSpring(0);
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
    zIndex: Math.abs(y.value) > 0 ? 2 : 0,
  }));
  return (
    <GestureDetector gesture={Gesture.Race(swipe, drag)}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.ink,
          },
          style,
        ]}
      >
        <View style={{ flex: 1 }}>
          <TrackRow
            track={track}
            active={track.id === currentId}
            onPress={() => usePlayerStore.getState().setCurrent(track)}
          />
        </View>
        <Pressable
          accessibilityLabel="Move earlier"
          onPress={() => usePlayerStore.getState().move(index, -1)}
        >
          <ArrowUp size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityLabel="Move later"
          onPress={() => usePlayerStore.getState().move(index, 1)}
        >
          <ArrowDown size={18} color={colors.muted} />
        </Pressable>
        <Pressable accessibilityLabel="Remove from queue" onPress={remove}>
          <X size={18} color={colors.muted} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}
