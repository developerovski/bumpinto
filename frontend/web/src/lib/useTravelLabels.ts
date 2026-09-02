import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView } from "@bumpinto/shared";

/** travelMinutes katılımcı UUID'siyle anahtarlı rozet metinleri — Deste/Runoff/Sonuç ekranları ortak. */
export function useTravelLabels(
  view: SessionView | null,
  selfLabelKey = "deck.travelSelf",
): Record<string, string> {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of view?.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === view?.viewer?.participantId ? t(selfLabelKey) : (p.displayName ?? t("deck.travelFriend"));
    }
    return labels;
  }, [view, selfLabelKey, t]);
}
