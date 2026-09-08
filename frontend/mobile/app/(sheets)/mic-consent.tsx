import { router } from "expo-router";
import { MicrophoneSlashIcon, MoonIcon, TimerIcon } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button } from "../../src/components/atoms";
import { REASON_ICON_COLOR, Reason } from "../../src/components/molecules";
import { resolveMicConsent } from "../../src/lib/micConsent";
import { requestMicrophone } from "../../src/lib/permissions";
import { space } from "../../src/theme";

/**
 * O7 — mikrofon ÖN-BİLGİLENDİRMESİ. `presentMicConsent()` bunu açar, sonucu bu ekran çözer.
 *
 * Sayfa nasıl kapanırsa kapansın (düğme, geri, kaydırma) söz MUTLAKA çözülür: temizlikte
 * `dismissed` gönderilir, aksi hâlde M-6 dock'u sonsuza kadar bekler.
 */
export default function MicConsentSheet() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const settled = useRef(false);

  const finish = (result: Parameters<typeof resolveMicConsent>[0]) => {
    settled.current = true;
    resolveMicConsent(result);
    router.back();
  };

  useEffect(
    () => () => {
      if (!settled.current) resolveMicConsent("dismissed");
    },
    [],
  );

  return (
    <ScrollView
      contentContainerStyle={[
        s.page,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={s.head}>
        <AppText variant="display">{t("permission.micTitle")}</AppText>
        <AppText variant="muted">{t("permission.micSub")}</AppText>
        <AppText variant="body">{t("permission.micBody")}</AppText>
      </View>

      <View style={s.reasons}>
        <Reason
          icon={<MicrophoneSlashIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.micWhyOff")}
          note={t("permission.micWhyOffCopy")}
        />
        <Reason
          icon={<TimerIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.micWhyEnd")}
          note={t("permission.micWhyEndCopy")}
        />
        <Reason
          icon={<MoonIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.micWhyBg")}
          note={t("permission.micWhyBgCopy")}
        />
      </View>

      <AppText variant="muted" style={s.next}>
        {t("permission.micNext")}
      </AppText>

      <View style={s.actions}>
        <Button
          title={t("permission.notNow")}
          kind="ghost"
          onPress={() => finish("dismissed")}
          style={s.half}
        />
        <Button
          title={t("permission.locContinue")}
          kind="flame"
          onPress={() => void requestMicrophone().then(finish)}
          style={s.half}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.screenX, gap: 20 },
  head: { gap: 8 },
  reasons: { gap: 16 },
  next: { fontSize: 12 },
  actions: { flexDirection: "row", gap: 10 },
  half: { flex: 1, width: undefined },
});
