import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";
import { personIndexMap } from "./personColor";

/** RangeBar/TravelBars girdisi — TEK nesne. `labels` ve `selfId` iki ayrı prop olarak
    sürüklenirse (Task 1 kapanış incelemesi bulgusu) yüzeyler arasında birbirinden ayrışabilir;
    tek nesne geçirilerek her yüzeyin aynı çifti okuması garanti edilir. */
export type TravelInfo = {
  /** Cümlelerde kullanılan ad: kendi satırın "Sen" der (TravelBars, adalet notu, sr-only liste). */
  labels: Record<string, string>;
  /** HAM görünen ad — kendi satırında da gerçek ad. Tek harflik `RangeBar` noktası bunu kullanır:
      "Sen"in baş harfi ("S"/"Y") başlıktaki avatarlarla eşleşmediği için oturumda olmayan
      ÜÇÜNCÜ bir kişi gibi okunuyordu. Kendi noktan zaten flame dolgusuyla ayrılıyor. */
  names?: Record<string, string>;
  /** `id → kanonik dizin` (bkz. `lib/personColor.ts`). Yol çubuğu noktaları rengi buradan alır;
      `f.entries` DAKİKAYA göre sıralı olduğu için kendi sayacı kimliği taşıyamaz. */
  colors?: Record<string, number>;
  selfId?: string | null;
  /** Çapalı oturum: adalet notu (`RangeBar`, `TravelBars`) mekanları KIYASLADIĞI için çizilmez —
      2 km'lik daire içinde 20 kartın hepsinde aynı şeyi yazar. Ayrı bir prop olarak tüm render
      yerlerine (bugün beş: VenueCard'ın polaroid ve row dalları, VenueMeta üzerinden VenueRow ve
      VenuePopCard, bir de LikedList) sürüklenseydi biri sessizce düşerdi (W-8 `mixedDeck`
      dersi); bu nesne hepsine zaten geçiyor. */
  anchored?: boolean;
};

/** travel[] katılımcı UUID'siyle anahtarlı rozet metinleri — Deste/Runoff/Sonuç ekranları ortak. */
export function useTravelLabels(view: SessionView | null): TravelInfo {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<string, string> = {};
    const names: Record<string, string> = {};
    for (const p of view?.participants ?? []) {
      if (p.id) {
        const name = p.displayName ?? t("travel.friend");
        names[p.id] = name;
        labels[p.id] = p.id === view?.viewer?.participantId ? t("travel.self") : name;
      }
    }
    return {
      labels,
      names,
      colors: personIndexMap(view?.participants),
      selfId: view?.viewer?.participantId ?? null,
      anchored: view?.anchored ?? false,
    };
  }, [view, t]);
}
