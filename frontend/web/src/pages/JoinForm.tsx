import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../components/atoms";
import JoinFormFields from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import TwoZone from "../components/molecules/TwoZone";
import WhoIsHere from "../components/molecules/WhoIsHere";
import MapView from "../components/organisms/MapView";
import { useSessionStore } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

export default function JoinForm() {
  const { t } = useTranslation();
  const preview = useSessionStore((s) => s.preview);
  const join = useSessionStore((s) => s.join);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loc = useOwnLocation({ autoDetect: true });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const location = await loc.resolve();
      if (!location && loc.address.trim()) {
        setError(t("join.errGeocode"));
        return;
      }
      // token HttpOnly cookie'de — web'de saklanmaz; join() görünümü tazeler
      await join({
        displayName: name.trim(),
        lat: location?.lat,
        lng: location?.lng,
        locationLabel: location?.label ?? undefined,
      });
    } catch {
      setError(t("join.errJoin"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page>
      <TwoZone
        left={
          <>
            <JoinIntro
              hostName={preview?.hostDisplayName ?? null}
              sessionName={preview?.name ?? null}
              activity={preview?.activityType ?? null}
              count={preview?.participantCount ?? 0}
            />
            <JoinFormFields
              name={name}
              address={loc.address}
              locationState={loc.state}
              locationLabel={loc.coords?.label ?? null}
              locationBusy={loc.busy}
              error={error}
              busy={submitting}
              onNameChange={setName}
              onAddressChange={loc.setAddress}
              onUseLocation={loc.detect}
              onOtherAddress={loc.otherAddress}
              onSubmit={submit}
            />
          </>
        }
        right={
          <WhoIsHere participants={preview?.participants ?? []}>
            <MapView participants={[]} venues={[]} midpoint={null} radiusKm={null} caption={t("map.joinToSee")} lgOnly />
          </WhoIsHere>
        }
      />
    </Page>
  );
}
