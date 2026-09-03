import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { Note, Page } from "../components/atoms";
import ActivityStrip from "../components/molecules/ActivityStrip";
import JoinedCard from "../components/molecules/JoinedCard";
import MidpointCard from "../components/molecules/MidpointCard";
import SessionSteps from "../components/molecules/SessionSteps";
import TwoZone from "../components/molecules/TwoZone";
import WaitingStatus from "../components/molecules/WaitingStatus";
import ParticipantList from "../components/organisms/ParticipantList";
import { sessionActivity } from "../lib/activity";
import { DEFAULT_TRAVEL_MODE, type TravelMode } from "../lib/travelMode";
import { useSessionStore, viewerOf } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/** Artboard W2 · Katıldın — canlı bekleme. Harita YOK (§4.7 — Bekle'de harita hiç mount
    edilmez); orta nokta kartı yeterli bilgiyi verir. */
export default function WaitingRoom({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const updateLocation = useSessionStore((s) => s.updateLocation);
  const self = viewerOf(view);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>(self?.travelMode ?? DEFAULT_TRAVEL_MODE);
  const activity = sessionActivity(view);
  const km = view.radiusKm != null ? Math.round(view.radiusKm) : null;
  const loc = useOwnLocation();

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
    } catch {
      setError(t("waiting.errUpdate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <TwoZone
        mobileFirst="right"
        left={
          <>
            <JoinedCard self={self} />
            <ActivityStrip activity={activity} km={km} />
            <ParticipantList participants={view.participants ?? []} />
          </>
        }
        right={
          <>
            <MidpointCard view={view} />
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
            />
            <SessionSteps current="locations" />
            {/* §5.C gizlilik satırı — LobbyPage.tsx ile AYNI anahtar (`join.privacy`),
                tekrarlanmaz/yeniden yazılmaz. */}
            <Note center>{t("join.privacy")}</Note>
          </>
        }
      />
    </Page>
  );
}
