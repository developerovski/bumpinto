/* Kaynak: artboard Oturumlar_390_boş.html — boş durum kartı */
import { useTranslation } from "react-i18next";
import { HandNote, Note } from "../atoms";
import MapMark from "./MapMark";

/** Artboard W1 · Oturumlar boş durum — kart dolgusu artboard (779) 26px/22px.
    Sayfa üstündeki tek CTA yeterli, kart yalnız bilgilendirir. */
export default function EmptySessions() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-card px-[1.375rem] py-[1.625rem] text-center shadow-sh1">
      <MapMark />
      <h2>{t("sessions.emptyTitle")}</h2>
      {/* Artboard (787) `.cp{max-width:26ch}` — üç satırlık ortalı blok bu genişlikle duruyor;
          Note atomu genişlik taşımadığı için kapta veriliyor. */}
      <div className="max-w-[26ch]">
        <Note center>{t("sessions.emptyCopy")}</Note>
      </div>
      <HandNote center>{t("sessions.emptyHand")}</HandNote>
    </div>
  );
}
