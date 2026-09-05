import { Suspense, lazy, useState } from "react";
import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadges from "../components/molecules/ActivityBadges";
import ActivityStrip from "../components/molecules/ActivityStrip";
import InviteCard from "../components/molecules/InviteCard";
import LazyBoundary from "../components/molecules/LazyBoundary";
import MidpointCard from "../components/molecules/MidpointCard";
import SessionHeader from "../components/molecules/SessionHeader";
import SessionSteps from "../components/molecules/SessionSteps";
import TwoZone from "../components/molecules/TwoZone";
import ParticipantList from "../components/organisms/ParticipantList";
import { sessionActivities } from "../lib/activity";
import { useMediaQuery } from "../lib/useMediaQuery";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/* Harita ayrı chunk — lg+ varsayılan mount, 2026-09-04 prezans kararı §7 (§4.7'nin "ghost
   arkasında" maddesini değiştirdi). 390'da ghost kalır: chunk ve Maps faturası bedava değil. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** Artboard W3 Lobi — GROUP host: davet linki + katılımcılar + harita (lg+ varsayılan açık,
    390'da ghost arkasında — 2026-09-04 prezans kararı §7) + "Mekanları bul". */
export default function LobbyPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const findVenues = useSessionStore((s) => s.findVenues);
  const { run, busy, error } = useSessionAction();
  const desktop = useMediaQuery("(min-width: 1024px)");
  // 390'da ghost'a basilinca; lg'de dogrudan. Tek yonlu OR: genislik degisse de kullanicinin
  // ghost'a bastigi durum korunur.
  const [mapOpen, setMapOpen] = useState(false);
  const showMap = desktop || mapOpen;

  const participants = view.participants ?? [];
  const located = participants.filter((p) => p.hasLocation).length;
  const waiting = participants.find((p) => !p.hasLocation);
  const activities = sessionActivities(view);
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;

  return (
    <Page fit>
      <SessionHeader
        as="h1"
        title={view.name}
        badges={
          <>
            <ActivityBadges activities={activities} />
            <Badge tone="amber">{t("lobby.collecting")}</Badge>
          </>
        }
      />
      <TwoZone
        fill
        mobileFirst="right"
        left={
          <>
            <InviteCard slug={view.slug ?? ""} />
            <ActivityStrip activities={activities} km={km} />
            <SessionSteps current="locations" />
            <ParticipantList participants={participants} />
          </>
        }
        right={
          <>
            {/* Orta nokta kartı harita şeridinin yerini alır (§4.7: harita 390'da varsayılan
                yok). Harita açılınca da TEK yerde basılır — MapView'e ayrıca caption verilmez
                (kod-review bulgusu: iki kez basılıyordu). */}
            <MidpointCard view={view} />
            {/* Harita kalan yüksekliği alır — sabit ölçü YOK. `fit:min-h-[14rem]` taban: sağ kolon
                (orta nokta + CTA + notlar) kalanı yerse harita silinmez, bölge kendi içinde kayar. */}
            {showMap ? (
              <div className="fit:min-h-[14rem] fit:flex-1">
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
              <Button type="button" kind="white" size="fit" onClick={() => setMapOpen(true)}>
                {t("lobby.openMap")}
              </Button>
            )}
            {/* Çapalı oturumda merkez katılımcılardan türemez, bu yüzden backend'in konum
                önkoşulu B-10'da DÜŞTÜ (DeckFlow.findVenues). Kapı da bilmeli — yoksa backend
                kabul ederken düğme kapalı kalır ve oturum COLLECTING'de asılı kalır. */}
            <Button
              onClick={() => void run(findVenues, "lobby.errFind")}
              disabled={(!view.anchored && located < 2) || busy}
            >
              {t("newSession.findVenues")}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            <Note center>{t("join.privacy")}</Note>
            {waiting && <Note center>{t("lobby.late", { name: waiting.displayName })}</Note>}
          </>
        }
      />
    </Page>
  );
}
