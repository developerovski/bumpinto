import Constants from "expo-constants";
import { router } from "expo-router";
import {
  ChartLineIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  LifebuoyIcon,
  MapTrifoldIcon,
  ScrollIcon,
  ShieldCheckIcon,
  ToggleRightIcon,
  TrashIcon,
} from "phosphor-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Card, Toggle } from "../../src/components/atoms";
import { ScreenHeader, SettingsRow } from "../../src/components/molecules";
import { colors, space } from "../../src/theme";
import { useMeStore } from "../../src/store/meStore";

/**
 * O8 "Hesap ve veriler" — mağaza denetiminin ilk baktığı ekran (R-M3).
 *
 * Dört grup, dokuz satır: yasal belgeler, veri kontrolü, hakkında, tehlikeli bölge.
 * Buradaki tek anahtar (analitik) ANINDA yazar; üç anahtarlı O12 ekranı ise "Kaydet"
 * bekler — ikisi de aynı `setConsents`'i kullanır, iki farklı yazma yolu yoktur.
 */
const ICON = { size: 20, color: colors.ink2, weight: "regular" } as const;

export default function AccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useMeStore((s) => s.me);
  const load = useMeStore((s) => s.load);
  const setConsents = useMeStore((s) => s.setConsents);
  const error = useMeStore((s) => s.error);

  useEffect(() => {
    void load();
  }, [load]);

  // "Verilerimi indir" ucu B-15'te iniyor; bayrak açılana kadar satır devre dışı (K-M5).
  const exportEnabled =
    (Constants.expoConfig?.extra as { exportEnabled?: boolean } | undefined)?.exportEnabled === true;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("account.title")}
        backLabel={t("common.back")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 28 }]}>
        <Group title={t("account.legal")}>
          <SettingsRow
            icon={<ShieldCheckIcon {...ICON} />}
            label={t("legal.privacy")}
            right="chevron"
            onPress={() => router.push("/account/legal/privacy")}
          />
          <SettingsRow
            icon={<FileTextIcon {...ICON} />}
            label={t("legal.terms")}
            right="chevron"
            onPress={() => router.push("/account/legal/terms")}
          />
          <SettingsRow
            icon={<ScrollIcon {...ICON} />}
            label={t("legal.dataRights")}
            right="chevron"
            onPress={() => router.push("/account/legal/kvkk")}
          />
          <SettingsRow
            icon={<ToggleRightIcon {...ICON} />}
            label={t("account.consent")}
            right="chevron"
            onPress={() => router.push("/account/consent")}
          />
        </Group>

        <Group title={t("account.data")}>
          <SettingsRow
            icon={<ChartLineIcon {...ICON} />}
            label={t("account.analytics")}
            note={t("account.analyticsHint")}
            right={
              <Toggle
                value={me?.consents?.analytics === true}
                onValueChange={(analytics) => void setConsents({ analytics })}
                accessibilityLabel={t("account.analytics")}
              />
            }
          />
          <SettingsRow
            icon={<DownloadSimpleIcon {...ICON} />}
            label={t("account.export")}
            note={t("account.exportHint")}
            disabled={!exportEnabled}
            onPress={() => undefined}
          />
        </Group>

        <Group title={t("account.about")}>
          <SettingsRow
            icon={<MapTrifoldIcon {...ICON} />}
            label={t("account.attributions")}
            right="chevron"
            onPress={() => router.push("/account/legal/attributions")}
          />
          <SettingsRow
            icon={<LifebuoyIcon {...ICON} />}
            label={t("account.support")}
            right="chevron"
            onPress={() => router.push("/account/legal/support")}
          />
        </Group>

        <Group title={t("account.danger")}>
          <SettingsRow
            icon={<TrashIcon size={20} color={colors.flameDeep} />}
            label={t("account.delete")}
            note={t("account.deleteHint")}
            tone="danger"
            right="chevron"
            onPress={() => router.push("/account/delete")}
          />
        </Group>

        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Group(p: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.group}>
      <AppText variant="over" style={s.groupTitle}>
        {p.title}
      </AppText>
      <Card padded={false} style={s.card}>
        {p.children}
      </Card>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: 20, paddingTop: 4 },
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 4 },
  card: { overflow: "hidden", paddingVertical: 4 },
  error: { color: colors.flameDeep, textAlign: "center" },
});
