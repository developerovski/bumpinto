import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow } from "../../theme";
import AppText from "./AppText";

/** `.stk` — el yazısı etiket, -3° eğik, sarı zemin. Mutlak konumlanır (çağıran `style` verir). */
export default function Sticker(p: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.base, p.style]}>
      <AppText variant="hand" style={{ fontSize: 16, color: colors.ink, transform: [] }}>
        {p.children}
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    backgroundColor: colors.sun,
    borderRadius: radius.thumb,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: "-3deg" }],
    alignSelf: "flex-start",
    ...shadow.s1,
  },
});
