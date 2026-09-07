# Mağaza uyumluluğu — Web (W-14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apple 5.1.1(v)/4.8 ve Google Play Data safety'nin kullanıcıya dönük web şartlarını karşılamak: giriş gerektirmeyen yasal rotalar (`/privacy`, `/terms`, `/kvkk`, `/attributions`, `/support`), `/account` hesap ve veriler ekranı, `/account/consent` açık rıza, uygulama kurulu olmadan çalışan `/account/delete` akışı, rıza kapılı analitik ve Sign in with Apple.

> **2026-09-07 KULLANICI DÜZELTMESİ — gövdeden ÖNCE okunur, çelişkide kazanır.**
>
> 1. **Yasal gövde ÜÇ DİLDE de tam yazılır.** Planın "TR taban + `legal._status` şeridi"
>    yaklaşımı BIRAKILDI. İçerik `content/legal/*.ts` içinde `LegalBody = Record<"tr"|"en"|"nl",
>    LegalBlock[]>` olarak durur; `legal._status` anahtarı yoktur. (i18n JSON'una değil içerik
>    dosyasına yazılır: uzun düzyazı çeviri paketini şişirir ve her sayfa yüklemesine biner.)
> 2. **KVKK Türkiye'ye özgüdür; Avrupa'da GDPR geçerlidir.** `/kvkk` rotası **`/data-rights`**
>    oldu (`legal.kvkk` → `legal.dataRights`). **Rejim dile bağlıdır:** TR gövde KVKK m.10/m.11'i,
>    EN/NL gövde GDPR Art. 13/14 + 15–22'yi anlatır. Dil yargı yetkisiyle birebir örtüşmediği
>    için (Hollanda'daki Türkçe konuşan GDPR'a tabidir) her sürüm diğer rejime tek notla köprü
>    kurar — bu köprü testle sabitlendi.
> 3. `/privacy` GDPR Art. 13/14 gereği **hukuki dayanak** ve **yurt dışına aktarım** başlıklarını
>    kazandı; GDPR ayrı doküman istemez, bilgilendirmeyi gizlilik metninde arar.
> 4. Şikâyet mercii her rejimde adlandırıldı: TR → Kişisel Verileri Koruma Kurulu, EN/NL →
>    ulusal denetim otoritesi (Hollanda'da Autoriteit Persoonsgegevens).
>
> **Metinler hukukçu onayı bekler** (planın kendi yayın kapısı); yazılanlar taslaktır.

**Architecture:** Yasal metin **çeviri değil yerelleştirmedir**: gövde `content/legal/*.tsx` içinde TR taban **blok verisi** olarak yaşar, tek `LegalBlocks` bileşeni basar, i18n yalnız kabuk etiketlerini taşır ve TR dışı dillerde `legal._status` şeridi çıkar. `/attributions` sağlayıcı başına kod dalı içermez; satırlar `DATA_SOURCES`'tan gelir ve şekil W-12'nin `AppConfigSource`'uyla birebir aynıdır. Rıza yazımı tek yerde toplanır (`authStore.saveConsents`): `PUT /api/me/consents` → `me()` tazelemesi → analitik kapısının hizalanması; hata fırlatılır, UI eski anahtarı geri alır. `lib/analytics.ts` rıza kapısı ekler: rıza yokken sağlayıcı **betiği hiç yüklenmez**, `track()` no-op'tur. `/account/delete` ve `/account/deleted` `AppShell` dışında sade kabukta (`PlainShell`) yaşar ve kurulumsuz çalışır.

**Tech Stack:** React 18, react-router-dom 7, zustand 5, react-i18next (tr/en/nl), Tailwind v4, axios (paylaşılan `createHttp`), Google Identity Services + Sign in with Apple JS, vitest + RTL + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` — §2 sözleşme kararları (rıza, veri indirme, hesap silme, Apple), §3 **R-W10, R-W11, R-W12, R-W13, R-W14, R-W17**. Uyumluluk kaynağı: `2026-09-06-mobile-store-compliance.md` §5. Ham analiz: `…/scratchpad/req/web.md` §4 Plan B.

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36` → `Web Ekranlar v3.dc.html`: **W13** (Hesap ve veriler 1280/390), **W13b** (Açık rıza 390), **W14** (Gizlilik), **W15** (Şartlar), **W16** (KVKK), **W17** (Atıflar), **W18** (Hesabı sil / onay / silindi), **W19** (Destek). Yerel fragmanlar `…/scratchpad/design/w3/frags/53…67-*.html`. Yasal **metin gövdesi** mobil artboard'lardan AYNEN alınır: `…/design/m3/B/09-gizlilik.html` (O9), `10-sartlar.html` (O10), `11-kvkk-aydinlatma.html` (O11), `14-destek.html` (O14). **W20 (Bildir/Engelle) bu planın DIŞINDA** — `ParticipantRow` "…" menüsü W-15'te; bu planın hiçbir görevi `ParticipantRow`'a dokunmaz.

**Ön koşul:** **B-14 (plan33) done** ve `pnpm codegen` koşulmuş. Doğrula (repo kökünden):

```bash
grep -c '"/api/auth/apple"\|"/api/me/consents"\|"/api/me/export"' frontend/shared/openapi.json  # ≥ 3
grep -c "authProviders" frontend/shared/src/api-types.ts                                        # ≥ 1
grep -c "consents" frontend/shared/src/api-types.ts                                             # ≥ 1
```

Biri 0 dönerse **dur**: B-14 yapılmamış ya da codegen eksik. `MeResponse.consents{location,microphone,analytics,updatedAt,version}` ve `MeResponse.authProviders[]` bu planın her yerinde okunur.

**W-12 (plan31) bağımlılığı bilinçli GEVŞETİLDİ:** `web.md` R-W10 `/attributions`'ı W-12'nin `configStore.sources[]`'una bağlıyordu; W-14 mağaza için W-12'den önce yürütülebilmeli. Atıf satırları aynı şekilli yerel `DATA_SOURCES`'tan okunur (T5); W-12 indiğinde tek satır değişir (`DATA_SOURCES` → `useConfigStore((s) => s.config?.sources`)). Sözleşme (§2) hiçbir yerde ihlal edilmez.

**Bağlayıcı kurallar:**
- **Git yazma işlemi YOK**; her görev sonunda dosya listesi bırakılır, commit'i kullanıcı atar.
- Test komutu (repo kökünden): `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>` — aşağıda `PNPM_TEST <yol>`. Kökten çıplak `vitest` KOŞMA. Tam koşu `pnpm test:web`, derleme `pnpm --filter @bumpinto/web exec tsc -b`.
- Tailwind utility'leri **yalnız `components/` altında**; `pages/` ve `content/` kompozisyondur, sınıf dizesi taşımaz.
- i18n: `tr` taban, `en`/`nl` parite (`pnpm i18n:check` → 0). Yasal **gövde** i18n'e girmez (TR taban + `legal._status`).
- Uç adları §2 sözleşmesidir: `POST /api/auth/apple`, `PUT /api/me/consents`, `GET /api/me/export`, `DELETE /api/me`. Yeni uç uydurulmaz.
- Yasal metinlerin hukukçu onayı yok (uyumluluk dok. §7); bu plan kabuğu ve rotaları kodlar, metin artboard'dan aynen gelir ve `version: "1.0"` ile sürümlenir.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/api.ts`, `index.ts` | T1 | `loginApple`, `putConsents`, `exportMyData`, `deleteMe` + `ConsentsInput` |
| `web/src/lib/analytics.ts` (+test), `store/authStore.ts` (+test) | T2 | Rıza kapısı; `saveConsents`/`loginApple`/`deleteAccount` |
| `web/src/components/molecules/LegalBlocks.tsx`, `content/legal/{privacy,terms,kvkk}.tsx`, `content/legal/index.ts` | T3 | Blok modeli + TR taban belgeler |
| `web/src/pages/LegalPage.tsx` (+test), `App.tsx`, `organisms/AppShell.tsx`, `i18n/locales/*` | T4 | `/privacy` `/terms` `/kvkk` + altbilgi |
| `web/src/components/atoms/Toggle.tsx` (+test), `molecules/{SettingsCard,SettingRow,SourceRow,FaqItem}.tsx` | T5 | DS parçaları |
| `web/src/content/legal/sources.ts`, `pages/AttributionsPage.tsx` (+test) | T6 | `/attributions` veri-güdümlü |
| `web/src/pages/AccountPage.tsx` (+test), `molecules/{AvatarMenu,IdentityCard}.tsx` | T7 | `/account` (R-W11) |
| `web/src/pages/ConsentPage.tsx` (+test) | T8 | `/account/consent` (R-W12) |
| `web/src/components/molecules/AppleSignIn.tsx` (+test), `GoogleSignIn.tsx`, `SignInBlock.tsx` | T9 | Apple girişi (R-W17) |
| `web/src/components/organisms/PlainShell.tsx`, `pages/{DeleteAccountPage,AccountDeletedPage,SupportPage}.tsx` (+2 test) | T10 | Silme akışı + destek |
| `docs/superpowers/plans/INDEX.md` | T11 | Doğrulama ve kayıt |

---

### Task 1: Paylaşılan API istemcisi

**Files:**
- Modify: `frontend/shared/src/api.ts`, `frontend/shared/src/index.ts`

- [x] **Step 1: Ön koşulu doğrula** — yukarıdaki üç `grep`. Expected: üçü de ≥1. Biri 0 ise dur, B-14 + `pnpm codegen`.

- [x] **Step 2: Tipleri ekle** (`api.ts`, `export type SessionPreview = …` satırından sonra)

```ts
/* Yazma gövdesi §2: üç boolean. Üretilen istek şemasının adı B-14'e bağlı olduğundan ELLE
   yazılır — alanlar birebir aynı. Okuma `MeResponse.consents`'tan (updatedAt/version dahil). */
export type ConsentsInput = { location: boolean; microphone: boolean; analytics: boolean };
export type AppleLoginRequest = { identityToken: string; nonce: string; fullName?: string };
```

- [x] **Step 3: Dört fonksiyon ekle** (`createBumpintoApi` içine, `voiceCredentials`'tan sonra)

```ts
    loginApple: (body: AppleLoginRequest) =>
      http.post<Schemas["LoginResponse"]>("/api/auth/apple", body).then((r) => r.data),
    // PUT yanıt gövdesi sözleşmede sabit değil — yazımdan sonra `me()` tazelenir (authStore).
    putConsents: (body: ConsentsInput) =>
      http.put("/api/me/consents", body).then(() => undefined),
    // 1/saat sınırlı, attachment JSON. Blob alınır; indirmeyi çağıran yapar.
    exportMyData: () =>
      http.get<Blob>("/api/me/export", { responseType: "blob" }).then((r) => r.data),
    deleteMe: () => http.delete("/api/me").then(() => undefined),
```

- [x] **Step 4: `index.ts` export bloğuna ekle** (alfabetik): `type AppleLoginRequest,` ve `type ConsentsInput,`

- [x] **Step 5: Derle** — Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` → hata yok.

- [x] **Step 6: Dosya listesi** — `frontend/shared/src/api.ts`, `index.ts`. Mesaj: `feat(compliance): shared api client for apple login, consents, export and delete`.

---

### Task 2: Analitik rıza kapısı + `authStore` uçları (R-W14)

**Files:**
- Modify: `frontend/web/src/lib/analytics.ts`, `lib/analytics.test.ts` (yeniden yazılır), `store/authStore.ts`, `store/authStore.test.ts`

- [x] **Step 1: `analytics.test.ts`'i yeniden yaz**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsConsent, loadLocalAnalyticsConsent, resetAnalytics,
  setAnalyticsConsent, setLocalAnalyticsConsent, track, trackStatus,
} from "./analytics";

type W = typeof window & { clarity?: (c: string, ...r: unknown[]) => void; gtag?: (c: string, n: string, p?: Record<string, unknown>) => void };

afterEach(() => {
  delete (window as W).clarity;
  delete (window as W).gtag;
  document.head.querySelectorAll("script[data-analytics]").forEach((s) => s.remove());
  localStorage.clear();
  resetAnalytics();
});

describe("analytics — rıza kapısı", () => {
  it("varsayılan kapalı: sağlayıcı çağrılmaz, betik yüklenmez", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    expect(analyticsConsent()).toBe(false);
    track("map_open", { screen: "venues" });
    expect(gtag).not.toHaveBeenCalled();
    expect(document.head.querySelectorAll("script[data-analytics]")).toHaveLength(0);
  });

  it("rıza verilince olay gider, geri alınınca susar", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    setAnalyticsConsent(true);
    track("map_open", { screen: "venues" });
    expect(gtag).toHaveBeenCalledWith("event", "map_open", { screen: "venues" });
    setAnalyticsConsent(false);
    track("map_open", {});
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("sağlayıcı throw etse bile akışı kırmaz", () => {
    setAnalyticsConsent(true);
    (window as W).clarity = () => { throw new Error("boom"); };
    expect(() => track("map_open", { screen: "venues" })).not.toThrow();
  });

  it("aynı aşama geçişi iki kez gitmez, farklı slug/durum gider", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    setAnalyticsConsent(true);
    trackStatus("x", "BROWSING");
    trackStatus("x", "BROWSING");
    trackStatus("x", "SWIPING");
    trackStatus("y", "BROWSING");
    expect(gtag).toHaveBeenCalledTimes(3);
  });

  it("anonim rıza localStorage'da tutulur ve geri okunur", () => {
    setLocalAnalyticsConsent(true);
    resetAnalytics();
    expect(analyticsConsent()).toBe(false);
    loadLocalAnalyticsConsent();
    expect(analyticsConsent()).toBe(true);
  });

  it("localStorage okunamazsa rıza kapalı kalır (özel pencere)", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => loadLocalAnalyticsConsent()).not.toThrow();
    expect(analyticsConsent()).toBe(false);
    spy.mockRestore();
  });

  it("resetAnalytics rızayı da sıfırlar", () => {
    setAnalyticsConsent(true);
    resetAnalytics();
    expect(analyticsConsent()).toBe(false);
  });
});
```

- [x] **Step 2: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/lib/analytics.test.ts` → FAIL (`analyticsConsent` yok).

- [x] **Step 3: `analytics.ts`'i yeniden yaz**

```ts
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
```

- [x] **Step 4: Çalıştır** — Run: `PNPM_TEST src/lib/analytics.test.ts` → 7 passed.

- [x] **Step 5: `authStore.ts`'i genişlet**

Import bloğuna: `import type { ConsentsInput } from "@bumpinto/shared";` ve `import { loadLocalAnalyticsConsent, setAnalyticsConsent } from "../lib/analytics";`

`AuthState` tipine (`updatePrefs`'ten sonra):

```ts
  /** PUT /api/me/consents — patch mevcut rızaların üstüne biner; başarısızsa FIRLATIR (UI geri alır). */
  saveConsents: (patch: Partial<ConsentsInput>) => Promise<void>;
  loginApple: (identityToken: string, nonce: string, fullName?: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
```

Modül düzeyine (`applyServerLanguage`'dan sonra):

```ts
/** Sunucudaki rıza tek gerçek kaynak; kapı her `me` tazelemesinde ona hizalanır. */
function applyAnalyticsConsent(me: MeResponse) {
  setAnalyticsConsent(me.consents?.analytics === true);
}

const NO_CONSENTS: ConsentsInput = { location: false, microphone: false, analytics: false };

export function consentsOf(me: MeResponse | null): ConsentsInput {
  const c = me?.consents;
  if (!c) return NO_CONSENTS;
  return { location: c.location === true, microphone: c.microphone === true, analytics: c.analytics === true };
}
```

`load` gövdesini değiştir: `catch` dalına `loadLocalAnalyticsConsent();` (set'ten sonra), son satırı `if (me) { applyServerLanguage(me); applyAnalyticsConsent(me); }` yap. `login` sonuna `applyAnalyticsConsent(me);`. `logout`'un `finally`'sine `setAnalyticsConsent(false);`.

`updatePrefs`'ten sonra üç eylem:

```ts
  saveConsents: async (patch) => {
    const me = get().me;
    if (!me) return;
    await api.putConsents({ ...consentsOf(me), ...patch });
    const fresh = await api.me(); // updatedAt/version sunucudan gelir
    set({ me: fresh });
    applyAnalyticsConsent(fresh);
  },
  loginApple: async (identityToken, nonce, fullName) => {
    await api.loginApple({ identityToken, nonce, fullName });
    const me = await api.me();
    set({ me, status: "signed" });
    applyServerLanguage(me);
    applyAnalyticsConsent(me);
  },
  deleteAccount: async () => {
    await api.deleteMe();
    set({ me: null, status: "anon" });
    setAnalyticsConsent(false);
    useSessionsStore.getState().reset();
  },
```

- [x] **Step 6: `authStore.test.ts`'e üç test ekle**

Dosyanın `vi.mock("../lib/api", …)` sahtesine `putConsents: vi.fn()`, `deleteMe: vi.fn()`, `loginApple: vi.fn()`, `exportMyData: vi.fn()` ekle; `import { analyticsConsent, resetAnalytics } from "../lib/analytics";` ve `beforeEach`e `resetAnalytics();` koy. Sonra `describe` içine:

```ts
  it("me.consents.analytics true ise analitik kapısı açılır", async () => {
    vi.mocked(api.me).mockResolvedValue({ id: "u1", consents: { location: true, microphone: false, analytics: true } } as never);
    await useAuthStore.getState().load();
    expect(analyticsConsent()).toBe(true);
  });

  it("saveConsents mevcut rızaların üstüne patch biner ve me tazelenir", async () => {
    useAuthStore.setState({ status: "signed", me: { id: "u1", consents: { location: true, microphone: true, analytics: false } } as never });
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue({ id: "u1", consents: { location: true, microphone: true, analytics: true } } as never);
    await useAuthStore.getState().saveConsents({ analytics: true });
    expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: true, analytics: true });
    expect(analyticsConsent()).toBe(true);
  });

  it("deleteAccount oturumu anon'a düşürür ve analitiği kapatır", async () => {
    useAuthStore.setState({ status: "signed", me: { id: "u1" } as never });
    vi.mocked(api.deleteMe).mockResolvedValue(undefined);
    await useAuthStore.getState().deleteAccount();
    expect(useAuthStore.getState().status).toBe("anon");
    expect(analyticsConsent()).toBe(false);
  });
```

- [x] **Step 7: Çalıştır** — Run: `PNPM_TEST src/store/authStore.test.ts` → önceki + 3 yeşil. `tsc -b` temiz.

- [x] **Step 8: Dosya listesi** — `lib/analytics.ts`, `lib/analytics.test.ts`, `store/authStore.ts`, `store/authStore.test.ts`. Mesaj: `feat(compliance): consent-gated analytics and consent/delete actions in authStore`.

---

### Task 3: Yasal blok modeli + TR taban belgeler (R-W10 içerik)

**Files:**
- Create: `frontend/web/src/components/molecules/LegalBlocks.tsx`, `content/legal/{privacy,terms,kvkk}.tsx`, `content/legal/index.ts`
- Modify: `frontend/web/src/components/index.ts`, `frontend/web/src/styles/app.css`

- [x] **Step 1: `LegalBlocks.tsx`'i yaz** (Tailwind burada kalır — `content/` sınıf taşımaz)

```tsx
/* Artboard W14/W15/W16 okuyucu tipografisi (.lg-h / .lg-p / .lg-ul / .tbl / amber not).
   Metin blok VERİSİ olarak gelir: içerik dosyaları sınıf dizesi taşımaz, tek renderer basar. */
export type LegalBlock =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { table: [string, string][] }
  | { note: string }
  /** [önce yazılan metin, bağlantı etiketi, href] — iletişim/başvuru satırları. */
  | { link: [string, string, string] };

export default function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if ("h" in b) return <h2 key={i} className="mt-2 font-head text-[1.0625rem] font-bold text-ink">{b.h}</h2>;
        if ("p" in b) return <p key={i} className="text-[0.9375rem] leading-relaxed text-ink2">{b.p}</p>;
        if ("note" in b)
          return (
            <p key={i} className="rounded-2xl border border-[#f3ddb0] bg-amber-w p-[0.75rem_0.875rem] text-[0.8125rem] leading-normal text-ink">
              {b.note}
            </p>
          );
        if ("ul" in b)
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 pl-5 text-[0.9375rem] leading-relaxed text-ink2">
              {b.ul.map((item) => <li key={item}>{item}</li>)}
            </ul>
          );
        if ("link" in b)
          return (
            <p key={i} className="text-[0.9375rem] leading-relaxed text-ink2">
              {b.link[0]}
              <a href={b.link[2]} className="text-flame-deep">{b.link[1]}</a>
            </p>
          );
        return (
          <dl key={i} className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-x-4 gap-y-2 rounded-2xl border border-line bg-card p-[1rem_1.125rem]">
            {b.table.map(([term, value]) => (
              <div key={term} className="contents">
                <dt className="text-[0.8125rem] font-semibold text-ink">{term}</dt>
                <dd className="m-0 text-[0.8125rem] leading-normal text-ink2">{value}</dd>
              </div>
            ))}
          </dl>
        );
      })}
    </>
  );
}
```

`styles/app.css` `@theme` bloğuna (yoksa) `--color-amber-w: #fdf3e0;` ekle (artboard `--amb-w`).

- [x] **Step 2: `content/legal/privacy.tsx`'i yaz** (metin O9/W14'ten AYNEN)

```tsx
/* Kaynak: Mobil Onboarding v3 · O9 + Web v3 · W14. TR taban (çeviri değil yerelleştirme). */
import LegalBlocks, { type LegalBlock } from "../../components/molecules/LegalBlocks";

const BLOCKS: LegalBlock[] = [
  { h: "Neyi topluyoruz" },
  { table: [
    ["Hesap", "Ad, e-posta, Google/Apple kimliği"],
    ["Konum", "Yalnız uygulama açıkken · ~1 km yuvarlanarak paylaşılır"],
    ["Ulaşım türü", "Yürüyüş, bisiklet, araba vb. — yol süresi için"],
    ["Görünen ad", "Oturumdaki herkese görünür"],
    ["Ses", "Kaydedilmez; cihazlar arası doğrudan (P2P) akar"],
    ["Oturum geçmişi", "24 saatte kapanır, 30 günde silinir"],
    ["Kullanım verisi", "Yalnız sen Ayarlar'dan açarsan toplanır"],
  ] },
  { h: "Neden topluyoruz" },
  { p: "Herkese adil bir orta nokta bulmak, çevredeki mekanları aramak ve oturumunu listende tutmak için. Bunların dışında bir amaçla kullanmayız." },
  { h: "Kimlerle paylaşıyoruz" },
  { p: "Konumun ve görünen adın yalnızca aynı oturumdaki kişilerle paylaşılır. Mekan aramak için Google Places, Foursquare ve OpenStreetMap/Nominatim'e sorgu göndeririz; bu sorgularda kimliğin yer almaz. Verini reklam ağlarına satmayız, paylaşmayız." },
  { h: "Ne kadar tutuyoruz" },
  { p: "Oturumlar 24 saatte kapanır, 30 gün sonra kalıcı olarak silinir. Hesap bilgilerin, hesabını silene kadar tutulur." },
  { h: "Hakların" },
  { link: ["Verilerine erişme, düzeltme ve silme hakkın var. Uygulama içinde Hesap → Hesabı sil ile başlayabilir, ya da ", "bumpinto.app/account/delete", "/account/delete"] },
  { h: "Çocuklar" },
  { p: "BumpInto 13 yaşın altındaki kullanıcılar için tasarlanmamıştır; bilerek onlardan veri toplamayız." },
  { h: "İletişim" },
  { link: ["Sorun mu var: ", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
];

export default function PrivacyContent() {
  return <LegalBlocks blocks={BLOCKS} />;
}
```

- [x] **Step 3: `content/legal/terms.tsx`'i yaz** (metin O10/W15'ten AYNEN)

```tsx
/* Kaynak: Mobil Onboarding v3 · O10 + Web v3 · W15. TR taban. */
import LegalBlocks, { type LegalBlock } from "../../components/molecules/LegalBlocks";

const BLOCKS: LegalBlock[] = [
  { h: "Hizmet" },
  { p: "BumpInto, arkadaşlarınla adil bir buluşma noktası ve mekan bulmanı sağlar. Mekan bilgileri (saat, fiyat, puan) üçüncü taraf sağlayıcılardan gelir; bunlar önceden haber vermeden değişebilir. Doğruluğunu garanti etmeyiz — gitmeden önce kontrol et." },
  { h: "Hesap ve davet linkleri" },
  { p: "Davet linkini paylaştığın kişilerden sorumlusun. Bir oturum 24 saat içinde otomatik kapanır; kapanan bir linke yeniden katılamazsın." },
  { h: "Kabul edilebilir kullanım" },
  { p: "Taciz, nefret söylemi, spam ve sahte kimlik yasaktır. Sesli sohbette ve görünen adlarda rahatsız edici içeriğe sıfır toleransımız var. Bir kişiyi bildirebilir ya da engelleyebilirsin; ihlal tespit edilirse hesabın uyarısız kapatılabilir." },
  { h: "İçerik" },
  { p: "Oturum adı ve görünen adın sana aittir. Bize yalnızca bunları uygulama içinde göstermemiz için sınırlı bir lisans verirsin." },
  { h: "Sorumluluk sınırı" },
  { p: "BumpInto bir buluşma aracıdır; taraflar arasında ne olduğundan sorumlu değiliz. Hizmeti olduğu gibi sunarız, kesintisiz çalışacağını garanti etmeyiz." },
  { h: "Fesih" },
  { p: "Şartları ihlal edersen hesabını askıya alabilir ya da kapatabiliriz. Sen de hesabını istediğin an kapatabilirsin." },
  { h: "Değişiklikler" },
  { p: "Bu şartları güncelleyebiliriz; önemli değişikliklerde uygulama içinden bilgilendiririz." },
  { h: "Uygulanacak hukuk" },
  { p: "Türkiye ve Hollanda'daki tüketici haklarını saklı tutarız; bu şartlar seni yasal haklarından mahrum bırakmaz." },
  { h: "İletişim" },
  { link: ["Sorun mu var: ", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
];

export default function TermsContent() {
  return <LegalBlocks blocks={BLOCKS} />;
}
```

- [x] **Step 4: `content/legal/kvkk.tsx`'i yaz** (metin O11/W16'dan AYNEN)

```tsx
/* Kaynak: Mobil Onboarding v3 · O11 + Web v3 · W16 (6698 s.K. m.10). TR taban.
   Açık rıza tercihleri burada DEĞİL — /account/consent'te (m.5/1 ayrımı). */
import LegalBlocks, { type LegalBlock } from "../../components/molecules/LegalBlocks";

const BLOCKS: LegalBlock[] = [
  { note: "Bu metin aydınlatma amaçlıdır; açık rıza tercihlerin ayrı ekranda (Açık rıza tercihlerin)." },
  { h: "Veri sorumlusu" },
  { link: ["BumpInto (Mehmet Şerefoğlu) · [tacir adresi — mağazada görünür] · ", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
  { h: "İşlenen kişisel veriler" },
  { ul: [
    "Kimlik ve iletişim: ad, e-posta, Google/Apple kimliği",
    "Konum: yalnız uygulama açıkken, ~1 km yuvarlanmış",
    "Ulaşım türü ve görünen ad",
    "Ses: yalnız aktarım anında, kaydedilmez",
    "Oturum geçmişi ve kullanım verisi (açarsan)",
  ] },
  { h: "İşleme amaçları" },
  { p: "Hesap oluşturma, adil orta nokta hesaplama, mekan arama, oturum ve buluşma kaydının yönetilmesi." },
  { h: "Aktarılan taraflar ve amaç" },
  { p: "Mekan arama ve adres çözümleme için Google, Foursquare ve OpenStreetMap Vakfı'na (yurt dışı) sorgu gönderilir. Sunucularımız AB'de barındırılır. Verin oturum dışındaki kişilerle ya da reklam amacıyla paylaşılmaz." },
  { h: "Toplama yöntemi ve hukuki sebep" },
  { p: "Hesap ve oturum verileri, sözleşmenin ifası için gereklidir (m.5/2-c). Konum ve mikrofon verisi ile kullanım verisi, açık rızana dayanır (m.5/1); rızanı istediğin an geri alabilirsin." },
  { h: "Saklama süresi" },
  { p: "Oturum verileri 24 saatte kapanır, 30 gün içinde silinir. Hesap verilerin, hesabını silene kadar tutulur." },
  { h: "İlgili kişinin hakları (m.11)" },
  { ul: [
    "İşlenip işlenmediğini öğrenme",
    "İşlenmişse buna ilişkin bilgi talep etme",
    "İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme",
    "Yurt içi/yurt dışı aktarıldığı üçüncü kişileri bilme",
    "Eksik/yanlış işlenmişse düzeltilmesini isteme",
    "Silinmesini veya yok edilmesini isteme",
    "Düzeltme/silme işleminin aktarılan taraflara bildirilmesini isteme",
    "Otomatik analiz sonucu aleyhe çıkan sonuca itiraz etme",
  ] },
  { h: "Başvuru" },
  { link: ["Talebini şu adrese yaz, başvurunu en geç 30 gün içinde sonuçlandırırız: ", "hello@bumpinto.app", "mailto:hello@bumpinto.app"] },
];

export default function KvkkContent() {
  return <LegalBlocks blocks={BLOCKS} />;
}
```

- [x] **Step 5: `content/legal/index.ts`'i yaz**

```ts
import type { ComponentType } from "react";
import KvkkContent from "./kvkk";
import PrivacyContent from "./privacy";
import TermsContent from "./terms";

export type LegalSlug = "privacy" | "terms" | "kvkk";
export type LegalDocMeta = {
  slug: LegalSlug;
  /** i18n başlık anahtarı — gövde çevrilmez, başlık çevrilir. */
  titleKey: string;
  /** ISO tarih; ekranda kullanıcının diline göre biçimlenir. */
  updated: string;
  version: string;
  Content: ComponentType;
};

export const LEGAL_DOCS: Record<LegalSlug, LegalDocMeta> = {
  privacy: { slug: "privacy", titleKey: "legal.privacy", updated: "2026-09-06", version: "1.0", Content: PrivacyContent },
  terms: { slug: "terms", titleKey: "legal.terms", updated: "2026-09-06", version: "1.0", Content: TermsContent },
  kvkk: { slug: "kvkk", titleKey: "legal.kvkk", updated: "2026-09-06", version: "1.0", Content: KvkkContent },
};
```

- [x] **Step 6: Barrel + derleme** — `components/index.ts` molecules bloğuna `export { default as LegalBlocks } from "./molecules/LegalBlocks";`. Run: `tsc -b` → temiz.

- [x] **Step 7: Dosya listesi** — `components/molecules/LegalBlocks.tsx`, `content/legal/{privacy,terms,kvkk}.tsx`, `content/legal/index.ts`, `components/index.ts`, `styles/app.css`. Mesaj: `feat(legal): block model and TR base legal documents`.

---

### Task 4: Yasal rotalar, `LegalPage` ve altbilgi (R-W10)

**Files:**
- Create: `frontend/web/src/pages/LegalPage.tsx`, Test: `pages/LegalPage.test.tsx`
- Modify: `frontend/web/src/App.tsx`, `components/organisms/AppShell.tsx`, `i18n/locales/{tr,en,nl}.json`

- [x] **Step 1: i18n `legal` alanını ekle** — `tr.json` kök nesnesinin sonuna:

```json
  "legal": {
    "privacy": "Gizlilik politikası",
    "terms": "Kullanım şartları",
    "kvkk": "KVKK aydınlatma metni",
    "attributions": "Atıflar ve lisanslar",
    "support": "Destek",
    "updated": "Son güncelleme: {{date}} · Sürüm {{version}}",
    "_status": ""
  }
```

`en.json` / `nl.json` aynı ağaç, değerler:

| anahtar | en | nl |
|---|---|---|
| `legal.privacy` | Privacy policy | Privacybeleid |
| `legal.terms` | Terms of use | Gebruiksvoorwaarden |
| `legal.kvkk` | KVKK disclosure | KVKK-informatie |
| `legal.attributions` | Attributions and licenses | Vermeldingen en licenties |
| `legal.support` | Support | Ondersteuning |
| `legal.updated` | Last updated: {{date}} · Version {{version}} | Laatst bijgewerkt: {{date}} · Versie {{version}} |
| `legal._status` | This document is published in Turkish. The Turkish text is the binding version; write to hello@bumpinto.app for a summary in English. | Dit document is in het Turks gepubliceerd. De Turkse tekst is bindend; mail hello@bumpinto.app voor een samenvatting in het Nederlands. |

Run: `source ./init-nvm.sh && pnpm i18n:check` → 0 fark.

- [x] **Step 2: `LegalPage.test.tsx`'i yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "../i18n";
import LegalPage from "./LegalPage";

function at(slug: "privacy" | "terms" | "kvkk") {
  return render(<MemoryRouter><LegalPage slug={slug} /></MemoryRouter>);
}

afterEach(() => void i18n.changeLanguage("tr"));

describe("LegalPage", () => {
  it("gizlilik: başlık, sürüm satırı, tablo ve hak bağlantısı", () => {
    at("privacy");
    expect(screen.getByRole("heading", { level: 1, name: "Gizlilik politikası" })).toBeInTheDocument();
    expect(screen.getByText(/Sürüm 1\.0/)).toBeInTheDocument();
    expect(screen.getByText("Ses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "bumpinto.app/account/delete" })).toHaveAttribute("href", "/account/delete");
  });

  it("şartlar: sıfır tolerans cümlesi aynen basılır", () => {
    at("terms");
    expect(screen.getByText(/sıfır toleransımız var/)).toBeInTheDocument();
  });

  it("kvkk: aydınlatma uyarısı ve m.11 hakları", () => {
    at("kvkk");
    expect(screen.getByText(/Bu metin aydınlatma amaçlıdır/)).toBeInTheDocument();
    expect(screen.getByText("Silinmesini veya yok edilmesini isteme")).toBeInTheDocument();
  });

  it("TR'de dil şeridi yok; EN'de var ve gövde yine Türkçe", async () => {
    at("privacy");
    expect(screen.queryByText(/binding version/)).not.toBeInTheDocument();
    await i18n.changeLanguage("en");
    at("privacy");
    expect(screen.getByText(/binding version/)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: "Privacy policy" })).toHaveLength(1);
    expect(screen.getAllByText(/cihazlar arası doğrudan \(P2P\) akar/).length).toBeGreaterThan(0);
  });
});
```

- [x] **Step 3: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/pages/LegalPage.test.tsx` → FAIL (`./LegalPage` yok).

- [x] **Step 4: `LegalPage.tsx`'i yaz**

```tsx
/* Artboard W14/W15/W16 · yasal okuyucu — RequireAuth YOK, anonim erişilebilir (mağaza meta
   verisi herkese açık URL ister). Gövde TR taban; TR dışı dilde `legal._status` şeridi basılır. */
import { useTranslation } from "react-i18next";
import { Note, Overline, Page } from "../components/atoms";
import OneZone from "../components/molecules/OneZone";
import PageHeader from "../components/molecules/PageHeader";
import { LEGAL_DOCS, type LegalSlug } from "../content/legal";

export default function LegalPage({ slug }: { slug: LegalSlug }) {
  const { t, i18n } = useTranslation();
  const doc = LEGAL_DOCS[slug];
  const status = t("legal._status");
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(doc.updated));
  const Content = doc.Content;
  return (
    <Page>
      <PageHeader title={t(doc.titleKey)} />
      <OneZone>
        <Overline>{t("legal.updated", { date, version: doc.version })}</Overline>
        {status !== "" && <Note card>{status}</Note>}
        <Content />
      </OneZone>
    </Page>
  );
}
```

`OneZone` dikey aralık taşımıyorsa `components/molecules/OneZone.tsx` sınıf listesine `gap-3` ekle.

- [x] **Step 5: Çalıştır** — Run: `PNPM_TEST src/pages/LegalPage.test.tsx` → 4 passed.

- [x] **Step 6: `App.tsx`'e üç rota** (`AppShell` layout'unun İÇİNE, `/profile`'dan sonra; **`RequireAuth` YOK** — kasıtlı)

```tsx
        <Route path="/privacy" element={<LegalPage slug="privacy" />} />
        <Route path="/terms" element={<LegalPage slug="terms" />} />
        <Route path="/kvkk" element={<LegalPage slug="kvkk" />} />
```

Import: `import LegalPage from "./pages/LegalPage";`

- [x] **Step 7: `AppShell` altbilgisi** — mevcut atıf `<p>`'sini şununla değiştir (import satırı `import { Link, Outlet } from "react-router-dom";` olur):

```tsx
      <footer className="flex flex-col items-center gap-2 px-5 pb-4 text-center text-[0.6875rem] text-ink2">
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link to="/privacy" className="text-ink2">{t("legal.privacy")}</Link>
          <Link to="/terms" className="text-ink2">{t("legal.terms")}</Link>
          <Link to="/kvkk" className="text-ink2">{t("legal.kvkk")}</Link>
          <Link to="/attributions" className="text-ink2">{t("legal.attributions")}</Link>
          <Link to="/support" className="text-ink2">{t("legal.support")}</Link>
        </nav>
        <span>{t("attribution.osm")}</span>
      </footer>
```

- [x] **Step 8: Çalıştır** — Run: `PNPM_TEST src/pages` ve `PNPM_TEST src/components/molecules/TopBar.test.tsx` → yeşil. `pnpm i18n:check` → 0.

- [x] **Step 9: Dosya listesi** — `pages/LegalPage.tsx`, `pages/LegalPage.test.tsx`, `App.tsx`, `components/organisms/AppShell.tsx`, `i18n/locales/{tr,en,nl}.json`, (gerekirse) `OneZone.tsx`. Mesaj: `feat(legal): public /privacy /terms /kvkk routes and footer links`.

---

### Task 5: DS parçaları — `Toggle`, `SettingsCard`, `SettingRow`, `SourceRow`, `FaqItem`

**Files:**
- Create: `frontend/web/src/components/atoms/Toggle.tsx`, Test: `atoms/Toggle.test.tsx`
- Create: `frontend/web/src/components/molecules/{SettingsCard,SettingRow,SourceRow,FaqItem}.tsx`
- Modify: `frontend/web/src/components/atoms/index.ts`, `components/index.ts`, `.design-sync/config.json`

- [x] **Step 1: `Toggle.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toggle from "./Toggle";

describe("Toggle", () => {
  it("switch rolü ve aria-checked taşır", () => {
    render(<Toggle checked label="Kullanım verisi" onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "true");
  });

  it("tıklanınca tersini bildirir, disabled iken bildirmez", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked={false} label="Konum" onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Konum" }));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Toggle checked={false} label="Konum" disabled onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Konum" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
```

- [x] **Step 2: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/components/atoms/Toggle.test.tsx` → FAIL.

- [x] **Step 3: `Toggle.tsx`'i yaz**

```tsx
/* Artboard .tog / .tog.off — 46×28 pill anahtar. `role="switch"` zorunlu: rıza ekranı klavye
   ve ekran okuyucuyla çalışmak zorunda (KVKK m.5/1 açık rıza kanıtlanabilir olmalı). */
export default function Toggle(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.checked)}
      className={[
        "relative h-7 w-[2.875rem] flex-none cursor-pointer rounded-full border-[1.5px] transition-colors",
        "focus-visible:outline-[2.5px] focus-visible:outline-flame-deep focus-visible:outline-offset-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-45",
        props.checked ? "border-transparent bg-flame-deep" : "border-line2 bg-sand",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute top-[0.1875rem] h-[1.25rem] w-[1.25rem] rounded-full bg-white shadow-sh1 transition-all",
          props.checked ? "left-[1.4375rem]" : "left-[0.1875rem]",
        ].join(" ")}
      />
    </button>
  );
}
```

- [x] **Step 4: `SettingsCard.tsx` ve `SettingRow.tsx`'i yaz**

```tsx
/* Artboard .card(padding:0) + .dv ayraçları — ayar satırlarının kabı. */
import type { ReactNode } from "react";

export default function SettingsCard(props: { children: ReactNode; danger?: boolean }) {
  return (
    <ul className={[
      "m-0 flex list-none flex-col divide-y divide-line rounded-card border bg-card p-0 shadow-sh1",
      props.danger ? "border-[#efc9c2]" : "border-line",
    ].join(" ")}>
      {props.children}
    </ul>
  );
}
```

```tsx
/* Artboard W13/O8 .srow.st — ikon + etiket (+alt satır) + sağda caret ya da anahtar.
   Üç kullanım: bağlantı (`to`), eylem (`onClick`), salt bilgi/anahtar (`aside`). */
import { CaretRight } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const ROW = "flex w-full items-center gap-3.5 px-[1.125rem] py-3.5 text-left no-underline";
const ICON = "flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-sand";

export default function SettingRow(props: {
  icon: ReactNode; label: string; hint?: string;
  to?: string; onClick?: () => void; aside?: ReactNode; danger?: boolean; disabled?: boolean;
}) {
  const body = (
    <>
      <span className={`${ICON} ${props.danger ? "text-[#c0392b]" : "text-ink2"}`} aria-hidden>{props.icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-[0.875rem] font-semibold ${props.danger ? "text-[#c0392b]" : "text-ink"}`}>{props.label}</span>
        {props.hint && <span className="text-[0.75rem] leading-normal text-ink2">{props.hint}</span>}
      </span>
      {props.aside ?? <CaretRight size={16} className="flex-none text-ink2" aria-hidden />}
    </>
  );
  return (
    <li className="flex">
      {props.to ? (
        <Link to={props.to} className={`${ROW} text-ink`}>{body}</Link>
      ) : props.onClick ? (
        <button type="button" className={ROW} disabled={props.disabled} onClick={props.onClick}>{body}</button>
      ) : (
        <div className={ROW}>{body}</div>
      )}
    </li>
  );
}
```

- [x] **Step 5: `SourceRow.tsx` ve `FaqItem.tsx`'i yaz**

```tsx
/* Artboard W17 · atıf satırı — ikon yok; sağda lisans metni, etiket dış bağlantı olabilir. */
export default function SourceRow(props: { label: string; hint?: string; href?: string | null; aside?: string }) {
  return (
    <li aria-label={props.hint ? "veri kaynağı" : undefined} className="flex items-center gap-3 px-[1.125rem] py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {props.href ? (
          <a href={props.href} target="_blank" rel="noreferrer" className="text-[0.875rem] font-semibold text-ink">{props.label}</a>
        ) : (
          <span className="text-[0.875rem] font-semibold text-ink">{props.label}</span>
        )}
        {props.hint && <span className="text-[0.75rem] leading-normal text-ink2">{props.hint}</span>}
      </span>
      {props.aside && <span className="flex-none text-[0.75rem] text-ink2">{props.aside}</span>}
    </li>
  );
}
```

```tsx
/* Artboard W19 · SSS satırı — `<details>` örtük `group` rolü taşır, JS'siz açılır. */
export default function FaqItem(props: { question: string; answer: string }) {
  return (
    <details className="rounded-2xl border border-line bg-card p-[0.875rem_1.125rem]">
      <summary className="cursor-pointer text-[0.875rem] font-semibold text-ink">{props.question}</summary>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-ink2">{props.answer}</p>
    </details>
  );
}
```

- [x] **Step 6: Barrel'lar ve DS önizlemesi**

`atoms/index.ts`: `export { default as Toggle } from "./Toggle";` (alfabetik). `components/index.ts` molecules bloğuna alfabetik: `FaqItem`, `SettingRow`, `SettingsCard`, `SourceRow` default export satırları. `.design-sync/config.json#overrides`'a `Toggle`, `SettingRow`, `SourceRow`, `FaqItem` girdilerini `cardMode: "column"` ile ekle.

- [x] **Step 7: Çalıştır** — Run: `PNPM_TEST src/components/atoms/Toggle.test.tsx` → 2 passed. `tsc -b` temiz.

- [x] **Step 8: Dosya listesi** — `atoms/Toggle.tsx`, `atoms/Toggle.test.tsx`, `atoms/index.ts`, `molecules/{SettingsCard,SettingRow,SourceRow,FaqItem}.tsx`, `components/index.ts`, `.design-sync/config.json`. Mesaj: `feat(ds): Toggle, SettingsCard, SettingRow, SourceRow, FaqItem`.

---

### Task 6: `/attributions` — veri-güdümlü atıf sayfası (R-W10)

**Files:**
- Create: `frontend/web/src/content/legal/sources.ts`, `pages/AttributionsPage.tsx`, Test: `pages/AttributionsPage.test.tsx`
- Modify: `frontend/web/src/App.tsx`, `i18n/locales/{tr,en,nl}.json`

- [x] **Step 1: `content/legal/sources.ts`'i yaz**

```ts
/* Artboard W17. Sağlayıcı başına KOD DALI YOK: satırlar bu diziden gelir. Şekil W-12'nin
   `AppConfigSource`'uyla (id, attributionKey, attributionUrl, ratingScale) birebir aynıdır;
   W-12 indiğinde AttributionsPage kaynağı tek satırda configStore'a döner. */
export type DataSource = {
  id: string;
  attributionKey: string;
  attributionUrl: string | null;
  ratingScale: 5 | 10 | null;
  /** Yalnız bu sayfada kullanılan açıklama satırı. */
  descKey: string;
};

export const DATA_SOURCES: DataSource[] = [
  { id: "google", attributionKey: "attribution.google", attributionUrl: "https://cloud.google.com/maps-platform/terms", ratingScale: 5, descKey: "attrib.descGoogle" },
  { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: "https://foursquare.com/legal/", ratingScale: 10, descKey: "attrib.descFoursquare" },
  { id: "osm", attributionKey: "attribution.osm", attributionUrl: "https://www.openstreetmap.org/copyright", ratingScale: null, descKey: "attrib.descOsm" },
];

export type OssEntry = { name: string; license: string };

/** Web istemcisinin dağıtılan bağımlılıkları (package.json ile senkron tutulur). */
export const OSS_LICENSES: OssEntry[] = [
  { name: "React", license: "MIT" },
  { name: "Vite", license: "MIT" },
  { name: "Tailwind CSS", license: "MIT" },
  { name: "zustand", license: "MIT" },
  { name: "react-i18next", license: "MIT" },
  { name: "axios", license: "MIT" },
  { name: "@stomp/stompjs", license: "Apache-2.0" },
  { name: "Phosphor Icons", license: "MIT" },
  { name: "Bricolage Grotesque", license: "OFL 1.1" },
  { name: "Figtree", license: "OFL 1.1" },
  { name: "Caveat", license: "OFL 1.1" },
];
```

- [x] **Step 2: i18n `attrib` alanını ekle** — `tr.json`:

```json
  "attrib": {
    "dataTitle": "Mekan ve harita verisi",
    "ossTitle": "Açık kaynak",
    "everywhere": "Bu atıflar, verinin göründüğü her ekranda da yer alır.",
    "descGoogle": "Mekanlar, fotoğraflar, yol süreleri · Google Haritalar Ek Hizmet Şartları",
    "descFoursquare": "Mekan kategorileri ve ipuçları",
    "descOsm": "Adres/semt adları (Nominatim) · ODbL 1.0"
  }
```

| anahtar | en | nl |
|---|---|---|
| `attrib.dataTitle` | Venue and map data | Locatie- en kaartgegevens |
| `attrib.ossTitle` | Open source | Open source |
| `attrib.everywhere` | These attributions also appear on every screen where the data is shown. | Deze vermeldingen staan ook op elk scherm waar de gegevens te zien zijn. |
| `attrib.descGoogle` | Venues, photos, travel times · Google Maps Additional Terms of Service | Locaties, foto's, reistijden · Aanvullende servicevoorwaarden van Google Maps |
| `attrib.descFoursquare` | Venue categories and tips | Locatiecategorieën en tips |
| `attrib.descOsm` | Address and neighbourhood names (Nominatim) · ODbL 1.0 | Adres- en buurtnamen (Nominatim) · ODbL 1.0 |

- [x] **Step 3: `AttributionsPage.test.tsx`'i yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DATA_SOURCES } from "../content/legal/sources";
import AttributionsPage from "./AttributionsPage";

function at() {
  return render(<MemoryRouter><AttributionsPage /></MemoryRouter>);
}

describe("AttributionsPage", () => {
  it("satır sayısı diziden gelir (sağlayıcı başına kod dalı yok)", () => {
    at();
    expect(screen.getAllByRole("listitem", { name: "veri kaynağı" })).toHaveLength(DATA_SOURCES.length);
  });

  it("atıf metinleri ve lisans bağlantısı basılır", () => {
    at();
    expect(screen.getByText("© OpenStreetMap contributors")).toBeInTheDocument();
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" }))
      .toHaveAttribute("href", "https://cloud.google.com/maps-platform/terms");
  });

  it("açık kaynak listesi lisanslarıyla basılır", () => {
    at();
    expect(screen.getByText("Phosphor Icons")).toBeInTheDocument();
    expect(screen.getAllByText("OFL 1.1")).toHaveLength(3);
  });
});
```

- [x] **Step 4: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/pages/AttributionsPage.test.tsx` → FAIL.

- [x] **Step 5: `AttributionsPage.tsx`'i yaz**

```tsx
/* Artboard W17 · Atıflar ve lisanslar — RequireAuth YOK. Satırlar `DATA_SOURCES`'tan gelir;
   W-12 sonrası kaynak `useConfigStore((s) => s.config?.sources ?? DATA_SOURCES)` olur. */
import { useTranslation } from "react-i18next";
import { Note, Overline, Page } from "../components/atoms";
import OneZone from "../components/molecules/OneZone";
import PageHeader from "../components/molecules/PageHeader";
import SettingsCard from "../components/molecules/SettingsCard";
import SourceRow from "../components/molecules/SourceRow";
import { DATA_SOURCES, OSS_LICENSES } from "../content/legal/sources";

export default function AttributionsPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t("legal.attributions")} />
      <OneZone>
        <Overline>{t("attrib.dataTitle")}</Overline>
        <SettingsCard>
          {DATA_SOURCES.map((s) => (
            <SourceRow key={s.id} label={t(s.attributionKey)} hint={t(s.descKey)} href={s.attributionUrl} />
          ))}
        </SettingsCard>
        <Note>{t("attrib.everywhere")}</Note>
        <Overline>{t("attrib.ossTitle")}</Overline>
        <SettingsCard>
          {OSS_LICENSES.map((o) => <SourceRow key={o.name} label={o.name} aside={o.license} />)}
        </SettingsCard>
      </OneZone>
    </Page>
  );
}
```

- [x] **Step 6: Rota** — `App.tsx`, `/kvkk`'dan sonra: `<Route path="/attributions" element={<AttributionsPage />} />`

- [x] **Step 7: Çalıştır** — Run: `PNPM_TEST src/pages/AttributionsPage.test.tsx` → 3 passed. `pnpm i18n:check` → 0.

- [x] **Step 8: Dosya listesi** — `content/legal/sources.ts`, `pages/AttributionsPage.tsx`, `pages/AttributionsPage.test.tsx`, `App.tsx`, `i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(legal): data-driven /attributions page`.

---

### Task 7: `/account` — hesap ve veriler (R-W11)

**Files:**
- Create: `frontend/web/src/pages/AccountPage.tsx`, Test: `pages/AccountPage.test.tsx`
- Modify: `frontend/web/src/App.tsx`, `components/molecules/{AvatarMenu,IdentityCard}.tsx`, `i18n/locales/{tr,en,nl}.json`

- [x] **Step 1: i18n `account` alanını ve `shell.account`'u ekle** — `tr.json`:

```json
  "account": {
    "title": "Hesap ve veriler",
    "legal": "Yasal",
    "data": "Veri",
    "about": "Hakkında",
    "danger": "Tehlikeli bölge",
    "consent": "Açık rıza tercihlerin",
    "analytics": "Kullanım verisi paylaş",
    "analyticsHint": "Ürünü iyileştirmek için anonim kullanım verisi · varsayılan kapalı",
    "export": "Verilerimi indir",
    "exportHint": "JSON · tarayıcına iner",
    "support": "Destek ve iletişim",
    "delete": "Hesabı sil",
    "deleteHint": "Geri alınamaz · 30 gün içinde tamamen silinir",
    "appleLogin": "Apple ile giriş",
    "errConsent": "Kaydedilemedi — tekrar dene.",
    "errExport": "Veriler indirilemedi — tekrar dene.",
    "errExportRate": "Saatte bir kez indirilebilir. Biraz sonra tekrar dene."
  }
```

`shell` alanına `"account": "Hesap ve veriler"`.

| anahtar | en | nl |
|---|---|---|
| `shell.account` | Account and data | Account en gegevens |
| `account.title` | Account and data | Account en gegevens |
| `account.legal` | Legal | Juridisch |
| `account.data` | Data | Gegevens |
| `account.about` | About | Over |
| `account.danger` | Danger zone | Gevarenzone |
| `account.consent` | Your consent settings | Je toestemmingen |
| `account.analytics` | Share usage data | Gebruiksgegevens delen |
| `account.analyticsHint` | Anonymous usage data to improve the product · off by default | Anonieme gebruiksgegevens om het product te verbeteren · standaard uit |
| `account.export` | Download my data | Mijn gegevens downloaden |
| `account.exportHint` | JSON · saved to your browser | JSON · wordt in je browser opgeslagen |
| `account.support` | Support and contact | Ondersteuning en contact |
| `account.delete` | Delete account | Account verwijderen |
| `account.deleteHint` | Cannot be undone · fully erased within 30 days | Kan niet ongedaan worden gemaakt · binnen 30 dagen volledig gewist |
| `account.appleLogin` | Signed in with Apple | Ingelogd met Apple |
| `account.errConsent` | Couldn't save — try again. | Opslaan mislukt — probeer opnieuw. |
| `account.errExport` | Couldn't download your data — try again. | Downloaden mislukt — probeer opnieuw. |
| `account.errExportRate` | You can download once per hour. Try again shortly. | Je kunt één keer per uur downloaden. Probeer het straks opnieuw. |

**Sapma notu (bilinçli):** artboard `exportHint` "JSON · e-postana gelir" diyor; §2 sözleşmesi `GET /api/me/export`'u **attachment** olarak tanımlıyor. Kopya davranışa uydurulur; e-posta yolu yoktur, uydurulmaz.

- [x] **Step 2: `AccountPage.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { me: vi.fn(), putConsents: vi.fn(), exportMyData: vi.fn(), logout: vi.fn() },
}));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import AccountPage from "./AccountPage";

const me = (analytics: boolean) => ({
  id: "u1", email: "m@x.test", displayName: "Mehmet", authProviders: ["GOOGLE"],
  consents: { location: true, microphone: false, analytics },
  stats: { sessionsHosted: 2, friendsMet: 5 },
});

function at(analytics = false) {
  useAuthStore.setState({ status: "signed", me: me(analytics) as never });
  return render(<MemoryRouter><AccountPage /></MemoryRouter>);
}

describe("AccountPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dört blok, kimlik kartı ve doğru rotalar", () => {
    at();
    expect(screen.getByRole("heading", { level: 1, name: "Hesap ve veriler" })).toBeInTheDocument();
    ["Yasal", "Veri", "Hakkında", "Tehlikeli bölge"].forEach((s) => expect(screen.getByText(s)).toBeInTheDocument());
    expect(screen.getByText("m@x.test")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gizlilik politikası/ })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /Açık rıza tercihlerin/ })).toHaveAttribute("href", "/account/consent");
    expect(screen.getByRole("link", { name: /Hesabı sil/ })).toHaveAttribute("href", "/account/delete");
  });

  it("anahtar sunucudaki rızayı yansıtır ve açılınca üç alanla yazılır", async () => {
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue(me(true) as never);
    at(false);
    const sw = screen.getByRole("switch", { name: "Kullanım verisi paylaş" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    await waitFor(() =>
      expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: false, analytics: true }));
  });

  it("yazma düşerse anahtar geri alınır ve hata basılır", async () => {
    vi.mocked(api.putConsents).mockRejectedValue(new Error("net"));
    at(false);
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi paylaş" }));
    expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Kullanım verisi paylaş" })).toHaveAttribute("aria-checked", "false");
  });

  it("verilerimi indir ucu çağrılır", async () => {
    vi.mocked(api.exportMyData).mockResolvedValue(new Blob(["{}"], { type: "application/json" }));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    at();
    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/ }));
    await waitFor(() => expect(api.exportMyData).toHaveBeenCalled());
  });

  it("429 dönerse saatlik sınır mesajı", async () => {
    vi.mocked(api.exportMyData).mockRejectedValue({ response: { status: 429 } });
    at();
    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/ }));
    expect(await screen.findByText(/Saatte bir kez indirilebilir/)).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/pages/AccountPage.test.tsx` → FAIL.

- [x] **Step 4: `AccountPage.tsx`'i yaz**

```tsx
/* Artboard W13 · Hesap ve veriler — sol: Yasal / Veri / Hakkında / Tehlikeli bölge,
   sağ: kimlik kartı + saklama notu + çıkış. Play "hesap yönetimi" ve Apple 5.1.1
   gizlilik erişimi bu ekrandan sağlanır. */
import {
  ChartLine, DownloadSimple, FileText, Lifebuoy, MapTrifold, Scroll as ScrollIcon,
  ShieldCheck, SignOut, ToggleRight, Trash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, ErrorText, Note, Overline, Page, Toggle } from "../components/atoms";
import IdentityCard from "../components/molecules/IdentityCard";
import MobileCta, { DesktopOnly } from "../components/molecules/MobileCta";
import PageHeader from "../components/molecules/PageHeader";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import TwoZone from "../components/molecules/TwoZone";
import { api } from "../lib/api";
import { consentsOf, useAuthStore } from "../store/authStore";

const ICON = 18;

export default function AccountPage() {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const updatePrefs = useAuthStore((s) => s.updatePrefs);
  const saveConsents = useAuthStore((s) => s.saveConsents);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  // Anahtar iyimser çizilir; yazma düşerse `pending` bırakılır ve sunucu değeri geri gelir.
  const [pending, setPending] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  const analytics = pending ?? consentsOf(me).analytics;

  async function toggleAnalytics(next: boolean) {
    setPending(next);
    setError(null);
    try {
      await saveConsents({ analytics: next });
    } catch {
      setError(t("account.errConsent"));
    } finally {
      setPending(null);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const blob = await api.exportMyData();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "bumpinto-verilerim.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      setError(t(status === 429 ? "account.errExportRate" : "account.errExport"));
    } finally {
      setBusy(false);
    }
  }

  const logoutButton = (size: "fit" | "md") => (
    <Button type="button" kind="danger" size={size}
      onClick={() => void logout().catch(() => undefined).finally(() => navigate("/"))}>
      <SignOut size={ICON} aria-hidden />
      {t("profile.logout")}
    </Button>
  );

  return (
    <Page>
      <PageHeader title={t("account.title")} />
      <TwoZone
        left={<>
          <Overline>{t("account.legal")}</Overline>
          <SettingsCard>
            <SettingRow icon={<ShieldCheck size={ICON} />} label={t("legal.privacy")} to="/privacy" />
            <SettingRow icon={<FileText size={ICON} />} label={t("legal.terms")} to="/terms" />
            <SettingRow icon={<ScrollIcon size={ICON} />} label={t("legal.kvkk")} to="/kvkk" />
            <SettingRow icon={<ToggleRight size={ICON} />} label={t("account.consent")} to="/account/consent" />
          </SettingsCard>
          <Overline>{t("account.data")}</Overline>
          <SettingsCard>
            <SettingRow icon={<ChartLine size={ICON} />} label={t("account.analytics")} hint={t("account.analyticsHint")}
              aside={<Toggle checked={analytics} label={t("account.analytics")} onChange={(n) => void toggleAnalytics(n)} />} />
            <SettingRow icon={<DownloadSimple size={ICON} />} label={t("account.export")} hint={t("account.exportHint")}
              disabled={busy} onClick={() => void download()} />
          </SettingsCard>
          {error && <ErrorText>{error}</ErrorText>}
          <Overline>{t("account.about")}</Overline>
          <SettingsCard>
            <SettingRow icon={<MapTrifold size={ICON} />} label={t("legal.attributions")} to="/attributions" />
            <SettingRow icon={<Lifebuoy size={ICON} />} label={t("account.support")} to="/support" />
          </SettingsCard>
          <Overline>{t("account.danger")}</Overline>
          <SettingsCard danger>
            <SettingRow danger icon={<Trash size={ICON} />} label={t("account.delete")}
              hint={t("account.deleteHint")} to="/account/delete" />
          </SettingsCard>
        </>}
        right={<>
          <IdentityCard me={me} onSaveName={(displayName) => updatePrefs({ displayName })} />
          <Note card>{t("profile.retention")}</Note>
          <DesktopOnly>{logoutButton("fit")}</DesktopOnly>
        </>}
      />
      <MobileCta>{logoutButton("md")}</MobileCta>
    </Page>
  );
}
```

- [x] **Step 5: `IdentityCard` sağlayıcı rozetini alanla besle** — `{me.email} · {t("profile.googleLogin")}` satırını şununla değiştir:

```tsx
        <Note>{me.email} · {t(me.authProviders?.includes("APPLE") ? "account.appleLogin" : "profile.googleLogin")}</Note>
```

- [x] **Step 6: Rota + menü** — `App.tsx` (`AppShell` içinde): `<Route path="/account" element={<RequireAuth><AccountPage /></RequireAuth>} />`. `AvatarMenu.tsx`'te `Profil` satırının ardına:

```tsx
          <Link role="menuitem" className={ROW} to="/account" onClick={() => setOpen(false)}>
            <ShieldCheck size={16} aria-hidden />
            {t("shell.account")}
          </Link>
```

ve import satırına `ShieldCheck` ekle.

- [x] **Step 7: Çalıştır** — Run: `PNPM_TEST src/pages/AccountPage.test.tsx` → 5 passed. `PNPM_TEST src/pages/ProfilePage.test.tsx` → yeşil. `pnpm i18n:check` → 0.

- [x] **Step 8: Dosya listesi** — `pages/AccountPage.tsx`, `pages/AccountPage.test.tsx`, `App.tsx`, `molecules/AvatarMenu.tsx`, `molecules/IdentityCard.tsx`, `i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(compliance): /account page with legal, data, about and danger blocks`.

---

### Task 8: `/account/consent` — açık rıza (R-W12)

**Files:**
- Create: `frontend/web/src/pages/ConsentPage.tsx`, Test: `pages/ConsentPage.test.tsx`
- Modify: `frontend/web/src/App.tsx`, `i18n/locales/{tr,en,nl}.json`

- [x] **Step 1: i18n `consent` alanını ekle** — `tr.json`:

```json
  "consent": {
    "title": "Açık rıza tercihlerin",
    "intro": "Aşağıdaki işlemler için açık rızan gerekir. İstediğin zaman geri alabilirsin; geri alman geçmişe etki etmez.",
    "location": "Konum verimin işlenmesi",
    "locationHint": "Orta nokta ve mekan arama · yalnız uygulama açıkken · ~1 km yuvarlanarak paylaşılır",
    "microphone": "Mikrofon / sesli sohbet",
    "microphoneHint": "Yalnız sen \"Katıl\" deyince · kaydedilmez",
    "analytics": "Kullanım verisi",
    "analyticsHint": "Anonim ürün analitiği (Clarity/GA4) · yurt dışına aktarım",
    "granted": "Verildi: {{date}} · sürüm {{version}}",
    "never": "Henüz kaydedilmedi.",
    "locationOff": "Konum rızanı kapatırsan buluşmalara adres yazarak katılırsın.",
    "readKvkk": "Aydınlatma metnini oku",
    "errSave": "Kaydedilemedi — tekrar dene."
  }
```

| anahtar | en | nl |
|---|---|---|
| `consent.title` | Your consent settings | Je toestemmingen |
| `consent.intro` | The following require your explicit consent. You can withdraw it any time; withdrawal is not retroactive. | Hiervoor is jouw uitdrukkelijke toestemming nodig. Je kunt die altijd intrekken; intrekken werkt niet met terugwerkende kracht. |
| `consent.location` | Processing my location data | Verwerking van mijn locatiegegevens |
| `consent.locationHint` | Midpoint and venue search · only while the app is open · shared rounded to ~1 km | Middelpunt en locatiezoekopdracht · alleen als de app open is · gedeeld afgerond op ~1 km |
| `consent.microphone` | Microphone / voice chat | Microfoon / spraakchat |
| `consent.microphoneHint` | Only when you tap "Join" · never recorded | Alleen als jij op "Meedoen" tikt · wordt niet opgenomen |
| `consent.analytics` | Usage data | Gebruiksgegevens |
| `consent.analyticsHint` | Anonymous product analytics (Clarity/GA4) · transferred abroad | Anonieme productanalyse (Clarity/GA4) · doorgifte naar het buitenland |
| `consent.granted` | Granted: {{date}} · version {{version}} | Gegeven: {{date}} · versie {{version}} |
| `consent.never` | Not saved yet. | Nog niet opgeslagen. |
| `consent.locationOff` | With location consent off you join meet-ups by typing an address instead. | Zonder locatietoestemming doe je mee door een adres in te typen. |
| `consent.readKvkk` | Read the disclosure | Lees de informatie |
| `consent.errSave` | Couldn't save — try again. | Opslaan mislukt — probeer opnieuw. |

- [x] **Step 2: `ConsentPage.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { me: vi.fn(), putConsents: vi.fn() } }));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import ConsentPage from "./ConsentPage";

const me = (over: Record<string, unknown> = {}) => ({
  id: "u1", email: "m@x.test",
  consents: { location: true, microphone: true, analytics: false, updatedAt: "2026-09-06T09:41:00Z", version: "1.0", ...over },
});

function at(over: Record<string, unknown> = {}) {
  useAuthStore.setState({ status: "signed", me: me(over) as never });
  return render(<MemoryRouter><ConsentPage /></MemoryRouter>);
}

describe("ConsentPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("üç anahtar sunucudaki değerlerle, verildi satırı tarih ve sürümle", () => {
    at();
    expect(screen.getByRole("switch", { name: "Konum verimin işlenmesi" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Mikrofon / sesli sohbet" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText(/Verildi: .*sürüm 1\.0/)).toBeInTheDocument();
  });

  it("hiç kaydedilmemişse 'henüz kaydedilmedi'", () => {
    at({ updatedAt: undefined, version: undefined });
    expect(screen.getByText("Henüz kaydedilmedi.")).toBeInTheDocument();
  });

  it("Kaydet üç anahtarı birlikte yazar", async () => {
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue(me({ analytics: true }) as never);
    at();
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() =>
      expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: true, analytics: true }));
  });

  it("yazma düşerse hata basılır ve anahtarlar sunucu değerine döner", async () => {
    vi.mocked(api.putConsents).mockRejectedValue(new Error("net"));
    at();
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "false");
  });

  it("konum kapalıyken uyarı satırı görünür", () => {
    at({ location: false });
    expect(screen.getByText(/adres yazarak katılırsın/)).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/pages/ConsentPage.test.tsx` → FAIL.

- [x] **Step 4: `ConsentPage.tsx`'i yaz**

```tsx
/* Artboard W13b / W16 sağ panel · KVKK m.5/1 açık rıza. Üç anahtar yerelde tutulur, "Kaydet"
   hepsini birlikte yazar (PUT /api/me/consents); başarısızlıkta sunucudaki değerlere dönülür —
   yarım kalmış rıza ekranda asla durmaz. */
import { ChartLine, MapPin, Microphone, Scroll as ScrollIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, ErrorText, LinkButton, Note, Overline, Page, Toggle } from "../components/atoms";
import OneZone from "../components/molecules/OneZone";
import PageHeader from "../components/molecules/PageHeader";
import SettingRow from "../components/molecules/SettingRow";
import SettingsCard from "../components/molecules/SettingsCard";
import { consentsOf, useAuthStore } from "../store/authStore";

const ICON = 18;
type Key = "location" | "microphone" | "analytics";

export default function ConsentPage() {
  const { t, i18n } = useTranslation();
  const me = useAuthStore((s) => s.me);
  const saveConsents = useAuthStore((s) => s.saveConsents);
  const server = consentsOf(me);
  const [draft, setDraft] = useState(server);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;

  const stamp = me.consents?.updatedAt;
  const granted = stamp
    ? t("consent.granted", {
        date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
        }).format(new Date(stamp)),
        version: me.consents?.version ?? "1.0",
      })
    : t("consent.never");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveConsents(draft);
    } catch {
      setDraft(server); // geri al
      setError(t("consent.errSave"));
    } finally {
      setBusy(false);
    }
  }

  const row = (key: Key, icon: ReactNode) => (
    <SettingRow
      icon={icon}
      label={t(`consent.${key}`)}
      hint={t(`consent.${key}Hint`)}
      aside={<Toggle checked={draft[key]} label={t(`consent.${key}`)} disabled={busy}
        onChange={(next) => setDraft({ ...draft, [key]: next })} />}
    />
  );

  return (
    <Page>
      <PageHeader title={t("consent.title")} />
      <OneZone>
        <Note>{t("consent.intro")}</Note>
        <SettingsCard>
          {row("location", <MapPin size={ICON} />)}
          {row("microphone", <Microphone size={ICON} />)}
          {row("analytics", <ChartLine size={ICON} />)}
        </SettingsCard>
        <Overline>{granted}</Overline>
        {!draft.location && <Note>{t("consent.locationOff")}</Note>}
        <LinkButton href="/kvkk" kind="ghost" size="fit-sm">
          <ScrollIcon size={ICON} aria-hidden />
          {t("consent.readKvkk")}
        </LinkButton>
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="button" disabled={busy} onClick={() => void save()}>{t("common.save")}</Button>
      </OneZone>
    </Page>
  );
}
```

- [x] **Step 5: Rota** — `App.tsx`, `/account`'tan sonra: `<Route path="/account/consent" element={<RequireAuth><ConsentPage /></RequireAuth>} />`

- [x] **Step 6: Çalıştır** — Run: `PNPM_TEST src/pages/ConsentPage.test.tsx` → 5 passed. `pnpm i18n:check` → 0. `tsc -b` temiz.

- [x] **Step 7: Dosya listesi** — `pages/ConsentPage.tsx`, `pages/ConsentPage.test.tsx`, `App.tsx`, `i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(compliance): /account/consent explicit consent screen`.

---

### Task 9: Sign in with Apple (R-W17)

**Files:**
- Create: `frontend/web/src/components/molecules/AppleSignIn.tsx`, Test: `molecules/AppleSignIn.test.tsx`
- Modify: `molecules/GoogleSignIn.tsx`, `molecules/SignInBlock.tsx`, `components/index.ts`, `i18n/locales/{tr,en,nl}.json`, `frontend/web/.env.{development,preprod,production}`

- [x] **Step 1: i18n ve env**

`landing` alanına üç anahtar — tr: `"apple": "Apple ile devam et"`, `"noAppleClientId": "Apple girişi bu ortamda yapılandırılmadı."`, `"errApple": "Apple ile giriş yapılamadı — tekrar dene."`

| anahtar | en | nl |
|---|---|---|
| `landing.apple` | Continue with Apple | Doorgaan met Apple |
| `landing.noAppleClientId` | Apple sign-in isn't configured in this environment. | Apple-inloggen is niet ingesteld in deze omgeving. |
| `landing.errApple` | Couldn't sign in with Apple — try again. | Inloggen met Apple is mislukt — probeer opnieuw. |

Üç `.env.*` dosyasına boş anahtar satırları (gerçek değerler `.env.development.local` ve dağıtım sırrında):

```
VITE_APPLE_CLIENT_ID=
VITE_APPLE_REDIRECT_URI=
VITE_CLARITY_ID=
VITE_GA4_ID=
```

- [x] **Step 2: `AppleSignIn.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { loginApple: vi.fn(), me: vi.fn() } }));

import { api } from "../../lib/api";
import AppleSignIn from "./AppleSignIn";

type AppleWindow = typeof window & { AppleID?: unknown };
const signIn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_APPLE_CLIENT_ID", "app.bumpinto.web");
  vi.stubEnv("VITE_APPLE_REDIRECT_URI", "https://bumpinto.app/");
  (window as AppleWindow).AppleID = { auth: { init: vi.fn(), signIn } };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as AppleWindow).AppleID;
});

function at(onDone = vi.fn()) {
  render(<MemoryRouter><AppleSignIn onDone={onDone} /></MemoryRouter>);
  return onDone;
}

describe("AppleSignIn", () => {
  it("kimlik yoksa buton yerine not basar", () => {
    vi.stubEnv("VITE_APPLE_CLIENT_ID", "");
    at();
    expect(screen.queryByRole("button", { name: /Apple ile devam et/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Apple girişi bu ortamda yapılandırılmadı/)).toBeInTheDocument();
  });

  it("başarılı girişte identityToken, nonce ve ad sunucuya gider", async () => {
    signIn.mockResolvedValue({ authorization: { id_token: "tok" }, user: { name: { firstName: "Mehmet", lastName: "Ş" } } });
    vi.mocked(api.loginApple).mockResolvedValue({ userId: "u1" } as never);
    vi.mocked(api.me).mockResolvedValue({ id: "u1", email: "m@x.test" } as never);
    const onDone = at();
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    await waitFor(() => expect(api.loginApple).toHaveBeenCalled());
    const body = vi.mocked(api.loginApple).mock.calls[0][0];
    expect(body.identityToken).toBe("tok");
    expect(body.nonce.length).toBeGreaterThan(15);
    expect(body.fullName).toBe("Mehmet Ş");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("kullanıcı vazgeçerse hata basılmaz, sunucu hatasında basılır", async () => {
    signIn.mockRejectedValue({ error: "popup_closed_by_user" });
    at();
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(screen.queryByText(/tekrar dene/)).not.toBeInTheDocument();
    signIn.mockResolvedValue({ authorization: { id_token: "tok" } });
    vi.mocked(api.loginApple).mockRejectedValue(new Error("500"));
    fireEvent.click(screen.getByRole("button", { name: /Apple ile devam et/ }));
    expect(await screen.findByText(/Apple ile giriş yapılamadı/)).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/components/molecules/AppleSignIn.test.tsx` → FAIL.

- [x] **Step 4: `AppleSignIn.tsx`'i yaz**

```tsx
/* App Store 4.8: Google girişi olan uygulama eşdeğer bir alternatif sunmak zorunda.
   Apple JS SDK popup akışı: id_token + ham nonce sunucuya gider (POST /api/auth/apple);
   doğrulamayı ve eşleştirmeyi backend yapar (§2: önce apple_sub, sonra e-posta).
   Buton kendi stilimizle çizilir — Apple JS, Google GIS'in aksine buna izin verir. */
import { AppleLogo } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Button, ErrorText, Note } from "../atoms";

type AppleAuth = {
  init: (cfg: { clientId: string; scope: string; redirectURI: string; usePopup: boolean; nonce: string }) => void;
  signIn: () => Promise<{
    authorization: { id_token: string };
    user?: { name?: { firstName?: string; lastName?: string } };
  }>;
};

declare global {
  interface Window {
    AppleID?: { auth: AppleAuth };
  }
}

const SCRIPT = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.AppleID) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("appleid")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Tekrar oynatma koruması — ham nonce sunucuya da gider, karşılaştırmayı backend yapar. */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Popup'ın kapatılması hata değildir — sessizce geçilir. */
function cancelled(e: unknown): boolean {
  const code = (e as { error?: string }).error;
  return code === "popup_closed_by_user" || code === "user_cancelled_authorize";
}

export default function AppleSignIn({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const loginApple = useAuthStore((s) => s.loginApple);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
  const redirectUri = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;

  if (!clientId) return <Note>{t("landing.noAppleClientId")}</Note>;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await loadScript();
      const nonce = makeNonce();
      window.AppleID!.auth.init({
        clientId: clientId!,
        scope: "name email",
        redirectURI: redirectUri ?? window.location.origin,
        usePopup: true,
        nonce,
      });
      const result = await window.AppleID!.auth.signIn();
      const name = result.user?.name;
      const fullName = name ? [name.firstName, name.lastName].filter(Boolean).join(" ") : "";
      await loginApple(result.authorization.id_token, nonce, fullName || undefined);
      if (onDone) onDone();
      else navigate("/sessions");
    } catch (e) {
      if (!cancelled(e)) setError(t("landing.errApple"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" kind="white" disabled={busy} onClick={() => void start()}>
        <AppleLogo size={18} weight="fill" aria-hidden />
        {t("landing.apple")}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  );
}
```

- [x] **Step 5: `GoogleSignIn`'e `onDone` kancası** — imzayı `export default function GoogleSignIn({ onDone }: { onDone?: () => void })` yap, geri çağrıyı değiştir ve `useEffect` bağımlılık dizisine `onDone` ekle:

```tsx
          void login(r.credential)
            .then(() => { if (onDone) onDone(); else navigate("/sessions"); })
            .catch(() => setError(t("landing.errLogin")));
```

(Silme sayfası girişten sonra gezinmemeli — kimlik doğrulaması aynı sayfada devam eder.)

- [x] **Step 6: `SignInBlock`'a Apple butonu** — `<GoogleSignIn />` satırından sonra `<AppleSignIn />`, import `./AppleSignIn`. Barrel: `export { default as AppleSignIn } from "./molecules/AppleSignIn";`

- [x] **Step 7: Çalıştır** — Run: `PNPM_TEST src/components/molecules/AppleSignIn.test.tsx` → 3 passed. `PNPM_TEST src/pages` → yeşil. `pnpm i18n:check` → 0.

- [x] **Step 8: Dosya listesi** — `molecules/AppleSignIn.tsx`, `AppleSignIn.test.tsx`, `GoogleSignIn.tsx`, `SignInBlock.tsx`, `components/index.ts`, `i18n/locales/{tr,en,nl}.json`, `.env.development`, `.env.preprod`, `.env.production`. Mesaj: `feat(auth): Sign in with Apple on landing`.

---

### Task 10: `/account/delete`, `/account/deleted` ve `/support` (R-W13 + R-W10)

**Files:**
- Create: `components/organisms/PlainShell.tsx`, `pages/DeleteAccountPage.tsx` (+test), `pages/AccountDeletedPage.tsx`, `pages/SupportPage.tsx` (+test)
- Modify: `frontend/web/src/App.tsx`, `i18n/locales/{tr,en,nl}.json`

- [x] **Step 1: i18n `del` ve `support` alanlarını ekle** — `tr.json`:

```json
  "del": {
    "title": "Hesabını silmek istediğine emin misin?",
    "warn": "Bu işlem geri alınamaz. Silinen veriler 30 gün içinde yedeklerden de temizlenir.",
    "willDelete": "Silinecekler",
    "d1": "Google/Apple ile bağlı hesabın, adın ve e-postan",
    "d2": "Kurduğun buluşmalar ve davet linkleri",
    "d3": "Konum etiketlerin ve ulaşım tercihlerin",
    "d4": "Profil istatistiklerin",
    "willKeep": "Kalacaklar",
    "k1": "Arkadaşlarının kurduğu buluşmalardaki katılımın (adın \"eski katılımcı\" olur)",
    "k2": "Zorunlu yasal kayıtlar (en fazla 30 gün)",
    "pause": "Yalnız bir mola mı istiyorsun? Çıkış yapman yeterli, verilerin durur.",
    "verify": "Kimliğini doğrula",
    "verifyHint": "Silme isteği yalnız hesap sahibinden alınır.",
    "signedAs": "{{email}} olarak giriş yaptın.",
    "confirmLabel": "Onaylamak için {{word}} yaz",
    "confirmWord": "SİL",
    "submit": "Hesabı kalıcı olarak sil",
    "appleNote": "Apple ile girdiysen Apple'daki bağlantı da kaldırılır.",
    "errDelete": "Hesap silinemedi — tekrar dene.",
    "errAuth": "Oturumun düşmüş. Kimliğini yeniden doğrula.",
    "doneTitle": "Hesabın silindi.",
    "doneCopy": "Verilerin 30 gün içinde tamamen temizlenir. Bir gün ortada buluşmak istersen, kapı açık.",
    "doneHand": "görüşürüz →"
  },
  "support": {
    "cardTitle": "Bir şey mi takıldı?",
    "cardHint": "Genelde 1 iş günü içinde dönüyoruz.",
    "email": "E-posta gönder",
    "faqTitle": "Sık sorulanlar",
    "q1": "Konumum neden yaklaşık gösteriliyor?",
    "a1": "Konumun ~1 km yuvarlanarak paylaşılır: orta noktayı adil hesaplamaya yeter, adresini ele vermez.",
    "q2": "Arkadaşım linke tıklayınca ne görür?",
    "a2": "Buluşmanın adını, etkinliğini ve katılanların görünen adlarını. Uygulama indirmeden, hesapsız katılır.",
    "q3": "Sesli sohbet kaydediliyor mu?",
    "a3": "Hayır. Ses cihazlar arasında doğrudan (P2P) akar ve hiçbir yere kaydedilmez.",
    "q4": "Verilerimi nasıl silerim?",
    "a4": "Hesap ve veriler → Hesabı sil. Uygulama kurulu olmasa da bumpinto.app/account/delete adresinden yapabilirsin.",
    "merchant": "Tacir bilgileri",
    "mName": "Ad",
    "mEmail": "E-posta",
    "mPhone": "Telefon",
    "mAddress": "Adres",
    "mWeb": "Web",
    "dsa": "AB Dijital Hizmetler Yasası (DSA) m.30 gereği yayımlanır.",
    "deleteLink": "Hesap silme isteği için: bumpinto.app/account/delete"
  }
```

`en.json` / `nl.json`: aynı ağaç, TR'deki bilgiyi birebir taşıyan çeviriler. Sabitlenmesi gereken değerler:

| anahtar | en | nl |
|---|---|---|
| `del.confirmWord` | DELETE | VERWIJDER |
| `del.confirmLabel` | Type {{word}} to confirm | Typ {{word}} om te bevestigen |
| `del.signedAs` | You are signed in as {{email}}. | Je bent ingelogd als {{email}}. |
| `del.title` | Are you sure you want to delete your account? | Weet je zeker dat je je account wilt verwijderen? |
| `del.submit` | Delete account permanently | Account definitief verwijderen |
| `support.mName` / `mEmail` / `mPhone` / `mAddress` / `mWeb` | Name / Email / Phone / Address / Web | Naam / E-mail / Telefoon / Adres / Web |

Kalan `del.*` ve `support.*` anahtarları aynı anlamı taşıyacak biçimde en/nl'ye çevrilir; `support.a3` "No. Audio flows directly between devices (P2P) and is never recorded." / "Nee. Audio gaat rechtstreeks tussen apparaten (P2P) en wordt nooit opgenomen."

Run: `source ./init-nvm.sh && pnpm i18n:check` → 0 fark.

- [x] **Step 2: `DeleteAccountPage.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { deleteMe: vi.fn(), me: vi.fn(), logout: vi.fn() } }));
vi.mock("../components/molecules/GoogleSignIn", () => ({ default: () => <div>google-signin</div> }));
vi.mock("../components/molecules/AppleSignIn", () => ({ default: () => <div>apple-signin</div> }));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import DeleteAccountPage from "./DeleteAccountPage";

function at(signed: boolean) {
  useAuthStore.setState(signed
    ? { status: "signed", me: { id: "u1", email: "m@x.test", displayName: "Mehmet" } as never }
    : { status: "anon", me: null });
  return render(
    <MemoryRouter initialEntries={["/account/delete"]}>
      <Routes>
        <Route path="/account/delete" element={<DeleteAccountPage />} />
        <Route path="/account/deleted" element={<div>silindi-ekrani</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const type = (value: string) => fireEvent.change(screen.getByLabelText(/SİL yaz/), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: /kalıcı olarak sil/ }));

describe("DeleteAccountPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("anonim: listeler ve iki giriş yolu; onay alanı yok (önce kimlik)", () => {
    at(false);
    expect(screen.getByRole("heading", { level: 1, name: /emin misin/ })).toBeInTheDocument();
    expect(screen.getByText("Kurduğun buluşmalar ve davet linkleri")).toBeInTheDocument();
    expect(screen.getByText(/eski katılımcı/)).toBeInTheDocument();
    expect(screen.getByText("google-signin")).toBeInTheDocument();
    expect(screen.getByText("apple-signin")).toBeInTheDocument();
    expect(screen.queryByLabelText(/SİL yaz/)).not.toBeInTheDocument();
  });

  it("girişli: kim olduğu yazar; SİL yazılmadan buton kapalı", () => {
    at(true);
    expect(screen.getByText("m@x.test olarak giriş yaptın.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /kalıcı olarak sil/ })).toBeDisabled();
    type("sil");
    expect(screen.getByRole("button", { name: /kalıcı olarak sil/ })).toBeEnabled();
  });

  it("onaylanınca DELETE /api/me çağrılır ve silindi ekranına gidilir", async () => {
    vi.mocked(api.deleteMe).mockResolvedValue(undefined);
    at(true);
    type("SİL");
    submit();
    await waitFor(() => expect(api.deleteMe).toHaveBeenCalled());
    expect(await screen.findByText("silindi-ekrani")).toBeInTheDocument();
  });

  it("401 kimlik hatası, diğerleri silme hatası basar", async () => {
    vi.mocked(api.deleteMe).mockRejectedValue({ response: { status: 401 } });
    at(true);
    type("SİL");
    submit();
    expect(await screen.findByText(/Oturumun düşmüş/)).toBeInTheDocument();
    vi.mocked(api.deleteMe).mockRejectedValue(new Error("500"));
    submit();
    expect(await screen.findByText("Hesap silinemedi — tekrar dene.")).toBeInTheDocument();
  });
});
```

- [x] **Step 3: Çalıştır, düştüğünü gör** — Run: `PNPM_TEST src/pages/DeleteAccountPage.test.tsx` → FAIL.

- [x] **Step 4: `PlainShell.tsx`'i yaz**

```tsx
/* Artboard W18 · silme akışı AppShell DIŞINDA: gezinme, avatar ve altbilgi yok — kullanıcı
   yanlışlıkla akıştan çıkmasın; sayfa kurulumsuz ve girişsiz de açılabilmeli. */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "../atoms";
import LangMenu from "../molecules/LangMenu";

export default function PlainShell(props: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="flex h-14 items-center justify-between border-b border-line bg-paper px-[1.125rem] lg:h-16 lg:px-12">
        <Link to="/" className="text-ink no-underline"><Wordmark /></Link>
        <LangMenu />
      </header>
      {props.children}
    </div>
  );
}
```

- [x] **Step 5: `DeleteAccountPage.tsx`'i yaz**

```tsx
/* Artboard W18 · Hesabı sil — Apple 5.1.1(v) + Play hesap silme politikası. Akış:
   kimlik (Google/Apple ile giriş) → silinecek/kalacak → "SİL" yazımı → DELETE /api/me →
   /account/deleted. Kurulumsuz çalışır: sayfa anonim açılır, giriş burada yapılır. */
import { Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, ErrorText, Note, Overline, Page, TextInput } from "../components/atoms";
import AppleSignIn from "../components/molecules/AppleSignIn";
import GoogleSignIn from "../components/molecules/GoogleSignIn";
import LegalBlocks from "../components/molecules/LegalBlocks";
import PageHeader from "../components/molecules/PageHeader";
import TwoZone from "../components/molecules/TwoZone";
import PlainShell from "../components/organisms/PlainShell";
import { useAuthStore } from "../store/authStore";

export default function DeleteAccountPage() {
  const { t } = useTranslation();
  const status = useAuthStore((s) => s.status);
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const word = t("del.confirmWord");
  const signed = status === "signed" && !!me;
  // TR'de "sil".toUpperCase() → "SIL" (noktasız I). Karşılaştırma yerele duyarlı yapılır.
  const confirmed = typed.trim().toLocaleUpperCase("tr") === word.toLocaleUpperCase("tr");

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      navigate("/account/deleted", { replace: true });
    } catch (e) {
      const code = (e as { response?: { status?: number } }).response?.status;
      setError(t(code === 401 || code === 403 ? "del.errAuth" : "del.errDelete"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PlainShell>
      <Page>
        <PageHeader title={t("del.title")} />
        <TwoZone
          left={<>
            <Note>{t("del.warn")}</Note>
            <Overline>{t("del.willDelete")}</Overline>
            <LegalBlocks blocks={[{ ul: [t("del.d1"), t("del.d2"), t("del.d3"), t("del.d4")] }]} />
            <Overline>{t("del.willKeep")}</Overline>
            <LegalBlocks blocks={[{ ul: [t("del.k1"), t("del.k2")] }]} />
            <Note>{t("del.pause")}</Note>
            {signed && (
              <Button type="button" kind="ghost" size="fit"
                onClick={() => void logout().catch(() => undefined)}>
                {t("profile.logout")}
              </Button>
            )}
          </>}
          right={<>
            <Overline>{t("del.verify")}</Overline>
            {signed ? (
              <>
                <Note card>{t("del.signedAs", { email: me.email ?? "" })}</Note>
                <TextInput
                  aria-label={t("del.confirmLabel", { word })}
                  value={typed}
                  autoComplete="off"
                  onChange={(e) => setTyped(e.target.value)}
                />
                <Button type="button" kind="danger" disabled={busy || !confirmed} onClick={() => void submit()}>
                  <Trash size={18} aria-hidden />
                  {t("del.submit")}
                </Button>
                <Note>{t("del.appleNote")}</Note>
              </>
            ) : (
              <>
                <GoogleSignIn onDone={() => setError(null)} />
                <AppleSignIn onDone={() => setError(null)} />
                <Note>{t("del.verifyHint")}</Note>
              </>
            )}
            {error && <ErrorText>{error}</ErrorText>}
          </>}
        />
      </Page>
    </PlainShell>
  );
}
```

- [x] **Step 6: `AccountDeletedPage.tsx`'i yaz**

```tsx
/* Artboard W18 · Hesap silindi — akışın son ekranı; hiçbir uç çağrılmaz. */
import { useTranslation } from "react-i18next";
import { HandNote, Heading, Lead, LinkButton, Page } from "../components/atoms";
import MapMark from "../components/molecules/MapMark";
import OneZone from "../components/molecules/OneZone";
import PlainShell from "../components/organisms/PlainShell";

export default function AccountDeletedPage() {
  const { t } = useTranslation();
  return (
    <PlainShell>
      <Page center>
        <OneZone>
          <MapMark />
          <Heading>{t("del.doneTitle")}</Heading>
          <Lead>{t("del.doneCopy")}</Lead>
          <HandNote>{t("del.doneHand")}</HandNote>
          <LinkButton href="/" kind="white" size="fit">{t("common.close")}</LinkButton>
        </OneZone>
      </Page>
    </PlainShell>
  );
}
```

- [x] **Step 7: `SupportPage.test.tsx` ve `SupportPage.tsx`'i yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SupportPage from "./SupportPage";

function at() {
  return render(<MemoryRouter><SupportPage /></MemoryRouter>);
}

describe("SupportPage", () => {
  it("e-posta bağlantısı mailto ile açılır", () => {
    at();
    expect(screen.getByRole("link", { name: /E-posta gönder/ })).toHaveAttribute("href", "mailto:hello@bumpinto.app");
  });

  it("dört SSS sorusu ve cevabı basılır", () => {
    at();
    expect(screen.getAllByRole("group")).toHaveLength(4);
    expect(screen.getByText(/Ses cihazlar arasında doğrudan/)).toBeInTheDocument();
  });

  it("DSA tacir bilgileri ve silme bağlantısı", () => {
    at();
    expect(screen.getByText("BumpInto (Mehmet Şerefoğlu)")).toBeInTheDocument();
    expect(screen.getByText(/DSA\) m\.30/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /account\/delete/ })).toHaveAttribute("href", "/account/delete");
  });
});
```

```tsx
/* Artboard W19 · Destek — RequireAuth YOK (Play destek e-postası + Apple Support URL herkese
   açık olmalı). Tacir bilgileri AB DSA m.30 gereği yayımlanır. */
import { EnvelopeSimple } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { LinkButton, Note, Overline, Page } from "../components/atoms";
import FaqItem from "../components/molecules/FaqItem";
import LegalBlocks from "../components/molecules/LegalBlocks";
import OneZone from "../components/molecules/OneZone";
import PageHeader from "../components/molecules/PageHeader";

const FAQ = ["1", "2", "3", "4"] as const;

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <Page>
      <PageHeader title={t("legal.support")} />
      <OneZone>
        <Note card>{t("support.cardTitle")} — {t("support.cardHint")}</Note>
        <LinkButton href="mailto:hello@bumpinto.app" size="fit">
          <EnvelopeSimple size={18} aria-hidden />
          {t("support.email")}
        </LinkButton>
        <Overline>{t("support.faqTitle")}</Overline>
        {FAQ.map((n) => <FaqItem key={n} question={t(`support.q${n}`)} answer={t(`support.a${n}`)} />)}
        <Overline>{t("support.merchant")}</Overline>
        <LegalBlocks blocks={[
          { table: [
            [t("support.mName"), "BumpInto (Mehmet Şerefoğlu)"],
            [t("support.mEmail"), "hello@bumpinto.app"],
            [t("support.mPhone"), "+31 ··· (mağazada görünür)"],
            [t("support.mAddress"), "[tacir adresi — mağazada görünür]"],
            [t("support.mWeb"), "bumpinto.app"],
          ] },
          { p: t("support.dsa") },
          { link: ["", t("support.deleteLink"), "/account/delete"] },
        ]} />
      </OneZone>
    </Page>
  );
}
```

- [x] **Step 8: Rotalar** — `App.tsx`: `AppShell` layout'unun İÇİNE `<Route path="/support" element={<SupportPage />} />`; layout bloğunun DIŞINA (`Routes` içinde):

```tsx
      <Route path="/account/delete" element={<DeleteAccountPage />} />
      <Route path="/account/deleted" element={<AccountDeletedPage />} />
```

- [x] **Step 9: Çalıştır** — Run: `PNPM_TEST src/pages/DeleteAccountPage.test.tsx` → 4 passed; `PNPM_TEST src/pages/SupportPage.test.tsx` → 3 passed. `tsc -b` temiz, `pnpm i18n:check` → 0.

- [x] **Step 10: Dosya listesi** — `organisms/PlainShell.tsx`, `pages/{DeleteAccountPage,AccountDeletedPage,SupportPage}.tsx`, `pages/{DeleteAccountPage,SupportPage}.test.tsx`, `App.tsx`, `i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(compliance): setup-free /account/delete flow, /account/deleted and /support`.

---

### Task 11: Tam doğrulama ve INDEX kaydı

**Files:**
- Modify: `docs/superpowers/plans/INDEX.md` (W tablosuna W-14 satırı)

- [x] **Step 1: Tam doğrulama** (repo kökünden)

```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/web exec tsc -b
pnpm test:web
pnpm i18n:check
pnpm --filter @bumpinto/web build
```

Expected: tsc temiz; testler önceki sayı + ~36 (analytics 7 (+2 net), authStore +3, LegalPage 4, Toggle 2, AttributionsPage 3, AccountPage 5, ConsentPage 5, AppleSignIn 3, DeleteAccountPage 4, SupportPage 3); parite 0 fark; build yeşil.

- [x] **Step 2: Rota erişimini elle doğrula** — `pnpm dev:web`, gizli pencerede (giriş YOK) sırayla: `/privacy`, `/terms`, `/kvkk`, `/attributions`, `/support`, `/account/delete` → hepsi içerik göstermeli, hiçbiri `/`'a yönlendirmemeli. `/account` ve `/account/consent` → `/`'a yönlenmeli. Ağ sekmesinde `clarity.ms` / `googletagmanager.com` isteği **olmamalı** (rıza yok).

- [x] **Step 3: INDEX.md W tablosuna satır ekle** (W-12'den sonra)

```markdown
| W-14 | **Mağaza uyumluluğu web** — yasal rotalar `/privacy` `/terms` `/kvkk` `/attributions` `/support` (RequireAuth yok; içerik `content/legal/*.tsx` TR taban blok verisi + `legal._status`), `/account` (Yasal/Veri/Hakkında/Tehlikeli bölge + kimlik kartı, "Kullanım verisi paylaş", "Verilerimi indir" → `GET /api/me/export`), `/account/consent` (3 anahtar, `PUT /api/me/consents`, geri alma), kurulumsuz `/account/delete` → `DELETE /api/me` → `/account/deleted`, analitik rıza kapısı (`lib/analytics.ts`), `AppleSignIn` (`POST /api/auth/apple`) | `2026-09-06-plan36-web-store-compliance.md` | Plan 36 | ready | **B-14 (plan33)** | — | Gereksinim dok. §3 R-W10–R-W14, R-W17; uyumluluk dok. §5. Artboard W13/W13b/W14–W19. Bildir/engelle (W20) W-15'te. `/attributions` şimdilik yerel `DATA_SOURCES` (W-12 sonrası tek satırda `configStore.sources[]`) |
```

- [x] **Step 4: Elle uçtan uca kontrol listesi** (kullanıcıya bırakılır; ajan yapamaz — Apple geliştirici hesabı ve gerçek silme gerekir)

1. Apple Developer'da Services ID (`VITE_APPLE_CLIENT_ID`) + Return URL tanımla, `.env.development.local`'e yaz. Landing'de "Apple ile devam et" → popup → giriş → `/sessions`.
2. Aynı e-postayla önce Google, sonra Apple ile gir → tek hesap (backend eşleştirmesi, §2).
3. `/account` → "Kullanım verisi paylaş" aç → ağ sekmesinde `clarity.ms`/`gtag` betiği **şimdi** yüklenir; kapat → yeni olay gitmez.
4. `/account/consent` → anahtarları değiştir, Kaydet → "Verildi: … · sürüm 1.0" güncellenir. Sunucuyu durdurup Kaydet → hata + anahtarlar sunucu değerine döner.
5. "Verilerimi indir" → JSON iner; hemen ikinci kez → 429 mesajı.
6. **Test hesabıyla**: gizli pencerede `/account/delete` (giriş yok) → Google ile gir → "SİL" → sil → `/account/deleted`. Ardından `GET /api/me` 401; arkadaşın oturumunda katılımcı adı "eski katılımcı".
7. Play Console Data safety formuna `https://bumpinto.app/account/delete`; App Store Connect'e `https://bumpinto.app/privacy` ve `https://bumpinto.app/support`.

- [x] **Step 5: Dosya listesi** — `INDEX.md`. Mesaj: `docs(compliance): register W-14 web store compliance plan`.

---

## Plan öz-incelemesi

**Spec kapsamı:** R-W10 → T3 (blok modeli + üç TR belge), T4 (üç rota `RequireAuth`sız + altbilgi), T6 (`/attributions` `sources[]` şekliyle veri-güdümlü), T10 (`/support`). R-W11 → T7 (dört blok, kimlik kartı, analitik anahtarı, "Verilerimi indir" → `GET /api/me/export` + 429 dalı). R-W12 → T8 (üç anahtar, `PUT /api/me/consents`, "Verildi · sürüm", başarısızsa geri alma) + T2 (`saveConsents` tek yazma yolu). R-W13 → T10 (kimlik Google/Apple → silinecek/kalacak → "SİL" → `DELETE /api/me` → `/account/deleted`, `AppShell` dışında `PlainShell`, kurulumsuz). R-W14 → T2 (rıza yoksa betik yüklenmez + `track()` no-op + anonimde `localStorage` + `resetAnalytics` rızayı sıfırlar). R-W17 → T9 (`AppleSignIn`, Landing + `/account/delete`, `POST /api/auth/apple`). §2: uç adları, `PUT` (POST değil), `GET /api/me/export` (POST değil), `DELETE /api/me`. **Kapsam dışı ve bilerek dokunulmayan:** R-W15 bildir/engelle (W-15) — hiçbir görevde `ParticipantRow` yok.

**Yer tutucu taraması:** yok; her adımda gerçek kod ya da gerçek metin. İki bilinçli sapma açıkça yazıldı: `account.exportHint` kopyası (e-posta değil indirme, §2 gereği) ve `/attributions` kaynağının W-12'ye kadar yerel olması.

**Tip tutarlılığı:** `ConsentsInput` T1 (shared) = T2 (`saveConsents` patch, `consentsOf` dönüşü) = T7/T8 (`draft`, `putConsents` çağrısı) · `AppleLoginRequest{identityToken,nonce,fullName?}` T1 = T2 (`loginApple`) = T9 · `LegalBlock` birleşimi T3 (renderer) = T3 (üç belge) = T10 (`del` listeleri, `support` tablosu) · `LegalSlug`/`LegalDocMeta` T3 = T4 prop · `DataSource` T6 alanları = W-12 `AppConfigSource` + `descKey` · `Toggle{checked,label,disabled?,onChange}` T5 = T7 = T8 · `SettingRow{icon,label,hint?,to?,onClick?,aside?,danger?,disabled?}` T5 = T7 = T8 · `SourceRow{label,hint?,href?,aside?}` T5 = T6 · `FaqItem{question,answer}` T5 = T10 · `GoogleSignIn`/`AppleSignIn` ortak `{onDone?: () => void}` T9 = T10.

**Yürütme sırası:** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 (T6 T5'in `SettingsCard`/`SourceRow`'unu, T7/T8 T5'in `Toggle`/`SettingRow`'unu, T10 T5'in `FaqItem`'ını ve T3'ün `LegalBlocks`'unu tüketir).
