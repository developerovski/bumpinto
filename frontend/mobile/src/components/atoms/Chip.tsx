import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, size } from "../../theme";
import AppText from "./AppText";

/** Seçilebilir etiket. Dokunma hedefi 44px'in altına inmez (GUIDE kural 4). */
export default function Chip(p: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  on?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ selected: !!p.on, disabled: !!p.disabled }}
      onPress={p.onPress}
      disabled={p.disabled}
      style={({ pressed }) => [
        s.base,
        p.on ? s.on : null,
        p.disabled ? { opacity: 0.45 } : null,
        pressed ? { transform: [{ scale: 0.97 }] } : null,
        p.style,
      ]}
    >
      {p.icon ? <View style={{ marginRight: 7 }}>{p.icon}</View> : null}
      <AppText variant="label" style={p.on ? { color: colors.flameDeep } : null}>
        {p.label}
      </AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: size.buttonSm,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line2,
  },
  on: { borderColor: colors.flameDeep, backgroundColor: colors.flameWash },
});
