import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadow, size } from "../../theme";
import AppText from "./AppText";

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: ReactNode };

/** `.seg` / `.f-seg.icn` — seçilide beyaz kabarcık. */
export default function Segmented<T extends string>(p: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View accessibilityRole="tablist" style={[s.track, p.style]}>
      {p.options.map((o) => {
        const on = o.value === p.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => p.onChange(o.value)}
            style={[s.item, on ? s.on : null]}
          >
            {o.icon ? <View style={{ marginRight: 6 }}>{o.icon}</View> : null}
            <AppText variant="label" style={on ? { color: colors.ink } : { color: colors.ink2 }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: colors.track,
    borderRadius: radius.pill,
    padding: 4,
  },
  item: {
    flex: 1,
    minHeight: size.buttonSm - 8,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  on: { backgroundColor: colors.card, ...shadow.s1 },
});
