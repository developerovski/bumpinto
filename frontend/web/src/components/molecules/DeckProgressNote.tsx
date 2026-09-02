/* Kaynak: DeckScreen sağ kolon — "X bitirdi, Y kaydırıyor" (spec işlevsel iskelet) */
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar } from "../atoms";

export default function DeckProgressNote(props: { participants: ParticipantDto[]; selfId?: string }) {
  const { i18n, t } = useTranslation();
  const present = props.participants.filter((p) => p.hasLocation && !p.manual);
  const others = present.filter((p) => p.id !== props.selfId);
  if (others.length === 0) return null;

  const listFormat = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, {
    type: "conjunction",
  });
  const done = others.filter((p) => p.deckDone);
  const waiting = others.filter((p) => !p.deckDone);
  const doneNames = listFormat.format(done.map((p) => p.displayName ?? "?"));
  const waitingNames = listFormat.format(waiting.map((p) => p.displayName ?? "?"));

  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-card p-[0.875rem_1rem] shadow-sh1">
      <div className="flex">
        {/* Artboard "M A K" — kendi avatarın da sırada, ad listelerinde değil. */}
        {present.map((p, i) => (
          <span key={p.id} className={i > 0 ? "-ml-[0.5625rem]" : ""}>
            <Avatar name={p.displayName ?? "?"} index={i} waiting={!p.deckDone} />
          </span>
        ))}
      </div>
      <p className="text-[0.8125rem] leading-[1.45] text-ink2">
        {done.length > 0 && <strong className="text-ink">{t("deck.progressDone", { names: doneNames })} </strong>}
        {waiting.length > 0 && t("deck.progressWaiting", { names: waitingNames })}
      </p>
    </div>
  );
}
