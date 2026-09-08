import { router } from "expo-router";
import { useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, HandNote, Sticker } from "../src/components/atoms";
import MapMark from "../src/components/molecules/MapMark";
import { webBase } from "../src/lib/api";
import { useAuthStore } from "../src/store/authStore";
import { colors, space } from "../src/theme";

/**
 * Artboard O2 · Giriş — çıkış yapılmış kök.
 *
 * Apple düğmesi (R-M1) burada YOK: mağaza/yasal paketi M-5'e ait, orada `landing.apple`
 * anahtarıyla eklenir. İki planda iki farklı düğme doğmasın diye burada çizilmez.
 */
export default function Landing() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const restore = useAuthStore((s) => s.restore);
  const signIn = useAuthStore((s) => s.signIn);

  useEffect(() => {
    void restore();
  }, [restore]);

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
        {error ? (
          <AppText variant="muted" style={{ color: colors.flameDeep, textAlign: "center" }}>
            {t(error)}
          </AppText>
        ) : null}
        <AppText variant="muted" style={s.terms}>
          <Trans
            i18nKey="landing.terms"
            components={[
              <AppText
                key="0"
                variant="muted"
                style={{ color: colors.flameDeep, textDecorationLine: "underline" }}
                onPress={() => void Linking.openURL(`${webBase}/terms`)}
              />,
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
});
