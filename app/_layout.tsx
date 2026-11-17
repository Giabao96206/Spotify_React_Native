import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors } from "@/theme/tokens";
import { audioEngine } from "@/services/audio/engine";
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 60000 } },
});
export default function Layout() {
  useEffect(() => audioEngine.start(), []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={client}>
          <StatusBar style="light" />
          <SafeAreaView
            edges={["top"]}
            style={{ flex: 1, backgroundColor: colors.ink }}
          >
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.ink },
              }}
            >
              <Stack.Screen
                name="player"
                options={{
                  presentation: "modal",
                  animation: "slide_from_bottom",
                }}
              />
            </Stack>
          </SafeAreaView>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
