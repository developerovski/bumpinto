import { activityListLabel, type SessionPreview } from "@bumpinto/shared";
import { router, useLocalSearchParams } from "expo-router";
import { MoonIcon } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Avatar, Badge, Card, Skeleton, Wordmark } from "../../src/components/atoms";
import { LanguageButton } from "../../src/components/molecules";
import JoinForm from "../../src/components/organisms/JoinForm";
import { ACTIVITY_ICON } from "../../src/icons";
import { api, hasParticipantToken } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/authStore";
import { useLocationStore, type PrimerOutcome } from "../../src/store/locationStore";
import ErrorScreen from "../../src/screens/ErrorScreen";
import PlanIntroScreen from "../../src/screens/PlanIntroScreen";
import { colors, space } from "../../src/theme";

export default function JoinScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { slug = "", locationPermission } = useLocalSearchParams<{
    slug?: string;
    locationPermission?: string;
  }>();

  const adopt = useLocationStore((s) => s.adopt);
  const status = useAuthStore((s) => s.status);
  const [preview, setPreview] = useState<SessionPreview | null>(null);
  const [failed, setFailed] = useState(false);
  /** Önizleme bir kez geldi mi: giriş durumu değişince yalnız koltuk sorusu yeniden sorulur. */
  const loaded = useRef(false);

  // O3 ön-ekranı sonucu rota parametresiyle döner (M-5 sözleşmesi).
  useEffect(() => {
    if (locationPermission) void adopt(locationPermission as PrimerOutcome);
  }, [locationPermission, adopt]);

  useEffect(() => {
    if (!slug) return;
    // Zaten katılmış kişi formu TEKRAR görmez: link ikinci kez açıldığında doğrudan oturuma.
    if (hasParticipantToken(slug)) {
      router.replace(`/s/${slug}`);
      return;
    }
    // Oturum geri yüklenirken (soğuk açılış / App Link) ya da giriş sürerken BEKLE: "hesabıyla
    // koltuğu var mı" sorusu ancak durum bilinince sorulabilir.
    if (status === "unknown" || status === "busy") return;
    let alive = true;
    void (async () => {
      /* Hesabıyla koltuğu olan (host, onaylanmış istek) plan detayında TAKILMASIN: Keşfet kişinin
         kendi planını da listeler ve bellekteki jeton uygulama yeniden başlayınca düşer. Üye
         olmayan hesaba sunucu 403 döner (401 değil) — çıkış kesicisi tetiklenmez. Anonimde
         hesap ucu SORULMAZ. Bu ekranda giriş yapılınca da yeniden sorulur. */
      if (status === "in") {
        const seated = await api
          .getSession(slug)
          .then((v) => !!v.viewer?.participantId, () => false);
        if (!alive) return;
        if (seated) {
          router.replace(`/s/${slug}`);
          return;
        }
      }
      if (loaded.current) return;
      try {
        const p = await api.preview(slug);
        if (!alive) return;
        loaded.current = true;
        setPreview(p);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, status]);

  /** K-B37 devri: katılım 409 `open_plan_seat_request_required` — önizleme bayat (gizli sanıldı).
      Tazelenir; `openPlan` gelince ekran plan detayına geçer. Döner: geçildi mi. */
  async function reloadPreview(): Promise<boolean> {
    try {
      const p = await api.preview(slug);
      loaded.current = true;
      setPreview(p);
      return !!p.openPlan;
    } catch {
      return false;
    }
  }

  if (failed) return <ErrorScreen kind="notFound" />;
  // Kapanmış buluşmaya katılım YOK: form gönderilince 409 dönerdi (çıkmaz sokak).
  // Durumu KAMU önizlemesi taşır — üye olmayan da okuyabilir.
  if (preview?.status === "EXPIRED") return <ErrorScreen kind="expired" />;
  if (preview?.status === "DECIDED") return <ErrorScreen kind="decided" />;
  // Açık plan (kitle ne olursa olsun, NONE dahil): katılım formu YOK, koltuk yalnız istekle (K-B37).
  if (preview?.openPlan) return <PlanIntroScreen slug={slug} preview={preview} />;

  const activities = preview?.activityTypes ?? [];
  const people = preview?.participants ?? [];
  const readyNames = people
    .filter((p) => p.hasLocation)
    .map((p) => p.displayName)
    .filter((n): n is string => !!n);

  return (
    <View style={s.screen}>
      {/* `.top` — SABİT (K-M26). Dil düğmesi burada: misafir ekranı okuyamıyorsa
          hiçbir şey yapamaz, ve hesabı olmadığı için tercih sayfasına gidemez. */}
      <View style={[s.bar, { paddingTop: insets.top + 10 }]}>
        <Wordmark />
        <LanguageButton />
      </View>

      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        {!preview ? (
          <View style={s.skeletons}>
            <Skeleton height={26} width="70%" />
            <Skeleton height={40} width="90%" />
            <Skeleton height={120} radius={22} />
          </View>
        ) : (
          <>
            <View style={s.invited}>
              <Avatar name={preview.hostDisplayName ?? "?"} tint={0} ring />
              <AppText variant="body" style={s.invitedText}>
                <Trans
                  i18nKey="join.invitedBy"
                  values={{ host: preview.hostDisplayName ?? "" }}
                  components={[<AppText key="0" style={s.host} />]}
                />
              </AppText>
            </View>

            {/* Adsız oturumda başlık BOŞ BIRAKILMAZ (K-M27): alan listesine düşülür. */}
            <AppText variant="display">
              {preview.name || activityListLabel(activities, t, i18n.resolvedLanguage ?? "tr")}
            </AppText>

            <View style={s.badges}>
              {activities.map((a) => {
                const Icon = ACTIVITY_ICON[a];
                return (
                  <Badge
                    key={a}
                    tone="flame"
                    icon={Icon ? <Icon size={13} color={colors.flameDeep} /> : undefined}
                  >
                    {t(`activity.${a}`)}
                  </Badge>
                );
              })}
              {preview.participantCount != null ? (
                <Badge>{t("join.joinedCount", { count: preview.participantCount })}</Badge>
              ) : null}
            </View>

            {/* "Kimler var" — hazır olanların adları YOKSA kart hiç çizilmez: boş bir
                "… hazır." cümlesi kurmaktansa satırı gizle. */}
            {readyNames.length > 0 ? (
              <Card style={s.who}>
                <AppText variant="over">{t("waiting.who")}</AppText>
                <View style={s.whoRow}>
                  <View style={s.stack}>
                    {people.slice(0, 4).map((p, i) => (
                      <Avatar
                        key={i}
                        name={p.displayName ?? "?"}
                        tint={i}
                        ring
                        style={i > 0 ? s.stacked : undefined}
                      />
                    ))}
                  </View>
                  <AppText variant="muted" style={s.whoCopy}>
                    {t("join.whoCopy", { names: readyNames.join(", "), count: readyNames.length })}
                  </AppText>
                </View>
              </Card>
            ) : null}

            {/* Host çevrimdışıysa açıkça söylenir — ama katılım ENGELLENMEZ. */}
            {preview.hostOnline === false ? (
              <Card tone="amber" style={s.away}>
                <MoonIcon size={17} color={colors.amber} />
                <AppText variant="muted" style={s.awayText}>
                  {t("join.hostAway", { host: preview.hostDisplayName ?? "" })}
                </AppText>
              </Card>
            ) : null}

            <View style={s.divider} />

            <JoinForm
              slug={slug}
              hostName={preview.hostDisplayName}
              sessionName={preview.name}
              onOpenPlan={reloadPreview}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.screenX,
    paddingBottom: 8,
    backgroundColor: colors.paper,
  },
  page: { paddingHorizontal: space.screenX, paddingBottom: 32, gap: 14 },
  skeletons: { gap: space.gap, paddingTop: 8 },
  invited: { flexDirection: "row", alignItems: "center", gap: 10 },
  invitedText: { flex: 1 },
  host: { fontWeight: "700" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  who: { gap: 8 },
  whoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stack: { flexDirection: "row" },
  stacked: { marginLeft: -10 },
  whoCopy: { flex: 1 },
  away: {
    backgroundColor: colors.amberWash,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: space.rowY,
  },
  awayText: { flex: 1, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.line },
});
