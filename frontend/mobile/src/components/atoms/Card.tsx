import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow, space } from "../../theme";

type Tone = "flame" | "amber" | "grass";

export default function Card(p: {
  children: ReactNode;
  tone?: Tone;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const padded = p.padded ?? true;
  return (
    <View
      style={[
        s.base,
        padded ? { padding: space.cardX } : null,
        p.tone ? { borderColor: BORDER[p.tone], borderWidth: 1.5 } : null,
        p.style,
      ]}
    >
      {p.children}
    </View>
  );
}

const BORDER: Record<Tone, string> = {
  flame: colors.flameDeep,
  amber: colors.amber,
  grass: colors.grass,
};

const s = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.s1,
  },
});
