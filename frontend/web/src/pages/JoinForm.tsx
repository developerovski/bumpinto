import { useState, type FormEvent } from "react";
import { Avatar, Button, Highlight, TextInput, Wordmark } from "../components/atoms";
import Field from "../components/molecules/Field";
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
          label: "Mevcut konumun",
        }),
      () => setError("Konum izni alınamadı — adres yazabilirsin."),
    );
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
          setError("Bu adres bulunamadı — yakındaki bir şehri dene.");
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
      setError("Katılamadın — bu oturum kapanmış olabilir.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <Wordmark />
      <div className="field" style={{ gap: 12 }}>
        <div className="row">
          <Avatar name="B" ring />
          <span>Arkadaşın seni buluşmaya çağırdı</span>
        </div>
        <h1>
          <Highlight>Buluşmaya</Highlight> katıl
        </h1>
        <p className="muted">Konumunu at, ortada buluşalım. Hesap filan gerekmez.</p>
      </div>
      <div className="a-dv" />

      <form onSubmit={submit} className="field" style={{ gap: 15 }}>
        <Field
          id="join-name"
          label="Adın"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Arkadaşların sana ne der?"
          autoComplete="name"
        />
        <div className="field">
          <span className="label">Neredesin?</span>
          <Button type="button" kind="white" align="start" onClick={useMyLocation}>
            <span className="a-dot" aria-hidden>
              <i />
            </span>
            {coords ? coords.label : "Mevcut konumumu kullan"}
          </Button>
          <div className="a-dv-text">veya</div>
          <TextInput
            id="join-address"
            aria-label="Şehir ya da adres"
            placeholder="Şehir ya da adres yaz"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setCoords(null);
            }}
          />
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !name.trim()}>
          Katıl
        </Button>
        <p className="muted" style={{ textAlign: "center" }}>
          Konumun yalnızca bu buluşma için kullanılır.
        </p>
      </form>
    </main>
  );
}
