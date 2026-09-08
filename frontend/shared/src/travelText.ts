/* R-W1 — yol çubuğunun ALT SATIRI (`.rg-g`) ve kart altındaki fark satırı AYNI cümleyi yazar.
   Kural eski `FairnessBadge`'in kuralıdır (karar dok. §4.2). Yeni aritmetik YOK — girdi
   `fairnessOf` çıktısıdır.

   M-7'de web'den buraya taşındı: mobil `RangeBar` de aynı cümleyi basıyor ve iki kopya
   ayrışırsa aynı mekan iki istemcide farklı "adil mi" cevabı verir. */
import type { Fairness } from "./fairness";
import { SAME_FOR_ALL } from "./fairness";

/** i18next `t`'nin bu modülün gerektirdiği dar yüzü — çağıran kendi `t`'sini geçer. */
export type Translate = (key: string, opts?: Record<string, unknown>) => string;

/** `RangeBar`/`TravelBars` girdisi — TEK nesne. `labels` ve `selfId` iki ayrı prop olarak
    sürüklenirse yüzeyler arasında birbirinden ayrışabilir; tek nesne geçirilerek her yüzeyin
    aynı çifti okuması garanti edilir. */
export type TravelInfo = {
  /** Cümlelerde kullanılan ad: kendi satırın "Sen" der. */
  labels: Record<string, string>;
  /** HAM görünen ad — kendi satırında da gerçek ad. Tek harflik yol çubuğu noktası bunu
      kullanır: "Sen"in baş harfi başlıktaki avatarlarla eşleşmediği için oturumda olmayan
      ÜÇÜNCÜ bir kişi gibi okunuyordu. */
  names?: Record<string, string>;
  /** `id → kanonik dizin` (bkz. `personColor.ts`). Nokta rengi buradan gelir; `f.entries`
      DAKİKAYA göre sıralı olduğu için kendi sayacı kimliği taşıyamaz. */
  colors?: Record<string, number>;
  selfId?: string | null;
  /** Çapalı oturum: adalet notu mekanları KIYASLADIĞI için çizilmez — 2 km'lik daire içinde
      20 kartın hepsinde aynı şeyi yazar. */
  anchored?: boolean;
};

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
  // Anlamsal bayrak — "lead zaten en uzun kişiyi adlandırdı mı?" ton adına (renk) değil buna bağlı.
  let leadNamesLongest = false;
  // Çapalı oturumda mekanları kıyaslamak anlamsız (spec K6) — baş cümle çizilmez, olgu kalır.
  if (many && !travel.anchored) {
    if (f.spread <= SAME_FOR_ALL) {
      lead = t("fairness.same");
      leadTone = "grass";
    } else if (f.outlierId) {
      lead =
        f.outlierId === travel.selfId
          ? t("fairness.farSelf")
          : t("fairness.far", { name: travel.labels[f.outlierId] ?? t("travel.friend") });
      leadTone = "amber";
      leadNamesLongest = true;
    }
  }
  const rest: string[] = [];
  if (many) rest.push(t("travel.gap", { min: f.spread }));
  // Lead o kişiyi zaten adlandırdıysa tekrar etme ("Kerem için uzak · fark 20 dk").
  // Etiket yoksa satır sessizce düşer — uydurma ad basılmaz (bilinçli).
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
