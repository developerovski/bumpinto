/* Kaynak: ui.css .a-card--grass (+ .label ezmesi) / .row(gap:11) / .field(gap:2) / .a-check(→ c-check) */
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Note } from "../atoms";

/** Artboard W2 · yeşil onay kartı — tik + "Katıldın!" + konum/ad alt satırı. */
export default function JoinedCard({ self }: { self: ParticipantDto | null }) {
  const { t } = useTranslation();
  return (
    // Artboard W5: iç boşluk 390'da 11/14px (1903-1905), 1280'de 16/18px (1812) — tek ölçü
    // kullanınca dar ekranda kart gereğinden şişkin duruyordu (rapor F/A-P3-12, B-P3-10).
    <div className="rounded-card border border-[#bfe5cf] bg-grass-wash px-[0.875rem] py-[0.6875rem] shadow-sh1 lg:px-[1.125rem] lg:py-4">
      <div className="flex items-center gap-[0.6875rem]">
        <span className="c-check c-check--joined" aria-hidden>
          <i />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.875rem] font-bold text-grass">{t("waiting.joined")}</span>
          {self && (
            <Note>
              {self.locationLabel ? `${self.locationLabel} · ${self.displayName}` : self.displayName}
            </Note>
          )}
        </div>
      </div>
    </div>
  );
}
