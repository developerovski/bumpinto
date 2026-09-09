import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToastStore, type ToastTone } from "../../store/toastStore";
import { colors, radius, shadow, space } from "../../theme";
import { AppText } from "../atoms";

/**
 * Alt orta geri bildirim şeridi (P17 dürtme onayı, P20 kart hatası).
 *
 * Kökte BİR kez mount edilir ve `Stack`ten SONRA gelir — ekranın kendi alt çubuğunun üstünde
 * kalsın. `pointerEvents="box-none"` katman dokunmayı yutmaz: şerit görünürken altındaki
 * düğmeler kullanılabilir olmalı, kullanıcı 4 saniye beklemek zorunda kalmamalı.
 *
 * Çeviri BURADA yapılır: `toastStore` anahtar + parametre taşır, `t`ye erişmez.
 */
export default function ToastHost() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[s.layer, { paddingBottom: insets.bottom + 12 }]}
      accessibilityLiveRegion="polite"
    >
      {toasts.map((toast) => (
        <View key={toast.id} style={[s.strip, TONE[toast.tone]]}>
          <AppText variant="label" style={s.text}>
            {t(toast.messageKey, toast.params)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const TONE: Record<ToastTone, { backgroundColor: string; borderColor: string }> = {
  grass: { backgroundColor: colors.grassWash, borderColor: colors.grass },
  flame: { backgroundColor: colors.flameWash, borderColor: colors.flameDeep },
  neutral: { backgroundColor: colors.card, borderColor: colors.line2 },
};

const s = StyleSheet.create({
  layer: {
    position: "absolute",
    left: space.screenX,
    right: space.screenX,
    bottom: 0,
    gap: 8,
    alignItems: "center",
  },
  strip: {
    maxWidth: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    ...shadow.s2,
  },
  text: { textAlign: "center", color: colors.ink },
});
