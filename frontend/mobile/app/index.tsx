import * as AppleAuthentication from "expo-apple-authentication";
import { Link, router } from "expo-router";
import { AppleLogoIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, HandNote, Sticker } from "../src/components/atoms";
import MapMark from "../src/components/molecules/MapMark";
import { useAuthStore } from "../src/store/authStore";
import { colors, space } from "../src/theme";

/**
 * Artboard O2 · Giriş — çıkış yapılmış kök.
 *
 * Apple ile Giriş (R-M1) Google ile EŞİT AĞIRLIKTA sunulur: aynı `kind`, aynı yükseklik,
 * hemen altında — Apple 4.8 "eşdeğer görünürlük" şartı. Düğme yalnız Apple'ın kendi
 * `isAvailableAsync()` cevabı olumluysa çizilir (Android'de ve eski iOS'ta hiç görünmez).
 *
 * Yasal linkler uygulama İÇİ okuyuculara gider (`/account/legal/*`): tarayıcıya atmak
 * kullanıcıyı giriş öncesi uygulamadan çıkarırdı. Bu rotalar oturum gerektirmez.
 */
export default function Landing() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const restore = useAuthStore((s) => s.restore);
  const signIn = useAuthStore((s) => s.signIn);
  const signInApple = useAuthStore((s) => s.signInApple);
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleReady, () => setAppleReady(false));
  }, []);

  useEffect(() => {
    if (status === "in") router.replace("/sessions");
  }, [status]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={[
        s.page,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.scene}>
        <MapMark />
        <Sticker style={s.sticker}>{t("landing.sticker")}</Sticker>
      </View>

      <AppText variant="display" style={s.title}>
        <Trans
          i18nKey="landing.title"
          components={[
            <AppText key="0" variant="display" style={{ color: colors.flameDeep }} />,
            <AppText key="1">{"\n"}</AppText>,
          ]}
        />
      </AppText>

      <AppText variant="body" style={s.copy}>
        {t("landing.copy")}
      </AppText>

      <HandNote style={s.hand}>{t("landing.hand")}</HandNote>

      <View style={s.cta}>
        <Button kind="white" title={t("landing.google")} onPress={() => void signIn()} />
        {appleReady ? (
          <Button
            kind="white"
            title={t("landing.apple")}
            onPress={() => void signInApple()}
            icon={<AppleLogoIcon size={18} color={colors.ink} weight="fill" />}
          />
        ) : null}
        {error ? (
          <AppText variant="muted" style={{ color: colors.flameDeep, textAlign: "center" }}>
            {t(error)}
          </AppText>
        ) : null}
        <AppText variant="muted" style={s.terms}>
          <Trans
            i18nKey="landing.legal"
            components={[
              <Link key="0" href="/account/legal/terms" style={s.link} />,
              <Link key="1" href="/account/legal/privacy" style={s.link} />,
            ]}
          />
        </AppText>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: space.screenX, justifyContent: "center" },
  scene: { alignItems: "center", marginBottom: 26 },
  sticker: { position: "absolute", right: 24, top: -6 },
  title: { textAlign: "center" },
  copy: { textAlign: "center", color: colors.ink2, marginTop: 10 },
  hand: { marginTop: 14 },
  cta: { marginTop: 28, gap: 10 },
  terms: { textAlign: "center" },
  link: { color: colors.flameDeep, textDecorationLine: "underline" },
});
