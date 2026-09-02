import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Page } from "../components/atoms";
import Confetti from "../components/molecules/Confetti";
import ShareButton from "../components/molecules/ShareButton";
import TravelList from "../components/molecules/TravelList";
import TwoZone from "../components/molecules/TwoZone";
import ViralCard from "../components/molecules/ViralCard";
import WinnerCard from "../components/molecules/WinnerCard";
import MapView from "../components/organisms/MapView";
import { GROUP_TINT, groupOf, sessionActivity } from "../lib/activity";
import { useTravelLabels } from "../lib/useTravelLabels";
import { mapProps } from "../store/sessionStore";

/** Artboard Karar 1280 · Sonuç — kazanan mekan + yol tarifi/paylaşım + viral döngü. */
export default function ResultScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const winner = (view.venues ?? []).find((v) => v.id === view.decidedVenueId);
  const participants = view.participants ?? [];
  const selfId = view.viewer?.participantId;
  const isHost = !!view.viewer?.host;
  const activity = sessionActivity(view);
  // travelMinutes katılımcı UUID'siyle anahtarlı (artboard W3 rozet metni).
  const travelLabels = useTravelLabels(view);

  if (!winner) return null;

  return (
    <Page variant="result">
      <Confetti />
      <TwoZone
        left={
          <>
            <WinnerCard venue={winner} travelLabels={travelLabels} />
            <ShareButton
              text={t("result.shareText", { name: view.name ?? "", venue: winner.name ?? "" })}
              url={`${location.origin}${location.pathname}`}
            />
          </>
        }
        right={
          <>
            <TravelList venue={winner} participants={participants} selfId={selfId} />
            <MapView
              participants={participants}
              venues={[winner]}
              selectedVenueId={winner.id ?? null}
              venueLabel="name"
              midpoint={null}
              radiusKm={null}
              heightClass="h-[10.625rem]"
              pinLabels={mapProps(view, t("map.you")).pinLabels}
              tint={GROUP_TINT[groupOf(activity)]}
              lgOnly
            />
            <ViralCard host={isHost} />
          </>
        }
      />
    </Page>
  );
}
