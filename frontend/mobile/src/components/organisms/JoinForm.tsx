import { DEFAULT_TRAVEL_MODE, type TravelMode } from "@bumpinto/shared";
import { router } from "expo-router";
import { ChatCircleIcon } from "phosphor-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share, StyleSheet, View } from "react-native";

import { api, rememberParticipantToken, webBase } from "../../lib/api";
import { apiErrorCode, statusOf } from "../../lib/apiError";
import { useLocationStore } from "../../store/locationStore";
import { colors, space } from "../../theme";
import { AppText, Button, Card, Input } from "../atoms";
import LocationField from "../molecules/LocationField";
import TravelModeField from "../molecules/TravelModeField";

/**
 * Artboard P8 formu + P9 hata dalı.
 *
 * Konum ZORUNLU DEĞİL (çapalı oturumda gerekmez, orta noktalıda da sunucu konumsuz katılıma
 * izin verir ve süreler kişi gelince güncellenir) — kapı yalnız AD.
 *
 * P9 (409 "çok uzak"): hata kartı `.cta` bloğunda, düğmenin ÜSTÜNDE durur ve **form kaybolmaz**;
 * kullanıcı adresini değiştirip yeniden dener. `SessionPreview` mesafe alanı TAŞIMIYOR, bu
 * yüzden artboard'daki "sen ~1.900 km" satırı BASILMAZ — uydurma sayı yazılmaz (sözleşme
 * kuralı: eksik alanda satır gizlenir).
 */
export default function JoinForm(p: {
  slug: string;
  hostName?: string;
  sessionName?: string;
  /** K-B37: sunucu bu oturumu AÇIK PLAN olarak tanıdı (409 `open_plan_seat_request_required`).
      Ekran önizlemeyi tazeler ve plan detayına geçer — "çok uzaksın" yanlış sebebi basılmaz.
      Döner: plan detayına geçildi mi (geçilmediyse form sessiz kalmaz, hata basar). */
  onOpenPlan?: () => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const point = useLocationStore((s) => s.point);

  const [displayName, setDisplayName] = useState("");
  const [travelMode, setTravelMode] = useState<TravelMode>(DEFAULT_TRAVEL_MODE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const tooFar = error === "join.errTooFar";

  async function submit() {
    const name = displayName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.join(p.slug, {
        displayName: name,
        lat: point?.lat,
        lng: point?.lng,
        locationLabel: point?.label,
        travelMode,
      });
      if (res.participantToken) rememberParticipantToken(p.slug, res.participantToken);
      router.replace(`/s/${p.slug}`);
    } catch (e) {
      if (apiErrorCode(e) === "open_plan_seat_request_required") {
        // Önizleme tazelenemediyse (ağ) ya da yine gizli göründüyse form SESSİZ kalmaz.
        if (!(p.onOpenPlan && (await p.onOpenPlan()))) setError("join.errJoin");
        return;
      }
      setError(statusOf(e) === 409 ? "join.errTooFar" : "join.errJoin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.form}>
      <View style={s.field}>
        <AppText variant="label" style={s.label}>
          {t("join.nameLabel")}
        </AppText>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          accessibilityLabel={t("join.nameLabel")}
          placeholder={t("join.namePlaceholder")}
          autoCorrect={false}
        />
      </View>

      <LocationField
        title={t("join.whereLabel")}
        next={`/j/${p.slug}`}
        otherLabel={t("join.locOther")}
        error={locationError}
        onError={setLocationError}
      />

      <TravelModeField value={travelMode} onChange={setTravelMode} />

      {/* P9 — flame kart. `.cta` bloğunun içinde, düğmenin ÜSTÜNDE. */}
      {tooFar ? (
        <Card tone="flame" style={s.errorCard}>
          <AppText variant="muted" style={s.errorText}>
            {t("join.errTooFar")}
          </AppText>
          <Button
            small
            kind="ghost"
            title={t("join.hostMessage")}
            icon={<ChatCircleIcon size={16} color={colors.flameDeep} />}
            onPress={() =>
              void Share.share({
                message: `${t("venues.inviteText", { name: p.sessionName ?? "" })} ${webBase}/j/${p.slug}`,
              })
            }
            style={s.errorCta}
          />
        </Card>
      ) : error ? (
        <AppText variant="muted" style={s.errorText}>
          {t(error)}
        </AppText>
      ) : null}

      <Button
        title={t("join.submit")}
        disabled={busy || !displayName.trim()}
        onPress={() => void submit()}
      />
      <AppText variant="muted" style={s.privacy}>
        {t("join.privacy")}
      </AppText>
    </View>
  );
}

const s = StyleSheet.create({
  form: { gap: 14 },
  field: { gap: 8 },
  label: { fontWeight: "600" },
  errorCard: { backgroundColor: colors.flameWash, gap: 6, paddingVertical: space.rowY },
  errorText: { color: colors.flameDeep, fontWeight: "600" },
  errorCta: { alignSelf: "flex-start", width: "auto" },
  privacy: { textAlign: "center" },
});
