import {
  backupOf,
  fairnessOf,
  fitsActivity,
  roundedMidpointMeters,
  venueLink,
  votersOf,
  type SessionView,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { MapPinLineIcon, ScalesIcon, SparkleIcon, ShareNetworkIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Linking, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Card, HandNote, IconButton } from "../components/atoms";
import Attribution from "../components/molecules/Attribution";
import Reason, { REASON_ICON_COLOR } from "../components/molecules/Reason";
import VenueRow from "../components/molecules/VenueRow";
import ResultCard from "../components/organisms/ResultCard";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { webBase } from "../lib/api";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P20 — karar. Oturumun son ekranı: nereye, kim ne kadar yol yapıyor, NEDEN orası.
 *
 * **Sonuç kartı STATİK** (R-M11/R-M12 → M-9): "Takvime ekle" ve "Kartı paylaş" düğmeleri
 * ÇİZİLMEZ — ICS üretimi ve kart görseli o planda. Üst çubuktaki paylaşım düz metindir
 * (`Share.share`), yani bugün de çalışan bir şey.
 *
 * "Neden burası" ekseni VERİSİ OLMAYAN satırı gizler: uydurma gerekçe yazmak kararın
 * güvenilirliğini yok eder.
 */
export default function ResultScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const travel = useTravelLabels(view);

  const locale = i18n.resolvedLanguage ?? "tr";
  const slug = view.slug ?? "";
  const venues = view.venues ?? [];
  const winner = venues.find((v) => v.id === view.decidedVenueId);
  const participants = view.participants ?? [];
  const voters = votersOf(participants);

  // Kazanan destede yoksa ekran ÇİZİLMEZ — yönlendirici bu durumu zaten hata ekranına
  // düşürüyor; burası ikinci bir savunma (uydurma kart basmaktansa boş dön).
  if (!winner) return null;

  const f = fairnessOf(winner);
  const backup = backupOf(view, winner.id ?? "");
  const likes = view.likeCounts?.[winner.id ?? ""];
  const href = venueLink(winner);

  // Adalet ekseni: yalnız birden çok yolcu varsa anlamlı.
  const fairAxis =
    f && f.entries.length > 1
      ? f.longestId && travel.labels[f.longestId]
        ? t("result.fairLine", {
            min: f.min,
            max: f.max,
            name: travel.labels[f.longestId],
          })
        : t("result.fairLineNoName", { min: f.min, max: f.max })
      : null;

  // Uyum ekseni: mekanın KENDİ türü oturumun ilgi alanlarıyla örtüşüyor mu.
  const fitAxis =
    winner.category && winner.activityType
      ? t(fitsActivity(winner.activityType, winner.category) ? "venue.fitOk" : "venue.fitOff", {
          activity: t(`activity.${winner.activityType}`),
          category: winner.category.toLocaleLowerCase(locale),
        })
      : null;

  // Yer ekseni: orta noktaya uzaklık. Çapalı oturumda "orta nokta" diye bir iddia YOK.
  const meters =
    !view.anchored && view.midpoint && winner.lat != null && winner.lng != null
      ? roundedMidpointMeters(view.midpoint, { lat: winner.lat, lng: winner.lng })
      : null;
  const placeAxis =
    meters == null
      ? view.midpointLabel
        ? t("venues.metaWithPlace", { count: venues.length, place: view.midpointLabel, km: view.radiusKm ?? 0 })
        : null
      : meters === 0
        ? t("result.midpointExact")
        : t("result.midpointMeters", { m: meters });

  async function share() {
    await Share.share({
      message: `${t("result.shareText", { name: view.name ?? "", venue: winner!.name ?? "" })} ${webBase}/j/${slug}`,
    }).catch(() => undefined);
  }

  return (
    <View style={s.screen}>
      <View style={[s.top, { paddingTop: insets.top + 8 }]}>
        <AppText variant="over" style={s.overline}>
          {t("result.overline")}
        </AppText>
        <IconButton
          kind="ghost"
          label={t("result.share")}
          onPress={() => void share()}
          icon={<ShareNetworkIcon size={20} color={colors.ink} weight="bold" />}
        />
      </View>

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <AppText variant="h1">{winner.name}</AppText>

        <View style={s.cardWrap}>
          <ResultCard
            venue={winner}
            travel={travel}
            participants={participants}
            likes={likes != null ? { n: likes, total: voters.length } : undefined}
            decidedAt={view.decidedAt}
          />
        </View>

        {fairAxis || fitAxis || placeAxis ? (
          <Card style={s.why}>
            <AppText variant="over">{t("result.whyTitle")}</AppText>
            {fairAxis ? (
              <Reason
                icon={<ScalesIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
                title={t("result.axisFair")}
                note={fairAxis}
              />
            ) : null}
            {fitAxis ? (
              <Reason
                icon={<SparkleIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
                title={t("result.axisFit")}
                note={fitAxis}
              />
            ) : null}
            {placeAxis ? (
              <Reason
                icon={<MapPinLineIcon size={20} color={REASON_ICON_COLOR} weight="bold" />}
                title={t("result.axisPlace")}
                note={placeAxis}
              />
            ) : null}
          </Card>
        ) : null}

        {/* En uzaktan gelen kişiye erken çıkma önerisi — yalnız gerçek bir fark varsa. */}
        {f && f.entries.length > 1 && f.spread > 0 && travel.labels[f.longestId] ? (
          <HandNote style={s.hand}>
            {t("result.leaveEarlyHand", { name: travel.labels[f.longestId], min: f.spread })}
          </HandNote>
        ) : null}

        {backup ? (
          <Card padded={false}>
            <AppText variant="over" style={s.backupHead}>
              {t("result.backup")}
            </AppText>
            <VenueRow
              venue={backup}
              travel={travel}
              midpointLabel={view.midpointLabel}
              categories={venues.map((v) => v.category ?? "")}
            />
          </Card>
        ) : null}

        <Card tone="flame" style={s.viral}>
          <AppText variant="h3">{t("result.viralTitle")}</AppText>
          <AppText variant="muted">{t("result.viralCopy")}</AppText>
          <Button
            small
            kind="white"
            title={t("result.viralCta")}
            onPress={() => router.push("/sessions/new")}
          />
        </Card>

        <Attribution providers={[winner.provider ?? "", backup?.provider ?? ""]} />
        <VoiceDockSlot slug={slug} />
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + 76 }]}
        pointerEvents="none"
      />

      {href ? (
        <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
          <Button title={t("venue.openInMaps")} onPress={() => void Linking.openURL(href)} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.screenX,
    paddingBottom: 6,
    gap: 8,
  },
  overline: { flex: 1 },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: space.gap },
  // Eğik kartın köşeleri kırpılmasın diye yatay pay.
  cardWrap: { paddingHorizontal: 4, paddingTop: 14 },
  why: { gap: 10 },
  hand: { alignSelf: "center" },
  backupHead: { paddingHorizontal: 14, paddingTop: 12 },
  viral: { gap: 6 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, backgroundColor: colors.paper },
});
