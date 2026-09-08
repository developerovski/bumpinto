import { Suspense, lazy, useState } from "react";
import VoiceDock from "../components/organisms/VoiceDock";
import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadges from "../components/molecules/ActivityBadges";
import ActivityStrip from "../components/molecules/ActivityStrip";
import InviteCard from "../components/molecules/InviteCard";
import LazyBoundary from "../components/molecules/LazyBoundary";
import MidpointCard from "../components/molecules/MidpointCard";
import SessionHeader from "../components/molecules/SessionHeader";
import SessionSteps from "../components/molecules/SessionSteps";
import TwoZone from "../components/molecules/TwoZone";
import ParticipantList from "../components/organisms/ParticipantList";
import VenuesLoading from "../components/organisms/VenuesLoading";
import { sessionActivities } from "../lib/activity";
import { useMediaQuery } from "../lib/useMediaQuery";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/* Harita ayrı chunk — lg+ varsayılan mount, 2026-09-04 prezans kararı §7 (§4.7'nin "ghost
   arkasında" maddesini değiştirdi). 390'da ghost kalır: chunk ve Maps faturası bedava değil. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** Artboard W3 Lobi / W3d Lobi çapalı — GROUP host: davet linki + katılımcılar + harita
    (lg+ varsayılan açık, 390'da orta nokta kartındaki "Haritada gör" düğmesinin arkasında —
    2026-09-04 prezans kararı §7) + "Mekanları bul". */
export default function LobbyPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const findVenues = useSessionStore((s) => s.findVenues);
  const { run, busy, error } = useSessionAction();
  const desktop = useMediaQuery("(min-width: 1024px)");
  // 390'da ghost'a basilinca; lg'de dogrudan. Tek yonlu OR: genislik degisse de kullanicinin
  // ghost'a bastigi durum korunur.
  const [mapOpen, setMapOpen] = useState(false);
  const showMap = desktop || mapOpen;

  const anchored = view.anchored === true;
  const participants = view.participants ?? [];
  const located = participants.filter((p) => p.hasLocation).length;
  // Çapalıda kimsenin konumu BEKLENMİYOR: "X yetişemezse sonradan katılır" cümlesi orada
  // yanlış bir beklenti kurar (üstelik tek kişilik çapalı oturumda host'un KENDİSİNİ işaret
  // ederdi — konumu olmayan ilk katılımcı o).
  const waiting = anchored ? undefined : participants.find((p) => !p.hasLocation);
  const activities = sessionActivities(view);
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;

  // İstek uçarken tüm ekran iskelete döner (artboard W3e): "Mekanları bul" tek yönlü bir kapı,
  // arkasında lobi tazelenmiyor.
  if (busy) return <VenuesLoading view={view} />;

  return (
    <Page fit>
      <SessionHeader
        as="h1"
        // Artboard 390 başlığı `.h2` (21px), 1280 `.big` (46px) — h1 tek başına 34/46px verirdi.
        // Semantik h1 KALIR, yalnız ölçü sarmalayıcıdan gelir (SessionHeader paylaşılan dosya).
        title={<span className="text-h2 lg:text-display-lg">{view.name}</span>}
        badges={
          <>
            <ActivityBadges activities={activities} />
            {/* Durum: 1280'de amber rozet, 390'da "· konumlar toplanıyor" düz metni (artboard
                1180 / 4099). Badge atomu className almadığı için zincir burada; DOM'u ikiye
                bölmek (biri `lg:hidden`) ekran okuyucuya aynı cümleyi iki kez okuturdu. */}
            <span className="text-[0.75rem] text-ink2 before:content-['·_'] lg:inline-block lg:rounded-full lg:bg-amber-wash lg:px-[0.6875rem] lg:py-[0.28125rem] lg:font-bold lg:whitespace-nowrap lg:text-amber-ink lg:before:content-none">
              {t(anchored ? "lobby.anchoredBadge" : "lobby.collecting")}
            </span>
          </>
        }
        action={<VoiceDock view={view} placement="header" />}
      />
      <TwoZone
        fill
        // Artboard 390 (1183-1246) sırası: davet → orta nokta → "Kimler var" → not → CTA.
        // Orta nokta SAĞ bölgede yaşıyor; `interleave` iki bölgeyi mobilde tek sütuna düzleştirir
        // ve sıra çocuk başına `max-lg:order-*` ile verilir (bileşen tek yerde kalır, kopya yok).
        interleave
        left={
          <>
            {/* Etkinlik şeridi yalnız 1280 çapasızda: 390'da artboard rozetlerle yetiniyor
                (1177–1181) ve çapalıda vaat cümlesi ("orta nokta çevresinde aranacak") YANLIŞ
                olur — merkez orta nokta değil, host'un seçtiği sabit yer. */}
            {!anchored && (
              <div className="hidden lg:block">
                <ActivityStrip activities={activities} km={km} />
              </div>
            )}
            <div className="max-lg:order-1">
              <InviteCard slug={view.slug ?? ""} joinCode={view.joinCode} sessionName={view.name} />
            </div>
            <div className="flex flex-col gap-4 max-lg:order-3">
              <ParticipantList
              participants={participants}
              slug={view.slug ?? ""}
              isHost={!!view.viewer?.host}
              anchored={anchored}
              steps={<SessionSteps current="locations" />}
              />
            </div>
            {/* Artboard 1129 / 4029: gizlilik notu sol bölgenin SONUNDA. Çapalıda gizlilik
                metni yanlış vaat olur (konum vermek zorunlu değil) — yerini çapa notu alır. */}
            <div className="max-lg:order-4">
              <Note>{t(anchored ? "lobby.anchoredNote" : "lobby.privacy")}</Note>
            </div>
          </>
        }
        right={
          <>
            {/* Orta nokta kartı harita şeridinin yerini alır (§4.7: harita 390'da varsayılan
                yok). Harita açılınca da TEK yerde basılır — MapView'e ayrıca caption verilmez
                (kod-review bulgusu: iki kez basılıyordu). Haritayı açan düğme kartın içinde
                (artboard 1198): harita zaten görünüyorsa hiç basılmaz. */}
            <div className="flex flex-col gap-4 max-lg:order-2">
              <MidpointCard view={view} attribution={false} onOpenMap={showMap ? undefined : () => setMapOpen(true)} />
            </div>
            {/* Harita kalan yüksekliği alır — sabit ölçü YOK. `fit:min-h-[14rem]` taban: sağ kolon
                (orta nokta + CTA + notlar) kalanı yerse harita silinmez, bölge kendi içinde kayar. */}
            {showMap && (
              <div className="fit:min-h-[14rem] fit:flex-1 max-lg:order-5">
                <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                  <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                    <MapView
                      participants={mapParticipants}
                      venues={[]}
                      midpoint={midpoint}
                      radiusKm={radiusKm}
                      pinLabels={pinLabels}
                      heightClass="h-[20rem] fit:h-full"
                    />
                  </Suspense>
                </LazyBoundary>
              </div>
            )}
            {/* Çapalı oturumda merkez katılımcılardan türemez, bu yüzden backend'in konum
                önkoşulu B-10'da DÜŞTÜ (DeckFlow.findVenues). Kapı da bilmeli — yoksa backend
                kabul ederken düğme kapalı kalır ve oturum COLLECTING'de asılı kalır. */}
            {/* CTA bloğu mobilde EN SONDA (artboard `.cta`); masaüstünde sağ bölgenin akışında
                kalır — sarmalayıcının `gap-4`ü bölge boşluğuyla aynı, görüntü değişmez. */}
            <div className="flex flex-col gap-4 max-lg:order-6">
            <Button
              onClick={() => void run(findVenues, "lobby.errFind")}
              disabled={!anchored && located < 2}
            >
              {t("newSession.findVenues")}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {waiting ? (
              <Note center>{t("lobby.late", { name: waiting.displayName })}</Note>
            ) : anchored ? (
              // Artboard 4046: tek kişilik çapalı oturumda CTA altı boş kalmasın — "yeterli
              // kişi yok" hissi verirdi, oysa çapalıda tek başına aramak geçerli bir yol.
              <Note center>{t("lobby.anchoredSolo")}</Note>
            ) : null}
            {/* Artboard 1149: OSM atfı bölgenin EN SONUNDA, ortalanmış — orta nokta kartının
                hemen altında değil. Yalnız ekranda OSM türevi bir etiket varken basılır. */}
            {view.midpointLabel && (
              <span className="self-center text-[0.6875rem] tracking-[0.02em] text-ink2">
                {t("attribution.osm")}
              </span>
            )}
            </div>
          </>
        }
      />
    </Page>
  );
}
