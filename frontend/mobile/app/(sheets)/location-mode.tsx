import { DEFAULT_TRAVEL_MODE, type TravelMode } from "@bumpinto/shared";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppText, Button } from "../../src/components/atoms";
import { LocationField, ScreenHeader, TravelModeField } from "../../src/components/molecules";
import { api } from "../../src/lib/api";
import { useLocationStore, type PrimerOutcome } from "../../src/store/locationStore";
import { useSessionStore } from "../../src/store/sessionStore";
import { colors, space } from "../../src/theme";
import { goBackOr } from "../../src/lib/nav";

export default function LocationModeSheet() {
  const { t } = useTranslation();
  const { slug = "", locationPermission } = useLocalSearchParams<{
    slug?: string;
    locationPermission?: string;
  }>();

  const point = useLocationStore((s) => s.point);
  const adopt = useLocationStore((s) => s.adopt);
  const loadView = useSessionStore((s) => s.loadView);
  const view = useSessionStore((s) => s.view);
  const self = (view?.participants ?? []).find((p) => p.id === view?.viewer?.participantId);

  const [travelMode, setTravelMode] = useState<TravelMode>(self?.travelMode ?? DEFAULT_TRAVEL_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (locationPermission) void adopt(locationPermission as PrimerOutcome);

  async function save() {
    if (!point) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateLocation(slug, {
        lat: point.lat,
        lng: point.lng,
        label: point.label,
        travelMode,
      });
      await loadView(slug);
      goBackOr(slug ? `/s/${slug}` : "/sessions");
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(status === 409 ? "join.errTooFar" : "waiting.errUpdate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.sheet}>
      <ScreenHeader
        title={t("waiting.changeLocationAndMode")}
        backLabel={t("common.close")}
        onBack={() => goBackOr(slug ? `/s/${slug}` : "/sessions")}
      />
      <ScrollView contentContainerStyle={s.body}>
        <LocationField
          title={t("join.whereLabel")}
          next="/location-mode"
          otherLabel={t("join.locOther")}
        />
        <TravelModeField value={travelMode} onChange={setTravelMode} />
        <AppText variant="muted">{t("waiting.modeHint")}</AppText>
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
        <Button
          title={t("common.save")}
          disabled={busy || !point}
          onPress={() => void save()}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.paper },
  body: { paddingHorizontal: space.screenX, paddingBottom: 32, gap: 14 },
  error: { color: colors.flameDeep, fontWeight: "600" },
});
