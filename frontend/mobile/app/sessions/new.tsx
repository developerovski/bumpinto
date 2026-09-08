import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { MapPinIcon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Input, Segmented } from "../../src/components/atoms";
import {
  ActivityPicker,
  LocationField,
  ScreenHeader,
  TravelModeField,
} from "../../src/components/molecules";
import MapPickerSheet from "../../src/components/organisms/MapPickerSheet";
import { api, rememberParticipantToken } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { useLocationStore, type PrimerOutcome } from "../../src/store/locationStore";
import { MAX_ACTIVITIES, useNewSessionStore } from "../../src/store/newSessionStore";
import { colors, space } from "../../src/theme";
import { goBackOr } from "../../src/lib/nav";

export default function NewSessionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const displayName = useAuthStore((s) => s.displayName);

  const sessionType = useNewSessionStore((s) => s.sessionType);
  const venueMode = useNewSessionStore((s) => s.venueMode);
  const activityTypes = useNewSessionStore((s) => s.activityTypes);
  const name = useNewSessionStore((s) => s.name);
  const anchor = useNewSessionStore((s) => s.anchor);
  const travelMode = useNewSessionStore((s) => s.travelMode);
  const setSessionType = useNewSessionStore((s) => s.setSessionType);
  const setVenueMode = useNewSessionStore((s) => s.setVenueMode);
  const toggleActivity = useNewSessionStore((s) => s.toggleActivity);
  const isActivityLocked = useNewSessionStore((s) => s.isActivityLocked);
  const setName = useNewSessionStore((s) => s.setName);
  const setAnchor = useNewSessionStore((s) => s.setAnchor);
  const setOrigin = useNewSessionStore((s) => s.setOrigin);
  const setTravelMode = useNewSessionStore((s) => s.setTravelMode);
  const canSubmit = useNewSessionStore((s) => s.canSubmit);
  const toRequest = useNewSessionStore((s) => s.toRequest);

  const point = useLocationStore((s) => s.point);
  const adopt = useLocationStore((s) => s.adopt);

  const [anchorQuery, setAnchorQuery] = useState(anchor?.label ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O3 ön-ekranı sonucu rota parametresiyle döner (M-5 sözleşmesi) — store onu benimser,
  // İKİNCİ bir sistem diyaloğu açılmaz.
  const { locationPermission } = useLocalSearchParams<{ locationPermission?: string }>();
  useEffect(() => {
    if (locationPermission) void adopt(locationPermission as PrimerOutcome);
  }, [locationPermission, adopt]);

  // Konum store'un; taslak onu istekte taşır. İki kaynak tutulmaz.
  useEffect(() => setOrigin(point), [point, setOrigin]);

  // Haritadan seçilen çapa alan metnini de günceller: alanla store ayrışırsa kullanıcı
  // yazdığından BAŞKA bir yerde buluşma kurar. `useEffect` DEĞİL çizim sırasında düzeltme
  // (React'in "prop değişince state'i ayarla" deseni): efektle yapılsaydı bir kare boyunca
  // eski adres görünür, üstelik her yazışta kullanıcının metnini geri alma riski doğardı.
  const [seenAnchorLabel, setSeenAnchorLabel] = useState(anchor?.label);
  if (anchor?.label !== seenAnchorLabel) {
    setSeenAnchorLabel(anchor?.label);
    if (anchor?.label) setAnchorQuery(anchor.label);
  }

  const anchored = venueMode === "ANCHOR";

  /** Adres alanı çözülmemiş ya da DEĞİŞMİŞ olabilir — göndermeden önce çözülür. */
  async function resolveAnchor(): Promise<boolean> {
    const q = anchorQuery.trim();
    if (!q) {
      setAnchor(null);
      return false;
    }
    if (anchor && anchor.label === q) return true;
    try {
      const found = await api.geocode({ query: q });
      setAnchor({ lat: found.lat, lng: found.lng, label: found.label });
      return true;
    } catch {
      setError("join.errGeocode");
      return false;
    }
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      if (anchored && !(await resolveAnchor())) {
        setError((e) => e ?? "newSession.errNoAnchor");
        return;
      }
      const res = await api.createSession(toRequest(displayName ?? ""));
      if (!res.slug) throw new Error("slug missing");
      if (res.participantToken) rememberParticipantToken(res.slug, res.participantToken);
      router.replace(`/s/${res.slug}`);
    } catch {
      setError("newSession.errCreate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      {/* `.top` — SABİT (K-M26). */}
      <ScreenHeader
        title={t("newSession.title")}
        backLabel={t("newSession.back")}
        onBack={() => goBackOr("/sessions")}
      />

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {/* Artboard P3: tip rayı ORTALANMIŞ, altında ne olacağını anlatan tek satır. */}
        <View style={s.typeRow}>
          <Segmented
            options={[
              { value: "GROUP", label: t("newSession.group") },
              { value: "SOLO", label: t("newSession.solo") },
            ]}
            value={sessionType}
            onChange={setSessionType}
            style={s.typeSeg}
          />
        </View>
        <AppText variant="muted" style={s.typeCopy}>
          {t(sessionType === "GROUP" ? "newSession.groupCopy" : "newSession.soloCopy")}
        </AppText>

        <View style={s.field}>
          <View style={s.fieldHead}>
            <AppText variant="label" style={s.label}>
              {t("newSession.what")}
            </AppText>
            <AppText variant="muted">{t("newSession.whatHint", { max: MAX_ACTIVITIES })}</AppText>
          </View>
          <ActivityPicker
            value={activityTypes}
            onToggle={toggleActivity}
            isLocked={isActivityLocked}
          />
        </View>

        <View style={s.field}>
          <AppText variant="label" style={s.label}>
            {t("newSession.name")}
            <AppText variant="muted"> {t("newSession.nameOptional")}</AppText>
          </AppText>
          <Input
            value={name}
            onChangeText={setName}
            accessibilityLabel={t("newSession.name")}
            placeholder={t("newSession.namePlaceholder")}
          />
        </View>

        <View style={s.field}>
          <AppText variant="label" style={s.label}>
            {t("newSession.meetWhere")}
          </AppText>
          <Segmented
            options={[
              { value: "MIDPOINT", label: t("newSession.modeMidpoint") },
              { value: "ANCHOR", label: t("newSession.modeAnchor") },
            ]}
            value={venueMode}
            onChange={(m) => {
              setVenueMode(m);
              // Moddan çıkarken alan da temizlenir: dolu görünen ama store'da karşılığı
              // olmayan bir adres kullanıcıyı çıkmaza sokar.
              if (m === "MIDPOINT") setAnchorQuery("");
            }}
          />
          {anchored ? (
            <View style={s.subField}>
              <AppText variant="muted" style={s.subLabel}>
                {t("newSession.anchorLabel")}
              </AppText>
              <Input
                value={anchorQuery}
                onChangeText={setAnchorQuery}
                onBlur={() => void resolveAnchor()}
                accessibilityLabel={t("newSession.anchorLabel")}
                placeholder={t("newSession.anchorPlaceholder")}
              />
              <Button
                small
                kind="white"
                title={t("map.pickOnMap")}
                icon={<MapPinIcon size={18} color={colors.ink} />}
                onPress={() => setPickerOpen(true)}
              />
              {anchor?.label ? (
                <AppText variant="muted">
                  {t("newSession.anchorSet", { label: anchor.label })}
                </AppText>
              ) : null}
              <AppText variant="muted">{t("newSession.anchorHint")}</AppText>
            </View>
          ) : (
            <AppText variant="muted">{t("newSession.midpointHint")}</AppText>
          )}
        </View>

        <LocationField
          title={t("newSession.where")}
          next="/sessions/new"
          /* Artboard P4: çapalı oturumda kuranın konumu ZORUNLU DEĞİL — "…ya da adres yaz"
             bağlantısının yerini bu not alır (`canSubmit` de aynı kapıyı uyguluyor). */
          hint={anchored ? t("newSession.ownOptional") : undefined}
        />

        <TravelModeField value={travelMode} onChange={setTravelMode} />

        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
      </ScrollView>

      {/* `.fade` — kaydırılacak içerik olduğunu belli eden alt gradyan. */}
      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 64 }]}
        pointerEvents="none"
      />

      {/* `.cta` — SABİT alt çubuk (K-M26). */}
      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        <Button
          title={t(sessionType === "SOLO" ? "newSession.findVenues" : "newSession.createGroup")}
          disabled={busy || !canSubmit()}
          onPress={() => void create()}
        />
      </View>

      {/* Formun ÜSTÜNDE açılan yerinde alt sayfa (artboard P4 `.scrim` + `.sheet`): kullanıcı
          çapayı seçerken doldurduğu formu scrim'in arkasında görmeye devam eder. */}
      <MapPickerSheet
        visible={pickerOpen}
        center={anchor ?? point}
        onCancel={() => setPickerOpen(false)}
        onPick={(picked) => {
          setAnchor(picked);
          setAnchorQuery(picked.label ?? "");
          setPickerOpen(false);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { paddingHorizontal: space.screenX, paddingBottom: 96, gap: 14 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, backgroundColor: colors.paper },
  typeRow: { flexDirection: "row", justifyContent: "center" },
  typeSeg: { alignSelf: "center", minWidth: 220 },
  typeCopy: { textAlign: "center", marginTop: -6 },
  field: { gap: 10 },
  fieldHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 },
  label: { fontWeight: "600" },
  subField: { gap: 8, marginTop: 2 },
  subLabel: { fontWeight: "600", color: colors.ink },
  error: { color: colors.flameDeep, fontWeight: "600" },
});
