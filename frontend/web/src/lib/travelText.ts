/* R-W1 — yol çubuğunun ALT SATIRI (`.rg-g`) ve kart altındaki fark satırı aynı cümleyi yazar.
   Kural eski `FairnessBadge`'in kuralıdır (karar dok. §4.2). Yeni aritmetik YOK — girdi
   `fairnessOf` çıktısıdır. */
import { SAME_FOR_ALL, type Fairness } from "@bumpinto/shared";
import type { TravelInfo } from "./useTravelLabels";

/** i18next `t`'nin bu modülün gerektirdiği dar yüzü — bileşenler kendi `t`'sini geçer. */
export type Translate = (key: string, opts?: Record<string, unknown>) => string;
export type FairnessLine = {
  /** Kalın baş cümle; çapalı oturumda ve tek kişide `null`. */
  lead: string | null;
  leadTone: "grass" | "amber" | null;
  /** " · " ile birleştirilecek ek parçalar. */
  rest: string[];
};

export function fairnessLine(f: Fairness, travel: TravelInfo, t: Translate): FairnessLine {
  const many = f.entries.length > 1;
  let lead: string | null = null;
  let leadTone: FairnessLine["leadTone"] = null;
  // C1: anlamsal bayrak — "lead zaten en uzun kişiyi adlandırdı mı?" ton adına (renk) değil buna bağlı.
  let leadNamesLongest = false;
  // Çapalı oturumda mekanları kıyaslamak anlamsız (spec K6) — baş cümle çizilmez, olgu kalır.
  if (many && !travel.anchored) {
    if (f.spread <= SAME_FOR_ALL) {
      lead = t("fairness.same");
      leadTone = "grass";
    } else if (f.outlierId) {
      lead = f.outlierId === travel.selfId
        ? t("fairness.farSelf")
        : t("fairness.far", { name: travel.labels[f.outlierId] ?? t("travel.friend") });
      leadTone = "amber";
      leadNamesLongest = true;
    }
  }
  const rest: string[] = [];
  if (many) rest.push(t("travel.gap", { min: f.spread }));
  // Lead o kişiyi zaten adlandırdıysa tekrar etme ("Kerem için uzak · fark 20 dk").
  // C2: etiket yoksa (labels[longestId] boş) satır sessizce düşer — uydurma ad basılmaz (bilinçli).
  const longestName = travel.labels[f.longestId];
  if (many && f.spread !== 0 && longestName && !leadNamesLongest) {
    rest.push(t("travel.longestName", { name: longestName }));
  }
  return { lead, leadTone, rest };
}

/** Yol çubuğu noktasının harfi — ad yoksa "?" (uydurma baş harf yok). */
export function initialOf(label: string, locale: string): string {
  const first = [...label.trim()][0];
  return first ? first.toLocaleUpperCase(locale) : "?";
}
