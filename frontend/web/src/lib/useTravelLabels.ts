import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";

/** TravelChips/FairnessBadge girdisi — TEK nesne. `labels` ve `selfId` iki ayrı prop olarak
    sürüklenirse (Task 1 kapanış incelemesi bulgusu) yüzeyler arasında birbirinden ayrışabilir;
    tek nesne geçirilerek her yüzeyin aynı çifti okuması garanti edilir. */
export type TravelInfo = {
  labels: Record<string, string>;
  selfId?: string | null;
  /** Çapalı oturum: FairnessBadge mekanları KIYASLADIĞI için çizilmez — 2 km'lik daire
      içinde 20 kartın hepsinde aynı şeyi yazar. Ayrı bir prop olarak tüm render yerlerine
      (bugün beş: VenueCard'ın polaroid ve row dalları, VenueMeta üzerinden VenueRow ve
      VenuePopCard, bir de LikedList) sürüklenseydi biri sessizce düşerdi (W-8 `mixedDeck`
      dersi); bu nesne hepsine zaten geçiyor. */
  anchored?: boolean;
};

/** travelMinutes katılımcı UUID'siyle anahtarlı rozet metinleri — Deste/Runoff/Sonuç ekranları ortak. */
export function useTravelLabels(view: SessionView | null): TravelInfo {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of view?.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === view?.viewer?.participantId ? t("travel.self") : (p.displayName ?? t("travel.friend"));
    }
    return {
      labels,
      selfId: view?.viewer?.participantId ?? null,
      anchored: view?.anchored ?? false,
    };
  }, [view, t]);
}
