import { personIndexMap, type SessionView, type TravelInfo } from "@bumpinto/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

/**
 * `RangeBar` (ve M-8'de `TravelBars`) girdisi — katılımcı UUID'siyle anahtarlı adlar,
 * kanonik renk dizini, görüntüleyenin kimliği ve çapa bayrağı TEK nesnede.
 *
 * `TravelInfo` tipi ve cümle kuralı `@bumpinto/shared`'ta; burada yalnız `SessionView`'dan
 * nesnenin kurulması var (web `useTravelLabels` ile aynı gövde, farklı `t` örneği).
 */
export function useTravelLabels(view: SessionView | null): TravelInfo {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<string, string> = {};
    const names: Record<string, string> = {};
    for (const p of view?.participants ?? []) {
      if (p.id) {
        const name = p.displayName ?? t("travel.friend");
        names[p.id] = name;
        // Kendi satırın cümlede "Sen" der; nokta harfi HAM adı kullanır.
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
