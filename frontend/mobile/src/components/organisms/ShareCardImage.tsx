/* Kaynak: artboard P21 · Sonuç kartı paylaş (.rc / .rc-ph / .rc-ppl / .rc-ft).

   Kullanıcı bu düğümü GÖRMEZ: ekranın dışında durur ve yalnız `captureShareCard` okur.
   Ölçüler bu yüzden burada MUTLAKTIR (depo kuralının tek istisnası): çıktı 1080×1920 px
   sabit bir görsel, cihazın yazı tipi ölçeğinden ya da ekran genişliğinden etkilenemez —
   aksi hâlde aynı kart farklı telefonlarda farklı kırpılırdı. */
import { fairnessOf, monogram, type ParticipantDto, type VenueDto } from "@bumpinto/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { CARD_DP_H, CARD_DP_W } from "../../lib/shareCard";
import { colors, fonts, photoTints, radius } from "../../theme";
import { AppText } from "../atoms";

/* `nodeRef` AYRIŞTIRILIR: React Compiler'ın `react-hooks/refs` kuralı, propların biri ref
   olduğunda `props` nesnesinin TAMAMINI ref sayıyor ve her `props.x` okumasını "render
   sırasında ref erişimi" diye işaretliyor. Ayrıştırma hem kuralı hem okuyucuyu rahatlatır. */
export default function ShareCardImage({
  nodeRef,
  venue,
  participants,
}: {
  nodeRef: RefObject<View | null>;
  venue: VenueDto;
  participants: ParticipantDto[];
}) {
  const { t } = useTranslation();
  const [broken, setBroken] = useState(false);

  const f = fairnessOf(venue);
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.displayName ?? "?";
  // `entries` zaten `roundTravel`den geçmiş (fairness.ts) — ikinci yuvarlama yapılmaz.
  const rows = (f?.entries ?? []).map((e) => ({ id: e.id, name: nameOf(e.id), minutes: e.minutes }));
  const showPhoto = !!venue.photoUrl && !broken;

  return (
    <View
      ref={nodeRef}
      collapsable={false}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={s.card}
    >
      <AppText variant="over" style={s.overline}>
        {t("result.overline")}
      </AppText>
      <AppText style={s.name} numberOfLines={2}>
        {venue.name}
      </AppText>

      <View style={s.photo}>
        {showPhoto ? (
          <Image
            source={{ uri: venue.photoUrl }}
            style={s.fill}
            contentFit="cover"
            onError={() => setBroken(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          /* Foto yüklenemezse kart YİNE ÜRETİLİR: gradyan + monogram. Uçak modunda
             paylaşmak isteyen kullanıcıya "olmadı" demek yerine çalışan bir kart verilir. */
          <LinearGradient
            colors={[...photoTints[0]]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[s.fill, s.center]}
          >
            <AppText style={s.mono}>{monogram(venue.name)}</AppText>
          </LinearGradient>
        )}
      </View>

      {venue.address ? (
        <AppText variant="muted" style={s.address} numberOfLines={2}>
          {venue.address}
        </AppText>
      ) : null}

      <View style={s.people}>
        {rows.map((r) => (
          <View key={r.id} style={s.person}>
            <AppText variant="label">{r.name}</AppText>
            <AppText variant="num">{t("travel.min", { min: r.minutes })}</AppText>
          </View>
        ))}
      </View>

      <View style={s.footer}>
        <AppText style={s.wordmark}>{t("common.wordmark")}</AppText>
        {f ? (
          <AppText variant="muted" style={s.footNote}>
            {t("share.cardFooter", { min: f.min, max: f.max, spread: f.spread })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    position: "absolute",
    left: -10000,
    top: 0,
    width: CARD_DP_W,
    height: CARD_DP_H,
    backgroundColor: colors.paper,
    padding: 24,
  },
  overline: { color: colors.flameDeep, textAlign: "center" },
  name: {
    fontFamily: fonts.head,
    fontSize: 30,
    lineHeight: 34,
    color: colors.ink,
    textAlign: "center",
    marginTop: 4,
  },
  photo: { height: 240, borderRadius: radius.card, overflow: "hidden", marginTop: 16 },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  center: { alignItems: "center", justifyContent: "center" },
  mono: { fontFamily: fonts.head, fontSize: 64, color: "rgba(255,255,255,0.6)" },
  address: { marginTop: 12, textAlign: "center" },
  people: { marginTop: 12, gap: 8 },
  person: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordmark: { fontFamily: fonts.head, fontSize: 16, color: colors.ink },
  footNote: { fontSize: 12, flexShrink: 1, textAlign: "right" },
});
