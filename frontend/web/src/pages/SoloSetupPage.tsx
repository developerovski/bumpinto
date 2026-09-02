import type { SessionView } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge, Button, ErrorText, HandNote, Note, Page } from "../components/atoms";
import ActivityBadge from "../components/molecules/ActivityBadge";
import SessionHeader from "../components/molecules/SessionHeader";
import TwoZone from "../components/molecules/TwoZone";
import MapView from "../components/organisms/MapView";
import PointsEditor from "../components/organisms/PointsEditor";
import { sessionActivity } from "../lib/activity";
import { pointCount } from "../store/newSessionStore";
import { mapProps, useSessionStore } from "../store/sessionStore";
import { useSessionAction } from "../store/useSessionAction";

/** SOLO host: sunucu taraflı nokta editörü + harita önizlemesi + "Mekanları bul". */
export default function SoloSetupPage({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const addPoint = useSessionStore((s) => s.addPoint);
  const removePoint = useSessionStore((s) => s.removePoint);
  const findVenues = useSessionStore((s) => s.findVenues);
  const { run, busy, error } = useSessionAction();

  const participants = view.participants ?? [];
  const host = participants.find((p) => p.host) ?? null;
  const manual = participants.filter((p) => p.manual);
  const count = pointCount(host?.hasLocation ? { label: host.locationLabel } : null, manual);
  const activity = sessionActivity(view);

  return (
    <Page>
      <SessionHeader
        as="h1"
        title={view.name}
        badges={
          <>
            <ActivityBadge activity={activity} />
            <Badge>{t("sessions.solo")}</Badge>
          </>
        }
      />
      <TwoZone
        left={
          <>
            <PointsEditor
              own={host?.hasLocation ? { label: host.locationLabel ?? null } : null}
              points={manual.map((p) => ({ displayName: p.displayName ?? "", locationLabel: p.locationLabel ?? null }))}
              onAdd={(p) =>
                run(
                  () => addPoint({ displayName: p.displayName, locationLabel: p.locationLabel ?? undefined, lat: p.lat, lng: p.lng }),
                  "lobby.errPoint",
                )
              }
              onRemove={(i) => {
                const id = manual[i]?.id;
                if (id) void run(() => removePoint(id), "lobby.errPoint");
              }}
            />
            <Button onClick={() => void run(findVenues, "lobby.errFind")} disabled={count < 2 || busy}>
              {t("newSession.findVenues")}
            </Button>
            <Note>{count < 2 ? t("newSession.needTwo") : t("newSession.findHint", { count })}</Note>
            {error && <ErrorText>{error}</ErrorText>}
          </>
        }
        right={
          <>
            <MapView {...mapProps(view, t("map.you"), t("newSession.manual"))} venues={[]} caption={t("map.midpointOnly")} />
            <HandNote>{t("newSession.soloHand")}</HandNote>
          </>
        }
      />
    </Page>
  );
}
