import React from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { House, Search, Library } from "lucide-react-native";
import { Pressable, Text } from "react-native";
import { MiniPlayer } from "@/components/music/MiniPlayer";
import { audioEngine } from "@/services/audio/engine";
import { colors } from "@/theme/tokens";
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View style={{ backgroundColor: colors.ink }}>
          <MiniPlayer
            onOpen={() => router.push("/player")}
            onPlay={audioEngine.toggle}
            onNext={audioEngine.next}
          />
          <View
            style={{
              flexDirection: "row",
              paddingTop: 6,
              paddingBottom: Math.max(12, props.insets.bottom),
            }}
          >
            {props.state.routes.map((route, index) => {
              const selected = props.state.index === index;
              const Icon = index === 0 ? House : index === 1 ? Search : Library;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => props.navigateToTab(route.key)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 54,
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 5,
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Icon
                    size={25}
                    color={selected ? colors.white : colors.muted}
                    strokeWidth={selected ? 2.5 : 1.8}
                  />
                  <Text
                    style={{
                      color: selected ? colors.white : colors.muted,
                      fontSize: 11,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {index === 0
                      ? "Trang chủ"
                      : index === 1
                        ? "Tìm kiếm"
                        : "Thư viện"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: {
          backgroundColor: colors.ink,
          borderTopColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.ink },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Library color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
