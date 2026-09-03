/* Kaynak: artboard W3 aksiyon satırı; ikonlar Phosphor (el yapımı CSS glifleri değiştirdi) */
import { ACTION_ICON } from "../../lib/deckActions";
import { ArrowCounterClockwise, Heart, X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

/** Artboard W3 · .act / .a-un / .a-yes — geri al · geç · beğen.
    Üç ikon da TEK ölçüde (ACTION_ICON): eski CSS glifleri 15/20/19px çiziyordu, satır
    dengesiz görünüyordu. Buton çapları artboard'daki gibi farklı kalır (48 / 60 / 60).
    aria-label metin karşılığıdır; ikonlar dekoratif. */


export default function DeckActions(props: {
  onUndo: () => void;
  onPass: () => void;
  onLike: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex flex-none items-center justify-center gap-5">
      <Button
        type="button"
        kind="white"
        shape="round-sm"
        aria-label={t("deck.ariaUndo")}
        onClick={props.onUndo}
      >
        <ArrowCounterClockwise size={ACTION_ICON} weight="bold" className="text-ink2" aria-hidden />
      </Button>
      <Button
        type="button"
        kind="white"
        shape="round"
        aria-label={t("deck.ariaPass")}
        onClick={props.onPass}
      >
        <X size={ACTION_ICON} weight="bold" className="text-ink" aria-hidden />
      </Button>
      <Button
        type="button"
        kind="grad"
        shape="round"
        aria-label={t("deck.ariaLike")}
        onClick={props.onLike}
      >
        <Heart size={ACTION_ICON} weight="fill" className="text-white" aria-hidden />
      </Button>
    </div>
  );
}
