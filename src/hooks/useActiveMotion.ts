import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
export function useActiveMotion() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => sub.remove();
  }, []);
  return active && !reduced;
}
