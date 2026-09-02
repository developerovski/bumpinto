/* Kaynak: artboard Oturumlar_390_boş.html — boş durum kartı */
import { useTranslation } from "react-i18next";
import { HandNote, Note } from "../atoms";
import MapMark from "./MapMark";

/** Artboard W1 · Oturumlar boş durum — sayfa üstündeki tek CTA yeterli, kart yalnız bilgilendirir. */
export default function EmptySessions() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-card px-6 py-9 text-center shadow-sh1">
      <MapMark />
      <h2>{t("sessions.emptyTitle")}</h2>
      <Note center>{t("sessions.emptyCopy")}</Note>
      <HandNote center>{t("sessions.emptyHand")}</HandNote>
    </div>
  );
}
