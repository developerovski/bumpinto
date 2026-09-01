/* Kaynak: ui.css .field(gap:12) / .row / .muted / .a-dv */
import { Trans, useTranslation } from "react-i18next";
import { Avatar, Highlight, Note } from "../atoms";

/** Artboard W1 · davet başlığı bloğu + onu formdan ayıran saç teli ayraç. */
export default function JoinIntro() {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Avatar name="B" ring />
          <span>{t("join.invited")}</span>
        </div>
        <h1>
          <Trans i18nKey="join.title" components={[<Highlight key="0" />]} />
        </h1>
        <Note>{t("join.subtitle")}</Note>
      </div>
      <div className="h-px bg-line" />
    </>
  );
}
