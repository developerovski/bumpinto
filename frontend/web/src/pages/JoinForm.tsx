import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../components/atoms";
import JoinFormFields from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import TwoZone from "../components/molecules/TwoZone";
import WhoIsHere from "../components/molecules/WhoIsHere";
import MapView from "../components/organisms/MapView";
import type { ParticipantDto } from "@bumpinto/shared";
import { approx } from "../lib/geo";
import { useSessionStore } from "../store/sessionStore";
import { useOwnLocation } from "../store/useOwnLocation";

/** Kendi pinimizin id'si — gercek katilimci id'si henuz yok (katilim oncesi). */
const SELF_PIN = "self";

export default function JoinForm() {
  const { t } = useTranslation();
  const preview = useSessionStore((s) => s.preview);
  const join = useSessionStore((s) => s.join);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loc = useOwnLocation({ autoDetect: true });

  // Artboard W4: harita katilmadan once de KENDI konumunu gosterir ("sen · katilinca").
  // Baskalarinin konumu burada yok — preview DTO'su onlari tasimaz (davetli anonimdir).
  const ownPin: ParticipantDto[] = useMemo(
    () =>
      loc.coords
        ? [{
            id: SELF_PIN,
            // Isim yazilana kadar bos — participantPin "?" gosterir; artboard'da
            // avatar isim bas harfidir.
            displayName: name.trim(),
            host: false,
            hasLocation: true,
            deckDone: false,
            // Artboard .pin-av.man: katilim ONCESI kendi pinin kesikli/beyazdir,
            // "henuz kesinlesmedi" anlaminda. Konum izniyle ilgisi yok.
            manual: true,
            approxLocation: approx({ lat: loc.coords.lat, lng: loc.coords.lng }),
          }]
        : [],
    [loc.coords, name],
  );

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
            <MapView
              participants={ownPin}
              pinLabels={{ [SELF_PIN]: t("map.youPending") }}
              venues={[]}
              midpoint={null}
              radiusKm={null}
              caption={t("map.midpointPending")}
              lgOnly
            />
          </WhoIsHere>
        }
      />
    </Page>
  );
}
