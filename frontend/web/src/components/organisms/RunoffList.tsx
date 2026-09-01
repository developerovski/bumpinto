import { useState } from "react";
import type { VenueDto } from "@bumpinto/shared";
import { api } from "../../lib/api";
import { Button, HandNote } from "../atoms";
import VenueCard from "../molecules/VenueCard";

/** Artboard 07 Runoff — finalist kartları + "Seçimimi kilitle".
    Seçim görünümü kartın kendisinde (flame kenarlık + tikli daire); sarmalayıcı
    buton yalnız erişilebilir tıklama alanı, biçimi sıfırlanmıştır. */
export default function RunoffList(props: {
  slug: string;
  finalists: VenueDto[];
  travelLabels?: Record<string, string>;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function lockIn() {
    if (!choice || sending) return;
    setSending(true);
    try {
      await api.runoffVote(props.slug, { venueId: choice });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {props.finalists.map((v) => (
        <button
          key={v.id}
          type="button"
          className="a-pick-btn"
          aria-pressed={choice === v.id}
          disabled={sent}
          onClick={() => setChoice(v.id!)}
        >
          <VenueCard
            venue={v}
            variant="row"
            selected={choice === v.id}
            travelLabels={props.travelLabels}
          />
        </button>
      ))}
      {/* Artboard: .row(gap:8;justify-content:center;margin-top:4px) — sayaç kısmı
          ("2/3 seçti") RUNOFF durumunda veride yok, not kısmı birebir. */}
      <div className="row" style={{ gap: 8, justifyContent: "center", marginTop: 4 }}>
        <span className="a-mi">kim neyi seçti, sonuçta belli olur</span>
      </div>
      {sent ? (
        // Artboard'da karşılığı yok — plandaki işlevsel iskelet (oy gönderildi durumu).
        <HandNote style={{ textAlign: "center" }}>seçimin kilitli — diğerlerini bekliyoruz</HandNote>
      ) : (
        <Button type="button" onClick={() => void lockIn()} disabled={!choice || sending}>
          Seçimimi kilitle
        </Button>
      )}
    </>
  );
}
