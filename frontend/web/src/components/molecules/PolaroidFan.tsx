/* Kaynak: artboard Landing 1280 sağ üst — üç kartlık polaroid yığını, salt dekoratif.
   VenueCard `photoOnly` ile kurulamaz: o kural deste artboard'ının d2/d3 kartları içindir
   (çıplak gradyan, yükseklik ebeveynden). Landing'in arka kartları monogramlı ve
   .pol iç boşluğu 8/8/22 — bu yüzden kart burada doğrudan kuruluyor, gradyanlar ortak. */
import { useTranslation } from "react-i18next";
import { Sticker } from "../atoms";
import { PHOTO_CLASSES, PHOTO_MONO } from "./VenueCard";

// .pol — 24px köşe, 1px çizgi, beyaz.
const CARD = "absolute flex flex-col rounded-3xl border border-line bg-white";
// .pol-ph — 16px köşe, alt hizalı.
const PHOTO = "relative flex items-end overflow-hidden rounded-2xl";
// Arka kartlar: padding 8px 8px 22px, %70 opaklık, sh1.
const BACK = `${CARD} w-[11.25rem] p-[0.5rem_0.5rem_1.375rem] opacity-70 shadow-sh1`;
const BACK_PHOTO = `${PHOTO} h-[8.125rem]`;

export default function PolaroidFan() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden h-[18.75rem] lg:block" aria-hidden>
      {/* Koffie Top */}
      <div className={`${BACK} right-0 top-0 rotate-[3deg]`}>
        <div className={`${BACK_PHOTO} ${PHOTO_CLASSES[2]}`}>
          <span className={`${PHOTO_MONO} text-[1.5rem]`}>kt</span>
        </div>
      </div>
      {/* Stadswandelpark */}
      <div className={`${BACK} left-0 top-[1.625rem]`}>
        <div className={`${BACK_PHOTO} ${PHOTO_CLASSES[1]}`}>
          <span className={`${PHOTO_MONO} text-[1.5rem]`}>sw</span>
        </div>
      </div>
      <div
        className={`${CARD} inset-x-0 top-[4.375rem] z-2 mx-auto w-[15rem] -rotate-[1.6deg] p-2.5 shadow-sh2`}
      >
        <span className="absolute -right-2 -top-3.5 z-3 flex">
          <Sticker>{t("landing.sticker")}</Sticker>
        </span>
        <div className={`${PHOTO} h-[10rem] ${PHOTO_CLASSES[0]}`}>
          <span className={`${PHOTO_MONO} text-[1.75rem]`}>cb</span>
        </div>
        <div className="flex flex-col gap-1 px-1.5 pt-2.5 pb-1.5">
          <h3>Café Berlage</h3>
          <span className="text-[0.75rem] text-ink2">★ 4.6 · {t("landing.cardCity")} · €€</span>
        </div>
      </div>
    </div>
  );
}
