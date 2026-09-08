import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { SessionView, TravelInfo } from "@bumpinto/shared";
import { personIndexMap } from "./personColor";

/* `TravelInfo` tipi `@bumpinto/shared`'ta (mobil `RangeBar` de aynı nesneyi geçiriyor —
   M-7'de taşındı); burada yalnız web'in React kancası kalır. */
export type { TravelInfo } from "@bumpinto/shared";

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
