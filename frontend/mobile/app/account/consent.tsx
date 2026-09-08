import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card, Toggle } from "../../src/components/atoms";
import { ScreenHeader } from "../../src/components/molecules";
import { colors, space } from "../../src/theme";
import { useMeStore } from "../../src/store/meStore";

/**
 * O12 "Açık rıza tercihlerin" (R-M5) — KVKK m.5/1 açık rıza yüzeyi.
 *
 * Yerel durum ekranda tutulur ve "Kaydet"e kadar SUNUCUYA YAZILMAZ: üç anahtarı tek tek
 * yazmak, kullanıcı vazgeçtiğinde yarım kaydedilmiş bir rıza bırakırdı. O8'deki tekil
 * anahtar ise anında yazar; ikisi de AYNI `setConsents`'i kullanır.
 */
type Draft = { location: boolean; microphone: boolean; analytics: boolean };

export default function ConsentScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const me = useMeStore((s) => s.me);
  const load = useMeStore((s) => s.load);
  const setConsents = useMeStore((s) => s.setConsents);
  const error = useMeStore((s) => s.error);
  /* Sunucu değeri state'e KOPYALANMAZ; yalnız kullanıcının dokunduğu anahtarlar tutulur ve
     çizim sırasında üstüne bindirilir. Kopyalama bir efekt gerektirir, efekt de sunucu
     tazelemesiyle kullanıcının seçimini ezme riskini getirirdi. */
  const [touched, setTouched] = useState<Partial<Draft>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const server = me?.consents;
  const value: Draft = {
    location: touched.location ?? server?.location === true,
    microphone: touched.microphone ?? server?.microphone === true,
    analytics: touched.analytics ?? server?.analytics === true,
  };
  const set = (patch: Partial<Draft>) => setTouched((prev) => ({ ...prev, ...patch }));

  const stamp = me?.consents?.updatedAt
    ? t("consent.granted", {
        date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(me.consents.updatedAt)),
        version: me.consents.version ?? "1.0",
      })
    : t("consent.never");

  const save = async () => {
    setBusy(true);
    const ok = await setConsents(value);
    setBusy(false);
    if (ok) router.back();
  };

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("consent.title")}
        backLabel={t("common.back")}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: insets.bottom + 20 }]}>
        <AppText variant="muted">{t("consent.intro")}</AppText>

        <Card padded={false} style={s.card}>
          <Row
            label={t("consent.location")}
            note={t("consent.locationHint")}
            value={value.location}
            onChange={(location) => set({ location })}
          />
          <View style={s.divider} />
          <Row
            label={t("consent.microphone")}
            note={t("consent.microphoneHint")}
            value={value.microphone}
            onChange={(microphone) => set({ microphone })}
          />
          <View style={s.divider} />
          <Row
            label={t("consent.analytics")}
            note={t("consent.analyticsHint")}
            value={value.analytics}
            onChange={(analytics) => set({ analytics })}
          />
        </Card>

        <AppText variant="muted">{stamp}</AppText>
        <AppText variant="muted">{t("consent.locationOff")}</AppText>

        <Button
          kind="ghost"
          small
          title={t("consent.readDataRights")}
          onPress={() => router.push("/account/legal/kvkk")}
        />

        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </ScrollView>
      <View style={[s.cta, { paddingBottom: insets.bottom + 10 }]}>
        <Button title={t("common.save")} disabled={busy || !server} onPress={() => void save()} />
      </View>
    </View>
  );
}

function Row(p: {
  label: string;
  note: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowText}>
        <AppText variant="label">{p.label}</AppText>
        <AppText variant="muted">{p.note}</AppText>
      </View>
      <Toggle value={p.value} onValueChange={p.onChange} accessibilityLabel={p.label} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, gap: 12, paddingTop: 4 },
  card: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: space.rowY,
    paddingHorizontal: space.cardX,
  },
  rowText: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.cardX },
  cta: { paddingHorizontal: space.screenX, paddingTop: 8 },
  error: { color: colors.flameDeep },
});
