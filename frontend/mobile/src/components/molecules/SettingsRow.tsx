import type { ReactNode } from "react";
import { CaretRightIcon } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { colors, space } from "../../theme";
import { AppText } from "../atoms";
import { useOncePress } from "../../lib/useOncePress";

/**
 * O8 "Hesap ve veriler" satırı. Dokunma hedefi en az 48px (WCAG 2.5.8 / Play erişilebilirlik).
 *
 * `accessibilityLabel` satır ETİKETİDİR; sağ slottaki `Toggle` aynı etiketi alır, böylece
 * ekran okuyucu tek anlamlı ad duyurur.
 */
export default function SettingsRow(p: {
  icon: ReactNode;
  label: string;
  note?: string;
  onPress?: () => void;
  right?: "chevron" | ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  const danger = p.tone === "danger";
  const onPress = useOncePress(p.onPress);
  const body = (
    <>
      <View style={s.icon}>{p.icon}</View>
      <View style={s.text}>
        <AppText variant="label" style={danger ? { color: colors.flameDeep } : undefined}>
          {p.label}
        </AppText>
        {p.note ? <AppText variant="muted">{p.note}</AppText> : null}
      </View>
      <View style={s.right}>
        {p.right === "chevron" ? (
          <CaretRightIcon size={16} color={colors.ink3} weight="bold" />
        ) : (
          p.right
        )}
      </View>
    </>
  );

  /* Yalnız `onPress` varsa düğmedir; Toggle satırı basılabilir DEĞİLDİR (anahtar kendisi ele alır).
     Bu dalda satıra erişilebilirlik ETİKETİ KONMAZ: etiket sağdaki anahtarın üzerindedir ve
     ikisi birden taşırsa ekran okuyucu aynı adı iki kez duyurur (test de iki eşleşme bulur). */
  if (!p.onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: !!p.disabled }}
      disabled={p.disabled}
      onPress={onPress}
      style={({ pressed }) => [s.row, p.disabled ? { opacity: 0.45 } : null, pressed ? s.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: space.rowY,
    paddingHorizontal: space.cardX,
  },
  pressed: { backgroundColor: colors.line },
  icon: { width: 22, alignItems: "center" },
  text: { flex: 1, gap: 1 },
  right: { minWidth: 16, alignItems: "flex-end" },
});
