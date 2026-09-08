import { LANGUAGES, MODE_LABEL_KEY } from "@bumpinto/shared";
import { router } from "expo-router";
import {
  CaretRightIcon,
  GlobeIcon,
  GoogleLogoIcon,
  LifebuoyIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SignOutIcon,
} from "phosphor-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Badge, Button, Card } from "../src/components/atoms";
import { ScreenHeader } from "../src/components/molecules";
import { LinearGradient } from "expo-linear-gradient";

import { ACTIVITY_ICON, MODE_ICON } from "../src/icons";
import { useAuthStore } from "../src/store/authStore";
import { useMeStore } from "../src/store/meStore";
import { colors, space } from "../src/theme";

/**
 * Artboard P22 · Profil.
 *
 * "Hesap ve veriler" ve "Destek" satırları M-5'te açıldı (`app/account/*`).
 * Varsayılan KONUM satırı hâlâ kapalı: konum seçici (harita + geocode) M-7'ye ait.
 */
const ICON = { size: 17, color: colors.ink2 } as const;

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
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
  // EBIKE iki glif basar; satır ikonu olarak ilki yeter.
  const Mode = me?.defaultTravelMode ? MODE_ICON[me.defaultTravelMode][0] : null;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={t("profile.title")}
        backLabel={t("common.close")}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={s.body}>
        {/* Artboard P22: avatar → 10px → (ad · e-posta · rozet) bloğu, aralarında 3px.
            Başlık `h2`; `h1` (26px) tasarımdakinin bir kademe üstüydü. */}
        <View style={s.identity}>
          <Avatar name={me?.displayName ?? ""} tint={0} size="xl" ring />
          <View style={s.identityText}>
            <AppText variant="h2">{me?.displayName ?? ""}</AppText>
            <AppText variant="muted">{me?.email ?? ""}</AppText>
            {/* `Badge` tabanında `alignSelf: "flex-start"` var — ebeveynin ortalamasını
                eziyordu, burada açıkça geri alınır. */}
            <Badge
              style={s.loginBadge}
              icon={<GoogleLogoIcon size={13} color={colors.ink2} weight="bold" />}
            >
              {t("profile.googleLogin")}
            </Badge>
          </View>
        </View>

        <View style={s.stats}>
          <Card style={[s.stat, { transform: [{ rotate: "-1deg" }] }]}>
            <AppText variant="display" style={s.statNum}>{me?.stats?.sessionsHosted ?? 0}</AppText>
            <AppText variant="muted">{t("profile.hosted")}</AppText>
          </Card>
          <Card style={[s.stat, { transform: [{ rotate: "1deg" }] }]}>
            <AppText variant="display" style={s.statNum}>{me?.stats?.friendsMet ?? 0}</AppText>
            <AppText variant="muted">{t("profile.friends")}</AppText>
          </Card>
        </View>

        <AppText variant="over" style={s.over}>
          {t("profile.prefs")}
        </AppText>
        <Card padded={false}>
          <Row
            first
            label={t("profile.defaultLocation")}
            value={me?.defaultLocation?.label}
            icon={<MapPinIcon {...ICON} />}
            disabled
          />
          <Row
            label={t("profile.defaultActivity")}
            value={me?.defaultActivity ? t(`activity.${me.defaultActivity}`) : undefined}
            icon={Activity ? <Activity {...ICON} /> : <MapPinIcon {...ICON} />}
            onPress={() =>
              router.push({
                pathname: "/(sheets)/prefs",
                params: { field: "activity" },
              })
            }
          />
          <Row
            label={t("profile.defaultTravelMode")}
            icon={Mode ? <Mode {...ICON} /> : <GlobeIcon {...ICON} />}
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
            icon={<GlobeIcon {...ICON} />}
            value={`${langLabel} · ${t("profile.languageNote")}`}
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
          <Row
            first
            nav
            icon={<ShieldCheckIcon {...ICON} />}
            label={t("shell.account")}
            hint={t("profile.accountHint")}
            onPress={() => router.push("/account")}
          />
          <Row
            nav
            icon={<LifebuoyIcon {...ICON} />}
            label={t("legal.support")}
            onPress={() => router.push("/account/legal/support")}
          />
        </Card>

        {error ? (
          <AppText variant="muted" style={{ color: colors.flameDeep, marginTop: 12 }}>
            {t(error)}
          </AppText>
        ) : null}

      </ScrollView>

      {/* Artboard P22 `.fade` + `.cta` — çıkış SABİT çubukta; kaydırma içindeyken jest
          çubuğunun altında kalıyordu (P2 ile aynı hata). */}
      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 64 }]}
        pointerEvents="none"
      />
      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          kind="danger"
          title={t("profile.logout")}
          icon={<SignOutIcon size={18} color={colors.flameDeep} />}
          onPress={() => {
            void signOut().then(() => router.replace("/"));
          }}
        />
      </View>
    </View>
  );
}

/** Tercih/hesap satırı. `disabled` satır çizilir ama basılamaz (ekranı sonraki plana ait). */
function Row(p: {
  label: string;
  /** Karttaki ilk satır üst çizgi çizmez. */
  first?: boolean;
  value?: string | null;
  /** Değer TAŞIMAYAN gezinme satırı: sağdaki değer yuvası hiç çizilmez. Aksi hâlde
      "Hesap ve veriler" gibi satırlar ayar taşıyormuş gibi "Belirlenmedi" gösterirdi. */
  nav?: boolean;
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
      {/* Artboard `.srow.st .ic` — 32px kum kutu, 10px yarıçap, 17px glif. */}
      <View style={s.chip}>{p.icon}</View>
      <View style={s.rowText}>
        <AppText variant="label">{p.label}</AppText>
        {/* Değer ETİKETİN ALTINDA (artboard) — sağa yaslanınca uzun değerler kırpılıyordu. */}
        {p.nav ? null : (
          <AppText variant="muted" numberOfLines={1}>
            {p.value || t("profile.unset")}
          </AppText>
        )}
        {p.hint ? <AppText variant="muted">{p.hint}</AppText> : null}
      </View>
      {p.disabled ? null : <CaretRightIcon size={16} color={colors.ink3} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  // Alt boşluk = sabit CTA çubuğunun yüksekliği.
  body: { paddingHorizontal: space.screenX, paddingBottom: 84 },
  identity: { alignItems: "center", paddingTop: 6, paddingBottom: 2, gap: 10 },
  identityText: { alignItems: "center", gap: 3 },
  loginBadge: { alignSelf: "center", marginTop: 2 },
  stats: { flexDirection: "row", gap: 10, marginTop: 14 },
  stat: { flex: 1, alignItems: "center", paddingVertical: 14 },
  statNum: { fontSize: 28, lineHeight: 32 },
  over: { marginTop: 14, marginBottom: 8 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.cardX,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  // Ayırıcı artboard'da 16px içeriden başlar; satır kutusunun tamamını kesmez.
  chip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, backgroundColor: colors.paper },
  retention: { marginTop: 12 },
});
