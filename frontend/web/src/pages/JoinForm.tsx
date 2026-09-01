import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Page, Wordmark } from "../components/atoms";
import JoinFormFields from "../components/molecules/JoinFormFields";
import JoinIntro from "../components/molecules/JoinIntro";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";

type Coords = { lat: number; lng: number; label: string };

// MVP tavizi (belgeli): Nominatim istemciden; trafik artarsa backend proxy.
async function geocode(query: string): Promise<Coords | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } },
  );
  const rows: { lat: string; lon: string; display_name: string }[] = await res.json();
  if (!rows.length) return null;
  return {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    label: rows[0].display_name.split(",")[0],
  };
}

export default function JoinForm(props: { slug: string; onJoined: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSelf = useSessionStore((s) => s.setSelf);

  function useMyLocation() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: t("join.currentLocation"),
        }),
      () => setError(t("join.errGeolocation")),
    );
  }

  function changeAddress(value: string) {
    setAddress(value);
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
      const joined = await api.join(props.slug, {
        displayName: name.trim(),
        lat: location?.lat,
        lng: location?.lng,
      });
      // W2 onay kartı + "(sen)" işareti için: SessionView "ben"i taşımıyor.
      setSelf({
        id: joined.participantId,
        name: name.trim(),
        locationLabel: location?.label ?? null,
      });
      props.onJoined(); // token HttpOnly cookie'de — web'de saklanmaz
    } catch {
      setError(t("join.errJoin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Wordmark />
      <JoinIntro />
      <JoinFormFields
        name={name}
        address={address}
        locationLabel={coords?.label ?? null}
        error={error}
        busy={busy}
        onNameChange={setName}
        onAddressChange={changeAddress}
        onUseLocation={useMyLocation}
        onSubmit={submit}
      />
    </Page>
  );
}
