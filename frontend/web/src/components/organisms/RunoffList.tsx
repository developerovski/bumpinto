/* Kaynak: ui.css .a-pick-btn / .a-mi / .row (artboard 07 Runoff) */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { api } from "../../lib/api";
import { Button, HandNote } from "../atoms";
import VenueCard from "../molecules/VenueCard";

// .a-pick-btn — `all: unset` reset'i; görsel biçim tamamen kartta, odak halkası .a-btn ile aynı.
const PICK_BTN =
  "m-0 block cursor-pointer appearance-none rounded-card border-0 bg-transparent p-0 text-left " +
  "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px] " +
  "disabled:cursor-default";

/** Artboard 07 Runoff — finalist kartları + "Seçimimi kilitle".
    Seçim görünümü kartın kendisinde (flame kenarlık + tikli daire); sarmalayıcı
    buton yalnız erişilebilir tıklama alanı, biçimi sıfırlanmıştır. */
export default function RunoffList(props: {
  slug: string;
  finalists: VenueDto[];
  travelLabels?: Record<string, string>;
}) {
  const { t } = useTranslation();
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
          className={PICK_BTN}
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
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="text-[0.75rem] text-ink2">{t("runoff.note")}</span>
      </div>
      {sent ? (
        // Artboard'da karşılığı yok — plandaki işlevsel iskelet (oy gönderildi durumu).
        <HandNote center>{t("runoff.locked")}</HandNote>
      ) : (
        <Button type="button" onClick={() => void lockIn()} disabled={!choice || sending}>
          {t("runoff.lockIn")}
        </Button>
      )}
    </>
  );
}
