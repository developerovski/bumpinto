# Açık hibrit mekan yığını — Web (W-12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web istemcisi harita motorunu ve atıf metinlerini SUNUCUDAN öğrenir: `GET /api/config`
ile gelen `mapEngine` anahtarına göre MapLibre GL + OpenFreeMap ya da bugünkü Google haritası
yüklenir; atıf satırları `sources[]`'tan veri-güdümlü basılır; puanlar kendi ölçeğinde
("8,7 / 10 · Foursquare") gösterilir; geocode çağrıları Nominatim'den backend'e taşınır.
Sonuç: Google Maps anahtarları kapatılabilir hâle gelir (spec §15 aşama 2).

**Architecture:** `configStore` (zustand) açılışta `/api/config`'i bir kez yükler; ulaşılamazsa
MapLibre + OpenFreeMap positron + boş `sources[]` yedeğine düşer (harita YİNE çizilir).
`MapView.tsx` ve `MapPicker.tsx` ince ANAHTARa dönüşür: prop arayüzü aynı kalır, motor
`configStore`'dan okunur ve yalnız seçilen motorun dosyası lazy import edilir
(`*.google.tsx` = bugünkü kod, `*.maplibre.tsx` = yeni). Kamera kararı (`mapCamera.ts`) ve pin
HTML'i (`mapPins.ts`) MOTORDAN BAĞIMSIZ kalır — iki uygulama da aynı saf modülleri tüketir;
ortak çerçeve (kutu + kapsül + ekran okuyucu özeti) `MapFrame` bileşenine çıkar.
`Attribution` sağlayıcı kimliği listesi alır, metni config'ten çözer.

**Tech Stack:** React 18, zustand 5, maplibre-gl 5, @googlemaps/js-api-loader 2 (Google yolu
için kalır), axios (paylaşılan istemci), Tailwind v4, react-i18next (tr/en/nl),
vitest + RTL + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-06-open-hybrid-venue-stack-design.md`
(§7 harita motoru, §8 web geocode, §10 harita linkleri UI tarafı, §11 atıf + puan ölçeği,
§12 API, §14 "Web" maddesi, §15 aşama 2).

**Ön koşul:** B-13 (plan30) aşama 1 tamam ve `frontend/shared/src/api-types.ts` yeniden
üretilmiş (`pnpm codegen`). Doğrula — üçü de ≥ 1 dönmeli:

```bash
grep -c "ratingScale" frontend/shared/src/api-types.ts
grep -c "\"/api/config\"" frontend/shared/src/api-types.ts
grep -c "\"/api/geocode\"" frontend/shared/src/api-types.ts
```

Sıfır dönüyorsa bu plan KOŞMAZ: önce plan30'un `/api/config` + `/api/geocode` + `VenueDto`
görevleri biter, sonra `pnpm codegen`.

**Bağlayıcı kurallar:**
- **Git yazma işlemi YOK.** `git add/commit/push/merge/rebase/reset` yasak. Ayrıca
  `git show HEAD:x > x`, `git checkout -- x`, `git restore x`, `git stash` **hiçbir adımda
  kullanılmaz** — dosya taşıma `cp`/`mv` + elle düzenleme ile yapılır. Her görev
  "Değişen dosyalar" ile biter; commit'i KULLANICI atar.
- Test komutu (repo kökünden): `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>`
  — aşağıda `PNPM_TEST <yol>`. Kökten çıplak `vitest` ya da `pnpm test` KOŞMA (izleme kipi asılır,
  41 dosya "window is not defined"). Tam koşu: `rtk pnpm test:web`.
- `.env.*` dosyalarını ajan **okumaz ve yazmaz** (AGENTS.md). Google anahtarları
  (`VITE_GOOGLE_MAPS_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`) yerinde kalır; MapLibre yolu hiçbir anahtar
  istemez. Env değişikliği gerekiyorsa görev metninde KULLANICIYA yazılır.
- Tailwind utility'leri yalnız `components/` altında; sayfalar kompozisyon. Atomic design
  dizinleri korunur (`atoms` / `molecules` / `organisms`).
- i18n: `tr` taban, `en`/`nl` parite (`pnpm i18n:check`). Locale JSON'ları **elle satır ekleyerek
  ya da** şu kalıpla düzenlenir — başka biçimde ASLA:
  ```bash
  python3 - <<'PY'
  import json
  p = "frontend/web/src/i18n/locales/tr.json"
  d = json.load(open(p))
  d["attribution"]["open"] = "…"
  json.dump(d, open(p, "w"), ensure_ascii=False, indent=2)
  open(p, "a").write("\n")
  PY
  ```
- Yorumlar KISA ve Türkçe. Yeni dosya yalnız aşağıdaki haritada olanlar.
- Testler önce yazılır, düştüğü görülür, sonra kod (TDD).

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/api.ts`, `index.ts` | T1, T4 | `AppConfig` tipi + `getConfig`, `geocode`, `reverseGeocode` |
| `web/src/store/configStore.ts` (+test), `main.tsx` | T1 | Motor/atıf config'i, açılışta bir kez, yedekli |
| `web/src/lib/format.ts` (+test), `VenueCard.tsx`, `VenueMeta.tsx`, `LikedList.tsx` | T2 | `formatRating(rating, scale)`, `providerMark` |
| `frontend/shared/src/fairness.ts` (+test) | T2 | `byRating` ölçek normalizasyonu |
| `web/src/components/molecules/Attribution.tsx` (+test), `lib/provider.ts`, `i18n/locales/{tr,en,nl}.json` | T3 | Veri-güdümlü atıf |
| `web/src/lib/geocode.ts` (+test) | T4 | Backend geocode uçları |
| `web/src/components/organisms/MapFrame.tsx`, `MapView.tsx`, `MapView.google.tsx`, `MapView.maplibre.tsx` (+test), `lib/maplibre.ts`, `vite.config.ts`, `package.json` | T5 | Harita motoru anahtarı |
| `web/src/components/organisms/MapPicker.tsx`, `MapPicker.google.tsx`, `MapPicker.maplibre.tsx` (+test), `mapPins.ts` | T6 | Nokta seçici anahtarı |
| `web/src/lib/venueLink.ts` (+test), `docs/CONFIGURATION.md`, `docs/superpowers/plans/INDEX.md` | T7 | Link sözleşmesi, belge, kayıt |

**Değişmeyenler (dokunma):** `pages/JoinForm.tsx`, `NewSessionPage.tsx`, `WaitingRoom.tsx`,
`LobbyPage.tsx`, `SoloSetupPage.tsx`, `components/organisms/VenueBrowser.tsx` mount noktaları —
hepsi `lazy(() => import(".../MapView"))` ile ANAHTAR dosyayı yükler, prop'lar birebir aynı kalır.
Tek istisna: `VenueBrowser` ve `DeckScreen` `Attribution` prop adını `provider` → `providers`
değiştirir (T3).

**Kapsam DIŞI:**
- `VenueDto.popularity` için UI — alan bu planda YALNIZ veri olarak taşınır, hiçbir yerde
  basılmaz (spec §12; gösterim kararı verilmedi).
- Mobil (`react-native-maps` → MapLibre RN) — M planları, K-M2.
- Static Maps / statik harita görseli — yok, hiçbir ekranda planlanmadı.
- Tile self-hosting (Protomaps PMTiles), OpenFreeMap stil JSON'unun `paint` ezmeleriyle
  DS §10 renklerine çekilmesi, Nominatim/Photon/OSRM kurulumu — **plan 32 (I-2)**.
- Backend `/api/config`, `/api/geocode`, `VenueDto` alanları, `MapLinks` — **plan 30 (B-13)**.
- Foto karuseli, `photos[]` tüketimi — V7 spec'i, ayrı iş.

---

### Task 1: `configStore` — motor ve atıf sunucudan, yedekli

**Files:**
- Modify: `frontend/shared/src/api.ts`, `frontend/shared/src/index.ts`, `frontend/web/src/main.tsx`
- Create: `frontend/web/src/store/configStore.ts`
- Test: `frontend/web/src/store/configStore.test.ts`

- [ ] **Step 1: Paylaşılan tip + istemci fonksiyonu**

`frontend/shared/src/api.ts` — dosyanın üst tip bloğuna (`export type SessionPreview = …`
satırından sonra) ekle:

```ts
/* /api/config sözleşmesi (spec §7) ELLE yazılır: üretilen şema adı plan30'un DTO isimlendirmesine
   bağlı, bu tip ise üç planın (B-13 / W-12 / I-2) ortak sözleşmesi. Alanlar birebir aynı. */
export type MapEngine = "maplibre" | "google";
export type AppConfigSource = {
  id: string;
  attributionKey: string;
  attributionUrl: string | null;
  ratingScale: 5 | 10 | null;
};
export type AppConfig = {
  mapEngine: MapEngine;
  tiles: { styleUrl: string };
  sources: AppConfigSource[];
};
```

`createBumpintoApi` nesnesinin içine, `preview` satırından sonra:

```ts
    getConfig: () => http.get<AppConfig>("/api/config").then((r) => r.data),
```

`frontend/shared/src/index.ts` — `createBumpintoApi` export bloğuna üç tip ekle:

```ts
export {
  createBumpintoApi,
  type AppConfig,
  type AppConfigSource,
  type BumpintoApi,
  type MapEngine,
  type MeResponse,
  type ParticipantDto,
  type Schemas,
  type SessionPreview,
  type SessionSummaryDto,
  type SessionView,
  type VenueDto,
} from "./api";
```

- [ ] **Step 2: Başarısız testi yaz**

`frontend/web/src/store/configStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { getConfig: vi.fn() } }));

import { api } from "../lib/api";
import { FALLBACK_CONFIG, resetConfig, useConfigStore } from "./configStore";

const served = {
  mapEngine: "google" as const,
  tiles: { styleUrl: "https://tiles.example.test/style" },
  sources: [
    { id: "foursquare", attributionKey: "attribution.foursquare",
      attributionUrl: "https://foursquare.com", ratingScale: 10 as const },
  ],
};

describe("configStore", () => {
  beforeEach(() => {
    resetConfig();
    vi.mocked(api.getConfig).mockReset();
  });

  it("sunucudan geleni saklar", async () => {
    vi.mocked(api.getConfig).mockResolvedValueOnce(served);
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().config).toEqual(served);
  });

  it("uç ulaşılamazsa MapLibre + OpenFreeMap yedeğine düşer (harita YİNE çizilir)", async () => {
    vi.mocked(api.getConfig).mockRejectedValueOnce(new Error("network"));
    await useConfigStore.getState().load();
    const config = useConfigStore.getState().config;
    expect(config).toEqual(FALLBACK_CONFIG);
    expect(config?.mapEngine).toBe("maplibre");
    expect(config?.sources).toEqual([]); // atıf: yalnız sabit OSM satırı
  });

  it("ikinci load ağa GİTMEZ (açılışta bir kez)", async () => {
    vi.mocked(api.getConfig).mockResolvedValueOnce(served);
    await useConfigStore.getState().load();
    await useConfigStore.getState().load();
    expect(api.getConfig).toHaveBeenCalledTimes(1);
  });

  it("eşzamanlı iki load tek istek yapar (MapView + MapPicker aynı anda mount)", async () => {
    vi.mocked(api.getConfig).mockResolvedValueOnce(served);
    await Promise.all([useConfigStore.getState().load(), useConfigStore.getState().load()]);
    expect(api.getConfig).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/store/configStore.test.ts`
Expected: `Failed to resolve import "./configStore"`.

- [ ] **Step 4: `configStore.ts`'i yaz**

`frontend/web/src/store/configStore.ts`:

```ts
import type { AppConfig } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";

/** Uç ulaşılamazsa ürün ÇALIŞIR: açık motor + açık stil, sağlayıcı atfı yok (spec §7).
    Google'a düşmek yanlış olurdu — anahtar kapalıyken harita hiç çizilmezdi. */
export const FALLBACK_CONFIG: AppConfig = {
  mapEngine: "maplibre",
  tiles: { styleUrl: "https://tiles.openfreemap.org/styles/positron" },
  sources: [],
};

type ConfigState = {
  config: AppConfig | null;
  load: () => Promise<void>;
};

/** Uçuştaki istek — MapView, MapPicker ve açılış aynı anda çağırır, uç bir kez vurulur. */
let inflight: Promise<void> | null = null;

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  load: () => {
    if (get().config) return Promise.resolve();
    if (!inflight) {
      inflight = api
        .getConfig()
        .then((config) => set({ config }))
        .catch(() => set({ config: FALLBACK_CONFIG }))
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  },
}));

/** Testler için — modül durumunu sıfırlar. */
export function resetConfig(): void {
  inflight = null;
  useConfigStore.setState({ config: null });
}
```

- [ ] **Step 5: Açılışta yükle**

`frontend/web/src/main.tsx` — `useAuthStore` satırının yanına:

```tsx
import { useConfigStore } from "./store/configStore";
```

ve

```tsx
void useAuthStore.getState().load();
void useConfigStore.getState().load();
```

`load()` beklenmez: harita bileşenleri config gelene kadar "yükleniyor" çerçevesi basar, geri
kalan ekranlar config'e hiç bakmaz.

- [ ] **Step 6: Çalıştır**

Run: `PNPM_TEST src/store/configStore.test.ts` → 4 passed.
Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` → hata yok.

- [ ] **Step 7: Değişen dosyalar**

`frontend/shared/src/api.ts`, `frontend/shared/src/index.ts`,
`frontend/web/src/store/configStore.ts`, `configStore.test.ts`, `frontend/web/src/main.tsx`.
Önerilen mesaj: `feat(web): app config store with open-map fallback`.

---

### Task 2: Puan ölçeği — `formatRating(rating, scale)` ve sağlayıcı işareti

Spec §11: puanlar **dönüştürülmez**, kendi ölçeğinde + sağlayıcı işaretiyle gösterilir
("8,7 / 10 · Foursquare"). `byRating` sıralaması ölçeği normalize eder ama gösterim etmez.

**Files:**
- Modify: `frontend/web/src/lib/format.ts`, `frontend/shared/src/fairness.ts`,
  `frontend/web/src/components/molecules/VenueCard.tsx`, `VenueMeta.tsx`, `LikedList.tsx`
- Test: `frontend/web/src/lib/format.test.ts` (yeni), `frontend/shared/src/fairness.test.ts`

- [ ] **Step 1: Başarısız testleri yaz**

`frontend/web/src/lib/format.test.ts` (yeni):

```ts
import { describe, expect, it } from "vitest";
import { formatRating, providerMark } from "./format";

describe("formatRating", () => {
  it("ölçek verilirse ölçeği de yazar (dönüştürmez)", () => {
    expect(formatRating(8.7, 10)).toBe("8,7 / 10"); // test dili tr
    expect(formatRating(4.25, 5)).toBe("4,3 / 5");
  });

  it("ölçek yoksa çıplak puan (bugünkü davranış korunur)", () => {
    expect(formatRating(4.5, null)).toBe("4,5");
    expect(formatRating(4.5)).toBe("4,5");
  });

  it("her zaman tek ondalık", () => {
    expect(formatRating(9, 10)).toBe("9,0 / 10");
  });
});

describe("providerMark", () => {
  it("sağlayıcı kimliğini okunur işarete çevirir (büyük/küçük harften bağımsız)", () => {
    expect(providerMark("foursquare")).toBe("Foursquare");
    expect(providerMark("FOURSQUARE")).toBe("Foursquare");
    expect(providerMark("tripadvisor")).toBe("Tripadvisor");
  });

  it("açık taban ve bilinmeyen/boş değer işaret basmaz", () => {
    expect(providerMark("open")).toBeNull();   // "Open" kullanıcıya hiçbir şey anlatmaz
    expect(providerMark(undefined)).toBeNull();
    expect(providerMark("")).toBeNull();
  });
});
```

`frontend/shared/src/fairness.test.ts` — dosyanın sonuna ekle:

```ts
describe("byRating — ölçek normalizasyonu", () => {
  it("10'luk 8,0 ile 5'lik 4,5'i doğru sıralar (0,80 < 0,90)", () => {
    const fsq = { id: "a", rating: 8, ratingScale: 10, deckOrder: 0 };
    const ta = { id: "b", rating: 4.5, ratingScale: 5, deckOrder: 1 };
    expect([fsq, ta].sort(byRating).map((v) => v.id)).toEqual(["b", "a"]);
  });

  it("ölçek yoksa 5 varsayılır (bugünkü Google/FSQ öncesi veri)", () => {
    const a = { id: "a", rating: 4.8, deckOrder: 0 };
    const b = { id: "b", rating: 9, ratingScale: 10, deckOrder: 1 };
    expect([a, b].sort(byRating).map((v) => v.id)).toEqual(["b", "a"]); // 0,96 > 0,90
  });

  it("puansız kart sona kalır, eşitlikte deste sırası korunur", () => {
    const a = { id: "a", deckOrder: 5 };
    const b = { id: "b", rating: 1, ratingScale: 10, deckOrder: 9 };
    expect([a, b].sort(byRating).map((v) => v.id)).toEqual(["b", "a"]);
  });
});
```

`fairness.test.ts` üstündeki import satırında `byRating`'in olduğundan emin ol
(`import { byFairness, byRating, fairestOf, fairnessOf } from "./fairness";`).

- [ ] **Step 2: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/lib/format.test.ts ../shared/src/fairness.test.ts`
Expected: `providerMark` çözülemiyor; `formatRating(8.7, 10)` → `"8,7"`; ölçek testleri kırmızı.

- [ ] **Step 3: `format.ts`'i genişlet**

`frontend/web/src/lib/format.ts` tamamı:

```ts
/* Puan biçimi tek atomda yaşar (§4.9 "rating format unified") — VenueMeta VE VenueCard VE
   LikedList bunu okur. Kullanıcının diline göre biçimlenir (tr/nl ondalık virgül, en nokta).
   Ölçek DÖNÜŞTÜRÜLMEZ (spec §11): 10'luk puan 10'luk yazılır, yanına sağlayıcı işareti gelir.
   VenueMeta.tsx yalnız bileşeni içerir (Fast Refresh bir .tsx modülün TÜM export'larının
   bileşen olmasını gerektirir). */
import i18n from "../i18n";

export function formatRating(rating: number, scale?: number | null): string {
  const value = new Intl.NumberFormat(i18n.resolvedLanguage, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
  return scale ? `${value} / ${scale}` : value;
}

/** Puanın yanındaki sağlayıcı işareti ("· Foursquare"). Kimlik `/api/config.sources[].id` ile
    aynı sözcük; i18n anahtarı YOK — marka adları çevrilmez. `open` (kendi tabanımız) işaret
    basmaz: kullanıcıya bir şey anlatmaz ve zaten puansızdır. */
export function providerMark(provider?: string | null): string | null {
  const id = (provider ?? "").trim().toLowerCase();
  if (!id || id === "open") return null;
  return id[0].toUpperCase() + id.slice(1);
}
```

- [ ] **Step 4: `byRating`'i normalize et**

`frontend/shared/src/fairness.ts` — `FairnessVenue` tipine alan ekle (`rating?: number;`
satırının hemen altına):

```ts
  ratingScale?: number | null;
```

`byRating`'i değiştir:

```ts
/** Normalize puan: ölçek farkı sıralamayı bozmasın (FSQ 10'luk, TA/Google 5'lik — spec §11).
    Ölçek yoksa 5 varsayılır (eski satırlar). Puansız kart sona. */
function normRating(v: FairnessVenue): number {
  if (v.rating == null) return -1;
  const scale = v.ratingScale ?? 5;
  return scale > 0 ? v.rating / scale : -1;
}

/** "Puan" sırası: normalize puan azalan; puansız kart sona. GÖSTERİM normalize edilmez. */
export function byRating(a: FairnessVenue, b: FairnessVenue): number {
  return normRating(b) - normRating(a) || (a.deckOrder ?? 0) - (b.deckOrder ?? 0);
}
```

`fairestOf` içindeki üçüncü eşitlik bozucu da aynı ölçüyü kullanmalı (aynı kusur sınıfı,
AGENTS.md "Review Fix Rule") — `(b.rating ?? -1) - (a.rating ?? -1) ||` satırını şununla değiştir:

```ts
      normRating(b) - normRating(a) ||
```

- [ ] **Step 5: Üç gösterim yüzeyini güncelle**

`frontend/web/src/components/molecules/VenueMeta.tsx` — import satırına `providerMark` ekle
(`import { formatRating, providerMark } from "../../lib/format";`), gövdede `const hasPrice`
satırının üstüne:

```tsx
  const mark = providerMark(v.provider);
```

ve puan parçasını değiştir:

```tsx
          {v.rating != null && (
            <span>
              ★ {formatRating(v.rating, v.ratingScale)}
              {mark && ` · ${mark}`}
            </span>
          )}
```

`frontend/web/src/components/molecules/VenueCard.tsx` — iki yerde:

`row` dalındaki HAM puan (`{v.rating != null && \`★ ${v.rating}\`}`) da atoma alınır — aynı kusur
sınıfı, biçimlenmemiş puan tek yerde kalmıştı:

```tsx
              {hasMeta && (
                <span className="text-[0.75rem] text-ink2">
                  {v.rating != null && `★ ${formatRating(v.rating, v.ratingScale)}`}
                  {v.rating != null && hasPrice && " · "}
                  {hasPrice && "€".repeat(v.priceLevel!)}
                </span>
              )}
```

polaroid dalında (`<strong className="font-bold text-ink">…`):

```tsx
                  {v.rating != null && (
                    <strong className="font-bold text-ink">
                      ★ {formatRating(v.rating, v.ratingScale)}
                    </strong>
                  )}
                  {v.rating != null && providerMark(v.provider) && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{providerMark(v.provider)}</span>
                    </>
                  )}
```

import: `import { formatRating, providerMark } from "../../lib/format";` (bugün yalnız
`formatRating` var).

`frontend/web/src/components/molecules/LikedList.tsx` — 41. satır:

```tsx
                <span className="text-[0.75rem] text-ink2">★ {formatRating(v.rating, v.ratingScale)}</span>
```

Sağlayıcı işareti LikedList'te YOK: satır dar ve atıf listenin altında zaten basılıyor.

- [ ] **Step 6: Çalıştır**

Run: `PNPM_TEST src/lib/format.test.ts ../shared/src/fairness.test.ts` → hepsi yeşil.
Run: `PNPM_TEST src/components/molecules src/components/organisms/VenueBrowser.test.tsx`
Expected: yeşil. Bir test ham puan bekliyorsa (`★ 4.5`) beklentiyi biçimli değere çevir
(`★ 4,5` ya da ölçekliyse `★ 8,7 / 10`) — kod doğru, beklenti bayat.

`popularity` alanı BİLEREK hiçbir yüzeye girmez (spec §12 veri; gösterim kararı yok).

- [ ] **Step 7: Değişen dosyalar**

`frontend/web/src/lib/format.ts`, `format.test.ts`, `frontend/shared/src/fairness.ts`,
`fairness.test.ts`, `components/molecules/VenueMeta.tsx`, `VenueCard.tsx`, `LikedList.tsx`.
Önerilen mesaj: `feat(web): show ratings on their own scale with provider mark`.

---

### Task 3: Atıf veri-güdümlü

Spec §11: `Attribution` ekrandaki `VenueDto.provider` KÜMESİNİ alır, metni
`/api/config.sources[].attributionKey`'den çözer; sağlayıcı başına kod dalı YOK. MapLibre
motorunda sabit OpenFreeMap/OSM satırı eklenir.

**Files:**
- Modify: `frontend/web/src/components/molecules/Attribution.tsx`, `frontend/web/src/lib/provider.ts`,
  `frontend/web/src/components/molecules/VenueCard.tsx`, `WinnerCard.tsx`,
  `frontend/web/src/components/organisms/VenueBrowser.tsx`, `frontend/web/src/pages/DeckScreen.tsx`,
  `frontend/web/src/i18n/locales/{tr,en,nl}.json`
- Test: `frontend/web/src/components/molecules/Attribution.test.tsx` (yeni)

- [ ] **Step 1: i18n anahtarlarını ekle**

Üç dosyaya da beş anahtar; `attribution.google`, `attribution.foursquare`, `attribution.osm`
KALIR (Google yolu ve open kaynağı hâlâ kullanıyor).

```bash
python3 - <<'PY'
import json

add = {
  "tr": {
    "attribution.open": "© OpenStreetMap katkıcıları · Overture Maps Foundation",
    "attribution.openfreemap": "OpenFreeMap © OpenMapTiles · OpenStreetMap verisi",
    "attribution.tripadvisor": "Veriler Tripadvisor'dan",
    "attribution.wikimedia": "Fotoğraf: Wikimedia Commons",
    "map.engineUnavailable": "Harita şu an yüklenemedi.",
  },
  "en": {
    "attribution.open": "© OpenStreetMap contributors · Overture Maps Foundation",
    "attribution.openfreemap": "OpenFreeMap © OpenMapTiles · Data from OpenStreetMap",
    "attribution.tripadvisor": "Data from Tripadvisor",
    "attribution.wikimedia": "Photo: Wikimedia Commons",
    "map.engineUnavailable": "The map could not be loaded right now.",
  },
  "nl": {
    "attribution.open": "© OpenStreetMap-bijdragers · Overture Maps Foundation",
    "attribution.openfreemap": "OpenFreeMap © OpenMapTiles · Data van OpenStreetMap",
    "attribution.tripadvisor": "Gegevens van Tripadvisor",
    "attribution.wikimedia": "Foto: Wikimedia Commons",
    "map.engineUnavailable": "De kaart kon nu niet worden geladen.",
  },
}

for lang, pairs in add.items():
    path = f"frontend/web/src/i18n/locales/{lang}.json"
    data = json.load(open(path))
    for dotted, value in pairs.items():
        section, key = dotted.split(".")
        data.setdefault(section, {})[key] = value
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=2)
    open(path, "a").write("\n")
print("ok")
PY
```

Run: `source ./init-nvm.sh && pnpm i18n:check` → 0 fark.

- [ ] **Step 2: Başarısız testi yaz**

`frontend/web/src/components/molecules/Attribution.test.tsx` (yeni):

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import Attribution from "./Attribution";

const config = (mapEngine: AppConfig["mapEngine"]): AppConfig => ({
  mapEngine,
  tiles: { styleUrl: "https://tiles.example.test/style" },
  sources: [
    { id: "foursquare", attributionKey: "attribution.foursquare",
      attributionUrl: "https://foursquare.com", ratingScale: 10 },
    { id: "open", attributionKey: "attribution.open",
      attributionUrl: "https://www.openstreetmap.org/copyright", ratingScale: null },
  ],
});

afterEach(resetConfig);

describe("Attribution", () => {
  it("ekrandaki sağlayıcı kümesi kadar satır basar", () => {
    useConfigStore.setState({ config: config("google") });
    render(<Attribution providers={["foursquare", "open", "foursquare"]} />);
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
    expect(screen.getByText(/Overture Maps Foundation/)).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  it("bağlantısı olan kaynak tıklanabilir, olmayan düz metin", () => {
    useConfigStore.setState({
      config: { ...config("google"),
        sources: [{ id: "wiki", attributionKey: "attribution.wikimedia",
                    attributionUrl: null, ratingScale: null }] },
    });
    render(<Attribution providers={["wiki"]} />);
    expect(screen.getByText("Fotoğraf: Wikimedia Commons").tagName).toBe("SPAN");
  });

  it("MapLibre motorunda sabit OpenFreeMap satırı da basılır", () => {
    useConfigStore.setState({ config: config("maplibre") });
    render(<Attribution providers={[]} />);
    expect(screen.getByText(/OpenFreeMap/)).toBeInTheDocument();
  });

  it("bilinmeyen sağlayıcı kimliği hiçbir şey basmaz, ÇÖKMEZ", () => {
    useConfigStore.setState({ config: config("google") });
    const { container } = render(<Attribution providers={["yelp"]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("config henüz gelmediyse sessiz kalır (yanlış atıf basmaktansa hiç basma)", () => {
    const { container } = render(<Attribution providers={["foursquare"]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("büyük harfli eski sağlayıcı değeri de eşleşir", () => {
    useConfigStore.setState({ config: config("google") });
    render(<Attribution providers={["FOURSQUARE"]} />);
    expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/components/molecules/Attribution.test.tsx`
Expected: `providers` prop'u tanınmıyor, satırlar basılmıyor → kırmızı.

- [ ] **Step 4: `Attribution.tsx`'i yeniden yaz**

```tsx
/* Karar dokümanı §2 (politika) + spec §11 — atıf VERİ-GÜDÜMLÜ: ekrandaki sağlayıcı kimlikleri
   `/api/config.sources[]` ile eşleşir, metin i18n anahtarından gelir. Sağlayıcı başına kod dalı
   YOK: yeni kaynak = bir config satırı + bir i18n anahtarı (spec §3 DoD).
   Saf birleşim mantığı `../../lib/provider`'da (Fast Refresh). */
import { useTranslation } from "react-i18next";
import { useConfigStore } from "../../store/configStore";

export default function Attribution(props: { providers: string[]; center?: boolean }) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  if (!config) return null; // config gelmeden yanlış atıf basmaktansa hiç basma

  const ids = new Set(props.providers.map((p) => p.toLowerCase()));
  const lines = config.sources
    .filter((s) => ids.has(s.id.toLowerCase()))
    .map((s) => ({ key: s.id, text: t(s.attributionKey), url: s.attributionUrl }));
  // Tile sağlayıcısı: MapLibre'de zorunlu, Google'da metni Maps'in kendisi basar.
  if (config.mapEngine === "maplibre") {
    lines.push({ key: "openfreemap", text: t("attribution.openfreemap"), url: null });
  }
  if (lines.length === 0) return null;

  const cls = `flex flex-col gap-0.5 text-[0.6875rem] text-ink3 ${props.center ? "text-center" : ""}`;
  return (
    <p className={cls}>
      {lines.map((l) =>
        l.url ? (
          <a key={l.key} href={l.url} target="_blank" rel="noreferrer" className="text-ink3 underline">
            {l.text}
          </a>
        ) : (
          <span key={l.key}>{l.text}</span>
        ),
      )}
    </p>
  );
}
```

- [ ] **Step 5: `provider.ts` — birleşim yerine KÜME**

`frontend/web/src/lib/provider.ts` tamamı:

```ts
/* Spec §11 — atıf artık kümeyle çalışıyor: karışık listede HER kaynağın satırı basılır
   (eski `unionProvider` karışık listede "bilinmiyor"a düşüp ikisini birden basıyordu; artık
   tahmine gerek yok). Attribution.tsx yalnız bileşeni içerir (Fast Refresh). */

/** Ekrandaki mekanların ayrık sağlayıcı kimlikleri, kararlı sırada. */
export function providerIds(venues: { provider?: string }[]): string[] {
  const ids = new Set<string>();
  for (const v of venues) if (v.provider) ids.add(v.provider);
  return [...ids].sort();
}
```

Dört çağrı yerini güncelle:

- `components/molecules/VenueCard.tsx`:
  `{(props.attribution ?? true) && <Attribution providers={v.provider ? [v.provider] : []} />}`
- `components/molecules/WinnerCard.tsx`:
  `<Attribution providers={props.venue.provider ? [props.venue.provider] : []} center />`
- `components/organisms/VenueBrowser.tsx`: import satırını
  `import { providerIds } from "../../lib/provider";` yap, `const listProvider = unionProvider(venues);`
  yerine `const listProviders = providerIds(venues);`, kullanım `<Attribution providers={listProviders} />`,
  üstündeki iki satırlık yorumu şuna indir:
  `// Sağlayıcı atfı (spec §11) — listedeki HER kaynağın satırı config'ten basılır.`
- `pages/DeckScreen.tsx`: aynı değişiklik (`unionProvider` → `providerIds`,
  `provider={listProvider}` → `providers={listProviders}`).

- [ ] **Step 6: Çalıştır**

Run: `PNPM_TEST src/components/molecules/Attribution.test.tsx` → 6 passed.
Run: `PNPM_TEST src/components/molecules src/components/organisms src/pages` → yeşil.
Beklenti "Google Maps"/"Powered by Foursquare" arayan eski testler artık `configStore`
kurulmadığı için sessiz satır görür: o testlerde `useConfigStore.setState({ config: … })`
kurulur (Attribution.test.tsx'teki `config()` yardımcısını kopyalamak yerine testin ihtiyacı
kadar tek kaynaklı config yeter).
Run: `source ./init-nvm.sh && pnpm i18n:check` → 0 fark.

- [ ] **Step 7: Değişen dosyalar**

`components/molecules/Attribution.tsx`, `Attribution.test.tsx`, `VenueCard.tsx`, `WinnerCard.tsx`,
`components/organisms/VenueBrowser.tsx`, `pages/DeckScreen.tsx`, `lib/provider.ts`,
`i18n/locales/{tr,en,nl}.json`.
Önerilen mesaj: `feat(web): data-driven attribution from /api/config`.

---

### Task 4: Geocode backend'e taşınır

Spec §8: istemci artık `nominatim.openstreetmap.org`'a GİTMEZ; `POST /api/geocode` ve
`POST /api/geocode/reverse` (kimliği doğrulanmış herhangi bir principal: hesap cookie'si/bearer
ya da katılımcı cookie'si). Throttle ve UA sorumluluğu backend'de (K-B20, K-B22 kapanır).

**Files:**
- Modify: `frontend/shared/src/api.ts`, `frontend/web/src/lib/geocode.ts`
- Test: `frontend/web/src/lib/geocode.test.ts` (yeni)

- [ ] **Step 1: Paylaşılan istemciye iki uç**

`frontend/shared/src/api.ts` — `getConfig` satırından sonra:

```ts
    geocode: (body: { query: string; biasLat?: number; biasLng?: number }) =>
      http.post<{ lat: number; lng: number; label: string }>("/api/geocode", body)
        .then((r) => r.data),
    reverseGeocode: (body: { lat: number; lng: number }) =>
      http.post<{ label: string | null }>("/api/geocode/reverse", body).then((r) => r.data),
```

`biasLat/biasLng` sözleşmede var ama bu planda GÖNDERİLMEZ: `lib/geocode.ts` imzaları
değişmiyor (aşağıda), bias'ı kullanacak çağrı yeri yok. Alan ileriye dönük.

- [ ] **Step 2: Başarısız testi yaz**

`frontend/web/src/lib/geocode.test.ts` (yeni):

```ts
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({ api: { geocode: vi.fn(), reverseGeocode: vi.fn() } }));

import { api } from "./api";
import { geocode, reverseGeocode } from "./geocode";

const notFound = () =>
  new AxiosError("x", "404", undefined, undefined, {
    status: 404, data: {}, statusText: "", headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("geocode", () => {
  beforeEach(() => {
    vi.mocked(api.geocode).mockReset();
    vi.mocked(api.reverseGeocode).mockReset();
  });

  it("backend ucunu çağırır ve Coords döner", async () => {
    vi.mocked(api.geocode).mockResolvedValueOnce({ lat: 52.37, lng: 4.9, label: "Amsterdam" });
    await expect(geocode("Amsterdam")).resolves.toEqual({ lat: 52.37, lng: 4.9, label: "Amsterdam" });
    expect(api.geocode).toHaveBeenCalledWith({ query: "Amsterdam" });
  });

  it("404 → null (adres bulunamadı, hata ekranı YOK)", async () => {
    vi.mocked(api.geocode).mockRejectedValueOnce(notFound());
    await expect(geocode("qwertyuiop")).resolves.toBeNull();
  });

  it("ağ hatası da null (çağıran akışı kırmaz)", async () => {
    vi.mocked(api.geocode).mockRejectedValueOnce(new Error("network"));
    await expect(geocode("Eindhoven")).resolves.toBeNull();
  });

  it("ters geocode etiketi döner", async () => {
    vi.mocked(api.reverseGeocode).mockResolvedValueOnce({ label: "Den Bosch" });
    await expect(reverseGeocode(51.7, 5.3)).resolves.toBe("Den Bosch");
    expect(api.reverseGeocode).toHaveBeenCalledWith({ lat: 51.7, lng: 5.3 });
  });

  it("ters geocode etiketsiz ya da hatalı yanıtta null (nokta yine seçilebilir)", async () => {
    vi.mocked(api.reverseGeocode).mockResolvedValueOnce({ label: null });
    await expect(reverseGeocode(0, 0)).resolves.toBeNull();
    vi.mocked(api.reverseGeocode).mockRejectedValueOnce(new Error("network"));
    await expect(reverseGeocode(0, 0)).resolves.toBeNull();
  });

  it("hiçbir yol doğrudan nominatim'e gitmez", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.mocked(api.geocode).mockResolvedValueOnce({ lat: 1, lng: 2, label: "x" });
    await geocode("x");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/lib/geocode.test.ts` → `api.geocode is not a function` / fetch çağrılıyor.

- [ ] **Step 4: `geocode.ts`'i yeniden yaz**

```ts
/* Geocode backend'de (spec §8): istemci Nominatim'e DOĞRUDAN gitmez — kullanım politikası,
   throttle ve User-Agent sorumluluğu sunucuda. İmzalar değişmedi; çağıran yerler (PointsEditor,
   NewSessionPage, useOwnLocation, MapPicker) aynı kalır. */
import { api } from "./api";

export type Coords = { lat: number; lng: number; label: string | null };

/** Adres → koordinat. Bulunamama (404) ve ağ hatası AYNI: null — çağıran "bulunamadı" der. */
export async function geocode(query: string): Promise<Coords | null> {
  try {
    const r = await api.geocode({ query });
    return { lat: r.lat, lng: r.lng, label: r.label ?? null };
  } catch {
    return null;
  }
}

/** Koordinat → semt etiketi. Etiket yoksa null; nokta yine seçilebilir. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    return (await api.reverseGeocode({ lat, lng })).label ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Çalıştır**

Run: `PNPM_TEST src/lib/geocode.test.ts` → 6 passed.
Run: `PNPM_TEST src/pages/NewSessionPage.test.tsx src/pages/WaitingRoom.test.tsx src/store` → yeşil
(bu testler zaten `vi.mock("../lib/geocode")` yapıyor; modülün iç yolu değişti, sözleşmesi değil).

`MapPicker` içindeki `reverseGeocode(point.lat, point.lng)` çağrısı ve "ters geocode ONAYDA bir
kez" kuralı DEĞİŞMEZ; yalnız üstündeki yorumun ikinci cümlesi güncellenir:
"Ters geocode ONAYDA bir kez çalışır, sürüklemede değil: uç sunucuda rate-limit'li (10/dk)."

- [ ] **Step 6: Değişen dosyalar**

`frontend/shared/src/api.ts`, `frontend/web/src/lib/geocode.ts`, `geocode.test.ts`,
`components/organisms/MapPicker.tsx` (tek yorum satırı).
Önerilen mesaj: `feat(web): route geocoding through backend endpoints`.

---

### Task 5: `MapView` motor anahtarı + MapLibre uygulaması

**Files:**
- Create: `frontend/web/src/components/organisms/MapFrame.tsx`,
  `MapView.google.tsx`, `MapView.maplibre.tsx`, `frontend/web/src/lib/maplibre.ts`
- Modify: `frontend/web/src/components/organisms/MapView.tsx`, `frontend/web/package.json`,
  `frontend/web/vite.config.ts`
- Test: `frontend/web/src/components/organisms/MapView.test.tsx`

- [ ] **Step 1: Bağımlılık**

Run (repo kökünden):

```bash
source ./init-nvm.sh && pnpm --filter @bumpinto/web add maplibre-gl@^5.6.0
```

`frontend/web/package.json` `dependencies` içinde `"maplibre-gl": "^5.6.0"` görünmeli.
`@types/*` GEREKMEZ (paket kendi tiplerini taşır). `@googlemaps/js-api-loader` KALIR.

- [ ] **Step 2: Başarısız testi yaz**

`frontend/web/src/components/organisms/MapView.test.tsx` tamamı (iki motorla parametrik;
jsdom'da WebGL yok → `maplibre-gl` tamamen taklit edilir):

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig, ParticipantDto, VenueDto } from "@bumpinto/shared";

class FakeMarker {
  static all: FakeMarker[] = [];
  element: HTMLElement;
  lngLat: [number, number] | null = null;
  removed = false;
  constructor(opts: { element: HTMLElement }) {
    this.element = opts.element;
    FakeMarker.all.push(this);
  }
  setLngLat(v: [number, number]) { this.lngLat = v; return this; }
  getLngLat() { return { lng: this.lngLat![0], lat: this.lngLat![1] }; }
  addTo() { return this; }
  remove() { this.removed = true; }
  on() { return this; }
}

class FakeMlMap {
  static all: FakeMlMap[] = [];
  handlers: Record<string, ((e?: unknown) => void)[]> = {};
  easeTo = vi.fn();
  jumpTo = vi.fn();
  remove = vi.fn();
  resize = vi.fn();
  addSource = vi.fn();
  addLayer = vi.fn();
  removeLayer = vi.fn();
  removeSource = vi.fn();
  getSource = vi.fn(() => undefined);
  getLayer = vi.fn(() => undefined);
  cameraForBounds = vi.fn(() => ({ center: { lat: 51.5, lng: 5.4 }, zoom: 12 }));
  constructor(public options: { style: string }) { FakeMlMap.all.push(this); }
  on(ev: string, cb: (e?: unknown) => void) { (this.handlers[ev] ??= []).push(cb); return this; }
  off() { return this; }
  fire(ev: string, e?: unknown) { this.handlers[ev]?.forEach((cb) => cb(e)); }
}

vi.mock("maplibre-gl", () => {
  const mod = { Map: FakeMlMap, Marker: FakeMarker, NavigationControl: class {} };
  return { default: mod, ...mod };
});

vi.mock("../../lib/maps", () => ({
  mapsConfigured: vi.fn(() => false),
  loadMaps: vi.fn(() => Promise.reject(new Error("no key"))),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));

import { trackMapInstance } from "../../lib/maps";
import { resetConfig, useConfigStore } from "../../store/configStore";
import MapView from "./MapView";

const config = (mapEngine: AppConfig["mapEngine"]): AppConfig => ({
  mapEngine,
  tiles: { styleUrl: "https://tiles.example.test/style" },
  sources: [],
});

const participants: ParticipantDto[] = [
  { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false,
    manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
];
const venues: VenueDto[] = [
  { id: "v1", name: "Café Berlage", lat: 51.44, lng: 5.47, rating: 8.7, ratingScale: 10, deckOrder: 0 },
  { id: "v2", name: "Bar Nul", lat: 51.46, lng: 5.5, deckOrder: 1 },
];

beforeEach(() => {
  FakeMlMap.all = [];
  FakeMarker.all = [];
});
afterEach(resetConfig);

describe("MapView — motor anahtarı", () => {
  it("config gelmeden yükleniyor notu basar, hiçbir motor kurulmaz", () => {
    render(<MapView participants={participants} venues={[]} midpoint={null} radiusKm={null} />);
    expect(screen.getByText("Harita yükleniyor…")).toBeInTheDocument();
    expect(FakeMlMap.all).toHaveLength(0);
  });

  it("caption ve ekran okuyucu özeti motordan BAĞIMSIZ görünür", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    render(
      <MapView participants={participants} venues={[]} midpoint={null} radiusKm={null}
        caption="Orta nokta" />,
    );
    expect(await screen.findByText("Orta nokta")).toBeInTheDocument();
    expect(screen.getByText(/Mehmet · Den Bosch/)).toBeInTheDocument();
  });
});

describe("MapView — google motoru", () => {
  it("anahtar yokken yapılandırma notu basar (bugünkü davranış)", async () => {
    useConfigStore.setState({ config: config("google") });
    render(<MapView participants={participants} venues={[]} midpoint={null} radiusKm={null} />);
    expect(await screen.findByText(/harita bu ortamda yapılandırılmadı/i)).toBeInTheDocument();
    expect(FakeMlMap.all).toHaveLength(0); // MapLibre paketi YÜKLENMEZ
  });
});

describe("MapView — maplibre motoru", () => {
  it("config'teki stille harita kurar, örnek sayacına DOKUNMAZ", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    render(<MapView participants={participants} venues={venues} midpoint={{ lat: 51.5, lng: 5.4 }} radiusKm={2} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    expect(FakeMlMap.all[0].options.style).toBe("https://tiles.example.test/style");
    expect(trackMapInstance).not.toHaveBeenCalled(); // yalnız Google faturalanır
  });

  it("her katılımcı ve mekan için işaretçi çizer, kamerayı easeTo ile oturtur", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    render(<MapView participants={participants} venues={venues} midpoint={{ lat: 51.5, lng: 5.4 }} radiusKm={2} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    const map = FakeMlMap.all[0];
    map.fire("load");
    await waitFor(() => expect(FakeMarker.all).toHaveLength(3)); // 1 katılımcı + 2 mekan
    expect(map.addSource).toHaveBeenCalled();                    // yarıçap çemberi
    expect(map.easeTo).toHaveBeenCalled();
  });

  it("mekan seçilince o mekana yakınlaşır", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    const { rerender } = render(
      <MapView participants={participants} venues={venues} midpoint={null} radiusKm={null} />,
    );
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    const map = FakeMlMap.all[0];
    map.fire("load");
    map.easeTo.mockClear();
    rerender(
      <MapView participants={participants} venues={venues} midpoint={null} radiusKm={null}
        selectedVenueId="v1" />,
    );
    await waitFor(() =>
      expect(map.easeTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [51.44 * 0 + 5.47, 51.44], zoom: 15 }),
      ),
    );
  });

  it("pine tıklayınca onSelectVenue çağrılır", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    const onSelectVenue = vi.fn();
    render(
      <MapView participants={[]} venues={venues} midpoint={null} radiusKm={null}
        onSelectVenue={onSelectVenue} />,
    );
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    FakeMlMap.all[0].fire("load");
    await waitFor(() => expect(FakeMarker.all).toHaveLength(2));
    FakeMarker.all[0].element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectVenue).toHaveBeenCalledWith("v1");
  });

  it("bileşen kalkınca harita YIKILIR (1024px geçişindeki ikinci örnek kusuru kapanır)", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    const { unmount } = render(
      <MapView participants={participants} venues={[]} midpoint={null} radiusKm={null} />,
    );
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    unmount();
    expect(FakeMlMap.all[0].remove).toHaveBeenCalled();
  });

  it("stil yüklenemezse motor uyarısı basar, çökmez", async () => {
    useConfigStore.setState({ config: config("maplibre") });
    render(<MapView participants={participants} venues={[]} midpoint={null} radiusKm={null} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    FakeMlMap.all[0].fire("error", { error: new Error("style 502") });
    expect(await screen.findByText("Harita şu an yüklenemedi.")).toBeInTheDocument();
  });
});
```

`easeTo` beklentisindeki `[51.44 * 0 + 5.47, 51.44]` yalnız "önce lng, sonra lat" sırasını göze
sokmak için böyle yazıldı — sadeleştirme yapma, MapLibre koordinatı `[lng, lat]` alır ve bu
sıranın ters yazılması en olası hatadır.

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/components/organisms/MapView.test.tsx` → yalnız ilk Google testi geçer
(bugünkü kod), gerisi kırmızı.

- [ ] **Step 4: `MapFrame.tsx` — ortak çerçeve**

`frontend/web/src/components/organisms/MapFrame.tsx` (yeni):

```tsx
import type { ReactNode } from "react";

/** Harita kutusu: kenarlık, köşe, yükseklik, 390 gizleme, sol-alt kapsül ve ekran okuyucu
    özeti. Üç yerden okunur (anahtar, google, maplibre) — sınıf dizesi tek yerde durmazsa
    motorlar arasında sessizce ayrışır. */
export default function MapFrame(props: {
  heightClass?: string;
  lgOnly?: boolean;
  caption?: string;
  summary?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="mapview"
      className={`relative overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7] ${props.heightClass ?? "h-[20rem]"} ${props.lgOnly ? "hidden lg:block" : ""}`}
    >
      {props.children}
      {props.caption && (
        <span className="absolute bottom-2.5 left-3.5 inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(255,255,255,0.92)] px-[0.6875rem] py-1.5 text-[0.75rem] font-bold text-ink">
          {props.caption}
        </span>
      )}
      {props.summary != null && <p className="sr-only">{props.summary}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Google uygulamasını taşı**

Kopyala (git komutu YOK):

```bash
cp frontend/web/src/components/organisms/MapView.tsx \
   frontend/web/src/components/organisms/MapView.google.tsx
```

`MapView.google.tsx`'te YALNIZ şunlar değişir — mantık, effect'ler, `animateCamera`,
`applyCamera`, `trackMapInstance` çağrısı, bilinen kusur yorumu dahil hiçbir şeye dokunma:

1. Üst import bloğuna ekle: `import MapFrame from "./MapFrame";`
2. `export type MapViewProps = { … };` bloğunu SİL, yerine:
   `import type { MapViewProps } from "./MapView";` (tip-only import, çalışma zamanında
   döngü YOK — anahtar dosya bunu lazy yükler).
3. Dosya başına tek satır yorum:
   `/* Google Maps uygulaması — motor anahtarı ../MapView.tsx'te (spec §7). Places ToS gereği
   Google sağlayıcısı açıksa motor da Google olmak zorunda. */`
4. `return (…)` bloğunu `MapFrame` ile sar:

```tsx
  return (
    <MapFrame heightClass={heightClass} lgOnly={lgOnly} caption={caption} summary={summary}>
      {configured && !failed && <div ref={box} className="h-full w-full" />}
      {(!configured || failed) && (
        <div className="flex h-full items-center justify-center p-6">
          <Note center>{t("map.notConfigured")}</Note>
        </div>
      )}
    </MapFrame>
  );
```

- [ ] **Step 6: `lib/maplibre.ts`**

`frontend/web/src/lib/maplibre.ts` (yeni):

```ts
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import { useConfigStore } from "../store/configStore";
import type { LatLng } from "./geo";

/** Config gelmeden çağrılırsa (savunma) OpenFreeMap positron. */
const FALLBACK_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function loadStyleUrl(): string {
  return useConfigStore.getState().config?.tiles.styleUrl || FALLBACK_STYLE;
}

/** Harita örneği. Atıf denetimi AÇIK (OpenFreeMap/OSM metni zorunlu), logo denetimi yok. */
export function createMap(container: HTMLElement, center: LatLng, zoom: number): MlMap {
  return new maplibregl.Map({
    container,
    style: loadStyleUrl(),
    center: [center.lng, center.lat],
    zoom,
    attributionControl: { compact: false },
  });
}

/** `mapPins.ts` HTML'ini MapLibre işaretçisine sarar. Pin kuyruğu noktayı gösterir → anchor
    "bottom". Koordinat MapLibre'de [lng, lat] sırasındadır. */
export function toMarker(el: HTMLElement, lngLat: LatLng, opts?: { draggable?: boolean }): Marker {
  return new maplibregl.Marker({
    element: el,
    anchor: "bottom",
    draggable: opts?.draggable ?? false,
  }).setLngLat([lngLat.lng, lngLat.lat]);
}

const EARTH_KM_PER_DEG = 111.32;

/** Yarıçap çemberi: MapLibre'de Circle nesnesi yok, GeoJSON çokgen çizilir. */
export function circleGeoJson(center: LatLng, radiusKm: number, steps = 64) {
  const dLat = radiusKm / EARTH_KM_PER_DEG;
  const cos = Math.max(Math.abs(Math.cos((center.lat * Math.PI) / 180)), 1e-6);
  const dLng = radiusKm / (EARTH_KM_PER_DEG * cos);
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)]);
  }
  return {
    type: "FeatureCollection" as const,
    features: [
      { type: "Feature" as const, properties: {},
        geometry: { type: "Polygon" as const, coordinates: [ring] } },
    ],
  };
}
```

- [ ] **Step 7: `MapView.maplibre.tsx`**

`frontend/web/src/components/organisms/MapView.maplibre.tsx` (yeni):

```tsx
/* MapLibre GL uygulaması (spec §7). Kamera kararı `mapCamera.ts`, pin HTML'i `mapPins.ts` —
   ikisi de motordan bağımsız, Google dalıyla ORTAK. Anahtar/örnek ücreti yok: `trackMapInstance`
   burada ÇAĞRILMAZ. */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Note } from "../atoms";
import type { LatLng } from "../../lib/geo";
import { MAX_FIT_ZOOM, type Camera, cameraFor, cameraSignature } from "../../lib/mapCamera";
import { circleGeoJson, createMap, toMarker } from "../../lib/maplibre";
import { useMediaQuery } from "../../lib/useMediaQuery";
import MapFrame from "./MapFrame";
import type { MapViewProps } from "./MapView";
import { participantPin, venuePin } from "./mapPins";

const VENUE_ZOOM = 15;
const CAMERA_MS = 500;
const CIRCLE = "bumpinto-radius";

type Cam = { center: LatLng; zoom: number };

/** Kutuyu kameraya çevirir; yakın iki pinde aşırı zoom `MAX_FIT_ZOOM` ile kırpılır (Google
    dalındaki kuralın aynısı). */
function camOf(map: MlMap, camera: Camera): Cam | null {
  if (camera.kind === "point") return { center: camera.center, zoom: camera.zoom };
  const fit = map.cameraForBounds(
    [
      [camera.sw.lng, camera.sw.lat],
      [camera.ne.lng, camera.ne.lat],
    ],
    { padding: { top: 88, right: 56, bottom: 56, left: 56 } },
  );
  if (!fit?.center) return null;
  const c = fit.center as { lat: number; lng: number };
  return { center: { lat: c.lat, lng: c.lng }, zoom: Math.min(fit.zoom ?? 0, MAX_FIT_ZOOM) };
}

function moveTo(map: MlMap, cam: Cam, instant: boolean) {
  const to = { center: [cam.center.lng, cam.center.lat] as [number, number], zoom: cam.zoom };
  if (instant) map.jumpTo(to);
  else map.easeTo({ ...to, duration: CAMERA_MS });
}

function drawCircle(map: MlMap, midpoint: LatLng | null, radiusKm: number | null) {
  const data =
    midpoint && radiusKm
      ? circleGeoJson(midpoint, radiusKm)
      : { type: "FeatureCollection" as const, features: [] };
  const src = map.getSource(CIRCLE) as { setData?: (d: unknown) => void } | undefined;
  if (src?.setData) {
    src.setData(data);
    return;
  }
  map.addSource(CIRCLE, { type: "geojson", data });
  map.addLayer({
    id: CIRCLE,
    type: "line",
    source: CIRCLE,
    paint: { "line-color": "#DE2456", "line-opacity": 0.35, "line-width": 2 },
  });
}

export default function MapViewMapLibre(props: MapViewProps) {
  const { participants, venues, midpoint, radiusKm, selectedVenueId, onSelectVenue, pinLabels,
    tint, venueLabel, caption, heightClass, lgOnly } = props;
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const fittedRef = useRef<string | null>(null);
  const homeRef = useRef<Cam | null>(null);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (!box.current) return;
    if (lgOnly && !desktop) return;
    const map = createMap(box.current, midpoint ?? { lat: 51.44, lng: 5.47 }, 10);
    mapRef.current = map;
    map.on("load", () => setReady(true));
    map.on("error", () => setFailed(true));
    return () => {
      // Google dalındaki BİLİNEN KUSUR burada kapanır: 1024px geçişinde effect yeniden koşar,
      // eski örnek artık yıkılıyor.
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      fittedRef.current = null;
      homeRef.current = null;
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
    // yalnız kap ve genişlik: içerik değişimi ayrı effect'te
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lgOnly, desktop]);

  const points: LatLng[] = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation?.lng != null)
    .map((p) => ({ lat: p.approxLocation!.lat!, lng: p.approxLocation!.lng! }))
    .concat(
      venues.filter((v) => v.lat != null && v.lng != null).map((v) => ({ lat: v.lat!, lng: v.lng! })),
    );
  const camera = cameraSignature(points, midpoint, radiusKm);

  const signature = JSON.stringify([
    participants.map((p) => [p.id, p.approxLocation?.lat, p.approxLocation?.lng, p.manual, p.displayName, pinLabels?.[p.id ?? ""]]),
    venues.map((v) => [v.id, v.lat, v.lng, v.rating, v.name]),
    midpoint,
    radiusKm,
    selectedVenueId,
    tint,
    venueLabel,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    participants.forEach((p, i) => {
      if (p.approxLocation?.lat == null || p.approxLocation?.lng == null) return;
      const el = participantPin(p, i, pinLabels?.[p.id ?? ""]);
      el.style.zIndex = "5"; // mekan pinlerinin üstünde
      markersRef.current.push(
        toMarker(el, { lat: p.approxLocation.lat, lng: p.approxLocation.lng }).addTo(map),
      );
    });
    // Orta nokta İĞNESİ çizilmez (UI review 2026-09-03) — alan yalnız yarıçap çemberiyle.
    drawCircle(map, midpoint, radiusKm);
    venues.forEach((v) => {
      if (v.lat == null || v.lng == null) return;
      const selected = v.id === selectedVenueId;
      const el = venuePin(v, tint ?? 0, selected, venueLabel === "name" ? v.name : undefined);
      el.style.zIndex = selected ? "3" : "2";
      el.addEventListener("click", () => onSelectVenue?.(v.id ?? null));
      markersRef.current.push(toMarker(el, { lat: v.lat, lng: v.lng }).addTo(map));
    });

    if (fittedRef.current !== camera) {
      fittedRef.current = camera;
      const target = cameraFor(points, midpoint, radiusKm);
      const cam = target && camOf(map, target);
      if (cam) {
        homeRef.current = cam;
        moveTo(map, cam, reduceMotion);
      }
    }
    // içerik imzası: polling her 3 sn yeni dizi üretir, pinler yalnız veri değişince çizilir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signature, camera, t]);

  // Kap boyutu değişince kamera yeniden sığdırılır (lg'de harita viewport yüksekliğine geçer).
  useEffect(() => {
    const el = box.current;
    if (!ready || !el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map || el.clientWidth === 0 || el.clientHeight === 0) return;
      map.resize();
      const target = cameraFor(points, midpoint, radiusKm);
      const cam = target && camOf(map, target);
      if (cam) {
        homeRef.current = cam;
        moveTo(map, cam, true); // boyut değişiminde animasyon yok
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, camera]);

  const selVenue = venues.find((v) => v.id === selectedVenueId);
  const selLat = selVenue?.lat ?? null;
  const selLng = selVenue?.lng ?? null;
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const home = homeRef.current;
    const target: Cam | null =
      selLat != null && selLng != null
        ? { center: { lat: selLat, lng: selLng }, zoom: Math.max(home?.zoom ?? 0, VENUE_ZOOM) }
        : home;
    if (target) moveTo(map, target, reduceMotion);
  }, [ready, selectedVenueId, selLat, selLng, reduceMotion]);

  const summary = participants
    .filter((p) => p.approxLocation?.lat != null && p.approxLocation.lng != null)
    .map((p) => `${p.displayName ?? ""} · ${p.locationLabel ?? ""}`.trim())
    .join(", ");

  return (
    <MapFrame heightClass={heightClass} lgOnly={lgOnly} caption={caption} summary={summary}>
      {!failed && <div ref={box} className="h-full w-full" />}
      {failed && (
        <div className="flex h-full items-center justify-center p-6">
          <Note center>{t("map.engineUnavailable")}</Note>
        </div>
      )}
    </MapFrame>
  );
}
```

- [ ] **Step 8: `MapView.tsx` — ince anahtar**

`frontend/web/src/components/organisms/MapView.tsx` tamamı:

```tsx
/* Harita motoru anahtarı (spec §7): motor SUNUCUDAN gelir, yalnız seçilenin paketi indirilir.
   Prop arayüzü DEĞİŞMEZ — çağıran sayfalar (Katıl, Yeni buluşma, Bekle, Lobi, Bireysel,
   Mekanlar) bu dosyayı lazy import etmeye devam eder. */
import { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { Note } from "../atoms";
import { useConfigStore } from "../../store/configStore";
import MapFrame from "./MapFrame";

export type MapViewProps = {
  participants: ParticipantDto[];
  venues: VenueDto[];
  midpoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  selectedVenueId?: string | null;
  onSelectVenue?: (venueId: string | null) => void;
  /** Katılımcı id → pin altı etiket ("sen" vb.). */
  pinLabels?: Record<string, string>;
  /** Fotoğrafsız tint (etkinlik grubu 0–3) — venuePin swatch'ı. */
  tint?: number;
  /** Mekan pini metni: varsayılan puan; "name" → mekan adı (Karar ekranı). */
  venueLabel?: "rating" | "name";
  /** Sol-alt kapsül (artboard .mcap). */
  caption?: string;
  heightClass?: string;
  /** 390 artboardlarında (Katıl/Bekle/Karar) harita gizli — yalnız lg+ görünür. */
  lgOnly?: boolean;
};

const GoogleEngine = lazy(() => import("./MapView.google"));
const MapLibreEngine = lazy(() => import("./MapView.maplibre"));

export default function MapView(props: MapViewProps) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  useEffect(() => {
    void load(); // açılıştaki çağrı kaçtıysa (doğrudan derin bağlantı) burada yakalanır
  }, [load]);

  const placeholder = (text: string) => (
    <MapFrame heightClass={props.heightClass} lgOnly={props.lgOnly} caption={props.caption}>
      <div className="flex h-full items-center justify-center p-6">
        <Note center>{text}</Note>
      </div>
    </MapFrame>
  );

  if (!config) return placeholder(t("map.loading"));
  const Engine = config.mapEngine === "google" ? GoogleEngine : MapLibreEngine;
  return <Suspense fallback={placeholder(t("map.loading"))}>{<Engine {...props} />}</Suspense>;
}
```

- [ ] **Step 9: Paket bölme**

`frontend/web/vite.config.ts` — `plugins` satırından sonra ekle:

```ts
  build: {
    rollupOptions: {
      // MapLibre ~800 kB: kendi paketinde dursun ki Google motorunda İNDİRİLMESİN
      // (lazy sınır zaten var, bu onu tek ve öngörülebilir bir chunk'a sabitler).
      output: { manualChunks: (id) => (id.includes("maplibre-gl") ? "maplibre" : undefined) },
    },
  },
```

- [ ] **Step 10: Çalıştır**

Run: `PNPM_TEST src/components/organisms/MapView.test.tsx` → 9 passed.
Run: `PNPM_TEST src/components/organisms src/pages` → yeşil. `VenueBrowser`/`JoinForm`
testleri `MapView`'ı lazy yüklüyor: config kurulmamış testlerde artık "Harita yükleniyor…"
görünür — beklentisi "Harita bu ortamda yapılandırılmadı." olan yerlerde ya
`useConfigStore.setState({ config: { mapEngine: "google", … } })` kurulur ya da beklenti
yükleniyor metnine çekilir (hangisi testin niyetiyse).
Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` → temiz.

- [ ] **Step 11: Değişen dosyalar**

`components/organisms/MapFrame.tsx`, `MapView.tsx`, `MapView.google.tsx`, `MapView.maplibre.tsx`,
`MapView.test.tsx`, `lib/maplibre.ts`, `vite.config.ts`, `frontend/web/package.json`,
`pnpm-lock.yaml`.
Önerilen mesaj: `feat(web): map engine switch with maplibre implementation`.

---

### Task 6: `MapPicker` motor anahtarı

**Files:**
- Create: `frontend/web/src/components/organisms/MapPicker.google.tsx`, `MapPicker.maplibre.tsx`
- Modify: `frontend/web/src/components/organisms/MapPicker.tsx`,
  `frontend/web/src/components/organisms/mapPins.ts`
- Test: `frontend/web/src/components/organisms/MapPicker.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

`frontend/web/src/components/organisms/MapPicker.test.tsx` tamamı:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeMarker {
  static all: FakeMarker[] = [];
  element: HTMLElement;
  lngLat: [number, number] | null = null;
  handlers: Record<string, (() => void)[]> = {};
  constructor(opts: { element: HTMLElement; draggable?: boolean }) {
    this.element = opts.element;
    FakeMarker.all.push(this);
  }
  setLngLat(v: [number, number]) { this.lngLat = v; return this; }
  getLngLat() { return { lng: this.lngLat![0], lat: this.lngLat![1] }; }
  addTo() { return this; }
  remove() {}
  on(ev: string, cb: () => void) { (this.handlers[ev] ??= []).push(cb); return this; }
  fire(ev: string) { this.handlers[ev]?.forEach((cb) => cb()); }
}

class FakeMlMap {
  static all: FakeMlMap[] = [];
  handlers: Record<string, ((e?: unknown) => void)[]> = {};
  remove = vi.fn();
  resize = vi.fn();
  jumpTo = vi.fn();
  easeTo = vi.fn();
  constructor(public options: { style: string }) { FakeMlMap.all.push(this); }
  on(ev: string, cb: (e?: unknown) => void) { (this.handlers[ev] ??= []).push(cb); return this; }
  fire(ev: string, e?: unknown) { this.handlers[ev]?.forEach((cb) => cb(e)); }
}

vi.mock("maplibre-gl", () => {
  const mod = { Map: FakeMlMap, Marker: FakeMarker, NavigationControl: class {} };
  return { default: mod, ...mod };
});

vi.mock("../../lib/maps", () => ({
  mapsConfigured: vi.fn(() => false),
  loadMaps: vi.fn(() => Promise.reject(new Error("no key"))),
  trackMapInstance: vi.fn(),
  MAP_ID: "test-map",
}));

vi.mock("../../lib/geocode", () => ({ reverseGeocode: vi.fn(() => Promise.resolve("Eindhoven")) }));

import { reverseGeocode } from "../../lib/geocode";
import { loadMaps, mapsConfigured } from "../../lib/maps";
import { resetConfig, useConfigStore } from "../../store/configStore";
import MapPicker from "./MapPicker";

const engine = (mapEngine: "maplibre" | "google") =>
  useConfigStore.setState({
    config: { mapEngine, tiles: { styleUrl: "https://tiles.example.test/style" }, sources: [] },
  });

beforeEach(() => {
  FakeMlMap.all = [];
  FakeMarker.all = [];
});
afterEach(() => {
  resetConfig();
  vi.mocked(mapsConfigured).mockReturnValue(false);
});

describe("MapPicker — google motoru", () => {
  it("Maps yapılandırılmamışsa harita yerine açıklama basar, çökmez", async () => {
    engine("google");
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    expect(await screen.findByText("Harita bu ortamda yapılandırılmadı.")).toBeInTheDocument();
  });

  it("harita yüklenemezse 'Burayı seç' kilitlenir", async () => {
    engine("google");
    vi.mocked(mapsConfigured).mockReturnValue(true);
    vi.mocked(loadMaps).mockRejectedValueOnce(new Error("no key"));
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Burayı seç" })).toBeDisabled());
  });
});

describe("MapPicker — maplibre motoru", () => {
  it("config stiliyle harita ve SÜRÜKLENEBİLİR pin kurar", async () => {
    engine("maplibre");
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    expect(FakeMlMap.all[0].options.style).toBe("https://tiles.example.test/style");
    expect(FakeMarker.all[0].lngLat).toEqual([4.9, 52.3]);
  });

  it("haritaya tıklayınca pin taşınır, onay ters geocode ile noktayı verir", async () => {
    engine("maplibre");
    const onPick = vi.fn();
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={onPick} onCancel={vi.fn()} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    FakeMlMap.all[0].fire("load");
    FakeMlMap.all[0].fire("click", { lngLat: { lng: 5.47, lat: 51.44 } });
    fireEvent.click(await screen.findByRole("button", { name: "Burayı seç" }));
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({ lat: 51.44, lng: 5.47, label: "Eindhoven" }));
    expect(reverseGeocode).toHaveBeenCalledWith(51.44, 5.47);
  });

  it("stil yüklenemezse onay KİLİTLENİR (görülmemiş koordinat onaylanmaz)", async () => {
    engine("maplibre");
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={vi.fn()} />);
    await waitFor(() => expect(FakeMlMap.all).toHaveLength(1));
    FakeMlMap.all[0].fire("error", { error: new Error("style 502") });
    await waitFor(() => expect(screen.getByRole("button", { name: "Burayı seç" })).toBeDisabled());
    expect(screen.getByText("Harita şu an yüklenemedi.")).toBeInTheDocument();
  });

  it("iptal düğmesi onCancel çağırır (motordan bağımsız)", async () => {
    engine("maplibre");
    const onCancel = vi.fn();
    render(<MapPicker center={{ lat: 52.3, lng: 4.9 }} onPick={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(await screen.findByRole("button", { name: "İptal" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/components/organisms/MapPicker.test.tsx` → maplibre bloğu kırmızı.

- [ ] **Step 3: Seçici pini**

`frontend/web/src/components/organisms/mapPins.ts` sonuna:

```ts
/** Nokta seçici pini (MapPicker) — katılımcı/mekan pinlerinden farklı: ad yok, tek damla.
    Google dalı `AdvancedMarkerElement`in varsayılan pinini kullanır; bu yalnız MapLibre için. */
export function pickPin() {
  const wrap = el("flex flex-col items-center");
  wrap.appendChild(
    el("h-[1.125rem] w-[1.125rem] rounded-full border-[3px] border-white bg-flame-deep shadow-[0_6px_18px_rgba(39,32,59,0.35)]"),
  );
  wrap.appendChild(el("h-2.5 w-[3px] rounded-sm bg-ink"));
  wrap.style.cursor = "grab";
  return wrap;
}
```

- [ ] **Step 4: Google uygulamasını taşı**

```bash
cp frontend/web/src/components/organisms/MapPicker.tsx \
   frontend/web/src/components/organisms/MapPicker.google.tsx
```

`MapPicker.google.tsx`'te değişenler:
1. `export default function MapPicker(props: { center… })` imzası
   `export default function MapPickerGoogle(props: MapPickerProps)` olur; prop tipi
   `import type { MapPickerProps } from "./MapPicker";` ile gelir (tip-only, döngü yok).
2. `props.center` kullanımları aynen kalır.
3. Dosya başına tek satır: `/* Google Maps nokta seçici — motor anahtarı ./MapPicker.tsx (spec §7). */`
4. Geri kalan (marker sürükleme, `toLatLng`, `confirm`, kilitli onay kuralı) DEĞİŞMEZ.

- [ ] **Step 5: `MapPicker.maplibre.tsx`**

```tsx
/* MapLibre nokta seçici (spec §7). Onay kuralı Google dalıyla AYNI: harita görünmüyorsa
   kullanıcı GÖRMEDİĞİ bir koordinatı onaylayamaz. */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LatLng } from "../../lib/geo";
import { reverseGeocode } from "../../lib/geocode";
import { createMap, toMarker } from "../../lib/maplibre";
import { Button, Note } from "../atoms";
import type { MapPickerProps } from "./MapPicker";
import { pickPin } from "./mapPins";

const PICK_ZOOM = 13;

export default function MapPickerMapLibre(props: MapPickerProps) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [point, setPoint] = useState<LatLng>(props.center);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const map = createMap(box.current, props.center, PICK_ZOOM);
    mapRef.current = map;
    const marker = toMarker(pickPin(), props.center, { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      setPoint({ lat: p.lat, lng: p.lng });
    });
    map.on("click", (e: { lngLat: { lat: number; lng: number } }) => {
      marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
      setPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    map.on("load", () => setReady(true));
    map.on("error", () => setFailed(true));
    return () => {
      marker.remove();
      mapRef.current = null;
      map.remove();
    };
    // yalnız ilk mount: merkez sonradan değişse kullanıcının seçimi ezilmemeli
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    setBusy(true);
    try {
      const label = await reverseGeocode(point.lat, point.lng);
      props.onPick({ ...point, label });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="h-[16rem] overflow-hidden rounded-[1.25rem] border border-line bg-[#f3efe7]">
        {!failed ? (
          <div ref={box} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Note center>{t("map.engineUnavailable")}</Note>
          </div>
        )}
      </div>
      <Note>{t("map.pickHint")}</Note>
      <div className="flex gap-2">
        <Button type="button" size="fit" onClick={() => void confirm()} disabled={busy || failed}>
          {t("map.pickConfirm")}
        </Button>
        <Button type="button" kind="white" size="fit" onClick={props.onCancel}>
          {t("map.pickCancel")}
        </Button>
      </div>
    </div>
  );
}
```

`ready` yalnız teşhis için tutulur (jsdom'da `load` gelmeyebilir); onay kilidi `failed`'a bağlı —
Google dalındaki kuralın aynısı: harita ÇİZİLEMİYORSA onay yok.

- [ ] **Step 6: `MapPicker.tsx` — ince anahtar**

```tsx
/* Nokta seçici motor anahtarı (spec §7). Prop arayüzü değişmez: JoinForm ve NewSessionPage
   bu dosyayı lazy import etmeye devam eder. */
import { Suspense, lazy, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { LatLng } from "../../lib/geo";
import { useConfigStore } from "../../store/configStore";
import { Note } from "../atoms";

export type MapPickerProps = {
  center: LatLng;
  onPick: (loc: { lat: number; lng: number; label: string | null }) => void;
  onCancel: () => void;
};

const GoogleEngine = lazy(() => import("./MapPicker.google"));
const MapLibreEngine = lazy(() => import("./MapPicker.maplibre"));

export default function MapPicker(props: MapPickerProps) {
  const { t } = useTranslation();
  const config = useConfigStore((s) => s.config);
  const load = useConfigStore((s) => s.load);
  useEffect(() => {
    void load();
  }, [load]);

  const placeholder = (
    <div className="flex h-[16rem] items-center justify-center rounded-[1.25rem] border border-line bg-[#f3efe7] p-6">
      <Note center>{t("map.loading")}</Note>
    </div>
  );

  if (!config) return placeholder;
  const Engine = config.mapEngine === "google" ? GoogleEngine : MapLibreEngine;
  return <Suspense fallback={placeholder}>{<Engine {...props} />}</Suspense>;
}
```

- [ ] **Step 7: Çalıştır**

Run: `PNPM_TEST src/components/organisms/MapPicker.test.tsx` → 6 passed.
Run: `PNPM_TEST src/pages/JoinForm.test.tsx src/pages/NewSessionPage.test.tsx` → yeşil
(seçiciyi açan testlerde `useConfigStore.setState({ config: … })` gerekebilir; MapView'daki
aynı düzeltme).
Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` → temiz.

- [ ] **Step 8: Değişen dosyalar**

`components/organisms/MapPicker.tsx`, `MapPicker.google.tsx`, `MapPicker.maplibre.tsx`,
`MapPicker.test.tsx`, `mapPins.ts`.
Önerilen mesaj: `feat(web): map picker engine switch`.

---

### Task 7: Link sözleşmesi, belge, doğrulama, kayıt

**Files:**
- Modify: `frontend/web/src/lib/venueLink.ts`, `frontend/web/src/lib/venueLink.test.ts`,
  `docs/CONFIGURATION.md`, `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: `venueLink` sözleşmesini güncelle ve `estimated` tipini kilitle**

`frontend/web/src/lib/venueLink.ts` — yalnız yorum bloğu değişir (zincir doğru):

```ts
/** Mekanın kanonik dış bağlantısı: önce kendi sayfası (yorum/fotoğraf — "detay" isteğinin
    karşılığı), sonra yol tarifi. Zincir TEK yerde: WinnerCard ve VenuePopCard aynı sıralamayı
    okur; iki yerde ayrı yazılsaydı sessizce ayrışırdı.

    Spec §10: `mapsUrl` artık HER mekanda dolu (koordinattan üretilen yol tarifi adresi,
    sağlayıcıdan bağımsız) — bu yüzden "bağlantı yok" hâli yalnız saklama kuralı satırı
    indirgediğinde (§11 `STRIP_*`) kalır; çağıranlardaki `href && …` koruması ONUN içindir,
    ölü `href="#"` için değil. */
```

`frontend/web/src/lib/venueLink.test.ts` sonuna iki test:

```ts
it("mapsUrl her mekanda dolu olduğu için placeLink yoksa yol tarifi döner (spec §10)", () => {
  expect(
    venueLink({ mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=51.44,5.47&travelmode=walking" }),
  ).toContain("travelmode=walking");
});

it("saklama kuralı satırı indirgediyse null (tek 'bağlantı yok' hâli)", () => {
  expect(venueLink({})).toBeNull();
});
```

Aynı dosyaya, `travel[].estimated`'ın DTO'da taşındığını derleme zamanında koruyan tek satır
(alan UI'da KULLANILMAZ — spec §9: yalnız teşhis/analitik):

```ts
// Sözleşme koruması: plan30 `travel[].estimated`'ı üretti. UI'da gösterilmez, ama tip
// kaybolursa (codegen bayatladıysa) derleme BURADA kırılır — sessiz veri kaybı olmaz.
type EstimatedFlag = NonNullable<NonNullable<VenueDto["travel"]>[number]["estimated"]>;
const _estimatedIsBoolean: EstimatedFlag = true;
void _estimatedIsBoolean;
```

`import type { VenueDto } from "@bumpinto/shared";` dosyada yoksa ekle. Bu satır derlenmiyorsa
plan30'un `travel[]` alanı henüz üretilmemiştir: `pnpm codegen` koş, hâlâ yoksa B-13'e geri dön.

- [ ] **Step 2: `docs/CONFIGURATION.md` — web bölümü**

`### Frontend hiçbir anahtar taşımaz` başlığı altındaki kod bloğunu ve devamını şununla değiştir:

```
VITE_API_URL / VITE_WS_URL              ← sadece bunlar, sır değil
VITE_GOOGLE_MAPS_KEY / _MAP_ID          ← YALNIZ Google motorunda kullanılır (aşağı bak)
```

Bloktan sonra, mevcut iki paragrafın arasına:

```markdown
**Harita motoru env'de DEĞİL, sunucuda.** Web açılışta `GET /api/config` çağırır ve
`mapEngine` (`maplibre` | `google`), `tiles.styleUrl`, `sources[]` bilgisini oradan alır
(spec §7). Motor `maplibre` iken hiçbir Google anahtarı okunmaz ve Maps JS indirilmez;
`google` iken bugünkü `VITE_GOOGLE_MAPS_KEY` + `VITE_GOOGLE_MAPS_MAP_ID` çifti gerekir.
Uç ulaşılamazsa istemci MapLibre + OpenFreeMap positron yedeğine düşer — harita yine çizilir,
yalnız sağlayıcı atfı satırları boş kalır.

Backend tarafı: `bumpinto.map.engine` (`MAP_ENGINE`) ve `bumpinto.map.tiles.style-url`.
Geocode artık istemciden değil sunucudan: `POST /api/geocode`, `POST /api/geocode/reverse`
(`bumpinto.geocode.base-url`). `.env.*` dosyalarını **kullanıcı** düzenler; ajanlar okumaz.
```

`## 7. Maliyet` bölümünde Google Maps kalemi varsa tek cümle ekle:
"Aşama 2'den (W-12) sonra harita motoru MapLibre + OpenFreeMap: Dynamic Maps örnek ücreti sıfır;
Maps JS anahtarları kapatılabilir (Sign-In client id kalır)."

`frontend/web/README*` dosyası YOK — bu maddede yapılacak bir şey yok, yeni README açma.

- [ ] **Step 3: Tam doğrulama** (repo kökünden)

```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/web exec tsc -b
rtk pnpm test:web
pnpm i18n:check
pnpm build:web
pnpm build:web:preprod
```

Expected: tsc temiz; testler önceki sayı + ~31 (configStore 4, format 5, fairness 3,
Attribution 6, geocode 6, MapView 9 − eski 1, MapPicker 6 − eski 3); i18n 0 fark;
iki build de yeşil ve çıktıda ayrı bir `maplibre-*.js` chunk'ı görünüyor.

Build "maplibre-gl.css bulunamadı" derse bağımlılık kurulmamıştır (T5 Step 1).

- [ ] **Step 4: INDEX.md kaydı**

`W` tablosuna, W-11 satırından sonra:

```markdown
| W-12 | **Açık hibrit web** — `configStore` (`GET /api/config`, yedekli), harita motoru anahtarı (`MapView`/`MapPicker` → `.google` + `.maplibre`, `lib/maplibre.ts`, `MapFrame`), veri-güdümlü `Attribution`, `formatRating(rating, scale)` + sağlayıcı işareti + `byRating` normalizasyonu, geocode backend'e taşındı | `2026-09-06-plan31-open-hybrid-web.md` | Plan 31 | ready | **B-13** (plan30: `/api/config`, `/api/geocode`, `VenueDto.ratingScale`) + `pnpm codegen` | — | Spec `2026-09-06-open-hybrid-venue-stack-design.md` §7/§8/§10/§11 · aşama 2. `popularity` UI'ı, tile self-host (PMTiles), stil renk uyarlaması ve mobil MapLibre KAPSAM DIŞI (plan32 / M-planları). K-B20, K-B22 bu izle kapanır; K-W4 (Google'da kalma kararı) geçersizleşir |
```

`K-M2` satırının notunu güncelle: "Web tarafı W-12 ile MapLibre'ye geçti; mobil karşılığı
`@maplibre/maplibre-react-native` ile M-3'te."

- [ ] **Step 5: Elle uçtan uca kontrol listesi** (kullanıcıya bırakılır — iki motor, gerçek ağ)

1. Backend `MAP_ENGINE=maplibre` ile ayakta; `curl -s localhost:8060/api/config | jq` →
   `mapEngine: "maplibre"`, `tiles.styleUrl` dolu, `sources[]` en az `foursquare` + `open`.
2. `pnpm dev:web`, 1280 genişlik: Lobi/Bekle/Mekanlar haritaları OpenFreeMap döşemesiyle
   çiziliyor; sağ altta OpenFreeMap/OSM atıf metni var; ağ sekmesinde `maps.googleapis.com`
   isteği YOK.
3. Pencereyi 1024px altına ve tekrar üstüne al: harita TEK örnek kalıyor (eski kusur), konsol
   temiz.
4. Mekan satırına hover → harita o mekana yumuşak yakınlaşıyor; hover bırakınca "ev" kadrajına
   dönüyor. `prefers-reduced-motion` açıkken sıçrayarak (animasyonsuz) gidiyor.
5. 390 genişlik: Katıl/Bekle/Karar'da harita yok; Mekanlar'da "Haritada gör" ghost'una basınca
   MapLibre chunk'ı O AN indiriliyor (ağ sekmesi).
6. Yeni buluşma → "Haritadan seç": pin sürükleniyor, haritaya tıklayınca taşınıyor, "Burayı seç"
   semt etiketini `POST /api/geocode/reverse` ile getiriyor.
7. Adres yazıp arama: `POST /api/geocode` çağrılıyor, `nominatim.openstreetmap.org`'a doğrudan
   istek YOK.
8. Kartlarda puan "8,7 / 10 · Foursquare" biçiminde; sıralamayı "Puan"a alınca 10'luk ve 5'lik
   kartlar birlikte doğru sıralanıyor.
9. Backend'i `MAP_ENGINE=google` ile yeniden başlat, sayfayı yenile: Google haritası geliyor,
   `maplibre` chunk'ı İNDİRİLMİYOR, atıfta "Google Maps" satırı var.
10. Backend'i durdur, sayfayı yenile: harita MapLibre yedeğiyle yine çiziliyor (atıf yalnız
    OpenFreeMap satırı), uygulama çökmüyor.

- [ ] **Step 6: Değişen dosyalar**

`frontend/web/src/lib/venueLink.ts`, `venueLink.test.ts`, `docs/CONFIGURATION.md`,
`docs/superpowers/plans/INDEX.md`.
Önerilen mesaj: `docs(web): register W-12 and document server-driven map config`.

---

## Plan öz-incelemesi

**Spec kapsamı.** §7 harita motoru: `/api/config` T1 · iki uygulama + lazy anahtar T5/T6 ·
MapLibre stil/pin/kamera/`MAX_FIT_ZOOM`/atıf denetimi T5 · `lgOnly` ve 390 davranışı korundu
T5 · "1024px'te ikinci örnek" kusuru `map.remove()` ile kapandı T5. §8 web: `lib/geocode.ts`
backend uçlarına, doğrudan Nominatim çağrıları silindi, imzalar korundu T4. §10 UI tarafı:
`mapsUrl` = yol tarifi, `venueLink` zinciri ve "bağlantı yok" hâlinin tek kaynağı T7. §11:
veri-güdümlü `Attribution` T3, `formatRating(rating, scale)` + sağlayıcı işareti + `byRating`
normalizasyonu T2. §12: `ratingScale` T2, `travel[].estimated` tip koruması T7, `popularity`
BİLEREK veri-only (Kapsam DIŞI'da yazılı). §14 "Web": `MapView` iki motorla parametrik T5,
config-güdümlü atıf satırları T3, iki ölçekli `formatRating` T2, config yüklenmeden harita
mount olmaz T5. §15 aşama 2 tamamı bu plandadır.

**Sapmalar (bilinçli).**
1. Google uygulaması "birebir taşındı" değil, **çerçevesi `MapFrame`'e çıkarılarak** taşındı:
   aynı sınıf dizesi üç dosyada yaşasaydı motorlar arası kayma kaçınılmazdı (AGENTS.md
   "Review Fix Rule" — kusur sınıfı). Mantık, effect'ler ve `trackMapInstance` çağrısı aynen.
2. `toMarker(el, lngLat, opts?)` sözleşmeye üçüncü, isteğe bağlı bir argüman ekler
   (`draggable`) — `MapPicker` sürüklenebilir pin ister ve ikinci bir fabrika yazmak
   ikinci kayıt noktası olurdu.
3. `unionProvider` kaldırıldı, yerine `providerIds`: veri-güdümlü atıf artık tahmin
   ("karışıksa ikisini bas") yapmıyor, kümenin tamamını basıyor.

**Yer tutucu taraması:** yok; her adımda gerçek TS/TSX/JSON/bash.

**Tip tutarlılığı:** `AppConfig`/`AppConfigSource`/`MapEngine` T1 shared = T1 store =
T3 test = T5 test · `MapViewProps` T5 anahtar = `.google` = `.maplibre` (tip-only import,
çalışma zamanı döngüsü yok) · `MapPickerProps` T6 aynı düzen · `Cam = {center: LatLng; zoom}`
T5 içinde tek · `Camera` (`point`|`bounds`) `mapCamera.ts`'ten değişmeden okunur ·
`formatRating(rating, scale?)` T2 = VenueMeta = VenueCard = LikedList ·
`providerIds(venues): string[]` T3 = `Attribution.providers` · `Coords` T4 imzası eski
tüketicilerle (`useOwnLocation`, `PointsEditor`, `NewSessionPage`) aynı.

**Bilinen sınırlar (kabul edilmiş).** OpenFreeMap'in SLA'sı yok: kesintide `map.engineUnavailable`
basılır, kalıcı çözüm PMTiles yedeği (plan32). Stil renkleri DS §10'a birebir uymuyor
(positron nötr gri); `paint` ezmeleri plan32'ye bırakıldı. jsdom'da WebGL olmadığı için
MapLibre testleri taklit üzerinden koşar — gerçek döşeme/kamera davranışı Step 5'teki elle
kontrol listesiyle doğrulanır (framework dikişi kuralı: burada gerçek istemci = tarayıcı).
</content>
</invoke>
