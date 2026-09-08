import { LANGUAGES, MODE_LABEL_KEY } from "@bumpinto/shared";
import { router } from "expo-router";
import { CaretRightIcon } from "phosphor-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText, Avatar, Badge, Button, Card } from "../src/components/atoms";
import { ScreenHeader } from "../src/components/molecules";
import { ACTIVITY_ICON } from "../src/icons";
import { useAuthStore } from "../src/store/authStore";
import { useMeStore } from "../src/store/meStore";
import { colors, space } from "../src/theme";

/**
 * Artboard P22 · Profil.
 *
 * "Hesap ve veriler" ve "Destek" satırları KAPALI çizilir — ekranlarını M-5 (mağaza/yasal
 * paketi) getirir. Tasarımdaki satır silinmez, sahte ekran da icat edilmez.
 * Varsayılan KONUM satırı aynı sebeple kapalı: konum seçici (harita + geocode) M-7'ye ait.
 */
export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const signOut = useAuthStore((s) => s.signOut);
  const me = useMeStore((s) => s.me);
  const error = useMeStore((s) => s.error);
  const load = useMeStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const langCode = me?.language ?? i18n.resolvedLanguage;
  const langLabel = LANGUAGES.find((l) => l.code === langCode)?.label ?? t("profile.unset");
  const Activity = me?.defaultActivity ? ACTIVITY_ICON[me.defaultActivity] : null;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("profile.title")}
        backLabel={t("common.close")}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.identity}>
          <Avatar name={me?.displayName ?? ""} tint={0} size="xl" ring />
          <AppText variant="h1" style={s.name}>
            {me?.displayName ?? ""}
          </AppText>
          <AppText variant="muted">{me?.email ?? ""}</AppText>
          <Badge style={{ marginTop: 8 }}>{t("profile.googleLogin")}</Badge>
        </View>

        <View style={s.stats}>
          <Card style={[s.stat, { transform: [{ rotate: "-1.5deg" }] }]}>
            <AppText variant="display">{me?.stats?.sessionsHosted ?? 0}</AppText>
            <AppText variant="muted">{t("profile.hosted")}</AppText>
          </Card>
          <Card style={[s.stat, { transform: [{ rotate: "1.5deg" }] }]}>
            <AppText variant="display">{me?.stats?.friendsMet ?? 0}</AppText>
            <AppText variant="muted">{t("profile.friends")}</AppText>
          </Card>
        </View>

        <AppText variant="over" style={s.over}>
          {t("profile.prefs")}
        </AppText>
        <Card padded={false}>
          <Row first label={t("profile.defaultLocation")} value={me?.defaultLocation?.label} disabled />
          <Row
            label={t("profile.defaultActivity")}
            value={me?.defaultActivity ? t(`activity.${me.defaultActivity}`) : undefined}
            icon={Activity ? <Activity size={18} color={colors.ink2} /> : null}
            onPress={() =>
              router.push({
                pathname: "/(sheets)/prefs",
                params: { field: "activity" },
              })
            }
          />
          <Row
            label={t("profile.defaultTravelMode")}
            value={
              me?.defaultTravelMode ? t(MODE_LABEL_KEY[me.defaultTravelMode].name) : undefined
            }
            onPress={() =>
              router.push({
                pathname: "/(sheets)/prefs",
                params: { field: "travelMode" },
              })
            }
          />
          <Row
            label={t("profile.language")}
            value={langLabel}
            hint={t("profile.languageNote")}
            onPress={() =>
              router.push({
                pathname: "/(sheets)/prefs",
                params: { field: "language" },
              })
            }
          />
        </Card>
        <AppText variant="muted" style={s.retention}>
          {t("profile.retention")}
        </AppText>

        <AppText variant="over" style={s.over}>
          {t("profile.account")}
        </AppText>
        <Card padded={false}>
          {/* Ekranları M-5 getirir; satır kapalı çizilir. */}
          <Row first label={t("shell.account")} hint={t("profile.accountHint")} disabled />
          <Row label={t("legal.support")} disabled />
        </Card>

        {error ? (
          <AppText variant="muted" style={{ color: colors.flameDeep, marginTop: 12 }}>
            {t(error)}
          </AppText>
        ) : null}

        <Button
          kind="danger"
          title={t("profile.logout")}
          onPress={() => {
            void signOut().then(() => router.replace("/"));
          }}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </View>
  );
}

/** Tercih/hesap satırı. `disabled` satır çizilir ama basılamaz (ekranı sonraki plana ait). */
function Row(p: {
  label: string;
  /** Karttaki ilk satır üst çizgi çizmez. */
  first?: boolean;
  value?: string | null;
  hint?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ disabled: !!p.disabled }}
      disabled={p.disabled}
      onPress={p.onPress}
      style={({ pressed }) => [
        s.row,
        p.first ? { borderTopWidth: 0 } : null,
        p.disabled ? { opacity: 0.45 } : null,
        pressed ? { backgroundColor: colors.paper } : null,
      ]}
    >
      {p.icon}
      <View style={{ flex: 1 }}>
        <AppText variant="label">{p.label}</AppText>
        {p.hint ? <AppText variant="muted">{p.hint}</AppText> : null}
      </View>
      <AppText variant="muted" numberOfLines={1} style={s.value}>
        {p.value || t("profile.unset")}
      </AppText>
      {p.disabled ? null : <CaretRightIcon size={16} color={colors.ink3} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: space.screenX, paddingBottom: 32 },
  identity: { alignItems: "center", paddingTop: 8 },
  name: { marginTop: 12 },
  stats: { flexDirection: "row", gap: space.gap, marginTop: 22 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 16 },
  over: { marginTop: 22, marginBottom: 8 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.cardX,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  value: { maxWidth: "45%", textAlign: "right" },
  retention: { marginTop: 12 },
});
