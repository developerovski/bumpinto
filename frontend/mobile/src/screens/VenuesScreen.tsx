import {
  GROUP_TINT,
  activityListLabel,
  byFairness,
  byRating,
  groupOf,
  sessionActivities,
  type SessionView,
  type VenueDto,
} from "@bumpinto/shared";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Button, Card, HandNote, Segmented, Skeleton } from "../components/atoms";
import { Attribution, MidpointCard, ScreenHeader, VenueRow } from "../components/molecules";
import VoiceDockSlot from "../components/organisms/VoiceDockSlot";
import { api } from "../lib/api";
import { useConfigStore } from "../store/configStore";
import { useSessionStore } from "../store/sessionStore";
import { useTravelLabels } from "../store/useTravelLabels";
import { colors, space } from "../theme";

/**
 * Artboard P11 (grup · host) · P12 (bireysel) · P13 (yükleniyor).
 *
 * Sıralama SAF fonksiyonlarla (`byFairness` / `byRating`, `@bumpinto/shared`) — ekran ikinci
 * bir dakika aritmetiği yapmaz.
 *
 * Atıf (`Attribution`) mekan verisi olan her ekranda ZORUNLU; sağlayıcı kimlikleri
 * mekanların kendi `provider` alanından toplanır, uydurulmaz.
 */
type SortKey = "fair" | "rating";

export default function VenuesScreen({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const loadView = useSessionStore((s) => s.loadView);
  const loadConfig = useConfigStore((s) => s.load);
  const travel = useTravelLabels(view);

  const [sort, setSort] = useState<SortKey>("fair");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const slug = view.slug ?? "";
  const host = view.viewer?.host === true;
  const solo = view.sessionType === "SOLO";
  const activities = sessionActivities(view);
  const venues = view.venues ?? [];
  const participants = view.participants ?? [];
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;
  const title = view.name || activityListLabel(activities, t, i18n.resolvedLanguage ?? "tr");

  // P13: mekanlar hâlâ aranıyorsa (durum SUGGESTING ya da liste boş) iskelet çizilir.
  const searching = view.status === "SUGGESTING" || venues.length === 0;

  // Sayfa çapında TEK ton: oturumun ilk alanının grubu. Kart başına ton taşınmaz.
  const tint = GROUP_TINT[groupOf(activities[0] ?? "")];
  const sorted = [...venues].sort(sort === "fair" ? byFairness : byRating);
  const categories = venues.map((v) => v.category ?? "");
  const providers = [...new Set(venues.map((v) => v.provider).filter((p): p is string => !!p))];

  // Sunucu kapısının AYNISI: konumu olan, elle eklenmemiş ve odada olan katılımcı ≥ 2.
  // `online` alanı yoksa çevrimiçi sayılır — bilgi gelmeden host'un önüne duvar çıkmaz.
  const inRoom = participants.filter((p) => !p.manual && p.hasLocation && p.online !== false).length;
  const canShuffle = !busy && inRoom >= 2;

  const meta = km != null
    ? view.midpointLabel
      ? t("venues.metaWithPlace", { count: venues.length, place: view.midpointLabel, km })
      : t("venues.meta", { count: venues.length, km })
    : t("venues.metaNoRadius", { count: venues.length });

  async function run(call: () => Promise<unknown>, errorKey: string) {
    setBusy(true);
    setError(null);
    try {
      await call();
      await loadView(slug);
    } catch {
      setError(errorKey);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={title}
        backLabel={t("shell.sessions")}
        onBack={() => router.replace("/sessions")}
      />
      <AppText variant="num" style={s.meta}>
        {searching ? t("venues.searching") : meta}
      </AppText>

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {searching ? (
          <>
            <MidpointCard view={view} />
            <View style={s.searching}>
              <AppText variant="h2" style={s.center}>
                {activities.length > 0
                  ? t("venues.searchingTitleFor", {
                      activity: activityListLabel(activities, t, i18n.resolvedLanguage ?? "tr"),
                    })
                  : t("venues.searchingTitle")}
              </AppText>
              <AppText variant="muted" style={s.center}>
                {t("venues.searchingCopy")}
              </AppText>
            </View>
            <Card padded={false} style={s.list}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i}>
                  {i > 0 ? <View style={s.divider} /> : null}
                  <View style={s.skeletonRow}>
                    <Skeleton width={56} height={64} radius={12} />
                    <View style={s.skeletonBody}>
                      <Skeleton width="70%" height={14} />
                      <Skeleton width="50%" height={12} />
                      <Skeleton width="100%" height={8} />
                    </View>
                  </View>
                </View>
              ))}
            </Card>
            <HandNote>{t("venues.searchingHand")}</HandNote>
          </>
        ) : (
          <>
            <View style={s.sortRow}>
              <Segmented
                options={[
                  { value: "fair", label: t("venues.sortFair") },
                  { value: "rating", label: t("venues.sortRating") },
                ]}
                value={sort}
                onChange={setSort}
                style={s.sort}
              />
            </View>
            {/* Bant açıklaması: nokta neyi gösteriyor, kullanıcı bir kez okusun. */}
            <AppText variant="muted" style={s.legend}>
              {t("travel.bars")}
            </AppText>

            {(view.emptyActivityTypes ?? []).length > 0 ? (
              <AppText variant="muted" style={s.warn}>
                {t("venues.noneFor", {
                  activity: activityListLabel(
                    view.emptyActivityTypes ?? [],
                    t,
                    i18n.resolvedLanguage ?? "tr",
                  ),
                })}
              </AppText>
            ) : null}

            <Card padded={false} style={s.list}>
              {sorted.map((venue: VenueDto, i) => (
                <View key={venue.id ?? i}>
                  {i > 0 ? <View style={s.divider} /> : null}
                  <VenueRow
                    venue={venue}
                    travel={travel}
                    tint={tint}
                    categories={categories}
                    midpointLabel={view.midpointLabel}
                    /* SOLO (P12): karar deste yerine listeden çıkar — her satırda "Kilitle". */
                    selectLabel={solo && host ? t("venues.lockIn") : undefined}
                    onSelect={
                      solo && host && venue.id
                        ? () => void run(() => api.forceDecision(slug, { venueId: venue.id }), "venues.errPick")
                        : undefined
                    }
                  />
                </View>
              ))}
            </Card>

            <Attribution providers={providers} />
          </>
        )}

        <VoiceDockSlot slug={slug} />
      </ScrollView>

      <LinearGradient
        colors={["rgba(255,251,246,0)", colors.paper]}
        style={[s.fade, { bottom: insets.bottom + (host && !solo ? 84 : 40) }]}
        pointerEvents="none"
      />

      <View style={[s.cta, { paddingBottom: insets.bottom + 8 }]}>
        {error ? (
          <AppText variant="muted" style={s.error}>
            {t(error)}
          </AppText>
        ) : null}
        {solo ? (
          <Badge>{t("venues.soloBadge", { count: participants.length })}</Badge>
        ) : host ? (
          <>
            <Button
              title={t("venues.shuffle")}
              disabled={searching || !canShuffle}
              onPress={() => void run(() => api.shuffle(slug), "venues.errShuffle")}
            />
            {/* Sessizce ölü düğme olmaz: kapalıysa SEBEBİ ve çıkışı yazılı. */}
            <AppText variant="muted" style={s.center}>
              {inRoom < 2 ? t("venues.needTwo") : t("venues.everyoneSeesShort")}
            </AppText>
          </>
        ) : (
          /* Davetlide CTA YOK: karıştırma host'un işi. */
          <AppText variant="muted" style={s.center}>
            {t("venues.guestWait")}
          </AppText>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  meta: {
    paddingHorizontal: space.screenX,
    paddingBottom: 8,
    color: colors.ink2,
    backgroundColor: colors.paper,
  },
  page: { paddingHorizontal: space.screenX, paddingBottom: 110, gap: 8 },
  fade: { position: "absolute", left: 0, right: 0, height: 64 },
  cta: { paddingHorizontal: space.screenX, paddingTop: 10, gap: 6, backgroundColor: colors.paper },
  sortRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  sort: { alignSelf: "flex-start", minWidth: 220 },
  legend: { fontSize: 12 },
  warn: { color: colors.amberInk, fontWeight: "600" },
  list: { paddingVertical: 2 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  skeletonRow: { flexDirection: "row", gap: 12, paddingVertical: space.rowY, paddingHorizontal: 14 },
  skeletonBody: { flex: 1, gap: 6, justifyContent: "center" },
  searching: { alignItems: "center", gap: 6, paddingVertical: 2 },
  center: { textAlign: "center" },
  error: { textAlign: "center", color: colors.flameDeep, fontWeight: "600" },
});
