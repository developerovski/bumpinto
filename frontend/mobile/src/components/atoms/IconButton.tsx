import type { ReactNode } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow, size } from "../../theme";
import { useOncePress } from "../../lib/useOncePress";

/**
 * 40×40 daire. Görsel 40, dokunma hedefi `hitSlop` ile 52 (GUIDE kural 4:
 * "dokunma hedefi asla 44px altına inmez").
 */
export default function IconButton(p: {
  icon: ReactNode;
  onPress: () => void;
  label: string;
  kind?: "solid" | "ghost";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const kind = p.kind ?? "solid";
  const onPress = useOncePress(p.onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: !!p.disabled }}
      onPress={onPress}
      disabled={p.disabled}
      hitSlop={6}
      style={({ pressed }) => [
        s.base,
        kind === "solid" ? s.solid : s.ghost,
        p.disabled ? { opacity: 0.45 } : null,
        pressed ? { transform: [{ scale: 0.94 }] } : null,
        p.style,
      ]}
    >
      {p.icon}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  solid: { backgroundColor: colors.card, borderColor: colors.line2, ...shadow.s1 },
  ghost: { backgroundColor: "transparent" },
});
