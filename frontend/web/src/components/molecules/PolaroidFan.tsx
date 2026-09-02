/* Kaynak: artboard Landing 1280 sağ üst — üç kartlık polaroid yığını, salt dekoratif */
import { useTranslation } from "react-i18next";
import { Sticker } from "../atoms";
import VenueCard from "./VenueCard";

export default function PolaroidFan() {
  const { t } = useTranslation();
  return (
    <div className="relative hidden h-[18.75rem] lg:block" aria-hidden>
      <div className="absolute right-0 top-0 w-[11.25rem] rotate-[3deg] opacity-70">
        <VenueCard venue={{ id: "kt", name: "Koffie Top", deckOrder: 2 }} photoOnly photoHeight={130} />
      </div>
      <div className="absolute left-0 top-[1.625rem] w-[11.25rem] opacity-70">
        <VenueCard venue={{ id: "sw", name: "Stadswandelpark", deckOrder: 1 }} photoOnly photoHeight={130} />
      </div>
      <div className="absolute inset-x-0 top-[4.375rem] mx-auto w-[15rem] -rotate-[1.6deg] shadow-sh2">
        <span className="absolute -right-2 -top-3.5 z-3 flex">
          <Sticker>{t("landing.sticker")}</Sticker>
        </span>
        <VenueCard
          venue={{ id: "cb", name: "Café Berlage", rating: 4.6, priceLevel: 2, deckOrder: 0 }}
          photoHeight={160}
        />
      </div>
    </div>
  );
}
