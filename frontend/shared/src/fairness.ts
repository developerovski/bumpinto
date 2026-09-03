/* Karar dokümanı §4.1–4.2, §4.5 — adalet metriğinin TEK kaynağı.
   Chips, rozet ve sıralama aynı nesneyi okur; başka yerde dakika aritmetiği yapılmaz. */
/** Modülün ihtiyaç duyduğu mekan şekli — YAPISAL tür. Paylaşımlı paket web'in B-7 köprüsüne
    bağlanamaz; `VenueDto` ve web'in `Venue`'sü bu şekli zaten karşılar (M-3 de karşılayacak). */
export type FairnessVenue = {
  id?: string;
  rating?: number;
  deckOrder?: number;
  travelMinutes?: Record<string, number>;
  fairness?: { maxMinutes?: number; spreadMinutes?: number; longestParticipantId?: string };
};

/** Sunucu 5 dk'ya yuvarlıyor (B-7:T1); alan gelene kadar istemci de aynı adımı uygular.
    Sunucu değeri geldiğinde idempotent — ikinci yuvarlama sayıyı değiştirmez. */
export const TRAVEL_STEP = 5;
/** Fark bu eşiğin altındaysa "Herkese ~aynı" (§4.2). */
export const SAME_FOR_ALL = 10;
/** Bir kişi grup medyanını bu kadar aşarsa "… için uzak" (§4.2). */
export const OUTLIER_GAP = 10;

export function roundTravel(minutes: number): number {
  return Math.max(TRAVEL_STEP, Math.round(minutes / TRAVEL_STEP) * TRAVEL_STEP);
}

export type TravelEntry = { id: string; minutes: number };

export type Fairness = {
  /** En uzun önce; eşitlikte id'ye göre kararlı. */
  entries: TravelEntry[];
  max: number;
  min: number;
  /** max − min ("fark" — ekranda YAZILAN sayı). */
  spread: number;
  longestId: string;
  /** Medyanı ≥ OUTLIER_GAP aşan kişi; yoksa null. */
  outlierId: string | null;
  /** Toplam yol — yalnız beraberlik kırıcı olarak kullanılır, ekranda sıralama anahtarı değildir. */
  total: number;
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function fairnessOf(venue: FairnessVenue): Fairness | null {
  const raw = Object.entries(venue.travelMinutes ?? {});
  if (raw.length === 0) {
    // `travelMinutes` henüz yok (B-7:T1 öncesi, ya da bu alan viewer'a özel bir kesitte
    // eksik) ama sunucunun toplu `fairness` alanı geldiyse (B-7:T1) YİNE DE bir Fairness
    // üretilir — kişi bazlı `entries` yok, min/max/spread doğrudan sunucudan türer, `total`
    // bilinmiyorsa `max`'a düşer (eskiden WhyHere'in yerel `fairnessForAxis`i yapardı —
    // reviewer bulgusu: iki kopya aynı düşümü yapıyordu, tek kaynağa katlandı).
    if (venue.fairness?.maxMinutes == null) return null;
    const max = venue.fairness.maxMinutes;
    const spread = venue.fairness.spreadMinutes ?? 0;
    return {
      entries: [],
      max,
      min: max - spread,
      spread,
      longestId: venue.fairness.longestParticipantId ?? "",
      outlierId: null,
      total: max,
    };
  }
  const entries = raw
    .map(([id, minutes]) => ({ id, minutes: roundTravel(minutes) }))
    .sort((a, b) => b.minutes - a.minutes || a.id.localeCompare(b.id, "en"));
  // B-7:T1 alanı varsa sunucu kazanır — ama max ve spread BAĞIMSIZ alanlardır: sunucu
  // yalnız maxMinutes gönderip spreadMinutes'ı boş bırakırsa, istemci kaynağını (max) sunucu
  // kaynağıyla (spread) karıştırmayız — spread tamamen istemciden hesaplanır.
  const s = venue.fairness;
  const min = entries[entries.length - 1].minutes;
  const max = s?.maxMinutes ?? entries[0].minutes;
  const spread = s?.spreadMinutes ?? entries[0].minutes - min;
  const longestId = s?.longestParticipantId ?? entries[0].id;
  const med = median(entries.map((e) => e.minutes));
  const top = entries.find((e) => e.id === longestId) ?? entries[0];
  return {
    entries,
    max,
    min,
    spread,
    longestId,
    outlierId: entries.length >= 2 && top.minutes - med >= OUTLIER_GAP ? top.id : null,
    total: entries.reduce((n, e) => n + e.minutes, 0),
  };
}

/** "Herkese adil" sırası (§4.5): en uzun yol artan → fark artan → sunucu deste sırası.
    Toplam yol BİLEREK yok: yükü tek kişiye yığar. */
export function byFairness(a: FairnessVenue, b: FairnessVenue): number {
  const fa = fairnessOf(a);
  const fb = fairnessOf(b);
  if (!fa || !fb) return Number(!fa) - Number(!fb);
  return fa.max - fb.max || fa.spread - fb.spread || (a.deckOrder ?? 0) - (b.deckOrder ?? 0);
}

/** "Puan" sırası: puan azalan; puansız kart sona. */
export function byRating(a: FairnessVenue, b: FairnessVenue): number {
  return (b.rating ?? -1) - (a.rating ?? -1) || (a.deckOrder ?? 0) - (b.deckOrder ?? 0);
}

/** Beraberlikte "adil olana bırak" seçimi (§5.C Runoff): min fark → min toplam → puan.
    SecureRandom yerine kararlı son eşik: id — herkes aynı sonucu görür. */
export function fairestOf<T extends FairnessVenue>(venues: T[]): T | null {
  const scored = venues.filter((v) => fairnessOf(v));
  if (scored.length === 0) return venues[0] ?? null;
  return [...scored].sort((a, b) => {
    const fa = fairnessOf(a)!;
    const fb = fairnessOf(b)!;
    return (
      fa.spread - fb.spread ||
      fa.total - fb.total ||
      (b.rating ?? -1) - (a.rating ?? -1) ||
      (a.id ?? "").localeCompare(b.id ?? "", "en")
    );
  })[0];
}
