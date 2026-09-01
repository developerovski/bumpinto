import { useEffect } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { useDeckStore } from "../../store/deckStore";
import { Progress } from "../atoms";
import DeckActions from "../molecules/DeckActions";
import VenueCard from "../molecules/VenueCard";

/** Artboard W3 · .prog + .deck + aksiyonlar + klavye ipucu. */
export default function VenueDeck(props: {
  venues: VenueDto[];
  travelLabels?: Record<string, string>;
}) {
  const venues = props.venues;
  const index = useDeckStore((s) => s.index);
  const decide = useDeckStore((s) => s.decide);
  const undo = useDeckStore((s) => s.undo);
  const current = venues[index];
  const next = venues[index + 1];
  const third = venues[index + 2];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      if (e.key === "ArrowRight") void decide(current.id!, true);
      if (e.key === "ArrowLeft") void decide(current.id!, false);
      if (e.key === "Backspace" && venues[index - 1]) void undo(venues[index - 1].id!);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, decide, undo, venues, index]);

  if (!current) return null;
  return (
    <>
      {/* Artboard: sayaç ile aynı sayı — 4/12 → %33. */}
      <div style={{ marginBottom: 14, flex: "0 0 auto" }}>
        <Progress value={Math.min(index + 1, venues.length) / venues.length} />
      </div>
      <div className="a-deck">
        {/* Arka katmanlar artboard'da yalnız fotoğraf alanı gösterir. */}
        {third && (
          <VenueCard venue={third} photoOnly className="a-pol--d3" style={{ height: 390 }} />
        )}
        {next && <VenueCard venue={next} photoOnly className="a-pol--d2" style={{ height: 400 }} />}
        <VenueCard venue={current} className="a-pol--d1" travelLabels={props.travelLabels} />
      </div>
      <DeckActions
        onUndo={() => venues[index - 1] && void undo(venues[index - 1].id!)}
        onPass={() => void decide(current.id!, false)}
        onLike={() => void decide(current.id!, true)}
      />
      <div
        className="row"
        style={{ justifyContent: "center", gap: 8, marginTop: 12, flex: "0 0 auto" }}
      >
        <span className="a-kbd">←</span>
        <span className="a-mi">geç</span>
        <span className="a-mi" style={{ margin: "0 4px" }}>
          ·
        </span>
        <span className="a-kbd">→</span>
        <span className="a-mi">beğen</span>
      </div>
    </>
  );
}
