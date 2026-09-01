import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Button, ErrorText, Page, Wordmark } from "../components/atoms";
import JoinedCard from "../components/molecules/JoinedCard";
import WaitingStatus from "../components/molecules/WaitingStatus";
import ParticipantList from "../components/organisms/ParticipantList";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W2 · Katıldın — canlı bekleme. */
export default function WaitingRoom({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const slug = useSessionStore((s) => s.slug);
  const self = useSessionStore((s) => s.self);
  const setSelf = useSessionStore((s) => s.setSelf);
  const refresh = useSessionStore((s) => s.refresh);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeLocation() {
    setError(null);
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void (async () => {
          try {
            await api.updateLocation(slug, {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
            if (self) setSelf({ ...self, locationLabel: t("join.currentLocation") });
            await refresh();
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
    );
  }

  return (
    <Page>
      <Wordmark />
      <JoinedCard self={self} />
      <WaitingStatus />
      <ParticipantList participants={view.participants ?? []} />
      <Button type="button" kind="white" onClick={changeLocation} disabled={busy}>
        {t("waiting.changeLocation")}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </Page>
  );
}
