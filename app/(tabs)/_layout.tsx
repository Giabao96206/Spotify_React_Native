import React from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { Compass, Search, Library } from "lucide-react-native";
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
              paddingTop: 10,
              paddingBottom: Math.max(12, props.insets.bottom),
              borderTopWidth: 1,
              borderTopColor: colors.line,
            }}
          >
            {props.state.routes.map((route, index) => {
              const selected = props.state.index === index;
              const Icon =
                index === 0 ? Compass : index === 1 ? Search : Library;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => props.navigateToTab(route.key)}
                  style={{ flex: 1, alignItems: "center", gap: 5 }}
                >
                  <Icon
                    size={22}
                    color={selected ? colors.green : colors.dim}
                  />
                  <Text
                    style={{
                      color: selected ? colors.white : colors.dim,
                      fontSize: 11,
                    }}
                  >
                    {index === 0 ? "Home" : index === 1 ? "Search" : "Library"}
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
          tabBarIcon: ({ color, size }) => (
            <Compass color={color} size={size} />
          ),
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
