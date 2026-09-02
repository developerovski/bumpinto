/* Kaynak: ui.css .a-deck / .a-pol--d1..d3 (.a-deck > .a-pol konumu) / .a-kbd / .a-mi */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { useDeckStore } from "../../store/deckStore";
import { HandNote } from "../atoms";
import DeckActions from "../molecules/DeckActions";
import VenueCard from "../molecules/VenueCard";

// ui.css `.a-deck > .a-pol` bir bağlam kuralıydı — çocuk varyantı olarak kapta durur.
// `!absolute`: karttaki taban `relative` ile özgüllük eşit (0,1,0); sıralamayı Tailwind'in
// yayın sırası belirliyor (`.relative`, `.absolute`ten sonra) — kalıcı kısıt, önem şart.
const DECK = "relative h-[27.5rem] flex-none [&>*]:!absolute [&>*]:inset-x-0 [&>*]:mx-auto";
const D1 = "z-2 transform-[rotate(-1.6deg)] shadow-sh2";
const D2 =
  "z-1 h-[25rem] opacity-75 shadow-sh1 transform-[rotate(2.6deg)_translateY(0.625rem)_scale(0.97)]";
const D3 = "z-0 h-[24.375rem] opacity-45 transform-[rotate(-5deg)_translateY(1.25rem)_scale(0.94)]";

const KBD =
  "inline-flex h-6 min-w-[1.625rem] items-center justify-center rounded-[0.4375rem] " +
  "border-[1.5px] border-line2 bg-white px-[0.4375rem] " +
  "font-[family-name:ui-monospace,Menlo,monospace] text-[0.75rem] text-ink2 " +
  "shadow-[0_2px_0_var(--color-line2)]";

/** Artboard W3 · .prog + .deck + aksiyonlar + klavye ipucu. */
export default function VenueDeck(props: {
  venues: VenueDto[];
  travelLabels?: Record<string, string>;
}) {
  const { t } = useTranslation();
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
    <div className="mx-auto w-full max-w-[26.25rem]">
      <div className={DECK}>
        {/* Arka katmanlar artboard'da yalnız fotoğraf alanı gösterir. */}
        {third && <VenueCard venue={third} photoOnly className={D3} />}
        {next && <VenueCard venue={next} photoOnly className={D2} />}
        <VenueCard venue={current} className={D1} travelLabels={props.travelLabels} />
      </div>
      <DeckActions
        onUndo={() => venues[index - 1] && void undo(venues[index - 1].id!)}
        onPass={() => void decide(current.id!, false)}
        onLike={() => void decide(current.id!, true)}
      />
      <div className="mt-3 hidden flex-none items-center justify-center gap-2 lg:flex">
        <span className={KBD}>←</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.pass")}</span>
        <span className="mx-1 text-[0.75rem] text-ink2">·</span>
        <span className={KBD}>→</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.like")}</span>
        <span className="mx-1 text-[0.75rem] text-ink2">·</span>
        <span className={KBD}>⌫</span>
        <span className="text-[0.75rem] text-ink2">{t("deck.undoKey")}</span>
      </div>
      <div className="mt-3 lg:hidden">
        <HandNote center>{t("deck.swipeHand")}</HandNote>
      </div>
    </div>
  );
}
