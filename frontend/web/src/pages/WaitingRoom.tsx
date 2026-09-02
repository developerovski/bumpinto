import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Page } from "../components/atoms";
import JoinedCard from "../components/molecules/JoinedCard";
import TwoZone from "../components/molecules/TwoZone";
import WaitingStatus from "../components/molecules/WaitingStatus";
import MapView from "../components/organisms/MapView";
import ParticipantList from "../components/organisms/ParticipantList";
import { reverseGeocode } from "../lib/geocode";
import { mapProps, useSessionStore, viewerOf } from "../store/sessionStore";

/** Artboard W2 · Katıldın — canlı bekleme. */
export default function WaitingRoom({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const updateLocation = useSessionStore((s) => s.updateLocation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeLocation() {
    setError(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            const locationLabel = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
            // etiket sunucudan gelir — updateLocation() görünümü tazeler
            await updateLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              label: locationLabel ?? undefined,
            });
          } catch {
            setError(t("waiting.errUpdate"));
          } finally {
            setBusy(false);
          }
        })();
      },
      () => {
        setError(t("join.errGeolocation"));
        setBusy(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <Page>
      <TwoZone
        left={
          <>
            <JoinedCard self={viewerOf(view)} />
            <ParticipantList participants={view.participants ?? []} />
          </>
        }
        right={
          <>
            <MapView
              {...mapProps(view, t("map.you"))}
              venues={[]}
              caption={view.radiusKm != null ? t("map.midpoint", { km: Math.round(view.radiusKm) }) : t("map.midpointPending")}
              lgOnly
            />
            <WaitingStatus onChange={changeLocation} busy={busy} error={error} />
          </>
        }
      />
    </Page>
  );
}
