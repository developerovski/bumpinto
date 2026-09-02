import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, Note, Page } from "../components/atoms";
import ActivityBadge from "../components/molecules/ActivityBadge";
import InviteCard from "../components/molecules/InviteCard";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import MapView from "../components/organisms/MapView";
import ParticipantList from "../components/organisms/ParticipantList";
import { sessionActivity } from "../lib/activity";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** Artboard W3 Lobi — GROUP host: davet linki + katılımcılar + harita + "Mekanları bul". */
export default function LobbyPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const findVenues = useSessionStore((s) => s.findVenues);
  const { run, busy, error } = useSessionAction();

  const participants = view.participants ?? [];
  const located = participants.filter((p) => p.hasLocation).length;
  const waiting = participants.find((p) => !p.hasLocation);
  const activity = sessionActivity(view);
  const { participants: mapParticipants, midpoint, radiusKm, pinLabels } = mapProps(view, t("map.you"));
  const caption = view.radiusKm != null ? t("map.midpoint", { km: Math.round(view.radiusKm) }) : t("map.midpointPending");

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
        left={
          <>
            <InviteCard slug={view.slug ?? ""} />
            <ParticipantList participants={participants} />
          </>
        }
        right={
          <>
            <MapView
              participants={mapParticipants}
              venues={[]}
              midpoint={midpoint}
              radiusKm={radiusKm}
              pinLabels={pinLabels}
              caption={caption}
            />
            <Button onClick={() => void run(findVenues, "lobby.errFind")} disabled={located < 2 || busy}>
              {t("newSession.findVenues")}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
            {waiting && <Note center>{t("lobby.late", { name: waiting.displayName })}</Note>}
          </>
        }
      />
    </Page>
  );
}
