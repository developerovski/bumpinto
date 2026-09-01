/* Kaynak: ui.css .a-card--grass (+ .label ezmesi) / .row(gap:11) / .field(gap:2) / .a-check(→ c-check) */
import { useTranslation } from "react-i18next";
import { Note } from "../atoms";
import type { Self } from "../../store/sessionStore";

/** Artboard W2 · yeşil onay kartı — tik + "Katıldın!" + konum/ad alt satırı. */
export default function JoinedCard({ self }: { self: Self | null }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-card border border-[#bfe5cf] bg-grass-wash px-4 py-[0.9375rem] shadow-sh1">
      <div className="flex items-center gap-[0.6875rem]">
        <span className="c-check" aria-hidden>
          <i />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.875rem] font-bold text-grass">{t("waiting.joined")}</span>
          {self && (
            <Note>{self.locationLabel ? `${self.locationLabel} · ${self.name}` : self.name}</Note>
          )}
        </div>
      </div>
    </div>
  );
}
