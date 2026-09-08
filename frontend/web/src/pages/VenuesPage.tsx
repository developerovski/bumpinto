import { useState } from "react";
import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadges from "../components/molecules/ActivityBadges";
import AvatarRow from "../components/molecules/AvatarRow";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import SessionHeader from "../components/molecules/SessionHeader";
import ShareButton from "../components/molecules/ShareButton";
import VenueSort, { type SortKey } from "../components/molecules/VenueSort";
import VenueBrowser from "../components/organisms/VenueBrowser";
import { activityListLabel, GROUP_TINT, groupOf, sessionActivities } from "../lib/activity";
import { track } from "../lib/analytics";
import { useMediaQuery } from "../lib/useMediaQuery";
import { useTravelLabels } from "../lib/useTravelLabels";
import { isHost, mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Artboard Mekanlar 1280/390 · BROWSING — mekan listesi/harita + host karıştır aksiyonu. */
export default function VenuesPage({ view }: { view: SessionView }) {
  const { t, i18n } = useTranslation();
  const host = isHost(view);
  const solo = view.sessionType === "SOLO";
  const mode = solo ? "solo" : host ? "host" : "guest";
  const shuffle = useSessionStore((s) => s.shuffle);
  const pick = useSessionStore((s) => s.pick);
  const { run, busy, error } = useSessionAction();
  const travel = useTravelLabels(view);
  const activities = sessionActivities(view);
  // Liste/harita kart başına ton taşımaz: sayfa çapındaki tek gradyan oturumun ilk alanından.
  const tint = GROUP_TINT[groupOf(activities[0] ?? "")];
  // Karışık deste (>1 ilgi alanı): satırlar kendi rozetlerini basar (bkz. VenueRow).
  const mixedDeck = activities.length > 1;
  const mp = mapProps(view, t("map.you"), solo ? t("newSession.manual") : undefined);
  // Sıralama artık sayfada yapılmaz — VenueBrowser saf fonksiyonlarla (byFairness/byRating) sıralar.
  const venues = view.venues ?? [];
  const participants = view.participants ?? [];

  // Artboard W3c 1280: SOLO'da sıralama rayı BAŞLIĞIN sağ yuvasında, "Bireysel · N konum" çipi
  // ise rozet satırında. Ray iki yerde birden basılmasın diye kırılma noktası burada ölçülür
  // (Landing.tsx ile aynı gerekçe: `DesktopOnly`/`MobileCta` çifti bloğu İKİ KEZ basardı, bir
  // radiogroup'un iki kopyası ekran okuyucuda iki ayrı denetim olurdu).
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [sort, setSort] = useState<SortKey>("fair");
  const soloSortInHeader = solo && desktop;

  // Sunucu kapisinin (409) AYNISI: konumu olan, elle eklenmemis ve odada olan katilimci >= 2.
  // `online` alani yoksa cevrimici sayilir — bilgi gelmeden host'un onune duvar cikmaz.
  const inRoom = participants.filter((p) => !p.manual && p.hasLocation && p.online !== false).length;

  const inviteUrl = `${location.origin}/j/${view.slug ?? ""}`;
  const shuffleDisabled = busy || inRoom < 2;
  const doShuffle = () =>
    void run(shuffle, "venues.errShuffle", { "participants present": "venues.errAlone" });

  // Katilim BROWSING'de hala acik (SessionCommands.CLOSED_TO_NEW_SEATS) — link de burada
  // olmali, yoksa kural izin verirken arayuz araci vermiyor. SOLO'da yok: o oturumun
  // davet linki hic calismaz.
  const invite = (kind: "white", size: "fit" | "md") => (
    <ShareButton
      text={t("venues.inviteText", { name: view.name })}
      url={inviteUrl}
      label={t("venues.invite")}
      copiedLabel={t("lobby.copied")}
      kind={kind}
      size={size}
      copyOnly
    />
  );

  const action =
    !solo ? (
      // Artboard W3b: avatarlar + tek birincil aksiyon YALNIZ 1280 başlığında; 390 host
      // panosunda başlıkta hiçbir denetim yok, ikisi de alttaki `.cta` bloğunda.
      // Avatarlar HOST'A ÖZEL DEĞİL: "oturumda kim var" kimlik bilgisidir, host denetimi değil —
      // davetli yalnız avatarları görür (davet + karıştır düğmeleri host'ta kalır). Artboard'ın
      // 1280 davetli panosu yok; 390 davetli panosunda da roster başlıkta duruyor (1531-1610).
      <DesktopOnly>
        <AvatarRow people={participants}>
          {host && (
            <>
              {invite("white", "fit")}
              <Button type="button" size="fit" disabled={shuffleDisabled} onClick={doShuffle}>
                {t("venues.shuffle")}
              </Button>
            </>
          )}
        </AvatarRow>
      </DesktopOnly>
    ) : soloSortInHeader ? (
      <VenueSort value={sort} onChange={setSort} />
    ) : undefined;

  return (
    <Page wide>
      <SessionHeader
        title={view.name}
        meta={
          view.radiusKm != null
            ? // Artboard W3b/W3c: "12 mekan · Eindhoven civarı · ≤ 9 km" — orta noktanın ADI
              // meta'nın parçası; yalnızca etiket gelmediğinde yersiz kısa biçime düşülür.
              view.midpointLabel
              ? t("venues.metaWithPlace", {
                  count: venues.length,
                  place: view.midpointLabel,
                  km: Math.round(view.radiusKm),
                })
              : t("venues.meta", { count: venues.length, km: Math.round(view.radiusKm) })
            : t("venues.metaNoRadius", { count: venues.length })
        }
        badges={
          // Durum çipi rozet satırında: 390'da başlığın SAĞINDA durunca oturum adını eziyordu
          // (artboard W3b 390 davetli panosunda çip kendi satırında).
          <>
            <ActivityBadges activities={activities} />
            {solo && <Badge>{t("venues.soloBadge", { count: participants.length })}</Badge>}
            {!solo && !host && <Badge tone="amber">{t("venues.guestWait")}</Badge>}
          </>
        }
        action={action}
      />
      {/* Backend telafi çağrısı yapmıyor (Places bütçesi) — boş kalan alan sessiz bir
          hata gibi okunmasın diye burada açıkça söylenir. */}
      {(view.emptyActivityTypes ?? []).length > 0 && (
        <p className="text-[0.8125rem] font-semibold text-amber">
          {t("venues.noneFor", {
            activity: activityListLabel(view.emptyActivityTypes ?? [], t, i18n.resolvedLanguage ?? "en"),
          })}
        </p>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      {/* Sessizce olu buton olmaz: kapaliysa sebebi ve cikisi yazili. */}
      {host && !solo && inRoom < 2 && !error && <Note center>{t("venues.needTwo")}</Note>}
      <VenueBrowser
        venues={venues}
        participants={mp.participants}
        midpoint={mp.midpoint}
        radiusKm={mp.radiusKm}
        mode={mode}
        travel={travel}
        onPick={(id) => void run(() => pick(id), "venues.errPick")}
        tint={tint}
        mixedDeck={mixedDeck}
        pinLabels={mp.pinLabels}
        midpointLabel={view.midpointLabel}
        onMapOpen={() => track("map_open", { screen: "venues" })}
        hideSort={soloSortInHeader}
        sort={sort}
        onSortChange={setSort}
      />
      {host && !solo && (
        // Artboard W3b 390 host `.cta`: tam genişlik "Karıştır ve kaydır" + ortalı not.
        // Davet linki de buraya iner — 390 başlığında üç denetim yarışıyordu.
        <MobileCta fade>
          {invite("white", "md")}
          <Button type="button" disabled={shuffleDisabled} onClick={doShuffle}>
            {t("venues.shuffle")}
          </Button>
          <Note center>{t("venues.everyoneSeesShort")}</Note>
        </MobileCta>
      )}
    </Page>
  );
}
