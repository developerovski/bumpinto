import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "../../theme";
import AppText from "./AppText";

type Tone = "flame" | "grass" | "amber" | "neutral";

/** Metin 12px'in altına İNMEZ (denetim bulgusu: 11px rozet erişilebilir değil). */
export default function Badge(p: {
  children: ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = p.tone ?? "neutral";
  return (
    <View style={[s.base, { backgroundColor: BG[tone] }, p.style]}>
      <AppText variant="num" style={{ fontSize: 12, color: FG[tone] }}>
        {p.children}
      </AppText>
    </View>
  );
}

const BG: Record<Tone, string> = {
  flame: colors.flameWash,
  grass: colors.grassWash,
  amber: colors.amberWash,
  neutral: "#F4EEE6",
};
const FG: Record<Tone, string> = {
  flame: colors.flameDeep,
  grass: colors.grass,
  amber: colors.amberInk,
  neutral: colors.ink2,
};

const s = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
});
