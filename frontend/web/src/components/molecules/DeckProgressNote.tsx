/* Kaynak: DeckScreen sağ kolon — "X bitirdi, Y kaydırıyor" (artboard Deste 1280 alt kart).
   Aktif destede diğerlerinin hepsi bitirip viewer geciktiyse tek, adlı, pozitif HandNote
   basılır — sayaç/"geç" etiketi yok (karar dokümanı §4.8, plan16 T3 step 7). Karışık durumda
   (bir kısmı bitirdi, bir kısmı kaydırıyor) metin satırı yalnız 1280'de görünür (hidden lg:block,
   §4.8'e uyan tek-isim/"diğerleri" biçimi — coordinator düzeltmesi). */
import { Trans, useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { votersOf } from "../../lib/voters";
import { Avatar, HandNote } from "../atoms";

export default function DeckProgressNote(props: {
  participants: ParticipantDto[];
  selfId?: string;
  /** Viewer'a kalan kart sayısı — geciken notu yalnız bu > 0 iken görünür. */
  remaining?: number;
  selfName?: string;
}) {
  const { i18n, t } = useTranslation();
  const present = votersOf(props.participants);
  const others = present.filter((p) => p.id !== props.selfId);
  if (others.length === 0) return null;

  // Diğerlerinin hepsi bitirdi, viewer geride kaldı → tek/adlı/pozitif not (satırlar zaten
  // avatar halkasıyla anlatılıyor; ayrıca "bitirdi/kaydırıyor" metni yok — §4.8).
  const laggard = others.length > 0 && others.every((p) => p.deckDone) && (props.remaining ?? 0) > 0;
  if (laggard)
    return (
      <HandNote>
        {t("deck.laggardHand", { name: props.selfName ?? "", count: props.remaining })}
      </HandNote>
    );

  const done = others.filter((p) => p.deckDone);
  const waiting = others.filter((p) => !p.deckDone);
  const doneNames = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, {
    type: "conjunction",
  }).format(done.map((p) => p.displayName ?? "?"));
  // Tek geciken kişi adla anılır; birden çok geciken → genel "diğerleri" (§4.8, coordinator düzeltmesi).
  const waitingLabel = waiting.length === 1 ? (waiting[0].displayName ?? "?") : t("deck.othersLabel");
  const showLine = done.length > 0 && waiting.length > 0;

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
      {showLine && (
        <p className="hidden text-[0.8125rem] leading-[1.45] text-ink2 lg:block">
          <Trans
            i18nKey="deck.progressLine"
            count={done.length}
            values={{ done: doneNames, name: waitingLabel }}
            components={[<strong key="0" className="text-ink" />]}
          />
        </p>
      )}
    </div>
  );
}
