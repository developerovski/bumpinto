/* Kaynak: DeckScreen W3 başlık satırı (.row + .a-mi.tab + artboard .bsm) */
import { useTranslation } from "react-i18next";
import { Button, Wordmark } from "../atoms";

/** Artboard W3 · marka + "4 / 12" sayacı + "Hepsini gör". */
export default function DeckHeader(props: {
  current: number;
  total: number;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-3 flex flex-none items-center justify-between gap-2.5">
      <Wordmark />
      <div className="flex items-center gap-2.5">
        <span className="text-[0.75rem] font-bold tabular-nums text-ink2">
          {t("deck.counter", { current: props.current, total: props.total })}
        </span>
        {/* Artboard .bsm — Button atomunda küçük varyant yok; ölçüler yerinde kalır. */}
        <Button
          type="button"
          kind="white"
          style={{ width: "auto", minHeight: "2.125rem", fontSize: "0.8125rem", padding: "0 1rem" }}
          onClick={props.onSeeAll}
        >
          {t("deck.seeAll")}
        </Button>
      </div>
    </div>
  );
}
