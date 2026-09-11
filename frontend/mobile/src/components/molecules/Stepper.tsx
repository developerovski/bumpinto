import { MinusIcon, PlusIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, fonts, radius, size } from "../../theme";
import { AppText } from "../atoms";

/**
 * Keşfet POC P3/P3a `.stp` — `−  4  +` sayaç (44px hücreler, ortada 52px sayı).
 *
 * Sınırda düğme KAPALI GÖRÜNÜR (`accessibilityState.disabled`) ama `disabled` DEĞİLDİR: kapanan
 * düğme ekran okuyucu odağını yerinden oynatır ve sınıra dayanan kullanıcı yerini kaybeder (web
 * `Stepper`'daki `aria-disabled` kararının RN karşılığı). Basış hiçbir şey yapmaz; değer sessizce
 * kırpılmaz. Sayı canlı bölgedir — değişince okunur.
 */
export default function Stepper(p: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  /** Sayının erişilebilir adı (görünür başlıkla aynı metin). */
  label: string;
  decLabel: string;
  incLabel: string;
}) {
  const atMin = p.value <= p.min;
  const atMax = p.value >= p.max;
  return (
    <View style={s.box}>
      <Cell
        label={p.decLabel}
        off={atMin}
        onPress={() => {
          if (!atMin) p.onChange(p.value - 1);
        }}
        icon={<MinusIcon size={16} color={colors.ink} weight="bold" />}
      />
      <View style={s.num}>
        <AppText
          accessibilityLabel={`${p.label}: ${p.value}`}
          accessibilityLiveRegion="polite"
          style={s.numText}
        >
          {p.value}
        </AppText>
      </View>
      <Cell
        label={p.incLabel}
        off={atMax}
        onPress={() => {
          if (!atMax) p.onChange(p.value + 1);
        }}
        icon={<PlusIcon size={16} color={colors.ink} weight="bold" />}
      />
    </View>
  );
}

function Cell(p: { label: string; off: boolean; onPress: () => void; icon: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: p.off }}
      onPress={p.onPress}
      style={({ pressed }) => [
        s.cell,
        p.off ? { opacity: 0.4 } : null,
        pressed && !p.off ? { backgroundColor: colors.paper } : null,
      ]}
    >
      {p.icon}
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.line2,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    overflow: "hidden",
    flexShrink: 0,
  },
  cell: { width: size.buttonSm, height: size.buttonSm, alignItems: "center", justifyContent: "center" },
  num: {
    minWidth: 52,
    height: size.buttonSm,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  numText: { fontFamily: fonts.headBold, fontSize: 18, color: colors.ink },
});
