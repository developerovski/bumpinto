/* Karar dokümanı §5.A.8 — üç olay: "Haritada gör", Maps JS yüklemesi, aşama geçişi.
   R-W14: ölçüm VARSAYILAN KAPALI ve açık rızaya bağlı. Rıza yokken sağlayıcı betiği sayfaya
   HİÇ eklenmez ("yükle ama gönderme" yetmez — Clarity/GA4 kendi başına çerez yazar) ve
   `track()` no-op'tur. PII gönderilmez — yalnız enum'lar. */
type Props = Record<string, string | number | boolean>;
type ClarityFn = (command: string, ...rest: unknown[]) => void;
type GtagFn = (command: string, name: string, props?: Props) => void;

/** `maps_js_load` üretimde atılmıyor; faturalanan birimi `maps_map_instance` sayar (lib/maps.ts). */
export type EventName = "map_open" | "maps_js_load" | "maps_map_instance" | "session_status";

/** Anonim ziyaretçinin rızası sunucuda tutulamaz — tarayıcıda kalır. */
const STORE_KEY = "bumpinto.analyticsConsent";
let consent = false;
let providersLoaded = false;

function env(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value && value.length > 0 ? value : undefined;
}

function addScript(src: string, inline?: string) {
  const el = document.createElement("script");
  el.async = true;
  el.dataset.analytics = "1";
  if (inline) el.text = inline;
  else el.src = src;
  document.head.appendChild(el);
}

/** Rıza verildiği ANDA, oturum başına bir kez. Kimlik yoksa hiçbir şey yapmaz. */
function loadProviders() {
  if (providersLoaded || typeof document === "undefined") return;
  const clarityId = env("VITE_CLARITY_ID");
  const gaId = env("VITE_GA4_ID");
  if (!clarityId && !gaId) return;
  providersLoaded = true;
  if (clarityId) {
    addScript("", `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};` +
      `t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;` +
      `y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`);
  }
  if (gaId) {
    addScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`);
    addScript("", `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag("js",new Date());gtag("config","${gaId}",{anonymize_ip:true});`);
  }
}

export function analyticsConsent(): boolean {
  return consent;
}

/** Girişli kullanıcı: kaynak `MeResponse.consents.analytics` (authStore çağırır). */
export function setAnalyticsConsent(on: boolean): void {
  consent = on;
  if (typeof window === "undefined") return;
  const gaId = env("VITE_GA4_ID");
  // Geri alma: yüklenmiş betik sayfadan sökülemez; GA'nın belgelenmiş opt-out bayrağı kurulur
  // ve `track()` zaten susar. Yeni yükleme YALNIZ rıza varken olur.
  if (gaId) (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = !on;
  if (on) loadProviders();
}

/** Anonim ziyaretçi rızası — tarayıcıda saklanır, hemen uygulanır. */
export function setLocalAnalyticsConsent(on: boolean): void {
  try {
    localStorage.setItem(STORE_KEY, on ? "1" : "0");
  } catch {
    // özel pencere / depolama kapalı: rıza yalnız bu sekmede geçerli
  }
  setAnalyticsConsent(on);
}

export function loadLocalAnalyticsConsent(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORE_KEY);
  } catch {
    stored = null;
  }
  setAnalyticsConsent(stored === "1");
}

export function track(name: EventName, props: Props = {}): void {
  if (typeof window === "undefined") return;
  if (!consent) return; // R-W14: rıza yoksa hiçbir şey gönderilmez
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

/** Testler için — modül durumunu ve rızayı sıfırlar. */
export function resetAnalytics(): void {
  seen.clear();
  consent = false;
  providersLoaded = false;
}
