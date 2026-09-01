/* Kaynak: RunoffScreen .top bloğu — .col(gap:4;align-items:flex-start) + h1(29px;margin-top:6) */
import { Trans, useTranslation } from "react-i18next";
import { Sticker } from "../atoms";

/** Artboard 07 Runoff · "Son düzlük" çıkartması + iki satırlık başlık. */
export default function RunoffIntro() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-1">
      <Sticker>{t("runoff.sticker")}</Sticker>
      <h1 className="mt-1.5 text-[1.8125rem]">
        <Trans i18nKey="runoff.title" components={[<br key="0" />]} />
      </h1>
    </div>
  );
}
