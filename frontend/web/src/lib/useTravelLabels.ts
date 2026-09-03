import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";

/** TravelChips/FairnessBadge girdisi — TEK nesne. `labels` ve `selfId` iki ayrı prop olarak
    sürüklenirse (Task 1 kapanış incelemesi bulgusu) yüzeyler arasında birbirinden ayrışabilir;
    tek nesne geçirilerek her yüzeyin aynı çifti okuması garanti edilir. */
export type TravelInfo = {
  labels: Record<string, string>;
  selfId?: string | null;
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
    return { labels, selfId: view?.viewer?.participantId ?? null };
  }, [view, t]);
}
