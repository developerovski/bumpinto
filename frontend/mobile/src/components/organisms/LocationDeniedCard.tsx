import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import { openAppSettings } from "../../lib/permissions";
import { colors } from "../../theme";
import { AppText, Button, Card } from "../atoms";

/**
 * O6 — konum reddedildikten sonraki KURTARMA. Çıkmaz sokak bırakmak mağaza reddi sebebidir:
 * kullanıcı ya Ayarlar'dan izni açar ya adres yazarak devam eder.
 *
 * `accessibilityRole="alert"` ile ekran okuyucu kartı belirdiği anda okur.
 */
export default function LocationDeniedCard(p: {
  onRetry: () => void;
  /** Sistem BİR DAHA SORMAYACAKSA (kalıcı ret) "Tekrar dene" hiçbir şey yapmaz — düğme
      çizilmez, tek çıkış Ayarlar kalır. Ölü düğme kullanıcıyı çıkmaza sokar. */
  canRetry?: boolean;
}) {
  const { t } = useTranslation();
  const canRetry = p.canRetry ?? true;
  return (
    <Card tone="amber" style={s.card}>
      <View accessibilityRole="alert" style={s.body}>
        <AppText variant="h3">{t("permission.deniedTitle")}</AppText>
        <AppText variant="muted">{t("permission.deniedCopy")}</AppText>
      </View>
      <View style={s.row}>
        <Button
          title={t("permission.openSettings")}
          kind="white"
          small
          onPress={() => void openAppSettings()}
          style={s.half}
        />
        {canRetry ? (
          <Button
            title={t("permission.retry")}
            kind="ghost"
            small
            onPress={p.onRetry}
            style={s.half}
          />
        ) : null}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.amberWash, gap: 12 },
  body: { gap: 4 },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1, width: undefined },
});
