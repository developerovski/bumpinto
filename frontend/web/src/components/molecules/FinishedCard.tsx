/* Kaynak: artboard Deste bitti 1280 sol kart */
import { Trans, useTranslation } from "react-i18next";
import { Button, Highlight, Sticker } from "../atoms";
import Confetti from "./Confetti";

export default function FinishedCard(props: {
  likedCount: number;
  sending: boolean;
  onSend: () => void;
  onList: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center gap-4 rounded-card border border-line bg-card px-8 pt-11 pb-9 text-center shadow-sh1">
      <Confetti />
      <Sticker>{t("deck.finishedSticker")}</Sticker>
      <h1 className="mt-1.5 text-[2.5rem]">
        <Trans i18nKey="deck.finishedTitle" components={[<Highlight key="0" />]} />
      </h1>
      <p className="max-w-[30ch] text-ink2">{t("deck.finishedCopy", { count: props.likedCount })}</p>
      <div className="mt-2 flex w-full max-w-[21.25rem] flex-col gap-2.5">
        <Button type="button" onClick={props.onSend} disabled={props.sending}>
          {t("deck.send")}
        </Button>
        <Button type="button" kind="white" onClick={props.onList}>
          {t("deck.backToList")}
        </Button>
      </div>
    </div>
  );
}
