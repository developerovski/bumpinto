/* Kaynak: WaitingRoom orta kolonu — .field(align:center;gap:14;padding:14px 0 4px) + .muted(max-width:34ch) */
import { useTranslation } from "react-i18next";
import MapMark from "./MapMark";

/** Artboard W2 · harita işareti + "Deste hazırlanıyor…" durum bloğu. */
export default function WaitingStatus() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3.5 pt-3.5 pb-1">
      <MapMark />
      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-center">{t("waiting.preparing")}</h2>
        <p className="max-w-[34ch] text-center text-[0.8125rem] leading-normal text-ink2">
          {t("waiting.copy")}
        </p>
      </div>
    </div>
  );
}
