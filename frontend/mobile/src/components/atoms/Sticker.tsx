import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow } from "../../theme";
import AppText from "./AppText";

/** `sun` = sarı (kesin/kesinleşti) · `amber` = süren plan (`.stk.now`, Keşfet POC) · `white` = bekleme. */
type Tone = "sun" | "amber" | "white";

/** `.stk` — el yazısı etiket, -3° eğik. Mutlak konumlanır (çağıran `style` verir). */
export default function Sticker(p: {
  children: ReactNode;
  tone?: Tone;
  /** Metnin solunda glif (süren planın şimşeği). Metnin İÇİNE konmaz — `Badge` ile aynı sebep. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = p.tone ?? "sun";
  return (
    <View style={[s.base, TONE[tone], p.style]}>
      {p.icon}
      <AppText
        variant="hand"
        style={{ fontSize: 16, color: tone === "amber" ? colors.amberInk : colors.ink, transform: [] }}
      >
        {p.children}
      </AppText>
    </View>
  );
}

const TONE: Record<Tone, ViewStyle> = {
  sun: { backgroundColor: colors.sun },
  // Süren damga "kesin" sarısıyla KARIŞMASIN (spec §11.3): amber zemin + koyu amber kenar.
  amber: { backgroundColor: colors.amberWash, borderWidth: 1.5, borderColor: colors.amberInk },
  white: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line2 },
};

const s = StyleSheet.create({
  base: {
    borderRadius: radius.thumb,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: "-3deg" }],
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    ...shadow.s1,
  },
});
