import { useMemo } from "react";
import type { SessionView } from "@bumpinto/shared";
import { Sticker, Wordmark } from "../components/atoms";
import RunoffList from "../components/organisms/RunoffList";
import { useSessionStore } from "../store/sessionStore";

/** Kaynak: mobil `07 Runoff` artboard'u, webe birebir uyarlandı
    (durum çubuğu gibi mobil kabuk çıkarıldı, açılış Wordmark eklendi). */
export default function RunoffScreen(props: { slug: string; view: SessionView }) {
  const finalists = useMemo(
    () => (props.view.venues ?? []).filter((v) => props.view.runoffVenueIds?.includes(v.id!)),
    [props.view.venues, props.view.runoffVenueIds],
  );
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sen 34′ · Ayşe 28′" diyor.
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of props.view.participants ?? []) {
      if (p.id) labels[p.id] = p.id === self?.id ? "Sen" : (p.displayName ?? "Arkadaşın");
    }
    return labels;
  }, [props.view.participants, self?.id]);

  return (
    <main className="page">
      <Wordmark />
      {/* Artboard .top: .col style="gap:4px;align-items:flex-start" */}
      <div className="col" style={{ gap: 4, alignItems: "flex-start" }}>
        <Sticker>Son düzlük</Sticker>
        <h1 style={{ fontSize: 29, marginTop: 6 }}>
          İkisi de güzel,
          <br />
          biri kazanacak
        </h1>
      </div>
      <p className="muted">
        Herkes ikisini de beğendi. Tek seçim hakkın var — sonuç herkes seçince açıklanır.
      </p>
      <RunoffList slug={props.slug} finalists={finalists} travelLabels={travelLabels} />
    </main>
  );
}
