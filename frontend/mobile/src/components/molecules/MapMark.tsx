import { personTint } from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "../../theme";

/**
 * Artboard O2/W2 `.mark` — kesikli halka + katılımcı noktaları + gradyan iğne. SALT DEKORATİF,
 * ekran okuyucudan gizli (web `MapMark` ile aynı karar).
 *
 * Noktalar kişi paletinden (`personTint`) boyanır: "birden çok konumdan türetilmiş merkez"
 * anlamı buradan gelir. `pinOnly` çapalı oturumda kullanılır (M-7) — merkez tek ve sabittir,
 * halka ile noktalar o zaman çizilmez.
 */
export default function MapMark(p: { size?: number; pinOnly?: boolean; muted?: boolean }) {
  const d = p.size ?? 96;
  const dot = Math.max(10, Math.round(d * 0.13));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: d, height: d, alignItems: "center", justifyContent: "center" }}
    >
      {p.pinOnly ? null : (
        <>
          <View
            style={[
              s.ring,
              { width: d, height: d, borderRadius: d / 2, borderColor: colors.line2 },
            ]}
          />
          {DOTS.map(([x, y], i) => (
            <LinearGradient
              key={i}
              colors={[...personTint(i)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                s.dot,
                {
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                  left: d * x - dot / 2,
                  top: d * y - dot / 2,
                },
              ]}
            />
          ))}
        </>
      )}

      <LinearGradient
        colors={p.muted ? [colors.ink3, colors.ink3] : [colors.flame, colors.flameDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.pin, { width: d * 0.3, height: d * 0.3, borderRadius: (d * 0.3) / 2 }]}
      />
    </View>
  );
}

/** Halka üzerinde üç konum (birim kare oranı) — üçgen duruş, artboard yerleşimi. */
const DOTS: readonly (readonly [number, number])[] = [
  [0.14, 0.3],
  [0.86, 0.42],
  [0.42, 0.9],
];

const s = StyleSheet.create({
  ring: { position: "absolute", borderWidth: 2, borderStyle: "dashed" },
  dot: { position: "absolute" },
  pin: {
    borderWidth: 3,
    borderColor: colors.card,
    borderRadius: radius.pill,
  },
});
