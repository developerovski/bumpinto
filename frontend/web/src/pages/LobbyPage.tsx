import { Suspense, lazy, useState } from "react";
import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadge from "../components/molecules/ActivityBadge";
import ActivityStrip from "../components/molecules/ActivityStrip";
import InviteCard from "../components/molecules/InviteCard";
import LazyBoundary from "../components/molecules/LazyBoundary";
import LgOnly from "../components/molecules/LgOnly";
import MidpointCard from "../components/molecules/MidpointCard";
import SessionHeader from "../components/molecules/SessionHeader";
import SessionSteps from "../components/molecules/SessionSteps";
import TwoZone from "../components/molecules/TwoZone";
import ParticipantList from "../components/organisms/ParticipantList";
import { sessionActivity } from "../lib/activity";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/* Harita ayrı chunk (harita politikası §4.7) — yalnız ghost'a basılınca mount edilir. */
const MapView = lazy(() => import("../components/organisms/MapView"));

/** Artboard W3 Lobi — GROUP host: davet linki + katılımcılar + harita (ghost arkasında,
    yalnız lg) + "Mekanları bul". Harita politikası (§4.7): 390'da hiçbir zaman mount olmaz. */
export default function LobbyPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const findVenues = useSessionStore((s) => s.findVenues);
  const { run, busy, error } = useSessionAction();
  const [mapOpen, setMapOpen] = useState(false);

  const participants = view.participants ?? [];
  const located = participants.filter((p) => p.hasLocation).length;
  const waiting = participants.find((p) => !p.hasLocation);
  const activity = sessionActivity(view);
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;

  return (
    <Page>
      <SessionHeader
        as="h1"
        title={view.name}
        badges={
          <>
            <ActivityBadge activity={activity} />
            <Badge tone="amber">{t("lobby.collecting")}</Badge>
          </>
        }
      />
      <TwoZone
        mobileFirst="right"
        left={
          <>
            <InviteCard slug={view.slug ?? ""} />
            <ActivityStrip activity={activity} km={km} />
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
            {mapOpen ? (
              <LazyBoundary fallback={<Note center>{t("map.notConfigured")}</Note>}>
                <Suspense fallback={<Note center>{t("map.loading")}</Note>}>
                  <MapView
                    participants={mapParticipants}
                    venues={[]}
                    midpoint={midpoint}
                    radiusKm={radiusKm}
                    pinLabels={pinLabels}
                    lgOnly
                  />
                </Suspense>
              </LazyBoundary>
            ) : (
              <LgOnly>
                <Button type="button" kind="white" size="fit" onClick={() => setMapOpen(true)}>
                  {t("lobby.openMap")}
                </Button>
              </LgOnly>
            )}
            <Button onClick={() => void run(findVenues, "lobby.errFind")} disabled={located < 2 || busy}>
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
