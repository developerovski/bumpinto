import { useEffect, useMemo } from "react";
import type { SessionView } from "@bumpinto/shared";
import { Button, Highlight, Wordmark } from "../components/atoms";
import VenueCard from "../components/molecules/VenueCard";
import VenueDeck from "../components/organisms/VenueDeck";
import { useDeckStore } from "../store/deckStore";
import { useSessionStore } from "../store/sessionStore";

/** Artboard W3 · Deste web — tıkla veya kaydır. */
export default function DeckScreen(props: { slug: string; view: SessionView }) {
  const venues = useMemo(
    () => [...(props.view.venues ?? [])].sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0)),
    [props.view.venues],
  );
  const self = useSessionStore((s) => s.self);
  // travelMinutes katılımcı UUID'siyle anahtarlı; artboard "Sana 28 dk · Mehmet 34 dk" diyor.
  const travelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of props.view.participants ?? []) {
      if (p.id) labels[p.id] = p.id === self?.id ? "Sana" : (p.displayName ?? "Arkadaşın");
    }
    return labels;
  }, [props.view.participants, self?.id]);

  const index = useDeckStore((s) => s.index);
  const liked = useDeckStore((s) => s.liked);
  const listMode = useDeckStore((s) => s.listMode);
  const sending = useDeckStore((s) => s.sending);
  const start = useDeckStore((s) => s.start);
  const setLike = useDeckStore((s) => s.setLike);
  const setListMode = useDeckStore((s) => s.setListMode);
  const finish = useDeckStore((s) => s.finish);

  useEffect(() => {
    start(props.slug, venues.length);
  }, [props.slug, venues.length, start]);

  const finished = index >= venues.length;
  const likedCount = Object.values(liked).filter(Boolean).length;

  // Artboard'da karşılığı yok — plandaki işlevsel iskelet.
  if (finished && !listMode) {
    return (
      <main className="page" style={{ justifyContent: "center", textAlign: "center" }}>
        <Wordmark />
        <h1>
          Deste <Highlight>bitti!</Highlight>
        </h1>
        <p className="muted">{likedCount} mekanı beğendin.</p>
        <Button type="button" onClick={() => void finish()} disabled={sending}>
          Beğenilerimi gönder
        </Button>
        <Button type="button" kind="white" onClick={() => setListMode(true)}>
          Listeye dön, düzelt
        </Button>
      </main>
    );
  }

  // Artboard'da karşılığı yok — plandaki işlevsel iskelet (az sonuç → liste, spec §4).
  if (listMode) {
    return (
      <main className="page">
        <Wordmark />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 26 }}>Hangisi olsun?</h1>
        </div>
        {venues.map((v) => (
          <label key={v.id} className="row" style={{ alignItems: "stretch" }}>
            <input
              type="checkbox"
              checked={!!liked[v.id!]}
              onChange={(e) => void setLike(v.id!, e.target.checked)}
              style={{ width: 22, accentColor: "var(--flame-deep)" }}
            />
            <div style={{ flex: 1 }}>
              <VenueCard venue={v} photoHeight={120} travelLabels={travelLabels} />
            </div>
          </label>
        ))}
        <Button type="button" onClick={() => void finish()} disabled={sending}>
          Beğenilerimi gönder
        </Button>
      </main>
    );
  }

  return (
    <main className="page page--deck">
      {/* Artboard W3: .row style="justify-content:space-between;margin-bottom:12px;flex:0 0 auto" */}
      <div
        className="row"
        style={{ justifyContent: "space-between", marginBottom: 12, flex: "0 0 auto" }}
      >
        <Wordmark />
        <div className="row" style={{ gap: 10 }}>
          <span className="a-mi tab" style={{ fontWeight: 700 }}>
            {Math.min(index + 1, venues.length)} / {venues.length}
          </span>
          {/* Artboard .bsm: min-height:34px;font-size:13px;padding:0 16px;width:auto */}
          <Button
            type="button"
            kind="white"
            style={{ width: "auto", minHeight: 34, fontSize: 13, padding: "0 16px" }}
            onClick={() => setListMode(true)}
          >
            Hepsini gör
          </Button>
        </div>
      </div>
      <VenueDeck venues={venues} travelLabels={travelLabels} />
    </main>
  );
}
