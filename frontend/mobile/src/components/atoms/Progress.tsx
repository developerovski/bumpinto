import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "../../theme";

/** 6px ilerleme çubuğu. `value` 0–1 aralığına kırpılır. */
export default function Progress(p: {
  value: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(p.value) ? p.value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={p.label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[s.track, p.style]}
    >
      <View style={[s.fill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: "hidden",
    width: "100%",
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.flame },
});
