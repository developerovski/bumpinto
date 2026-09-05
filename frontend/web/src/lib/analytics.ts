/* Karar dokümanı §5.A.8 — üç olay: "Haritada gör" dokunuşu, Maps JS yüklemesi, aşama geçişi.
   "Ölçmeden harita tasarrufu iddia edilemez" (bugün sıfır veri).
   Sağlayıcı yok: Clarity ve GA4 sayfaya sonradan eklenebilir; sarmalayıcı ikisini de
   koşullu çağırır ve hiçbir şey yoksa sessizce yutar. PII gönderilmez — yalnız enum'lar. */
type Props = Record<string, string | number | boolean>;

type ClarityFn = (command: "event", name: string) => void;
type GtagFn = (command: "event", name: string, props?: Props) => void;

/** `maps_js_load` artık üretimde atılmıyor (betik yüklemesi kullanıcı başına bir kezdi);
    faturalanan birimi sayan olay `maps_map_instance` — bkz. lib/maps.ts `trackMapInstance`. */
export type EventName = "map_open" | "maps_js_load" | "maps_map_instance" | "session_status";

export function track(name: EventName, props: Props = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { clarity?: ClarityFn; gtag?: GtagFn };
  try {
    w.clarity?.("event", name);
    w.gtag?.("event", name, props);
  } catch {
    // ölçüm asla akışı kırmaz
  }
}

const seen = new Set<string>();
/** Aşama geçişi oturum+durum başına bir kez. */
export function trackStatus(slug: string, status: string): void {
  const key = `${slug}:${status}`;
  if (seen.has(key)) return;
  seen.add(key);
  track("session_status", { status });
}

/** Testler için — modül durumunu sıfırlar. */
export function resetAnalytics(): void {
  seen.clear();
}
