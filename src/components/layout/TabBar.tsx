import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Compass, Library, Search } from "lucide-react-native";
import { colors } from "@/theme/tokens";
export function TabBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  const tabs = [
    ["home", "Home", Compass],
    ["search", "Search", Search],
    ["library", "Library", Library],
  ] as const;
  return (
    <View style={styles.bar}>
      {tabs.map(([key, label, Icon]) => (
        <Pressable key={key} onPress={() => onChange(key)} style={styles.item}>
          <Icon
            size={21}
            color={active === key ? colors.white : colors.dim}
            strokeWidth={active === key ? 2.4 : 1.7}
          />
          <Text style={[styles.label, active === key && styles.active]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    height: 78,
    paddingBottom: 12,
    paddingTop: 9,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.ink,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  item: { width: 80, alignItems: "center", gap: 5 },
  label: { color: colors.dim, fontSize: 11, fontWeight: "600" },
  active: { color: colors.white },
});
