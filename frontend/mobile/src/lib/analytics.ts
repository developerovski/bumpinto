/**
 * Rıza KAPILI analitik (R-M15).
 *
 * Kural: rıza `false` iken sağlayıcı modülü HİÇ `require` edilmez. Açılışta yüklenip
 * "rıza yoksa gönderme" demek yetmez — SDK'lar kurulur kurulmaz cihaz kimliği toplar,
 * bu da KVKK/GDPR ihlali ve mağaza reddi sebebidir. Bu yüzden yükleyici `track()` gövdesinde,
 * kapının İÇİNDE çağrılır.
 *
 * Bu sürümde sağlayıcı TANIMLI DEĞİL (no-op): `setProviderLoader` çağrılmaz, Clarity/GA4
 * paketi bağımlılık olarak da eklenmez (K-M7).
 */
export type AnalyticsProvider = {
  track: (event: string, props: Record<string, string | number | boolean>) => void;
  shutdown: () => void;
};

/** PII asla gitmez: YALNIZ bu anahtarlar taşınır (izin verilenler listesi, kara liste değil). */
const ALLOWED_PROPS = ["sessionType", "step", "count", "activity", "travelMode"] as const;

let loadProvider: (() => AnalyticsProvider) | null = null;
let provider: AnalyticsProvider | null = null;
let consented = false;

export function setProviderLoader(loader: () => AnalyticsProvider): void {
  loadProvider = loader;
}

/** Tek kapı. Rıza geri alınırsa sağlayıcı KAPATILIR (yalnız susturulmaz). */
export function applyAnalyticsConsent(next: boolean): void {
  if (next === consented) return;
  consented = next;
  if (!next) {
    provider?.shutdown();
    provider = null;
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!consented || !loadProvider) return;
  provider ??= loadProvider();
  const safe: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED_PROPS) {
    const value = props[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  provider.track(event, safe);
}

/** Yalnız testler için: modül düzeyi durumunu sıfırlar. */
export function __resetAnalytics(): void {
  loadProvider = null;
  provider = null;
  consented = false;
}
