import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { useArtworkTheme } from "@/hooks/useArtworkTheme";
import { useActiveMotion } from "@/hooks/useActiveMotion";

export function ArtworkBackdrop({ uri }: { uri: string | null | undefined }) {
  const theme = useArtworkTheme(uri);
  const motion = useActiveMotion();
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessible={false}
    >
      <Animated.View
        key={theme.top}
        entering={motion ? FadeIn.duration(300) : undefined}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={[theme.top, theme.middle, theme.bottom]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {uri ? (
        <Image
          key={uri}
          source={{ uri }}
          blurRadius={70}
          contentFit="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.18 }]}
        />
      ) : null}
      <LinearGradient
        colors={["#00000038", "#101010ed"]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
