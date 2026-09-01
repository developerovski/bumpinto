import { useMemo } from "react";
import type { SessionView } from "@bumpinto/shared";
import { Highlight, Sticker, Wordmark } from "../components/atoms";
import VenueCard from "../components/molecules/VenueCard";
import ViralCard from "../components/molecules/ViralCard";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W4 · Sonuç — viral döngü. */
export default function ResultScreen({ view }: { view: SessionView }) {
  const winner = (view.venues ?? []).find((v) => v.id === view.decidedVenueId);
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı (artboard W3 rozet metni).
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of view.participants ?? []) {
      if (p.id) labels[p.id] = p.id === self?.id ? "Sana" : (p.displayName ?? "Arkadaşın");
    }
    return labels;
  }, [view.participants, self?.id]);

  if (!winner) return null;
  // Artboard: "Café <span class=hl-m>Berlage!</span>" — son sözcük ünlemle vurgulu.
  const words = (winner.name ?? "").trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.join(" ");

  return (
    <main className="page page--result">
      {/* Artboard W4 .cel — kutlama konfetisi; top değerleri 68px tarayıcı çerçevesi düşülerek. */}
      <span
        className="a-cel"
        style={{ left: 36, top: 42, width: 9, height: 9, background: "var(--sun)" }}
        aria-hidden
      />
      <span
        className="a-cel a-cel--sq"
        style={{ right: 48, top: 82, width: 7, height: 7, background: "var(--flame)" }}
        aria-hidden
      />
      <span
        className="a-cel"
        style={{ right: 90, top: 32, width: 6, height: 6, background: "#7c4dff" }}
        aria-hidden
      />
      <Wordmark />
      <div className="col" style={{ alignItems: "center", gap: 6 }}>
        <p className="a-ov a-ov--flame">Ortak nokta</p>
        <h1 style={{ textAlign: "center" }}>
          {head && `${head} `}
          <Highlight>{last}!</Highlight>
        </h1>
      </div>
      <div style={{ position: "relative" }}>
        {/* Artboard: .stk style="position:absolute;right:10px;top:-14px;z-index:3" */}
        <Sticker style={{ position: "absolute", right: 10, top: -14, zIndex: 3 }}>
          Karar verildi!
        </Sticker>
        <VenueCard
          venue={winner}
          photoHeight={150}
          hideTitle
          travelLabels={travelLabels}
          className="a-pol--winner"
        />
      </div>
      <a
        className="a-btn a-btn--flame"
        href={winner.mapsUrl ?? "#"}
        target="_blank"
        rel="noreferrer"
      >
        Yol tarifi al
      </a>
      <ViralCard />
    </main>
  );
}
