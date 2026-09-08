import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

import LocationDeniedCard from "../organisms/LocationDeniedCard";
import { useLocationStore } from "../../store/locationStore";
import { colors, radius, shadow, size, space } from "../../theme";
import { AppText, Badge, Button, Input } from "../atoms";

/**
 * Artboard P3/P4 (izinli) ve P9 (reddedilmiş) `.loc` alanı — "Sen neredesin?" / "Neredesin?".
 *
 * Yeni buluşma ve Katıl AYNI bileşeni kullanır: iki ekrana ayrı kurtarma yazılırsa biri
 * sessizce eskir (plan41 T2/T3 kuralı).
 *
 * İzin AKIŞI: alan sistem diyaloğunu KENDİ açmaz — önce O3 ön-bilgilendirme sayfasını açar
 * (`/(sheets)/location-consent?next=…`, Play "prominent disclosure"). Sayfa sonucu
 * `locationPermission` parametresiyle geri verir; çağıran ekran onu `adopt()`a bağlar.
 * "Tekrar dene" (O6) doğrudan `request()` çağırır: kullanıcı gerekçeyi zaten okudu.
 */
export default function LocationField(p: {
  title: string;
  /** Ön-ekranın geri döneceği rota (`next` parametresi) — ör. "/sessions/new". */
  next: string;
  /** Çapalı oturumda kendi konumu ZORUNLU DEĞİL: bağlantı yerine bu not basılır. */
  hint?: string;
  /** "…ya da adres yaz" (P3) / "Başka bir şehir ya da adres yaz" (P8). */
  otherLabel?: string;
  /** Adres çözümlenemedi — `join.errGeocode`. */
  error?: string | null;
  onError?: (key: string | null) => void;
}) {
  const { t } = useTranslation();
  const phase = useLocationStore((s) => s.phase);
  const point = useLocationStore((s) => s.point);
  const request = useLocationStore((s) => s.request);
  const fromAddress = useLocationStore((s) => s.fromAddress);

  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  // Adres kutusu ya kullanıcı açtığı için ya da izin kapalı olduğu için görünür.
  const [typing, setTyping] = useState(false);
  const refused = phase === "denied" || phase === "blocked";
  const showAddress = typing || refused || phase === "manual";

  const openPrimer = () =>
    router.push({ pathname: "/(sheets)/location-consent", params: { next: p.next } });

  async function resolveAddress() {
    if (!address.trim()) return;
    setBusy(true);
    p.onError?.(null);
    try {
      const found = await fromAddress(address);
      if (found) setAddress(found.label ?? address);
      else p.onError?.("join.errGeocode");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.field}>
      <AppText variant="label" style={s.label}>
        {p.title}
      </AppText>

      {phase === "granted" && point ? (
        /* `.loc.on` — yeşil yıkama, dolu nokta, "Tamam" rozeti. Basılabilir kalır:
           kullanıcı konumunu tazelemek isteyebilir. */
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("join.locAuto")}
          onPress={() => void request()}
          style={[s.loc, s.locOn]}
        >
          <View style={[s.dot, s.dotOn]}>
            <View style={s.dotInner} />
          </View>
          <View style={s.locText}>
            <AppText variant="h3">{t("join.locAuto")}</AppText>
            <AppText variant="muted" numberOfLines={1}>
              {point.label
                ? t("join.locAutoHint", { label: point.label })
                : t("join.locAutoHintNoLabel")}
            </AppText>
          </View>
          <Badge tone="grass">{t("join.locOk")}</Badge>
        </Pressable>
      ) : refused ? (
        /* O6 — çıkmaz sokak bırakılmaz: Ayarlar ya da adres. Kalıcı rette "Tekrar dene"
           çizilmez (sistem bir daha sormaz, düğme ölü olurdu). */
        <LocationDeniedCard onRetry={() => void request()} canRetry={phase === "denied"} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={phase === "failed" ? t("join.locRetry") : t("join.useMyLocation")}
          onPress={phase === "failed" ? () => void request() : openPrimer}
          style={s.loc}
        >
          <View style={s.dot}>
            <View style={s.dotInner} />
          </View>
          <AppText variant="h3" style={s.locText}>
            {phase === "failed" ? t("join.locRetry") : t("join.useMyLocation")}
          </AppText>
        </Pressable>
      )}

      {phase === "failed" ? (
        <AppText variant="muted" style={s.error}>
          {t("join.errGeolocation")}
        </AppText>
      ) : null}

      {p.hint ? <AppText variant="muted">{p.hint}</AppText> : null}

      {showAddress ? (
        <View style={s.addressRow}>
          <Input
            value={address}
            onChangeText={setAddress}
            onBlur={() => void resolveAddress()}
            autoCorrect={false}
            accessibilityLabel={t("join.addressAria")}
            placeholder={t("join.addressPlaceholder")}
            invalid={!!p.error}
            containerStyle={s.addressInput}
          />
          <Button
            small
            kind="white"
            title={t("common.save")}
            disabled={busy || !address.trim()}
            onPress={() => void resolveAddress()}
            style={s.addressCta}
          />
        </View>
      ) : p.hint ? null : (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={p.otherLabel ?? t("newSession.orAddress")}
          onPress={() => setTyping(true)}
        >
          <AppText variant="muted" style={s.link}>
            {p.otherLabel ?? t("newSession.orAddress")}
          </AppText>
        </Pressable>
      )}

      {p.error ? (
        <AppText variant="muted" style={s.error}>
          {t(p.error)}
        </AppText>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  field: { gap: 8 },
  label: { fontWeight: "600" },
  // `.loc` — hap biçimli, gölgeli satır; 52px yükseklik.
  loc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: size.button,
    paddingHorizontal: space.cardX,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.line2,
    backgroundColor: colors.card,
    ...shadow.s1,
  },
  locOn: { backgroundColor: colors.grassWash, borderColor: "#BFE5CF" },
  locText: { flex: 1, gap: 1, minWidth: 0 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.grassWash,
    alignItems: "center",
    justifyContent: "center",
  },
  dotOn: { backgroundColor: colors.card },
  dotInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.grass },
  link: { color: colors.flameDeep },
  error: { color: colors.flameDeep, fontWeight: "600" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressInput: { flex: 1 },
  addressCta: { width: "auto", flexShrink: 0 },
});
