import { MODE_LABEL_KEY, nearestParticipant, type SessionView } from "@bumpinto/shared";
import { MapTrifoldIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { colors, space } from "../../theme";
import { AppText, Card, IconButton } from "../atoms";
import MapMark from "./MapMark";

/**
 * Artboard P5/P6/P10/P13 `.card.f-mid` (orta nokta) ve P7 (çapalı: "Buluşma yeri").
 *
 * Harita ŞERİDİ DEĞİL kart: 390'da harita varsayılan olarak açılmaz (harita politikası §4.7).
 * Sağdaki `.icb` yalnız `onOpenMap` verilirse çizilir.
 *
 * ÇAPALI oturumda (K-M5) yer adı yine `midpointLabel`'dan okunur — `SessionView`'da ayrı bir
 * çapa etiketi alanı YOK ve uydurulmaz. Halka + katılımcı noktaları da çizilmez (`pinOnly`):
 * merkez tek ve sabit, kimsenin konumundan türemiyor.
 *
 * Dakika aralığı sunucunun `midpointMinutes` alanından; istemci türetmesi YOK.
 */
export default function MidpointCard(p: { view: SessionView; onOpenMap?: () => void }) {
  const { t } = useTranslation();
  const v = p.view;
  const anchored = v.anchored === true;

  const mins = (v.participants ?? [])
    .map((x) => x.midpointMinutes)
    .filter((m): m is number => m != null);
  const range = mins.length > 0 ? { min: Math.min(...mins), max: Math.max(...mins) } : null;
  const km = v.radiusKm != null ? Math.round(v.radiusKm) : null;
  const near = anchored ? null : nearestParticipant(v);

  const meta = anchored
    ? km != null
      ? t("midpoint.anchorMeta", { km })
      : t("midpoint.anchorPending")
    : km != null && range
      ? t("midpoint.meta", { km, min: range.min, max: range.max })
      : km != null
        ? t("midpoint.metaKm", { km })
        : t("midpoint.pending");

  return (
    <Card style={s.card}>
      <MapMark size={64} pinOnly={anchored} />
      <View style={s.body}>
        <AppText variant="over">
          {t(anchored ? "midpoint.anchorOverline" : "midpoint.overline")}
        </AppText>
        <AppText variant="h2">
          {v.midpointLabel
            ? t(anchored ? "midpoint.anchorNear" : "midpoint.near", { label: v.midpointLabel })
            : t("midpoint.title")}
        </AppText>
        <AppText variant="num" style={s.meta}>
          {meta}
        </AppText>
        {/* TÜRKÇE EK YOK: "Orta nokta {{name}} tarafında · bisikletle geliyor".
            Arabada susulur — varsayılan mod, not bilgi taşımaz. */}
        {near?.travelMode && near.travelMode !== "CAR" ? (
          <AppText variant="muted">
            {t("midpoint.sideNote", {
              name: near.displayName ?? "",
              mode: t(MODE_LABEL_KEY[near.travelMode].coming),
            })}
          </AppText>
        ) : null}
      </View>
      {p.onOpenMap ? (
        <IconButton
          label={t("lobby.showOnMap")}
          onPress={p.onOpenMap}
          icon={<MapTrifoldIcon size={18} color={colors.ink} />}
        />
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: space.rowY + 1,
    paddingHorizontal: space.cardX,
  },
  body: { flex: 1, gap: 3, minWidth: 0 },
  meta: { color: colors.ink2 },
});
