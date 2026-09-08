import { Suspense, lazy, useState } from "react";
import { apiErrorCode } from "../lib/apiError";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Button, Note, Page } from "../components/atoms";
import ActivityStrip from "../components/molecules/ActivityStrip";
import JoinedCard from "../components/molecules/JoinedCard";
import LazyBoundary from "../components/molecules/LazyBoundary";
import MidpointCard from "../components/molecules/MidpointCard";
import SessionSteps from "../components/molecules/SessionSteps";
import TwoZone from "../components/molecules/TwoZone";
import WaitingStatus from "../components/molecules/WaitingStatus";
import ParticipantList from "../components/organisms/ParticipantList";
import { sessionActivities } from "../lib/activity";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";
import { mapProps, useSessionStore, viewerOf } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/* Harita ayrı chunk — her iki kırılımda da ghost'un (butonun) arkasında. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** Artboard W5 · Bekle — canlı bekleme. Artboard'ın 1280 sağ bölgesinde HARİTA YOK (orta nokta
    kartı + "Mekanlar geliyor" + adım şeridi): harita artık masaüstünde de kendiliğinden açılmaz,
    iki kırılımda da "Haritayı aç" butonunun arkasındadır (2026-09-04 presence kararı §7'nin lg
    varsayılanı düşürüldü — rapor F/A-P1-1). Çerçeveleme otomatik: yeni katılımcı geldiğinde
    refresh() view'ı günceller, MapView kamerayı kendi refit eder. */
export default function WaitingRoom({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const updateLocation = useSessionStore((s) => s.updateLocation);
  const self = viewerOf(view);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>(self?.travelMode ?? DEFAULT_TRAVEL_MODE);
  const activities = sessionActivities(view);
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;
  const loc = useOwnLocation();
  const [showMap, setShowMap] = useState(false);
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
  // R-W6 kapısı ParticipantList'tekiyle AYNI: yalnız çevrimdışı YA DA konumu gelmemiş kişi
  // dürtülür. Artboard dürtmeyi DAVETLİ görünümünde gösteriyor → host kapısı yok.
  const viewerId = view.viewer?.participantId;
  const nudgeTargets = (view.participants ?? []).filter(
    (p) => !!p.id && p.id !== viewerId && !p.manual && !p.blocked && (p.online === false || !p.hasLocation),
  );

  function toggle() {
    setError(null);
    setOpen((o) => !o);
  }

  async function submitChange() {
    setError(null);
    setBusy(true);
    try {
      // LocationRequest.lat/lng zorunlu — yalnız ulaşım türü değişse de konum YENİDEN gönderilir
      // (sunucu viewer'a fuzzed approxLocation döner, gerçek koordinatı geri saklamaz).
      const resolved = await loc.resolve();
      if (!resolved) {
        setError(t(loc.address.trim() ? "join.errGeocode" : "join.errGeolocation"));
        return;
      }
      await updateLocation({ lat: resolved.lat, lng: resolved.lng, label: resolved.label ?? undefined, travelMode });
      setOpen(false);
    } catch (e) {
      setError(t(apiErrorCode(e) === "participants_too_far_apart"
        ? "join.errTooFar" : "waiting.errUpdate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page fit>
      {/* `mobileFirst` YOK: artboard 390 sırası "Katıldın → orta nokta → Mekanlar geliyor →
          Kimler var → roster" istiyor; iki bölge arasında geçişmeli sıra TwoZone ile mümkün
          değil, bu yüzden 390'da önce sol bölge (Katıldın + roster) akar — "Katıldın!" ve
          roster'ın ekranın en altına düşmesi (rapor F/B-P1-1) böyle giderilir. */}
      <TwoZone
        fill
        // Artboard W5 390 (1899-1955) sırası: "Katıldın!" → orta nokta → "Mekanlar geliyor" →
        // "Kimler var" (prog + adım şeridi + roster). Orta nokta ve bekleme kartı SAĞ bölgede
        // yaşıyor; `interleave` mobilde iki bölgeyi tek sütuna düzleştirir, sıra çocuk başına
        // `max-lg:order-*` ile verilir (bileşenler tek yerde kalır).
        interleave
        left={
          <>
            <div className="max-lg:order-1">
              <JoinedCard self={self} />
            </div>
            <div className="max-lg:order-4">
              <ActivityStrip activities={activities} km={km} />
            </div>
            <div className="flex flex-col gap-4 max-lg:order-5">
              <ParticipantList
              participants={view.participants ?? []}
              slug={view.slug ?? ""}
              isHost={!!view.viewer?.host}
              hideNudge
              /* Çapalı oturumda konum ŞART DEĞİL — davetli de host gibi "1 / 1 hazır" ve
                 "Konum vermedi · gerekmiyor" görmeli (Lobi ile aynı kural). */
              anchored={view.anchored === true}
                steps={<SessionSteps current="locations" />}
              />
            </div>
          </>
        }
        right={
          <>
            <div className="flex flex-col gap-4 max-lg:order-2">
              <MidpointCard view={view} />
            </div>
            <div className="max-lg:order-3">
              <WaitingStatus
              open={open}
              onToggle={toggle}
              onSubmit={() => void submitChange()}
              busy={busy}
              error={error}
              locationState={loc.state}
              locationLabel={loc.coords?.label ?? null}
              address={loc.address}
              onAddressChange={loc.setAddress}
              onUseLocation={loc.detect}
              onOtherAddress={loc.otherAddress}
              locationBusy={loc.busy}
              travelMode={travelMode}
              onTravelModeChange={setTravelMode}
              canSubmit={!!loc.coords || !!loc.address.trim()}
              nudgeTargets={nudgeTargets}
              slug={view.slug ?? ""}
              />
            </div>
            {/* Harita artboard'da hiç yok — uygulamaya özel ek (presence kararı §7 ghost'u).
                Bu yüzden bölgenin SONUNDA duruyor: artboard sırası (orta nokta → bekleme kartı →
                adım şeridi) bozulmaz. Açıldığında kalan yüksekliği alır — sabit ölçü YOK. */}
            {showMap ? (
              <div className="fit:min-h-[14rem] fit:flex-1 max-lg:order-6">
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
            ) : (
              <Button type="button" kind="white" size="fit" onClick={() => setShowMap(true)}>
                {t("waiting.openMap")}
              </Button>
            )}
            {/* Artboard 390 `.cta` notu (1971-1973). 1280'de f-steps'ten sonra not YOK.
                Konum gizliliği satırı (`join.privacy`) bu ekrandan çıktı — o cümle katılma
                anına ait (LobbyPage/JoinPage), burada tekrarlanmaz (rapor F/B-P2-6). */}
            <div className="lg:hidden">
              <Note center>{t("waiting.closeHint")}</Note>
            </div>
          </>
        }
      />
    </Page>
  );
}
