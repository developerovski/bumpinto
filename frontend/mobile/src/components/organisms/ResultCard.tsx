import {
  fairnessOf,
  formatRating,
  type ParticipantDto,
  type TravelInfo,
  type VenueDto,
} from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import { MODE_ICON } from "../../icons";
import { colors, radius, shadow, space } from "../../theme";
import { AppText, Avatar, Badge, Sticker, Wordmark } from "../atoms";
import VenueThumb from "../molecules/VenueThumb";

/**
 * Artboard P20 `.rc` — kararın "imza kartı": hafif eğik, iki el yazısı etiketli, paylaşılası.
 *
 * **Statik** (R-M11 → M-9): kartın GÖRSELİNİ üretme (`view-shot`) ve takvime ekleme burada
 * YOK; kart yalnız ekranda yaşar. Yarım bir "paylaş" düğmesi koymaktansa hiç koymamak
 * doğru — üst çubuktaki metin paylaşımı zaten çalışıyor.
 *
 * Kişi satırları katılımcı sırasını DEĞİL yol süresini izler (`fairnessOf` sırası: en uzun
 * önce) — kartın anlattığı şey "kim ne kadar yol yapıyor".
 */
export default function ResultCard(p: {
  venue: VenueDto;
  travel: TravelInfo;
  participants: ParticipantDto[];
  /** `{{n}}/{{total}} beğendi!` etiketi — veri yoksa etiket hiç basılmaz. */
  likes?: { n: number; total: number };
  decidedAt?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "tr";
  const v = p.venue;
  const f = fairnessOf(v);

  const byId = new Map(p.participants.filter((x) => x.id).map((x) => [x.id!, x]));
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  const meta = [
    v.rating != null ? `★ ${formatRating(locale, v.rating, v.ratingScale)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    v.hoursToday ? t("venue.hoursToday", { hours: v.hoursToday }) : null,
    v.locality,
  ].filter((x): x is string => !!x);

  const time = p.decidedAt
    ? new Date(p.decidedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <View style={s.card}>
      {p.likes ? (
        <Sticker style={s.stickerLeft}>
          {t("result.likedSticker", { n: p.likes.n, total: p.likes.total })}
        </Sticker>
      ) : null}
      {time ? (
        <Sticker style={s.stickerRight}>{t("result.decidedAtSticker", { time })}</Sticker>
      ) : null}

      <VenueThumb venue={v} width={undefined} height={150} style={s.photo} />

      <View style={s.body}>
        <AppText variant="h2" numberOfLines={2}>
          {v.name}
        </AppText>
        <View style={s.metaRow}>
          {meta.length > 0 ? (
            <AppText variant="num" style={s.meta}>
              {meta.join(" · ")}
            </AppText>
          ) : null}
          {f && f.entries.length > 1 ? (
            <Badge tone="grass">{t("travel.range", { min: f.min, max: f.max })}</Badge>
          ) : null}
        </View>

        {f?.entries.map((entry) => {
          const person = byId.get(entry.id);
          const mode = person?.hasLocation ? person.travelMode : undefined;
          const icons = mode ? MODE_ICON[mode] : [];
          return (
            <View key={entry.id} style={s.person}>
              <Avatar
                size="s"
                name={p.travel.names?.[entry.id] ?? p.travel.labels[entry.id] ?? "?"}
                tint={p.travel.colors?.[entry.id]}
              />
              <AppText variant="label" numberOfLines={1} style={s.personName}>
                {p.travel.labels[entry.id] ?? t("travel.friend")}
              </AppText>
              <View style={s.modeIcons}>
                {icons.map((Icon, i) => (
                  <Icon key={i} size={14} color={colors.ink2} />
                ))}
              </View>
              <AppText variant="num">{t("travel.min", { min: entry.minutes })}</AppText>
            </View>
          );
        })}
      </View>

      <View style={s.footer}>
        <Wordmark />
        {f && f.entries.length > 1 ? (
          <AppText variant="muted" style={s.footerNote}>
            {`${t("travel.range", { min: f.min, max: f.max })} · ${t("travel.gap", { min: f.spread })}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "visible",
    // Artboard'da kart hafif eğik durur — "elde tutulan bir kâğıt" dili.
    transform: [{ rotate: "-1.2deg" }],
    ...shadow.s2,
  },
  stickerLeft: { position: "absolute", top: -12, left: 14, zIndex: 2 },
  stickerRight: { position: "absolute", top: -12, right: 14, zIndex: 2 },
  photo: { width: "100%", borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  body: { padding: space.cardX, gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  meta: { color: colors.ink2, fontSize: 12.5 },
  person: { flexDirection: "row", alignItems: "center", gap: 8 },
  personName: { flex: 1, minWidth: 0 },
  modeIcons: { flexDirection: "row", alignItems: "center", gap: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: space.cardX,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerNote: { fontSize: 11.5, flexShrink: 1, textAlign: "right" },
});
