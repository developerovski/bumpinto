/* Kaynak: ui.css .a-ico-* (→ c-ico-*) + W3 aksiyon satırı ölçüleri */
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

/** Artboard W3 · .act / .a-un / .a-yes — geri al · geç · beğen.
    İkonlar artboard'un CSS glifleri (.undo/.x1/.heart); aria-label metin karşılığı. */
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
        <span className="c-ico-undo" aria-hidden />
      </Button>
      <Button
        type="button"
        kind="white"
        shape="round"
        aria-label={t("deck.ariaPass")}
        onClick={props.onPass}
      >
        <span className="c-ico-x" aria-hidden />
      </Button>
      <Button
        type="button"
        kind="grad"
        shape="round"
        aria-label={t("deck.ariaLike")}
        onClick={props.onLike}
      >
        <span className="c-ico-heart" aria-hidden>
          <i />
        </span>
      </Button>
    </div>
  );
}
