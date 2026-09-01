import { useState } from "react";
import type { SessionView } from "@bumpinto/shared";
import { Button, Wordmark } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import ParticipantList from "../components/organisms/ParticipantList";
import { api } from "../lib/api";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W2 · Katıldın — canlı bekleme. */
export default function WaitingRoom({ view }: { view: SessionView }) {
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
            if (self) setSelf({ ...self, locationLabel: "Mevcut konumun" });
            await refresh();
          } catch {
            setError("Konum güncellenemedi — tekrar dene.");
          } finally {
            setBusy(false);
          }
        })();
      },
      () => {
        setError("Konum izni alınamadı — adres yazabilirsin.");
        setBusy(false);
      },
    );
  }

  return (
    <main className="page">
      <Wordmark />

      <div className="a-card a-card--grass">
        <div className="row" style={{ gap: 11 }}>
          <span className="a-check" aria-hidden>
            <i />
          </span>
          <div className="field" style={{ gap: 2 }}>
            <span className="label">Katıldın!</span>
            {self && (
              <span className="muted">
                {self.locationLabel ? `${self.locationLabel} · ${self.name}` : self.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="field" style={{ alignItems: "center", gap: 14, padding: "14px 0 4px" }}>
        <MapMark />
        <div className="field" style={{ alignItems: "center", gap: 6 }}>
          <h2 style={{ textAlign: "center" }}>Deste hazırlanıyor…</h2>
          <p className="muted" style={{ textAlign: "center", maxWidth: "34ch" }}>
            Mekanlar gelince buradan kaydıracaksın — sayfayı kapatma yeter.
          </p>
        </div>
      </div>

      <ParticipantList participants={view.participants ?? []} />

      <Button type="button" kind="white" onClick={changeLocation} disabled={busy}>
        Konumumu değiştir
      </Button>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
    </main>
  );
}
