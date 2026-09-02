import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Page } from "../components/atoms";
import JoinFormFields from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import TwoZone from "../components/molecules/TwoZone";
import WhoIsHere from "../components/molecules/WhoIsHere";
import { geocode, reverseGeocode, type Coords } from "../lib/geocode";
import { useSessionStore } from "../store/sessionStore";

type LocationState = "idle" | "granted" | "denied";

export default function JoinForm() {
  const { t } = useTranslation();
  const preview = useSessionStore((s) => s.preview);
  const join = useSessionStore((s) => s.join);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef(address);

  function detectLocation(isCancelled: () => boolean = () => false) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isCancelled()) return;
        void (async () => {
          const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (isCancelled()) return;
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, label });
          // kullanıcı bu arada adres yazdıysa geç gelen otomatik konumu üzerine yazma
          if (!addressRef.current.trim()) setLocationState("granted");
        })();
      },
      () => {
        if (!isCancelled()) setLocationState("denied");
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator)) return;
    detectLocation(() => cancelled);
    return () => {
      cancelled = true;
    };
    // yalnız ilk mount'ta — konum izni bir kez otomatik istenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeAddress(value: string) {
    setAddress(value);
    addressRef.current = value;
    setCoords(null);
  }

  function otherAddress() {
    setLocationState("idle");
    setCoords(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let location = coords;
      if (!location && address.trim()) {
        location = await geocode(address.trim());
        if (!location) {
          setError(t("join.errGeocode"));
          return;
        }
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
      setBusy(false);
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
              address={address}
              locationState={locationState}
              locationLabel={coords?.label ?? null}
              error={error}
              busy={busy}
              onNameChange={setName}
              onAddressChange={changeAddress}
              onUseLocation={() => detectLocation()}
              onOtherAddress={otherAddress}
              onSubmit={submit}
            />
          </>
        }
        right={<WhoIsHere participants={preview?.participants ?? []} />}
      />
    </Page>
  );
}
