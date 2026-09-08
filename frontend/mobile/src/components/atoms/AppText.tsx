import { StyleSheet, Text, type TextProps } from "react-native";

import { colors, fonts } from "../../theme";

/** Tipografi tek atomdan çıkar; ekranlarda ham `Text` yasak. */
type Variant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "muted"
  | "label"
  | "over"
  | "hand"
  | "num";

export default function AppText({
  variant = "body",
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[s[variant], style]} />;
}

const s = StyleSheet.create({
  display: {
    fontFamily: fonts.head,
    fontSize: 33,
    lineHeight: 37,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  h1: { fontFamily: fonts.head, fontSize: 26, lineHeight: 30, color: colors.ink, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.headBold, fontSize: 19, color: colors.ink },
  h3: { fontFamily: fonts.headBold, fontSize: 15.5, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  // native.css `.ov` — erişilebilirlik düzeltmesi: ink3 DEĞİL ink2 (2.5:1 → 5.3:1)
  over: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    letterSpacing: 0.08,
    textTransform: "uppercase",
    color: colors.ink2,
  },
  hand: {
    fontFamily: fonts.hand,
    fontSize: 19,
    color: colors.ink2,
    transform: [{ rotate: "-1.5deg" }],
  },
  num: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.ink,
    fontVariant: ["tabular-nums"],
  },
});
