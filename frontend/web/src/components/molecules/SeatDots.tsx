/* Kaynak: Keşfet POC `.seat` — dolu yeşil nokta = onaylı koltuk, kesikli boş = boş koltuk. */
import { useTranslation } from "react-i18next";

/** Yazı BOŞ koltuk sayısıdır ("2 yer"); `count={false}` yalnız noktalar (P4 özet kartı). */
export default function SeatDots({ approved, capacity, count = true }: { approved: number; capacity: number; count?: boolean }) {
  const { t } = useTranslation();
  const taken = Math.min(approved, capacity);
  const free = Math.max(0, capacity - approved);
  return (
    <span className="inline-flex flex-none items-center gap-[0.3125rem] whitespace-nowrap text-[0.78125rem] font-bold text-ink tabular-nums">
      <span className="inline-flex items-center gap-[0.3125rem]" role="img" aria-label={t("discover.seatsAria", { approved, capacity })}>
        {Array.from({ length: taken }, (_, i) => (
          <i key={`a${i}`} className="inline-block h-2.5 w-2.5 rounded-full bg-grass" />
        ))}
        {Array.from({ length: free }, (_, i) => (
          <i key={`f${i}`} className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-dashed border-line-in" />
        ))}
      </span>
      {count && t("discover.seats", { count: free })}
    </span>
  );
}
