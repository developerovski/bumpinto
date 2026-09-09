import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { AppText } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { webBase } from "../../src/lib/api";
import { goBackOr } from "../../src/lib/nav";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, fonts, space } from "../../src/theme";

/**
 * Artboard P6 — "QR göster". Masadaki arkadaşa telefonu uzatmak, linki WhatsApp'tan
 * göndermekten hızlı.
 *
 * QR HER ZAMAN `${webBase}/j/${slug}` taşır (kodu değil): üçüncü taraf bir kamera
 * uygulaması da okuyabilsin ve uygulaması olmayan kişi tarayıcıda açsın. Kod satırı
 * altında ayrıca YAZILI durur — QR okumayan telefonda elle girilebilsin.
 */
export default function QrSheet() {
  const { t } = useTranslation();
  const { slug = "" } = useLocalSearchParams<{ slug?: string }>();
  const joinCode = useSessionStore((s) => s.view?.joinCode);
  const url = `${webBase}/j/${slug}`;

  return (
    <View style={s.sheet}>
      <ScreenHeader
        title={t("code.qrTitle")}
        backLabel={t("common.close")}
        onBack={() => goBackOr(slug ? `/s/${slug}` : "/sessions")}
      />
      <View style={s.body}>
        <View style={s.frame} accessibilityLabel={t("code.qrTitle")}>
          <QRCode value={url} size={240} backgroundColor="#FFFFFF" color={colors.ink} />
        </View>
        <AppText variant="muted" style={s.hint}>
          {t("code.qrHint")}
        </AppText>
        {/* Kod yalnız üyeye gelir; gelmezse satır çizilmez — uydurma bir kod basılmaz. */}
        {joinCode ? <AppText style={s.code}>{joinCode}</AppText> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { flex: 1, alignItems: "center", paddingHorizontal: space.screenX, gap: 16, paddingTop: 12 },
  frame: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.line2,
  },
  hint: { textAlign: "center" },
  code: { fontFamily: fonts.head, fontSize: 30, letterSpacing: 2, color: colors.ink },
});
