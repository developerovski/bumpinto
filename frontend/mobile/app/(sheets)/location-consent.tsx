import { ClockCountdownIcon, KeyboardIcon, UsersThreeIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { AppText, Button } from "../../src/components/atoms";
import { REASON_ICON_COLOR, Reason } from "../../src/components/molecules";
import { requestLocationWhenInUse } from "../../src/lib/permissions";
import { space } from "../../src/theme";

/**
 * O3 — konum ÖN-BİLGİLENDİRMESİ (Play "prominent disclosure", Apple 5.1.1).
 *
 * Bu ekran sistem diyaloğunu AÇILIŞTA İSTEMEZ: kullanıcı neden sorulduğunu okumadan
 * diyalogla karşılaşırsa hem mağaza reddi hem kalıcı ret riski doğar. Sistem izni yalnız
 * "Devam et"e basılınca istenir; "Adres yazacağım" hiç istemez.
 *
 * Sonuç çağıran ekrana `locationPermission` parametresiyle döner
 * (`granted` | `denied` | `blocked` | `manual`) — M-7 "Neredesin?" alanı bunu okur.
 */
export default function LocationConsentSheet() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();

  const back = (locationPermission: string) =>
    router.replace({
      pathname: (next as "/") ?? "/",
      params: { locationPermission },
    });

  return (
    <ScrollView
      contentContainerStyle={[s.page, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={s.head}>
        <AppText variant="display">{t("permission.locTitle")}</AppText>
        <AppText variant="body" style={s.body}>
          {t("permission.locBody")}
        </AppText>
      </View>

      <View style={s.reasons}>
        <Reason
          icon={<UsersThreeIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.locWhyApprox")}
          note={t("permission.locWhyApproxCopy")}
        />
        <Reason
          icon={<ClockCountdownIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.locWhyTtl")}
          note={t("permission.locWhyTtlCopy")}
        />
        <Reason
          icon={<KeyboardIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
          title={t("permission.locWhyType")}
          note={t("permission.locWhyTypeCopy")}
        />
      </View>

      <AppText variant="muted" style={s.next}>
        {t("permission.locNext")}
      </AppText>

      <View style={s.actions}>
        <Button
          title={t("permission.locContinue")}
          kind="flame"
          onPress={() => void requestLocationWhenInUse().then(back)}
        />
        <Button
          title={t("permission.locTypeInstead")}
          kind="ghost"
          onPress={() => back("manual")}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { paddingHorizontal: space.screenX, gap: 20 },
  head: { gap: 10 },
  body: { color: undefined },
  reasons: { gap: 16 },
  next: { fontSize: 12 },
  actions: { gap: 10 },
});
