import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow, size } from "../../theme";
import AppText from "./AppText";
import { useOncePress } from "../../lib/useOncePress";

/** `.btn` b-fl / b-wh / b-gh / b-dg karşılıkları. */
type Kind = "flame" | "white" | "ghost" | "danger";

export default function Button(p: {
  title: string;
  onPress: () => void;
  kind?: Kind;
  disabled?: boolean;
  small?: boolean;
  icon?: ReactNode;
  /** Ekran okuyucuya ek bağlam — ör. listede tekrarlanan "Onayla"nın KİMİN için olduğu. */
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const kind = p.kind ?? "flame";
  // Çift dokunuşta gezinme/yazma İKİ KEZ tetiklenmesin (örnek başına kilit).
  const onPress = useOncePress(p.onPress);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.title}
      accessibilityHint={p.hint}
      accessibilityState={{ disabled: !!p.disabled }}
      onPress={onPress}
      disabled={p.disabled}
      style={({ pressed }) => [
        s.base,
        s[kind],
        { minHeight: p.small ? size.buttonSm : size.button },
        p.disabled ? { opacity: 0.45 } : null,
        pressed ? { transform: [{ scale: 0.97 }] } : null,
        p.style,
      ]}
    >
      {p.icon ? <View style={{ marginRight: 8 }}>{p.icon}</View> : null}
      <AppText
        variant="h3"
        style={[
          { fontSize: 16 },
          kind === "flame" ? { color: "#fff" } : null,
          kind === "ghost" ? { color: colors.flameDeep } : null,
          kind === "danger" ? { color: "#B3261E" } : null,
        ]}
      >
        {p.title}
      </AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: size.button,
    borderRadius: radius.pill,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 22,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  flame: { backgroundColor: colors.flameDeep, ...shadow.s2 },
  white: { backgroundColor: colors.card, borderColor: colors.line2, ...shadow.s1 },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: "#EFC9C2" },
});
