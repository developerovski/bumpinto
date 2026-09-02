/* Kaynak: artboard Bekle 1280/390 sağ kart — .card(align:center;gap:14;padding:22px 20px) */
import { useTranslation } from "react-i18next";
import { Button, ErrorText } from "../atoms";
import MapMark from "./MapMark";

/** Artboard W2 · sağ bölge kartı — harita işareti + "Deste hazırlanıyor…" + konum değiştir. */
export default function WaitingStatus(props: { onChange: () => void; busy: boolean; error: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-line bg-card p-[1.375rem_1.25rem] text-center shadow-sh1">
      <div className="lg:hidden">
        <MapMark />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <h2>{t("waiting.preparing")}</h2>
        <p className="max-w-[34ch] text-center text-[0.8125rem] leading-normal text-ink2">
          {t("waiting.copy")}
        </p>
      </div>
      <Button type="button" kind="white" onClick={props.onChange} disabled={props.busy}>
        {t("waiting.changeLocation")}
      </Button>
      {props.error && <ErrorText>{props.error}</ErrorText>}
    </div>
  );
}
