# Plan 16: Web — Adalet yüzeyi, haritasız değerlendirme ve uzlaşma hâlleri (W-6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Kimlik:** `W-6` (INDEX `Eski #` = **Plan 16**) · İz: Web · Durum INDEX'te tutulur (bu plan INDEX'i **düzenlemez**; durum güncellemesini yürüten ajan yapar).

**Goal:** Karar dokümanı `2026-09-03-map-free-group-decision-ux.md`'nin **web kapsamını** (§4 tüm kararlar + 5b, §5.B 0–9, §5.C tüm maddeler) uygulamak: her mekan yüzeyinde **tek** seyahat bileşeni + **tek** adalet rozeti, 390'da varsayılan harita yok (liste-önce), bekleme hâlleri uzlaşma durumunu gösterir, Runoff ve Karar "neden burası" sorusunu cevaplar, katılımcı **ulaşım türü** verir, ve üç analitik olayı ölçüm başlatır.

**Architecture:** Adalet tek saf modülde (`frontend/shared/src/fairness.ts`) — chips, rozet ve sıralama **aynı** nesneyi okur; sunucu alanı (`VenueDto.fairness`, B-7:T1) geldiğinde aynı modül onu tercih eder, istemci hesabı fallback olur. Seyahat sunumu tek molekülde (`molecules/TravelChips`), rozet tek molekülde (`molecules/FairnessBadge`); beş yüzey (deste kartı, liste satırı, pop kart, finalist, kazanan) bunları çağırır. Harita `React.lazy` arkasında ve yalnız istendiğinde mount edilir. Sayfalar kompozisyon-only; HTTP `sessionStore`/`deckStore`'da kalır.

**Tech Stack:** React 18 + react-router 7, zustand, Tailwind v4 (`@theme` token'ları `src/styles/app.css`), `@phosphor-icons/react`, react-i18next (tr/en/nl), vitest + RTL, `@googlemaps/js-api-loader` v2 (yalnız `MapView` içinde, tembel).

**Öncül:** `W-5 done` ✓, `W-4 done` ✓, `B-6 done` ✓. **B-7 (plan15) paralel yazılıyor** — aşağıdaki sözleşme tablosu bağlayıcıdır; görev başına `Bağımlılık: B-7:T<n>` ya da `B-7'den bağımsız` satırı vardır.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

`719fcd5f-…/Web Ekranlar v2.dc.html` — bloklar `data-screen-label`. **Bu planın artboard'ları
YÜKLENDİ**; aşağıdaki etiketler bağlayıcı kaynaktır ve ajan kendi tasarımını yapmaz (INDEX kural 7).

| Artboard (etiket) | Sayfa / bileşen | Görev |
|---|---|---|
| `Lobi 1280`, `Lobi 390` | `pages/LobbyPage.tsx` + `MidpointCard` / `ActivityStrip` / `SessionSteps` | T2, T6a |
| `Bekle 1280`, `Bekle 390 hata` | `pages/WaitingRoom.tsx`, `WaitingStatus` | T3, T6a |
| `Katıl 1280`, `Katıl 390 izin reddi`, `Katıl EN 1280`, `Katıl NL 1280` | `pages/JoinForm.tsx`, `JoinFormFields`, `TravelModeField` | T6b |
| `Yeni oturum 1280`, `Yeni oturum 390`, `Yeni oturum EN 390`, `Yeni oturum NL 390` | `pages/NewSessionPage.tsx`, `PointsEditor` | T6b |
| `Profil 1280`, `Profil 390` | `pages/ProfilePage.tsx`, `ProfilePrefs` | T6b |
| `Mekanlar grup 1280`, `Mekanlar grup 390 davetli`, **`Mekanlar grup 390 host`** (yeni) | `pages/VenuesPage.tsx`, `organisms/VenueBrowser` | T2, T7 |
| `Mekanlar bireysel 1280`, `Mekanlar bireysel 390` | SOLO akışı + **`.f-selcard`** satır-içi onay kartı | T2 |
| `Deste 1280`, `Deste 390`, `Liste modu 390` | `pages/DeckScreen.tsx`, `VenueCard`, `VenueCheckRow` | T1, T7 |
| `Deste bitti 1280`, **`Deste bitti 390`** (yeni), **`Gönderildi 1280`** (yeni), **`Gönderildi 390`** (yeni) | `FinishedCard` + `sent` dalı | T3 |
| `Runoff 1280`, `Runoff 390 kilitli`, **`Runoff 1280 kilitli`** (yeni) | `RunoffScreen`, `RunoffList`, `RunoffStatus`, `RunoffTrailer` | T4 |
| `Karar 1280`, `Karar 390 davetli`, **`Karar 1280 oylama`** (yeni) | `ResultScreen`, `WinnerCard`, `WhyHere`, `BackupPlan` | T5 |
| DS `b536b3aa-…/Design System v2.dc.html` **§11 · Adalet dili** (yeni) | aşağıdaki sözlük | T1–T7 |
| DS §06–§10 (mevcut) | Badge / Chip / Avatar / Buton / Harita dili | — |

**DS v2 §11 "Adalet dili" → bileşen eşlemesi** (her görev kendi satırını okur):

| DS sınıfı | Bileşen | Görev |
|---|---|---|
| TravelChips | `molecules/TravelChips.tsx` | T1 |
| FairnessBadge | `molecules/FairnessBadge.tsx` | T1 |
| `.f-fit` | `molecules/FitLine.tsx` (uyum satırı) | T7 |
| `.f-attr` | `molecules/Attribution.tsx` (sağlayıcı atfı) | T2, T7 |
| `.f-mid` | `molecules/MidpointCard.tsx` | T6a |
| `.f-steps` | `molecules/SessionSteps.tsx` (4 adım) | T6a |
| `.seg` | `molecules/Segmented.tsx` → `VenueSort`, `TravelModeField` | T2, T6b |
| `.f-trail` | `molecules/RunoffTrailer.tsx` | T4 |
| `.f-why` | `molecules/WhyHere.tsx` | T5 |
| `.f-selcard` | `molecules/SelectionCard.tsx` (SOLO satır-içi onay) | T2 |

Ölçü ve yerleşim **artboard'dan**; kural ve koşul **karar dokümanı §4/§5'ten**. Çelişkide karar
dokümanı kazanır.

---

## Bu plana özel kurallar

- **W-3/W-4 kuralları aynen geçerlidir** (INDEX §"Ajanlar için bağlayıcı kurallar", PATH, gate'ler).
- **Node 22 (nvm).** Her kabuk oturumunda önce: `source ~/.nvm/nvm.sh && nvm use 22`.
- Komutlar **repo kökünden** ve `rtk` ile:
  - `rtk pnpm test:web` — vitest tek tur (`--run`).
  - `rtk pnpm --filter @bumpinto/web exec tsc --noEmit` — tip kapısı.
  - `rtk pnpm build:web` · `rtk pnpm build:web:preprod` — prod/preprod derleme.
- **Tailwind v4 utility sınıfları YALNIZ `src/components/` altında.** `pages/`, `store/`, `lib/`
  dosyalarında `className=`/`style=` **yasak** — sayfalar yalnız bileşen kompozisyonu yapar.
  Kapanış kapısı: `rtk grep -rn "className=\|style=" frontend/web/src/pages` → boş.
- **`t()` zorunlu.** Kodda çıplak Türkçe/İngilizce metin yok. Her yeni anahtar **üç dilde**
  (`frontend/web/src/i18n/locales/tr.json`, `en.json`, `nl.json`) aynı anda eklenir.
  Locale dosyaları **yalnız** iki yoldan düzenlenir:
  1. hedefli ekleme (`Edit` ile tek blok), ya da
  2. `python3 -c "import json; d=json.load(open(p)); …; json.dump(d, open(p,'w'), ensure_ascii=False, indent=2)"`.
  `git checkout` / `git restore` / `git show … >` **kullanılmaz** (dosya ezilir, çeviri kaybolur).
- **Ajan commit atmaz.** Her görevin sonunda `**Commit önerisi:** <mesaj>` satırı bırakılır; commit'i
  kullanıcı atar (AGENTS.md).
- **Testler önce.** Her görev: (1) kırmızı test, (2) FAIL doğrula, (3) uygulama, (4) `Run`, (5) `Expected`.
- **Paket sınırı:** adalet metriği `frontend/shared`'da yaşar (M-3 aynı uygulamayı tüketecek).
  `frontend/shared` **web'e bağımlı olamaz** — React, i18n, `lib/serverFields.ts` import etmez;
  ihtiyacı olan şekilleri yapısal tür olarak kendi içinde bildirir. Shared testleri web'in vitest
  koşusuna `test.include` ile girer (`frontend/shared`'ın kendi vitest kurulumu yok).
- **Dil sözlüğü (§4.8):** "kazanan", "eşleşme", "match", "favorin" **hiçbir** ekranda geçmez;
  "Ortak nokta", "Herkes için", "Karar verildi" kullanılır. Geciken kişiye **tek**, **adlı**,
  **pozitif** not; sayaç/"geç" etiketi/suçluluk yok.
- **Türkçe ek yok.** Ada ek getiren metin yazılmaz (`{{ad}}'e`, `{{ad}}'in`): "için", "tarafında",
  "olmadan" gibi ek almayan yapılar kullanılır (tr/en/nl güvenli).
- **Renk yok:** TravelChips renksizdir (sand zemin, ink2 metin); tek renkli sinyal `FairnessBadge`
  (grass) ve amber-wash'tır.
- **Harita politikası (§4.7):** 390'da **hiçbir** ekranda varsayılan harita yüklenmez.
  `MapView` yalnız kullanıcı istediğinde mount edilir ve `React.lazy` ile ayrı chunk'tır.

---

## Backend sözleşmesi (B-7 = plan15, paralel yazılıyor)

Alan adları **birebir** bunlardır; kod bunlara göre yazılır.

| Alan | Tip | B-7 görevi |
|---|---|---|
| `ParticipantDto.travelMode` | `'WALK' \| 'BIKE' \| 'EBIKE' \| 'TRANSIT' \| 'CAR'` | B-7:T1 |
| `VenueDto.fairness` | `{ maxMinutes, spreadMinutes, longestParticipantId }?` | B-7:T1 |
| `VenueDto.provider`, `category?`, `address?`, `ratingCount?`, `hoursToday?`, `placeLink?` | string / number | B-7:T4 |
| `VenueDto.locality` | semt/kasaba kelimesi (tek sözcük) | B-7:T4 |
| `ParticipantDto.midpointMinutes` | ağırlıklı orta noktaya kişi başı dakika, 5 dk'ya yuvarlı, konumsuzda `null` | B-7:T1 |
| `SessionView.decisionKind` | `'UNANIMOUS' \| 'SINGLE_LIKE' \| 'RUNOFF' \| 'FORCED' \| 'PARTIAL'` (opsiyonel) | B-7:T2 |
| `SessionView.decidedAt`, `runoffReason: 'INTERSECTION' \| 'FALLBACK'` | string | B-7:T2 |
| `SessionView.likeCounts` | `Record<venueId, number>` — **yalnız DECIDED** | B-7:T2 |
| `SessionView.midpointLabel` | string | B-7:T3 |
| `travelMinutes` | herkes için **5 dk'ya yuvarlanmış** (viewer dahil) | B-7:T1 |
| `runoffVotes` | **KALDIRILDI** — RUNOFF'ta yalnız `runoffVotedParticipantIds` | B-7:T2 |
| `voteTally` | yalnız DECIDED **ya da** herkes oy verdiyse dolu | B-7:T2 |
| `JoinRequest.travelMode`, `PointRequest.travelMode`, `MeResponse/PUT /api/me → defaultTravelMode` | enum | B-7:T1 |

**Tip erişimi:** B-7 birleşene ve `rtk pnpm codegen` koşana kadar bu alanlar
`frontend/shared/src/api-types.ts`'te **yoktur**. Tek yerde yerel genişletme yapılır
(`lib/serverFields.ts`), her yerde `as any` **yasaktır**, ve codegen'den sonra bu dosya silinir
(Task 8 kapanış maddesi).

---

### Task 0: Ortak tip köprüsü — `lib/serverFields.ts`

**Files:**
- Create: `frontend/web/src/lib/serverFields.ts`

- [ ] **Step 1: Köprü** — B-7 alanlarının **tek** bildirim yeri. Her görev buradan okur.

```typescript
/* B-7 (plan15) alanları — `rtk pnpm codegen` koşana kadar OpenAPI türlerinde yoklar.
   Tek bildirim yeri burasıdır; `as any` hiçbir yerde kullanılmaz.
   B-7 birleşip codegen koştuktan sonra BU DOSYA SİLİNİR ve importlar @bumpinto/shared'a döner
   (Task 8, "Plan sonu doğrulaması"). */
import type { ParticipantDto, SessionView, VenueDto } from "@bumpinto/shared";

export type TravelMode = "WALK" | "BIKE" | "EBIKE" | "TRANSIT" | "CAR";
export type DecisionKind = "UNANIMOUS" | "SINGLE_LIKE" | "RUNOFF" | "FORCED" | "PARTIAL";
export type RunoffReason = "INTERSECTION" | "FALLBACK";

export type ServerFairness = {
  maxMinutes?: number;
  spreadMinutes?: number;
  longestParticipantId?: string;
};

export type Venue = VenueDto & {
  fairness?: ServerFairness;      // B-7:T1
  provider?: string;              // B-7:T4 ("GOOGLE" | "FOURSQUARE")
  category?: string;              // B-7:T4
  address?: string;               // B-7:T4
  ratingCount?: number;           // B-7:T4 (SAKLANIR, ekranda GÖSTERİLMEZ — artboard'da yok)
  locality?: string;              // B-7:T4 (semt/kasaba kelimesi)
  hoursToday?: string;            // B-7:T4
  placeLink?: string;             // B-7:T4
};

export type Participant = ParticipantDto & {
  travelMode?: TravelMode;        // B-7:T1
  midpointMinutes?: number | null; // B-7:T1 — orta noktaya dakika (konumsuzda null)
};

export type View = SessionView & {
  decisionKind?: DecisionKind;                    // B-7:T2
  decidedAt?: string;                             // B-7:T2
  runoffReason?: RunoffReason;                    // B-7:T2
  likeCounts?: Record<string, number>;            // B-7:T2 (yalnız DECIDED)
  midpointLabel?: string;                         // B-7:T3
  participants?: Participant[];
  venues?: Venue[];
};

/** Görünüm nesnesini genişletilmiş türe daraltır — çağrı yerinde tek satır, cast yok. */
export const asView = (v: SessionView): View => v;
export const asVenue = (v: VenueDto): Venue => v;
export const asParticipant = (p: ParticipantDto): Participant => p;
```

- [ ] **Step 2: Run** — `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`
- [ ] **Expected:** yeşil (dosya henüz kimse tarafından kullanılmıyor).

**Commit önerisi:** `chore(web): B-7 alan koprusu (serverFields)`

---

### Task 1: `TravelChips` + adalet rozeti — beş yüzeyde tek bileşen

**Bağımlılık: B-7'den bağımsız.** `venue.fairness` yokken `travelMinutes`'tan istemci hesabı
kullanılır (`frontend/shared/src/fairness.ts`). Alan gelince **hiçbir bileşen değişmez**; `fairnessOf()` içindeki
`server?.maxMinutes ?? …` dalları sunucu değerini tercih eder ve **istemci `roundTravel()` çağrısı
`fairnessOf` içinde kalır** (sunucu zaten yuvarlıyor, idempotent). Kaldırılacak tek şey Task 8'de
`serverFields.ts` köprüsüdür.

**Files:**
- Create: `frontend/shared/src/fairness.ts`, `frontend/shared/src/fairness.test.ts`
- Modify: `frontend/shared/src/index.ts` (dışa aktarım)
- Modify: `frontend/web/vite.config.ts` (`test.include` → shared testleri)
- Create: `frontend/web/src/components/molecules/TravelChips.tsx`, `TravelChips.test.tsx`
- Create: `frontend/web/src/components/molecules/FairnessBadge.tsx`, `FairnessBadge.test.tsx`
- Modify: `frontend/web/src/components/molecules/VenueCard.tsx`
- Modify: `frontend/web/src/components/molecules/VenueMeta.tsx`
- Modify: `frontend/web/src/components/molecules/LikedList.tsx`
- Modify: `frontend/web/src/lib/useTravelLabels.ts`
- Modify: `frontend/web/src/pages/DeckScreen.tsx`, `RunoffScreen.tsx`, `ResultScreen.tsx`, `VenuesPage.tsx` (yalnız `selfId` geçişi)
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `frontend/shared/src/fairness.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { byFairness, byRating, fairnessOf, roundTravel } from "./fairness";

const v = (id: string, tm: Record<string, number>, rating?: number, deckOrder = 0) =>
  ({ id, name: id, rating, deckOrder, travelMinutes: tm });

describe("fairness", () => {
  it("5 dk bandına yuvarlar, tabanı 5 dk'da tutar", () => {
    expect(roundTravel(28)).toBe(30);
    expect(roundTravel(32)).toBe(30);
    expect(roundTravel(1)).toBe(5);
  });

  it("en uzun önce sıralar; max/min/fark ve en uzun kişiyi verir", () => {
    const f = fairnessOf(v("a", { p1: 30, p2: 25, p3: 35 }))!;
    expect(f.entries.map((e) => e.id)).toEqual(["p3", "p1", "p2"]);
    expect(f.max).toBe(35);
    expect(f.min).toBe(25);
    expect(f.spread).toBe(10);
    expect(f.longestId).toBe("p3");
    expect(f.outlierId).toBeNull(); // 35 − medyan(30) = 5 < 10
  });

  it("medyanı ≥10 dk aşan kişiyi aykırı işaretler (karar dokümanı §4.2 B örneği)", () => {
    const f = fairnessOf(v("b", { p1: 10, p2: 15, p3: 50 }))!;
    expect(f.outlierId).toBe("p3");
    expect(f.spread).toBe(40);
  });

  it("sunucu alanı varsa istemci hesabını ezer (B-7:T1)", () => {
    const f = fairnessOf({
      ...v("c", { p1: 30, p2: 40 }),
      fairness: { maxMinutes: 45, spreadMinutes: 5, longestParticipantId: "p1" },
    })!;
    expect(f.max).toBe(45);
    expect(f.spread).toBe(5);
    expect(f.longestId).toBe("p1");
  });

  it("travelMinutes boşsa null", () => {
    expect(fairnessOf(v("d", {}))).toBeNull();
  });

  it("adil sıra: en uzun yol artan, sonra fark artan", () => {
    const a = v("a", { p1: 30, p2: 25, p3: 35 }); // max 35, fark 10
    const b = v("b", { p1: 10, p2: 15, p3: 50 }); // max 50
    const c = v("c", { p1: 40, p2: 40, p3: 40 }); // max 40, fark 0
    expect([b, c, a].sort(byFairness).map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("puan sırası: puan azalan, puansız sona", () => {
    const a = v("a", { p1: 10 }, 4.2);
    const b = v("b", { p1: 10 }, 4.6);
    const c = v("c", { p1: 10 });
    expect([a, c, b].sort(byRating).map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
});
```

`molecules/TravelChips.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TravelChips from "./TravelChips";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

describe("TravelChips", () => {
  it("herkesi gösterir, en uzun önce, sonda fark çipi", () => {
    render(
      <TravelChips
        venue={{ id: "v1", travelMinutes: { p1: 28, p2: 24, p3: 36 } }}
        labels={labels}
        selfId="p1"
      />,
    );
    const chips = screen.getAllByRole("listitem").map((n) => n.textContent);
    expect(chips[0]).toContain("Kerem");
    expect(chips[0]).toContain("~35 dk");
    expect(chips.at(-1)).toBe("fark 10 dk");
    // 3. katılımcı ASLA düşmez (karar dokümanı §4.3)
    expect(screen.getByText("Ayşe")).toBeInTheDocument();
  });

  it("viewer adı kalın, en uzunda ▲ ve ekran okuyucu karşılığı var", () => {
    render(
      <TravelChips
        venue={{ id: "v1", travelMinutes: { p1: 28, p3: 36 } }}
        labels={labels}
        selfId="p1"
      />,
    );
    expect(screen.getByText("Sen").className).toContain("font-extrabold");
    expect(screen.getByText("en uzun yol")).toBeInTheDocument();
  });

  it("travelMinutes yoksa hiç render etmez", () => {
    const { container } = render(<TravelChips venue={{ id: "v1" }} labels={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`molecules/FairnessBadge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FairnessBadge from "./FairnessBadge";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

describe("FairnessBadge", () => {
  it("fark ≤ 10 dk → 'Herkese ~aynı'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 30, p2: 25, p3: 35 } }} labels={labels} selfId="p1" />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("medyanı ≥10 aşan başkası → '{{ad}} için uzak' (ad ek almaz)", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 10, p2: 15, p3: 50 } }} labels={labels} selfId="p1" />);
    expect(screen.getByText("Kerem için uzak")).toBeInTheDocument();
  });

  it("aykırı viewer ise 'Senin için uzak'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 50, p2: 15, p3: 10 } }} labels={labels} selfId="p1" />);
    expect(screen.getByText("Senin için uzak")).toBeInTheDocument();
  });

  it("tek katılımcıda rozet yok", () => {
    const { container } = render(<FairnessBadge venue={{ travelMinutes: { p1: 30 } }} labels={labels} selfId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: FAIL doğrula** — `rtk pnpm test:web` → modüller yok.

- [ ] **Step 2b: Paket sınırı** — `fairness.ts` **`frontend/shared`'da** yaşar: M-3 (mobil) aynı
  uygulamayı tüketecek. Bu yüzden shared modülü `lib/serverFields.ts`'e **bağlanamaz**; ihtiyacı
  olan mekan şeklini kendi **yapısal** türü olarak bildirir (web'in `Venue`'sü onu karşılar).
  `frontend/shared/src/index.ts`'e eklenir:

```typescript
export {
  OUTLIER_GAP, SAME_FOR_ALL, TRAVEL_STEP,
  byFairness, byRating, fairestOf, fairnessOf, median, roundTravel,
  type Fairness, type FairnessVenue, type TravelEntry,
} from "./fairness";
```

  `frontend/web/vite.config.ts` `test` bloğu (shared testleri web koşusunda çalışsın —
  `frontend/shared`'ın kendi vitest kurulumu yok):

```typescript
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // Adalet modülü paylaşımlı pakette (M-3 aynı kodu tüketir); testi burada koşar.
    include: ["src/**/*.test.{ts,tsx}", "../shared/src/**/*.test.ts"],
  },
```

- [ ] **Step 3: `frontend/shared/src/fairness.ts`** (saf; React yok, `t()` yok, `@bumpinto/shared` dışına bağımlılık yok)

```typescript
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
  if (raw.length === 0) return null;
  const entries = raw
    .map(([id, minutes]) => ({ id, minutes: roundTravel(minutes) }))
    .sort((a, b) => b.minutes - a.minutes || a.id.localeCompare(b.id));
  // B-7:T1 alanı varsa sunucu kazanır — tek kod yolu, iki kaynak.
  const s = venue.fairness;
  const max = s?.maxMinutes ?? entries[0].minutes;
  const min = entries[entries.length - 1].minutes;
  const spread = s?.spreadMinutes ?? max - min;
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
      (a.id ?? "").localeCompare(b.id ?? "")
    );
  })[0];
}
```

- [ ] **Step 4: `molecules/TravelChips.tsx`**

```tsx
/* Kaynak: karar dokümanı §4.3 — beş yüzeyde (satır, deste kartı, Beğendiklerin, finalist,
   kazanan) TEK seyahat bileşeni. Herkes görünür, en uzun önce, "Sen" kalın, "~" öneki,
   sonda "fark N dk", en uzunda ▲, RENK YOK. */
import { useTranslation } from "react-i18next";
import type { Venue } from "../../lib/serverFields";
import { fairnessOf } from "@bumpinto/shared";

const CHIP =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-sand " +
  "px-[0.6875rem] py-[0.28125rem] font-bold text-ink2";
const SIZES = { md: "text-[0.75rem]", sm: "text-[0.6875rem]" };

export default function TravelChips(props: {
  venue: Venue;
  /** Katılımcı id → görünen ad; viewer için "Sen" (useTravelLabels). */
  labels: Record<string, string>;
  selfId?: string | null;
  size?: keyof typeof SIZES;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f) return null;
  const chip = `${CHIP} ${SIZES[props.size ?? "md"]}`;
  const many = f.entries.length > 1;

  return (
    <ul className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0 tabular-nums">
      {f.entries.map((e) => {
        const self = !!props.selfId && e.id === props.selfId;
        const longest = many && e.id === f.longestId;
        return (
          <li key={e.id} className={chip}>
            {longest && (
              <>
                <span aria-hidden className="text-ink3">
                  ▲
                </span>
                <span className="sr-only">{t("travel.longest")}</span>
              </>
            )}
            <span className={self ? "font-extrabold text-ink" : undefined}>
              {props.labels[e.id] ?? t("travel.friend")}
            </span>
            {t("travel.min", { min: e.minutes })}
          </li>
        );
      })}
      {many && <li className={chip}>{t("travel.gap", { min: f.spread })}</li>}
    </ul>
  );
}
```

- [ ] **Step 5: `molecules/FairnessBadge.tsx`**

```tsx
/* Kaynak: karar dokümanı §4.2 — TEK rozet, TEK kural. Meta satırında Badge olarak durur;
   fotoğrafın üstünde ASLA, Sticker ASLA. Ad ek almaz (tr/en/nl güvenli). */
import { useTranslation } from "react-i18next";
import type { Venue } from "../../lib/serverFields";
import { SAME_FOR_ALL, fairnessOf } from "@bumpinto/shared";
import { Badge } from "../atoms";

export default function FairnessBadge(props: {
  venue: Venue;
  labels: Record<string, string>;
  selfId?: string | null;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length < 2) return null;
  if (f.spread <= SAME_FOR_ALL) return <Badge tone="grass">{t("fairness.same")}</Badge>;
  if (!f.outlierId) return null;
  return (
    <Badge tone="neutral">
      {f.outlierId === props.selfId
        ? t("fairness.farSelf")
        : t("fairness.far", { name: props.labels[f.outlierId] ?? t("travel.friend") })}
    </Badge>
  );
}
```

- [ ] **Step 6: Beş yüzeyi tek bileşene bağla** (elle yazılmış beş çip satırı **silinir**)

1. **`VenueCard.tsx`** — `variant="row"` gövdesindeki `travel.map(… deck.travelShort …)` bloğu ve
   polaroid gövdesindeki `travel.map(… deck.travel …)` bloğu **tamamen** kaldırılır. Yerine:

```tsx
// props'a eklenir:
//   selfId?: string | null;
// ve `const travel = Object.entries(v.travelMinutes ?? {});` satırı SİLİNİR.

// variant="row" gövdesinde, meta satırının altına:
<TravelChips venue={v} labels={props.travelLabels ?? {}} selfId={props.selfId} size="sm" />

// polaroid gövdesinde, meta satırının ALTINA (foto üstüne DEĞİL):
<div className="flex flex-wrap items-center gap-2">
  <FairnessBadge venue={v} labels={props.travelLabels ?? {}} selfId={props.selfId} />
</div>
<TravelChips venue={v} labels={props.travelLabels ?? {}} selfId={props.selfId} />
```

2. **`VenueMeta.tsx`** — `travel.map(…)` bloğu kaldırılır; `selfId` prop'u eklenir; meta satırının
   altına `<FairnessBadge …/>` + `<TravelChips … size="sm" />`. `Badge` importu düşerse silinir.

3. **`LikedList.tsx`** — satırın `★ … · Sana N dk` metni ikiye ayrılır: `★ {{rating}}` kalır,
   dakika kısmı kalkar; altına `<FairnessBadge/>` + `<TravelChips size="sm"/>`. Bileşen
   `labels`/`selfId` prop'u alır (`DeckScreen` geçer).

4. **`RunoffList` / `VenueCard`** — ayrı iş yok: `RunoffList` zaten `VenueCard`'a `travelLabels`
   geçiyor; `selfId` de geçirilir.

5. **`TravelList.tsx`** — liste kalır (kazanan ekranı satır listesi), **çip'e çevrilmez**;
   Task 5'te `~dk` birimine geçer.

- [ ] **Step 7: `useTravelLabels` sadeleşir** — viewer etiketi artık tek: `travel.self`.

```typescript
export function useTravelLabels(view: SessionView | null): Record<string, string> {
  const { t } = useTranslation();
  return useMemo(() => {
    const labels: Record<string, string> = {};
    for (const p of view?.participants ?? []) {
      if (p.id)
        labels[p.id] =
          p.id === view?.viewer?.participantId ? t("travel.self") : (p.displayName ?? t("travel.friend"));
    }
    return labels;
  }, [view, t]);
}
```

`selfLabelKey` parametresi **kaldırılır**. `DeckScreen`'deki `listTravelLabels` satırı silinir
(liste modu artık aynı çipleri kullanır).

- [ ] **Step 8: i18n** — `tr.json`'a yeni **kök blok** `travel` + `fairness`:

```json
  "travel": {
    "min": "~{{min}} dk",
    "gap": "fark {{min}} dk",
    "self": "Sen",
    "friend": "Arkadaşın",
    "longest": "en uzun yol"
  },
  "fairness": {
    "same": "Herkese ~aynı",
    "far": "{{name}} için uzak",
    "farSelf": "Senin için uzak"
  }
```

`en.json`: `"min": "~{{min}} min"`, `"gap": "{{min}} min apart"`, `"self": "You"`,
`"friend": "Friend"`, `"longest": "longest trip"`; `"same": "About equal for all"`,
`"far": "Far for {{name}}"`, `"farSelf": "Far for you"`.
`nl.json`: `"min": "~{{min}} min"`, `"gap": "{{min}} min verschil"`, `"self": "Jij"`,
`"friend": "Vriend"`, `"longest": "langste rit"`; `"same": "Voor iedereen ~gelijk"`,
`"far": "Ver voor {{name}}"`, `"farSelf": "Ver voor jou"`.

**Silinen anahtarlar (üç dilde):** `deck.travel`, `deck.travelShort`, `deck.travelSelfTo`.
`deck.travelSelf` ve `deck.travelFriend` **kalır** (PointsEditor/TravelList/RunoffStatus kullanıyor);
`deck.travelFallback` kullanılmıyorsa silinir — önce `rtk grep -rn "travelFallback" frontend/web/src`.

- [ ] **Step 9: Run**
  - `rtk pnpm test:web`
  - `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`
  - `rtk grep -rn "deck.travelShort\|deck.travelSelfTo\|deck\.travel\"" frontend/web/src` → boş
- [ ] **Expected:** tüm testler yeşil; hiçbir ekranda elle yazılmış seyahat rozeti kalmadı;
  `VenueCard` fotoğrafının üzerinde rozet yok.

**Commit önerisi:** `feat(web): TravelChips + adalet rozeti — bes yuzeyde tek bilesen`

---

### Task 2: Mekanlar liste-önce + Lobi haritası ghost arkasında

**Bağımlılık: B-7'den bağımsız.** Sağlayıcı atfı (`venue.provider`, B-7:T4) gelene kadar **iki
metin de alt alta** gösterilir ("Google Maps" ve "Powered by Foursquare"); alan gelince
`Attribution` yalnız o sağlayıcının satırını basar (Task 7 Step 6).

**Files:**
- Modify: `frontend/web/src/components/organisms/VenueBrowser.tsx`, `VenueBrowser.test.tsx`
- Create: `frontend/web/src/components/molecules/Attribution.tsx`
- Create: `frontend/web/src/components/molecules/VenueSort.tsx`
- Create: `frontend/web/src/components/molecules/SelectionCard.tsx`, `SelectionCard.test.tsx`
- Modify: `frontend/web/src/pages/VenuesPage.tsx`
- Modify: `frontend/web/src/pages/LobbyPage.tsx`
- Modify: `frontend/web/src/components/organisms/AppShell.tsx` (footer atfı)
- Modify: `frontend/web/src/components/molecules/VenueRow.tsx`, `VenuePopCard.tsx` (grup "Bunu seç" kalkar)
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `VenueBrowser.test.tsx`'e eklenir

```tsx
it("390: harita SEKME AÇILANA KADAR mount edilmez; ghost 'Haritada gör' açar", async () => {
  render(<VenueBrowser {...base} mode="host" />);
  expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Haritada gör" }));
  expect(await screen.findByTestId("mapview")).toBeInTheDocument();
});

it("grup modunda seçim aksiyonu yok; SOLO'da seçili satırın altında onay kartı var", () => {
  const { rerender } = render(<VenueBrowser {...base} mode="host" />);
  expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
  rerender(<VenueBrowser {...base} mode="solo" />);
  fireEvent.click(screen.getByText("Adil Kahve"));
  expect(screen.getByText("Seçimin")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Kilitle" }));
  expect(base.onPick).toHaveBeenCalledWith("v1");
});

it("onay kartı 'Vazgeç' ile kapanır", () => {
  render(<VenueBrowser {...base} mode="solo" />);
  fireEvent.click(screen.getByText("Adil Kahve"));
  fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
  expect(screen.queryByText("Seçimin")).not.toBeInTheDocument();
});

it("varsayılan sıra 'Herkese adil' (en uzun yol artan); Puan'a geçince puan azalan", () => {
  render(<VenueBrowser {...base} mode="host" />);
  const first = () => screen.getAllByRole("heading", { level: 3 })[0].textContent;
  expect(first()).toBe("Adil Kahve");          // max 30
  fireEvent.click(screen.getByRole("radio", { name: "Puan" }));
  expect(first()).toBe("Puanlı Kahve");        // 4.8
});

it("tek HandNote: 'önce herkese en adil olanlar'", () => {
  render(<VenueBrowser {...base} mode="host" />);
  expect(screen.getAllByText(/önce herkese en adil olanlar/)).toHaveLength(1);
});

it("sağlayıcı atfı listede görünür (provider gelene kadar iki metin)", () => {
  render(<VenueBrowser {...base} mode="host" />);
  expect(screen.getByText("Google Maps")).toBeInTheDocument();
  expect(screen.getByText("Powered by Foursquare")).toBeInTheDocument();
});
```

`MapView` testte `data-testid="mapview"` ile bulunur → `MapView.tsx` kök `div`'ine
`data-testid="mapview"` eklenir (tek satır, üretimde zararsız).

- [ ] **Step 2: FAIL doğrula** — `rtk pnpm test:web`

- [ ] **Step 3: `molecules/VenueSort.tsx`** (Segmented sarmalayıcı; sıralama saf fonksiyondan gelir)

```tsx
/* Karar dokümanı §4.5 / §5.B.1 — liste sırası: "Herkese adil" (varsayılan) · "Puan". */
import { useTranslation } from "react-i18next";
import Segmented from "./Segmented";

export type SortKey = "fair" | "rating";

export default function VenueSort(props: { value: SortKey; onChange: (v: SortKey) => void }) {
  const { t } = useTranslation();
  return (
    <Segmented
      value={props.value}
      onChange={props.onChange}
      ariaLabel={t("venues.sort")}
      options={[
        { value: "fair" as const, label: t("venues.sortFair") },
        { value: "rating" as const, label: t("venues.sortRating") },
      ]}
    />
  );
}
```

- [ ] **Step 4: `molecules/Attribution.tsx`**

```tsx
/* Karar dokümanı §2 (politika) + §5.B.9 — sağlayıcı atfı. Google içeriğinin yanında
   "Google Maps" metni, FSQ verisi olan ekranda "Powered by Foursquare" zorunlu.
   `provider` (B-7:T4) gelene kadar HER İKİ metin alt alta basılır; alan gelince tek satır. */
import { useTranslation } from "react-i18next";

export default function Attribution(props: { provider?: string; center?: boolean }) {
  const { t } = useTranslation();
  const cls = `flex flex-col gap-0.5 text-[0.6875rem] text-ink3 ${props.center ? "text-center" : ""}`;
  if (props.provider === "GOOGLE") return <p className={cls}>{t("attribution.google")}</p>;
  if (props.provider === "FOURSQUARE") return <p className={cls}>{t("attribution.foursquare")}</p>;
  // B-7:T4 öncesi: hangi sağlayıcı olduğunu bilmiyoruz, ikisini de yazmak politikaya uygundur.
  return (
    <p className={cls}>
      <span>{t("attribution.google")}</span>
      <span>{t("attribution.foursquare")}</span>
    </p>
  );
}
```

- [ ] **Step 5: `VenueBrowser.tsx`** — tembel harita, liste-önce, adil sıra, "Bunu seç" yalnız SOLO

```tsx
import { Fragment, Suspense, lazy, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import type { Venue } from "../../lib/serverFields";
import { byFairness, byRating } from "@bumpinto/shared";
import { Button, HandNote, Note } from "../atoms";
import Attribution from "../molecules/Attribution";
import SelectionCard from "../molecules/SelectionCard";
import VenuePopCard from "../molecules/VenuePopCard";
import VenueRow from "../molecules/VenueRow";
import VenueSort, { type SortKey } from "../molecules/VenueSort";

/* Harita ayrı chunk: 390'da liste sekmesindeyken Maps JS ne indirilir ne yüklenir
   (karar dokümanı §1 bulgusu — her 390 görüntülemesi = 1 Dynamic Maps yüklemesi). */
const MapView = lazy(() => import("./MapView"));

export type BrowserMode = "host" | "guest" | "solo";

export default function VenueBrowser(props: {
  venues: Venue[];
  participants: ParticipantDto[];
  midpoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  mode: BrowserMode;
  travelLabels: Record<string, string>;
  selfId?: string | null;
  onPick: (venueId: string) => void;
  tint?: number;
  pinLabels?: Record<string, string>;
  /** Analitik: "Haritada gör" dokunuşu (Task 8). */
  onMapOpen?: () => void;
}) {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("fair");
  /** 390'da harita YALNIZ bu bayrakla mount edilir; lg'de sağ kolon zaten görünür. */
  const [mapOpen, setMapOpen] = useState(false);
  const tint = props.tint ?? 0;

  const venues = useMemo(
    () => [...props.venues].sort(sort === "fair" ? byFairness : byRating),
    [props.venues, sort],
  );
  const selected = sel ?? venues[0]?.id ?? null;
  const selectedVenue = venues.find((v) => v.id === selected);

  // Grup modunda seçim aksiyonu YOK (karar dokümanı §5.B.1): karar deste + runoff'tan çıkar.
  // SOLO'da da satırda buton yok — artboard `Mekanlar bireysel 390/1280` seçili satırın ALTINA
  // `.f-selcard` onay kartını koyuyor (satır tıklanınca seçilir, kart kilitler).
  const solo = props.mode === "solo";

  function openMap() {
    setMapOpen(true);
    props.onMapOpen?.();
  }

  const map = (
    <Suspense fallback={<Note center>{t("venues.mapLoading")}</Note>}>
      <MapView
        participants={props.participants}
        venues={venues}
        midpoint={props.midpoint}
        radiusKm={props.radiusKm}
        selectedVenueId={selected}
        onSelectVenue={setSel}
        pinLabels={props.pinLabels}
        tint={tint}
        heightClass="h-[35rem]"
      />
      {selectedVenue && (
        <VenuePopCard
          venue={selectedVenue}
          tint={tint}
          travelLabels={props.travelLabels}
          selfId={props.selfId}
          action={
            solo && selectedVenue.id ? (
              <SelectionCard
                venue={selectedVenue}
                labels={props.travelLabels}
                selfId={props.selfId}
                compact
                onConfirm={() => props.onPick(selectedVenue.id!)}
                onCancel={() => setSel(null)}
              />
            ) : undefined
          }
        />
      )}
    </Suspense>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <VenueSort value={sort} onChange={setSort} />
        {/* 390: sekme anahtarı yerine tek ghost — harita ancak basılınca yüklenir. */}
        {!mapOpen && (
          <div className="lg:hidden">
            <Button type="button" kind="white" size="sm" onClick={openMap}>
              {t("venues.showOnMap")}
            </Button>
          </div>
        )}
      </div>
      <div className="lg:grid lg:grid-cols-[42fr_58fr] lg:gap-10 lg:items-start">
        <div className={`${mapOpen ? "hidden lg:flex" : "flex"} flex-col gap-1.5`}>
          {venues.map((v) => (
            <Fragment key={v.id}>
            <VenueRow
              key={v.id}
              venue={v}
              selected={v.id === selected}
              tint={tint}
              travelLabels={props.travelLabels}
              selfId={props.selfId}
              onHover={() => setSel(v.id ?? null)}
              onSelect={() => setSel(v.id ?? null)}
            />
            {/* Artboard `.f-selcard` — SOLO'da seçili satırın ALTINDA satır-içi onay. */}
            {solo && v.id === selected && v.id && (
              <SelectionCard
                venue={v}
                labels={props.travelLabels}
                selfId={props.selfId}
                onConfirm={() => props.onPick(v.id!)}
                onCancel={() => setSel(null)}
              />
            )}
            </Fragment>
          ))}
          {/* TEK el yazısı not — "önce herkese en adil olanlar →" (§4.5). */}
          <HandNote>{t("venues.fairHand")}</HandNote>
          {props.mode !== "solo" && <Note>{t("venues.everyoneSees")}</Note>}
          <Attribution />
        </div>
        <div className={`relative ${mapOpen ? "" : "hidden"} lg:block`}>
          {/* lg'de sağ kolon her zaman görünür ama Maps JS yine tembel chunk'tan gelir. */}
          {(mapOpen || typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches) && map}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5b: `molecules/SelectionCard.tsx`** (artboard `.f-selcard`)

```tsx
/* Artboard `Mekanlar bireysel 390` / `1280` — seçili satırın altındaki onay kartı.
   1280'de de AYNI kart kullanılır: satırdaki "Bunu seç" butonunun yerini alır. */
import { useTranslation } from "react-i18next";
import type { Venue } from "../../lib/serverFields";
import { Button, Overline } from "../atoms";
import TravelChips from "./TravelChips";

export default function SelectionCard(props: {
  venue: Venue;
  labels: Record<string, string>;
  selfId?: string | null;
  compact?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col gap-2.5 rounded-[1.125rem] border-[1.5px] border-flame-deep bg-flame-wash ${
      props.compact ? "p-3" : "mt-1.5 p-[0.875rem_1rem]"
    }`}>
      <Overline tone="flame">{t("venues.selectionTitle")}</Overline>
      <span className="text-[0.9375rem] font-bold">{props.venue.name}</span>
      <TravelChips venue={props.venue} labels={props.labels} selfId={props.selfId} size="sm" />
      <div className="flex items-center gap-2">
        <Button type="button" size="fit" onClick={props.onConfirm}>
          {t("venues.lockIn")}
        </Button>
        <Button type="button" kind="white" size="fit" onClick={props.onCancel}>
          {t("venues.cancel")}
        </Button>
      </div>
    </div>
  );
}
```

> `initialTab` prop'u **kaldırılır**; davetli de artık liste görür (`§5.B.1`). `Segmented`
> görünüm anahtarı ve `venues.list`/`venues.map`/`venues.view` anahtarları silinir.

- [ ] **Step 6: `VenuesPage.tsx`** — `initialTab` geçişi silinir, `selfId` eklenir:

```tsx
<VenueBrowser
  venues={venues}
  participants={mp.participants}
  midpoint={mp.midpoint}
  radiusKm={mp.radiusKm}
  mode={mode}
  travelLabels={travelLabels}
  selfId={view.viewer?.participantId}
  onPick={(id) => void run(() => pick(id), "venues.errPick")}
  tint={tint}
  pinLabels={mp.pinLabels}
/>
```

`venues` sıralaması sayfada **yapılmaz** (`deckOrder` sort satırı silinir) — sıra artık
`VenueBrowser`'ın saf fonksiyonlarının işi.

- [ ] **Step 7: `LobbyPage.tsx`** — harita ghost arkasında

```tsx
// MapView doğrudan render EDİLMEZ; lg'de bile önce ghost durur (karar dokümanı §4.7).
const [mapOpen, setMapOpen] = useState(false);
// …
right={
  <>
    <MidpointCard view={view} />            {/* Task 6a — bu görevde yer tutucu: mevcut caption */}
    {mapOpen ? (
      <MapView participants={mapParticipants} venues={[]} midpoint={midpoint}
        radiusKm={radiusKm} pinLabels={pinLabels} caption={caption} lgOnly />
    ) : (
      <div className="hidden lg:block">
        <Button type="button" kind="white" size="fit" onClick={() => setMapOpen(true)}>
          {t("lobby.openMap")}
        </Button>
      </div>
    )}
    <Button onClick={() => void run(findVenues, "lobby.errFind")} disabled={located < 2 || busy}>
      {t("newSession.findVenues")}
    </Button>
    {error && <ErrorText>{error}</ErrorText>}
    {waiting && <Note center>{t("lobby.late", { name: waiting.displayName })}</Note>}
  </>
}
```

> `LobbyPage` bir sayfadır → utility sınıfı yasağı. `hidden lg:block` sarmalayıcısı
> `molecules/LgOnly.tsx` adında iki satırlık bir moleküle taşınır:
> `export default function LgOnly({ children }: { children: ReactNode }) { return <div className="hidden lg:block">{children}</div>; }`

- [ ] **Step 8: Footer atfı** — `organisms/AppShell.tsx` alt bloğuna:

```tsx
<p className="px-5 pb-4 text-center text-[0.6875rem] text-ink3">{t("attribution.osm")}</p>
```

- [ ] **Step 9: i18n**

```json
  "venues": {
    "sort": "Sıralama",
    "sortFair": "Herkese adil",
    "sortRating": "Puan",
    "showOnMap": "Haritada gör",
    "selectionTitle": "Seçimin",
    "lockIn": "Kilitle",
    "cancel": "Vazgeç",
    "mapLoading": "Harita yükleniyor…",
    "fairHand": "önce herkese en adil olanlar →"
  },
  "lobby": { "openMap": "Haritayı aç" },
  "attribution": {
    "google": "Google Maps",
    "foursquare": "Powered by Foursquare",
    "osm": "© OpenStreetMap contributors"
  }
```

EN: `"Sort" / "Fair for all" / "Rating" / "Show on map" / "Loading map…" / "fairest for everyone first →"`,
`"Open map"`. NL: `"Sortering" / "Eerlijk voor iedereen" / "Beoordeling" / "Op de kaart" /
"Kaart laden…" / "eerst het eerlijkst voor iedereen →"`, `"Kaart openen"`.
`attribution.*` üç dilde **aynı** (marka metinleri çevrilmez).
**Silinen:** `venues.list`, `venues.map`, `venues.view`.

- [ ] **Step 10: Run**
  - `rtk pnpm test:web` · `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`
  - `rtk grep -rn "initialTab" frontend/web/src` → boş
- [ ] **Expected:** 390'da liste açılır ve `MapView` DOM'da yok; ghost'a basınca gelir; grup
  satırlarında "Bunu seç" yok; varsayılan sıra adil.

**Commit önerisi:** `feat(web): Mekanlar liste-once, adil sira, tembel harita, saglayici atfi`

---

### Task 3: Deste bitti = bekleme lobisi + rev-2 kopyası

**Bağımlılık: B-7'den bağımsız.** (K-W3 bu görevde kapanır.)

**Files:**
- Modify: `frontend/web/src/store/deckStore.ts`
- Modify: `frontend/web/src/store/sessionStore.ts` (host "olmadan devam et")
- Modify: `frontend/web/src/components/molecules/FinishedCard.tsx` (+ `FinishedCard.test.tsx` yeni)
- Modify: `frontend/web/src/components/molecules/DeckProgressNote.tsx`
- Modify: `frontend/web/src/components/molecules/DeckHeader.tsx`
- Modify: `frontend/web/src/components/molecules/ShareButton.tsx`
- Modify: `frontend/web/src/components/molecules/WaitingStatus.tsx` (kopya)
- Modify: `frontend/web/src/pages/DeckScreen.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `FinishedCard.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FinishedCard from "./FinishedCard";

const people = [
  { id: "me", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true, manual: false },
  { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true, manual: false },
  { id: "k", displayName: "Kerem", host: false, hasLocation: true, deckDone: false, manual: false },
];

const base = {
  likedCount: 4, sending: false, sent: false, host: true, selfId: "me",
  participants: people, shareUrl: "https://x/j/a", shareText: "gel",
  onSend: vi.fn(), onList: vi.fn(), onForce: vi.fn(),
};

describe("FinishedCard", () => {
  it("gönderilmeden önce başlık beğeni sayısını söyler, gönder butonu var", () => {
    render(<FinishedCard {...base} />);
    expect(screen.getByText("4 mekan beğendin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beğenilerimi gönder" })).toBeInTheDocument();
  });

  it("gönderdikten sonra gönder butonu KAYBOLUR, 'Listeye dön, düzelt' kalır", () => {
    render(<FinishedCard {...base} sent />);
    expect(screen.queryByRole("button", { name: "Beğenilerimi gönder" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listeye dön, düzelt" })).toBeInTheDocument();
  });

  it("gönderdikten sonra kişi satırları: bitiren story-ring, kaydıran rozetli", () => {
    render(<FinishedCard {...base} sent />);
    expect(screen.getByText("Kerem")).toBeInTheDocument();
    expect(screen.getByText("Kaydırıyor")).toBeInTheDocument();
  });

  it("host + ≥1 bitiren + ≥1 bitirmeyen → 'olmadan devam et'; sayaç yok", () => {
    render(<FinishedCard {...base} sent />);
    fireEvent.click(screen.getByRole("button", { name: "Kerem olmadan devam et" }));
    expect(base.onForce).toHaveBeenCalled();
  });

  it("host değilse 'olmadan devam et' yok", () => {
    render(<FinishedCard {...base} sent host={false} />);
    expect(screen.queryByRole("button", { name: /olmadan devam et/ })).not.toBeInTheDocument();
  });

  it("0 beğeniyle uyarı ve birincil buton 'Listeye dön'", () => {
    render(<FinishedCard {...base} likedCount={0} />);
    expect(screen.getByText(/kimse ortak beğenmezse sonuç boş kalır/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listeye dön, düzelt" })).toBeInTheDocument();
  });
});
```

`DeckScreen` için `pages/DeckScreen.test.tsx` (yeni) — geciken not:

```tsx
it("aktif destede geciken kişiye tek, adlı, pozitif not gösterir", () => {
  // diğerleri bitirdi, viewer 12 karttan 9'unda
  useDeckStore.setState({ slug: "x", index: 9, liked: {}, listMode: false, sending: false, sent: false });
  render(<DeckScreen slug="x" view={viewWithOthersDone} />);
  expect(screen.getByText("Mehmet, herkes seni bekliyor — 3 kart kaldı")).toBeInTheDocument();
});
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `deckStore` — `sent` bayrağı**

```typescript
// DeckState'e:
  sent: boolean;

// start(): `sent: false` da sıfırlanır
  start: (slug, venueCount) => {
    if (get().slug === slug) return;
    set({ slug, index: 0, liked: {}, listMode: venueCount < 6, sending: false, sent: false });
  },

// finish(): başarıda sent=true — buton bir daha basılamaz (karar dokümanı §1 bulgusu)
  finish: async () => {
    set({ sending: true });
    try {
      await api.deckDone(get().slug);
      set({ sent: true });
    } finally {
      set({ sending: false });
    }
  },
```

- [ ] **Step 4: `sessionStore` — host "olmadan devam et"**

```typescript
// SessionState'e:
  decideWithout: () => Promise<void>;

// implementasyon — mekân seçmeden karar: sunucu kalanları dışarıda bırakıp motoru koşturur.
// `pick(venueId)` ile AYNI uç, gövde boş: ForceDecisionRequest.venueId opsiyoneldir.
  decideWithout: async () => {
    await mutate(async () => {
      set({ view: await api.forceDecision(get().slug, {}) });
    });
  },
```

- [ ] **Step 5: `ShareButton` genelleşir** — hazır metinli "dürtme" için etiket + görünüm prop'u

```tsx
export default function ShareButton(props: {
  text: string;
  url: string;
  /** Varsayılan "Gruba paylaş"; dürtme/hatırlatma için ayrı etiket. */
  label?: string;
  copiedLabel?: string;
  kind?: "white" | "flame";
  size?: "md" | "sm" | "fit";
}) { /* … mevcut gövde; etiketler props'tan, yoksa result.share/result.copied … */ }
```

- [ ] **Step 6: `FinishedCard` — gönderilmiş hâli bekleme lobisi**

```tsx
/* Kaynak: karar dokümanı §5.B.5 + §5.C "Deste bitti" — artboard `Deste bitti 390` /
   `Gönderildi 1280` / `Gönderildi 390` (çizilmedi; DS token'larıyla kuruldu).
   TEK sticker; "Deste bitti" BİREYSEL an — kutlama yok (§4.8), konfeti kaldırıldı. */
import { useTranslation } from "react-i18next";
import type { ParticipantDto } from "@bumpinto/shared";
import { Avatar, Badge, Button, HandNote, Note, Sticker } from "../atoms";
import ShareButton from "./ShareButton";

export default function FinishedCard(props: {
  likedCount: number;
  sending: boolean;
  sent: boolean;
  host: boolean;
  selfId?: string;
  participants: ParticipantDto[];
  shareText: string;
  shareUrl: string;
  onSend: () => void;
  onList: () => void;
  onForce: () => void;
}) {
  const { t, i18n } = useTranslation();
  const present = props.participants.filter((p) => p.hasLocation && !p.manual);
  const others = present.filter((p) => p.id !== props.selfId);
  const waiting = others.filter((p) => !p.deckDone);
  const anyDone = present.some((p) => p.deckDone);
  const names = new Intl.ListFormat(i18n.resolvedLanguage ?? i18n.language, { type: "conjunction" })
    .format(waiting.map((p) => p.displayName ?? "?"));
  const empty = props.likedCount === 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-line bg-card px-8 pt-11 pb-9 text-center shadow-sh1">
      <Sticker>{props.sent ? t("deck.sentSticker") : t("deck.finishedSticker")}</Sticker>
      <h1 className="mt-1.5 text-[2rem]">{t("deck.likedTitle", { count: props.likedCount })}</h1>
      <p className="max-w-[34ch] text-ink2">
        {props.sent ? t("deck.sentCopy") : t("deck.finishedCopy", { count: props.likedCount })}
      </p>
      {empty && !props.sent && <Note center>{t("deck.emptyWarn")}</Note>}

      <div className="mt-2 flex w-full max-w-[21.25rem] flex-col gap-2.5">
        {/* Gönderdikten sonra buton KAYBOLUR — tekrar basılamaz (karar dokümanı §1). */}
        {!props.sent && !empty && (
          <Button type="button" onClick={props.onSend} disabled={props.sending}>
            {t("deck.send")}
          </Button>
        )}
        <Button
          type="button"
          kind={empty && !props.sent ? "flame" : "white"}
          onClick={props.onList}
        >
          {t("deck.backToList")}
        </Button>
        {empty && !props.sent && (
          <Button type="button" kind="white" onClick={props.onSend} disabled={props.sending}>
            {t("deck.sendAnyway")}
          </Button>
        )}
      </div>

      {props.sent && others.length > 0 && (
        <div className="mt-2 flex w-full flex-col gap-0.5 rounded-card border border-line bg-paper py-1">
          {present.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar name={p.displayName ?? "?"} index={i} ring={p.deckDone} waiting={!p.deckDone} />
              <span className="flex-1 text-left text-[0.875rem] font-semibold">
                {p.id === props.selfId ? t("travel.self") : p.displayName}
              </span>
              {p.deckDone ? (
                <Badge tone="grass">{t("deck.rowDone")}</Badge>
              ) : (
                <Badge tone="amber">{t("deck.rowSwiping")}</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {props.sent && waiting.length > 0 && (
        <div className="flex w-full max-w-[21.25rem] flex-col gap-2.5">
          <ShareButton
            text={props.shareText}
            url={props.shareUrl}
            label={t("deck.nudge")}
            copiedLabel={t("result.copied")}
            kind="white"
          />
          {/* Host + ≥1 bitiren + ≥1 bitirmeyen. Sayaç YOK, "geç" etiketi YOK (§4.8). */}
          {props.host && anyDone && (
            <Button type="button" kind="white" onClick={props.onForce}>
              {t("deck.continueWithout", { names })}
            </Button>
          )}
        </div>
      )}

      {props.sent && waiting.length === 0 && <HandNote center>{t("deck.allDoneHand")}</HandNote>}
    </div>
  );
}
```

`Confetti` importu ve kullanımı **silinir** (§4.8 — "Deste bitti" bireysel an, kutlama yok).

- [ ] **Step 7: `DeckProgressNote` yalnız aktif destede kalır, geciken notu ekler**

`DeckScreen` aktif destede: diğerlerinin `deckDone`'u **hepsi** true ve viewer bitirmediyse tek
HandNote basılır. Bileşen değil, mevcut `DeckProgressNote` içine ek dal:

```tsx
// DeckProgressNote props'una: remaining?: number; selfName?: string
const laggard = others.length > 0 && others.every((p) => p.deckDone) && (props.remaining ?? 0) > 0;
if (laggard)
  return <HandNote>{t("deck.laggardHand", { name: props.selfName ?? "", n: props.remaining })}</HandNote>;
```

- [ ] **Step 8: `DeckHeader` 390 beğeni sayacı** — `meta`'ya `· {{count}} beğeni` eklenir:
  `DeckScreen` aktif destede `meta={`${t("deck.cardsOf", {…})} · ${t("deck.likesN", { count: likedCount })}`}`.

- [ ] **Step 9: `DeckScreen` bağlantıları**

```tsx
const sent = useDeckStore((s) => s.sent);
const decideWithout = useSessionStore((s) => s.decideWithout);
const shareUrl = `${location.origin}/j/${props.view.slug ?? ""}`;
const shareText = t("deck.nudgeText", {
  activity: t(`activity.${props.view.activityType}`),
  count: venues.length,
});

// finished && !listMode dalı:
<FinishedCard
  likedCount={likedCount}
  sending={sending}
  sent={sent}
  host={isHost(props.view)}
  selfId={selfId}
  participants={props.view.participants ?? []}
  shareText={shareText}
  shareUrl={shareUrl}
  onSend={() => void finish()}
  onList={() => setListMode(true)}
  onForce={() => void decideWithout()}
/>
```

`right` bölgesinde `DeckProgressNote` **kalkar** (kişi satırları artık `FinishedCard`'ta);
`LikedList` kalır ve `labels`/`selfId` alır.

- [ ] **Step 10: Bekle kopyası (K-W3)** — `waiting` bloğu:

```json
  "waiting": {
    "preparing": "Mekanlar geliyor",
    "copy": "Önce liste, sonra oylama. Sayfayı kapatma yeter."
  }
```

EN: `"Venues are on the way"` / `"First the list, then the vote. Just keep this page open."`
NL: `"De plekken komen eraan"` / `"Eerst de lijst, dan stemmen. Laat deze pagina gewoon open."`

- [ ] **Step 11: yeni `deck` anahtarları**

```json
    "likedTitle": "{{count}} mekan beğendin",
    "sentSticker": "Gönderildi",
    "sentCopy": "Beğenilerin kaydedildi. Herkes bitirince sonuç açıklanır.",
    "rowDone": "Bitirdi",
    "rowSwiping": "Kaydırıyor",
    "nudge": "Bekleyenleri dürt",
    "nudgeText": "{{activity}} için {{count}} mekan hazır, seni bekliyoruz:",
    "continueWithout": "{{names}} olmadan devam et",
    "allDoneHand": "herkes bitirdi — sonuç birazdan →",
    "laggardHand": "{{name}}, herkes seni bekliyor — {{n}} kart kaldı",
    "emptyWarn": "Hiç beğeni seçmedin. Kimse ortak beğenmezse sonuç boş kalır.",
    "sendAnyway": "Yine de gönder"
```

(+ en/nl karşılıkları; `continueWithout` EN `"Continue without {{names}}"`, NL
`"Doorgaan zonder {{names}}"` — hiçbirinde ada ek yok.)
**Silinen:** `deck.finishedTitle` (`Trans` + `Highlight` kullanımı düşer), `deck.progressDone`,
`deck.progressWaiting` (satırlar rozetle anlatılıyor).

- [ ] **Step 12: Run**
  - `rtk pnpm test:web` · `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`
- [ ] **Expected:** gönderdikten sonra buton yok, kişi satırları ve dürtme var; 0 beğenide birincil
  buton "Listeye dön, düzelt"; geciken notu yalnız **bir kez** ve adla çıkıyor; Bekle metni rev-2.

**Commit önerisi:** `feat(web): Deste bitti bekleme lobisi, gonderildi hali, rev-2 Bekle kopyasi`

---

### Task 4: Runoff v2 — treyler, karar veren hücre, sayım, "Adil olana bırak"

**Bağımlılık:** treyler + amber-wash + başlık dalı + 390 çelişkisi + overline **B-7'den bağımsız**.
`runoffReason` kopyası ve `voteTally` sayımı **B-7:T2**'ye bağlıdır: alan yoksa FALLBACK kopyası
gösterilmez (varsayılan INTERSECTION metni) ve sayım hiç render edilmez.

**Files:**
- Create: `frontend/web/src/components/molecules/RunoffTrailer.tsx`
- Create: `frontend/web/src/components/molecules/VoteTally.tsx`
- Create: `frontend/web/src/lib/useCountUp.ts`, `frontend/web/src/lib/useCountUp.test.ts`
- Modify: `frontend/web/src/components/organisms/RunoffList.tsx`
- Modify: `frontend/web/src/components/molecules/RunoffIntro.tsx`
- Modify: `frontend/web/src/components/molecules/RunoffStatus.tsx`, `RunoffStatus.test.tsx`
- Modify: `frontend/web/src/components/molecules/RunoffTie.tsx`
- Modify: `frontend/web/src/pages/RunoffScreen.tsx`, `RunoffScreen.test.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `RunoffScreen.test.tsx`'e eklenir

```tsx
it("her finalistin altında toplam ve fark treyleri var", () => {
  renderRunoff(twoFinalists);
  expect(screen.getByText("toplam ~85 dk · fark ~15 dk")).toBeInTheDocument();
});

it("karar verici hücre amber-wash: ≥5 dk fark ya da ≥0.3★", () => {
  renderRunoff(twoFinalists);
  expect(screen.getByTestId("trailer-v1").className).toContain("bg-amber-wash");
  expect(screen.getByTestId("trailer-v2").className).not.toContain("bg-amber-wash");
});

it("başlık 2 finalistte ikili, ≥3 finalistte çoklu dal kullanır; 'Son düzlük' çıkartması yok", () => {
  renderRunoff(twoFinalists);
  expect(screen.getByText("İkisi de güzel, biri seçilecek")).toBeInTheDocument();
  expect(screen.queryByText("Son düzlük")).not.toBeInTheDocument();
  renderRunoff(threeFinalists);
  expect(screen.getByText("Hepsi güzel, biri seçilecek")).toBeInTheDocument();
});

it("FALLBACK runoff'ta kopya nedene göre değişir (B-7:T2)", () => {
  renderRunoff(twoFinalists, { runoffReason: "FALLBACK" });
  expect(screen.getByText(/Henüz ortak nokta yok/)).toBeInTheDocument();
});

it("herkes kilitleyince sayım gelir; kilitli kart 'bekliyoruz' DEMEZ", () => {
  renderRunoff(twoFinalists, { runoffVotedParticipantIds: ["p1", "p2"], voteTally: { v1: 2, v2: 0 } });
  expect(screen.queryByText(/diğerlerini bekliyoruz/)).not.toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
});

it("beraberlikte host'a ikinci buton: 'Adil olana bırak' en adil finalisti seçer", () => {
  const pick = vi.fn();
  renderTie(twoFinalists, pick);
  fireEvent.click(screen.getByRole("button", { name: "Adil olana bırak" }));
  expect(pick).toHaveBeenCalledWith("v2"); // min fark
});
```

`lib/useCountUp.test.ts`: reduced-motion `true` iken hedef değer **anında** döner.

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `lib/useCountUp.ts`**

```typescript
import { useEffect, useState } from "react";

/** Karar dokümanı §5.C: sayım 320 ms, reduced-motion'da YOK.
    `enabled` false iken hiç animasyon başlamaz (sunucu-kapılı: voteTally gelmeden çalışmaz). */
export function useCountUp(target: number, enabled: boolean, duration = 320): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setValue(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, duration]);
  return value;
}
```

- [ ] **Step 4: `molecules/RunoffTrailer.tsx`**

```tsx
/* Karar dokümanı §5.B.7 — finalist kartının ALTINDA tek satır: toplam ~N dk · fark ~N dk.
   Karar verici hücre amber-wash: iki finalist arasında ≥5 dk fark ya da ≥0.3★ varsa. */
import { useTranslation } from "react-i18next";
import type { Venue } from "../../lib/serverFields";
import { fairnessOf } from "@bumpinto/shared";

export const DECIDING_MINUTES = 5;
export const DECIDING_RATING = 0.3;

/** Bu finalist, diğerlerine göre "kararı veren" mi? (toplam yol ya da puan üstünlüğü) */
export function isDeciding(venue: Venue, all: Venue[]): boolean {
  const me = fairnessOf(venue);
  const others = all.filter((v) => v.id !== venue.id);
  if (others.length === 0) return false;
  const bestOtherTotal = Math.min(...others.map((v) => fairnessOf(v)?.total ?? Infinity));
  const bestOtherRating = Math.max(...others.map((v) => v.rating ?? -1));
  const minutesWin = me != null && bestOtherTotal - me.total >= DECIDING_MINUTES;
  const ratingWin = (venue.rating ?? -1) - bestOtherRating >= DECIDING_RATING;
  return minutesWin || ratingWin;
}

export default function RunoffTrailer(props: { venue: Venue; all: Venue[] }) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f) return null;
  const deciding = isDeciding(props.venue, props.all);
  return (
    <p
      data-testid={`trailer-${props.venue.id}`}
      className={`mt-1.5 rounded-full px-3 py-1 text-center text-[0.75rem] font-bold tabular-nums ${
        deciding ? "bg-amber-wash text-amber" : "text-ink2"
      }`}
    >
      {t("runoff.trailer", { total: f.total, gap: f.spread })}
    </p>
  );
}
```

- [ ] **Step 5: `RunoffList` treyleri basar** — her `<button>` altına `<RunoffTrailer venue={v} all={props.finalists} />`.

- [ ] **Step 6: `RunoffIntro` — overline + başlık dalı + neden**

```tsx
export default function RunoffIntro(props: {
  activity: string;
  people: number;
  finalists: number;
  reason?: "INTERSECTION" | "FALLBACK";
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-1">
      <Overline>
        {t("runoff.overline", {
          activity: t(`activity.${props.activity}`).toLocaleUpperCase("tr"),
          people: props.people,
        })}
      </Overline>
      {/* Artboard'lardan "Son düzlük" çıkartması KALDIRILDI — overline + başlık yeterli. */}
      <h1 className="mt-1.5 text-[1.8125rem]">
        {props.finalists <= 2 ? t("runoff.titleTwo") : t("runoff.titleMany", { count: props.finalists })}
      </h1>
      <Note>{props.reason === "FALLBACK" ? t("runoff.copyFallback") : t("runoff.copy")}</Note>
    </div>
  );
}
```

> `runoff.overline` = `"{{activity}} · {{people}} KİŞİ · ORTA NOKTA ÇEVRESİ"`. `Overline` atomu
> zaten `uppercase` uyguluyor; aktivite adı için `toLocaleUpperCase("tr")` ile "i→İ" korunur.

- [ ] **Step 7: `RunoffStatus` — 390 kilitli çelişkisi + sayım**

```tsx
// props'a: total/done zaten hesaplanıyor; ek olarak
//   tally?: Record<string, number>;  finalists?: Venue[];
const everyone = total > 0 && done === total;

if (props.sent) {
  return (
    <>
      <div className="…sayaç satırı…">{t("runoff.votedCount", { done, total })}</div>
      <div className="…grass kart…">
        <span className="c-check" aria-hidden><i /></span>
        <div className="flex flex-col gap-0.5">
          <span className="…">{t("runoff.lockedTitle")}</span>
          {/* Çelişki düzeltmesi: "3/3 seçti" iken "bekliyoruz" YAZILMAZ. */}
          <span className="…">{everyone ? t("runoff.lockedAllCopy") : t("runoff.lockedCopy")}</span>
        </div>
      </div>
      {/* Sunucu-kapılı sayım: voteTally yalnız herkes oy verince gelir (B-7:T2). */}
      {props.tally && props.finalists && <VoteTally tally={props.tally} finalists={props.finalists} />}
      {/* Kilit sonrası hatırlatma — Web Share, hazır metin. */}
      <ShareButton text={props.shareText} url={props.shareUrl} label={t("runoff.remind")} kind="white" />
    </>
  );
}
```

`molecules/VoteTally.tsx` — finalist adı + `useCountUp(count, true)` sayı; `role="list"`.

- [ ] **Step 8: `RunoffTie` — ikinci buton**

```tsx
{props.host && (
  <>
    <Button type="button" onClick={props.onDecide} disabled={!props.choice || props.sending}>
      {t("runoff.tieDecide")}
    </Button>
    {/* B-7'de uç YOK: en adil finalist istemcide seçilir (min fark → min toplam → puan → id)
        ve mevcut force-decision ile gönderilir. */}
    <Button type="button" kind="white" onClick={props.onFair} disabled={props.sending}>
      {t("runoff.tieFair")}
    </Button>
    {props.error && <ErrorText>{props.error}</ErrorText>}
  </>
)}
```

`RunoffScreen`:

```tsx
async function decideFair() {
  const v = fairestOf(finalists);
  if (!v?.id) return;
  setSending(true);
  setError(null);
  try {
    await pick(v.id);
  } catch {
    setError(t("runoff.errDecide"));
  } finally {
    setSending(false);
  }
}
```

- [ ] **Step 9: `RunoffScreen` — `runoffVotes` yok, `voteTally` kapılı**

```tsx
const v = asView(props.view);
const voters = (v.participants ?? []).filter((p) => p.hasLocation && !p.manual);
const everyoneVoted = voters.length > 0 && voters.every((p) => !!p.id && voted.includes(p.id));
// voteTally SUNUCU tarafından kapılı (B-7:T2): dolu geldiyse gösterilebilir.
const tally = v.voteTally && Object.keys(v.voteTally).length > 0 ? v.voteTally : undefined;
```

`tie` hesabı `everyoneVoted && status === "RUNOFF"` olarak kalır (beraberlik = sunucu hâlâ RUNOFF).

- [ ] **Step 10: i18n**

```json
  "runoff": {
    "overline": "{{activity}} · {{people}} KİŞİ · ORTA NOKTA ÇEVRESİ",
    "titleTwo": "İkisi de güzel, biri seçilecek",
    "titleMany": "Hepsi güzel, biri seçilecek",
    "copyFallback": "Henüz ortak nokta yok — en çok beğenilen mekanlar finalde.",
    "trailer": "toplam ~{{total}} dk · fark ~{{gap}} dk",
    "lockedAllCopy": "herkes seçti — sonuç açıklanıyor",
    "tieFair": "Adil olana bırak",
    "remind": "Hatırlatma gönder",
    "tallyTitle": "Oylar"
  }
```

(+ en/nl.) `runoff.title` (Trans + `<br/>`) ve `runoff.sticker` **silinir**; `RunoffIntro` artık `Trans` ve
`Sticker` kullanmaz (importlar da düşer).

- [ ] **Step 11: Run** — `rtk pnpm test:web` · `tsc --noEmit`
- [ ] **Expected:** treyler her finalistte; amber-wash yalnız karar veren hücrede; kilitli kart
  herkes seçtiğinde "bekliyoruz" demiyor; sayım yalnız `voteTally` doluyken ve reduced-motion'da
  animasyonsuz; "Adil olana bırak" min-fark finalisti seçiyor.

**Commit önerisi:** `feat(web): Runoff v2 — treyler, karar veren hucre, sayim, adil kapatici`

---

### Task 5: Karar v2 — "Neden burası?", adres, yedek plan, tek seferlik açılış

**Bağımlılık:** harita kaldırma, adres/`placeLink`, TravelList, paylaşım metni **B-7'den bağımsız**.
"Neden burası?" eyebrow'u ve "Yedek plan" **B-7:T2** (`decisionKind`, `likeCounts`, `voteTally`);
UYUM ekseni ve adres satırı **B-7:T4** (`category`, `address`, `placeLink`). Alan yoksa o **eksen
satırı hiç render edilmez** (yer tutucu metin yazılmaz) — alan geldiğinde ek kod gerekmez.

**Files:**
- Create: `frontend/web/src/components/molecules/WhyHere.tsx`, `WhyHere.test.tsx`
- Create: `frontend/web/src/components/molecules/BackupPlan.tsx`
- Create: `frontend/web/src/lib/reveal.ts`
- Modify: `frontend/web/src/lib/geo.ts` (+`distanceMeters`), `geo.test.ts`
- Modify: `frontend/web/src/components/molecules/WinnerCard.tsx`
- Modify: `frontend/web/src/components/molecules/TravelList.tsx`
- Modify: `frontend/web/src/pages/ResultScreen.tsx` (+ `ResultScreen.test.tsx` yeni)
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `ResultScreen.test.tsx`

```tsx
it("1280'de harita YOK; adres satırı ve 'Google Maps'te aç' var", () => {
  renderResult(decided);
  expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Google Maps'te aç" })).toHaveAttribute(
    "href", expect.stringContaining("google.com/maps"),
  );
});

it("TravelList herkesi gösterir (davetli dahil), ~dk, km yok", () => {
  renderResult(decided, { viewer: { participantId: "guest", host: false } });
  expect(screen.getByText("~35 dk")).toBeInTheDocument();
  expect(screen.queryByText(/km/)).not.toBeInTheDocument();
});

it("paylaşım metni viewer'dan bağımsız", () => {
  const a = renderResult(decided, { viewer: { participantId: "p1", host: true } });
  const b = renderResult(decided, { viewer: { participantId: "p2", host: false } });
  expect(a.shareText).toBe(b.shareText);
});

it("eyebrow decisionKind'a göre: UNANIMOUS / RUNOFF / PARTIAL", () => { /* üç dal */ });

it("ortalama uzaklık 50 m'ye yuvarlanır; <100 m 'tam ortada'", () => { /* haversine */ });

it("en uzak ≥10 dk fark varsa HandNote çıkar, altında çıkmaz", () => { /* iki dal */ });

it("açılış efekti sessionStorage ile bir kez; ikinci render'da yok", () => { /* reveal.ts */ });
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `lib/geo.ts` — haversine**

```typescript
const R = 6371000;
/** İki nokta arası metre (haversine). "Herkesin ortasına ~X m" için — 50 m'ye yuvarlanır. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la = (a.lat * Math.PI) / 180;
  const lb = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
```

- [ ] **Step 4: `lib/reveal.ts`** (tek seferlik açılış anahtarı)

```typescript
/** Yakınsama açılışı ≤1,5 s YALNIZ canlı DECIDED geçişinde, oturum+mekan başına BİR KEZ
    (karar dokümanı §5.C). Sayfa yenilemede tekrar oynamaz; reduced-motion'da hiç oynamaz. */
export function claimReveal(slug: string, venueId: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const key = `bumpinto:reveal:${slug}:${venueId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return false; // özel pencere / storage kapalı → statik
  }
}
```

- [ ] **Step 5: `molecules/WhyHere.tsx`** — üç eksen

```tsx
/* Karar dokümanı §5.C "Karar v2" — ADALET / UYUM / YER. Veri olmayan eksen HİÇ çizilmez;
   yer tutucu metin yazılmaz (§1 bulgusu: artboard'lar olmayan veriye yaslanıyordu). */
import { useTranslation } from "react-i18next";
import type { View, Venue } from "../../lib/serverFields";
import { fairnessOf } from "@bumpinto/shared";
import { distanceMeters } from "../../lib/geo";
import { HandNote, Note, Overline } from "../atoms";

const AXIS = "flex flex-col gap-0.5 border-l-2 border-line pl-3";

export default function WhyHere(props: {
  view: View;
  venue: Venue;
  labels: Record<string, string>;
  selfId?: string | null;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  const mid = props.view.midpoint;
  const meters =
    mid?.lat != null && mid?.lng != null && props.venue.lat != null && props.venue.lng != null
      ? distanceMeters({ lat: mid.lat, lng: mid.lng }, { lat: props.venue.lat, lng: props.venue.lng })
      : null;
  const rounded = meters == null ? null : Math.round(meters / 50) * 50;
  const longestName = f ? (props.labels[f.longestId] ?? "") : "";

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-card p-[1.25rem_1.375rem] shadow-sh1">
      <Overline>{t("result.whyTitle")}</Overline>

      {f && (
        <div className={AXIS}>
          <Overline>{t("result.axisFair")}</Overline>
          <span className="text-[0.875rem]">
            {t("result.fairLine", { min: f.min, max: f.max, name: longestName })}
          </span>
        </div>
      )}

      {/* UYUM — B-7:T4 `category` gelmeden çizilmez. */}
      {props.venue.category && (
        <div className={AXIS}>
          <Overline>{t("result.axisFit")}</Overline>
          <span className="text-[0.875rem]">
            {t("result.fitLine", {
              activity: t(`activity.${props.view.activityType}`),
              category: props.venue.category,
            })}
          </span>
        </div>
      )}

      {/* YER — adres B-7:T4; yoksa yalnız orta noktaya uzaklık satırı kalır. */}
      {(props.venue.address || rounded != null) && (
        <div className={AXIS}>
          <Overline>{t("result.axisPlace")}</Overline>
          {props.venue.address && <span className="text-[0.875rem]">{props.venue.address}</span>}
          {rounded != null && (
            <Note>
              {rounded < 100 ? t("result.midpointExact") : t("result.midpointMeters", { m: rounded })}
            </Note>
          )}
        </div>
      )}

      {/* Tek HandNote — yalnız fark ≥ 10 dk iken (yoksa gereksiz gürültü). */}
      {f && f.spread >= 10 && (
        <HandNote>{t("result.leaveEarlyHand", { name: longestName, min: f.spread })}</HandNote>
      )}
    </div>
  );
}
```

- [ ] **Step 6: `molecules/BackupPlan.tsx`**

```tsx
/* Karar dokümanı §5.C — "Yedek plan": runoff ikincisi (voteTally), yoksa likeCounts ikincisi
   (≥2 beğeni ve ≥3 katılımcı şartıyla). İkisi de yoksa satır hiç çizilmez. */
import { useTranslation } from "react-i18next";
import type { View, Venue } from "../../lib/serverFields";
import { Note, Overline } from "../atoms";
import VenueThumb from "./VenueThumb";

export function backupOf(view: View, winnerId: string): Venue | null {
  const venues = view.venues ?? [];
  const byId = (id: string) => venues.find((v) => v.id === id) ?? null;
  const tally = view.voteTally;
  if (tally && Object.keys(tally).length > 1) {
    const second = Object.entries(tally)
      .filter(([id]) => id !== winnerId)
      .sort((a, b) => b[1] - a[1])[0];
    if (second && second[1] > 0) return byId(second[0]);
  }
  const likes = view.likeCounts;
  const people = (view.participants ?? []).filter((p) => p.hasLocation && !p.manual).length;
  if (likes && people >= 3) {
    const second = Object.entries(likes)
      .filter(([id, n]) => id !== winnerId && n >= 2)
      .sort((a, b) => b[1] - a[1])[0];
    if (second) return byId(second[0]);
  }
  return null;
}

export default function BackupPlan(props: { view: View; winnerId: string; tint: number }) {
  const { t } = useTranslation();
  const v = backupOf(props.view, props.winnerId);
  if (!v) return null;
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-sh1">
      <VenueThumb venue={v} tint={props.tint} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Overline>{t("result.backup")}</Overline>
        <span className="text-[0.875rem] font-bold">{v.name}</span>
      </div>
      <Note>{t("result.backupNote")}</Note>
    </div>
  );
}
```

- [ ] **Step 7: `WinnerCard` — eyebrow + adres bağlantısı, harita yok**

```tsx
// props: venue, travelLabels, selfId, decisionKind?, tally?, names?
const eyebrow =
  props.decisionKind === "UNANIMOUS" ? t("result.eyebrowUnanimous")
  : props.decisionKind === "RUNOFF" && props.tally ? t("result.eyebrowRunoff", { a: props.tally.top, b: props.tally.second })
  : props.decisionKind === "PARTIAL" ? t("result.eyebrowPartial", { names: props.names ?? "" })
  : t("result.overline");   // varsayılan "Ortak nokta"

// "Yol tarifi al" → adres satırı + ghost "Google Maps'te aç"
const href =
  props.venue.placeLink ??
  props.venue.mapsUrl ??
  (props.venue.lat != null && props.venue.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${props.venue.lat},${props.venue.lng}`
    : null);
// href null ise bağlantı HİÇ render edilmez (bugünkü href="#" ölü butonu düzelir).
```

- [ ] **Step 8: `TravelList` — herkes, `~dk`, km yok**

```tsx
// rows filtresi değişir: travelMinutes'ı olan HERKES (davetli dahil) listelenir.
// Dakika metni tek kaynaktan: roundTravel + travel.min
<span className="text-[0.8125rem] font-bold text-ink tabular-nums">
  {t("travel.min", { min: roundTravel(props.venue.travelMinutes![p.id!]) })}
</span>
```

- [ ] **Step 9: `ResultScreen` — harita kalkar, açılış bir kez**

```tsx
const v = asView(view);
const reveal = useMemo(
  () => (v.status === "DECIDED" && v.decidedVenueId ? claimReveal(v.slug ?? "", v.decidedVenueId) : false),
  [v.slug, v.decidedVenueId, v.status],
);
// …
<Page variant="result">
  {reveal && <Confetti />}
  <TwoZone
    left={<><WinnerCard … /><ShareButton text={shareText} url={shareUrl} /></>}
    right={<><WhyHere … /><TravelList … /><BackupPlan … /><ViralCard host={isHost} /></>}
  />
</Page>
```

`MapView` importu ve kullanımı **silinir** (§4.7 — Karar'da harita yok).
Paylaşım metni viewer'dan bağımsız: `t("result.shareText", { name: view.name, venue: winner.name })`
zaten öyle; `useTravelLabels` ile üretilen hiçbir kişisel metin paylaşıma **girmez** (doğrulanır).

- [ ] **Step 10: i18n** — `result` bloğuna:

```json
    "whyTitle": "Neden burası?",
    "axisFair": "Adalet",
    "axisFit": "Uyum",
    "axisPlace": "Yer",
    "fairLine": "Herkes ~{{min}}–{{max}} dk · en uzun yol {{name}}",
    "fitLine": "{{activity}} için · {{category}}",
    "midpointMeters": "Herkesin ortasına ~{{m}} m",
    "midpointExact": "Tam ortada",
    "leaveEarlyHand": "en uzaktan gelen ~{{min}} dk önce çıkarsa herkes aynı anda varır",
    "eyebrowUnanimous": "HEPİNİZ AYNI YERİ BEĞENDİ",
    "eyebrowRunoff": "Oylamayla {{a}}–{{b}}",
    "eyebrowPartial": "{{names}} olmadan",
    "openInMaps": "Google Maps'te aç",
    "backup": "Yedek plan",
    "backupNote": "ikinci sırada"
```

(+ en/nl.) `result.directions` **silinir** ("Yol tarifi al" → "Google Maps'te aç").

- [ ] **Step 11: Run** — `rtk pnpm test:web` · `tsc --noEmit`
- [ ] **Expected:** Karar'da hiçbir kırılımda `MapView` yok; ölü `href="#"` yok; TravelList herkesi
  `~dk` ile gösteriyor; eyebrow yalnız alan varken değişiyor; açılış efekti yenilemede tekrar yok.

**Commit önerisi:** `feat(web): Karar v2 — neden burasi, adres, yedek plan, tek seferlik acilis`

---

### Task 6a: Lobi/Bekle orta nokta kartı, aktivite şeridi, 4 adımlı stepper

**Bağımlılık: B-7:T1** (`ParticipantDto.midpointMinutes`) **+ B-7:T3** (`SessionView.midpointLabel`).
`midpointMinutes` kişi başı, ağırlıklı orta noktaya, 5 dk'ya yuvarlanmış dakikadır; konumsuz
katılımcıda `null`. Kart aralığı (`herkes ~25–35 dk`) **doğrudan** bu alanın min/max'ıdır — istemci
türetmesi YOK. `midpointLabel` gelene kadar başlık `t("midpoint.title")` ("Orta nokta") basılır;
alan gelince `{{label}} civarı` olur (kod dalı zaten var).

> **Sıra notu:** `lib/travelMode.ts` (ikon + etiket sözlüğü) bu görevde açılır; Task 6b onu
> `SEND_TRAVEL_MODE` / `withTravelMode` ile **genişletir**. 6a önce koşabilir.
> `ParticipantDto.travelMode` OpenAPI'de henüz yok → roster ve orta nokta notu katılımcıyı
> `asParticipant(p)` ile `Participant` türüne daraltarak okur (`lib/serverFields.ts`).

**Files:**
- Create: `frontend/web/src/lib/travelMode.ts` (bu görevde yalnız `MODE_ICON` + `MODE_LABEL_KEY` + `TRAVEL_MODES` + `DEFAULT_TRAVEL_MODE`)
- Create: `frontend/web/src/components/molecules/MidpointCard.tsx`, `MidpointCard.test.tsx`
- Create: `frontend/web/src/components/molecules/ActivityStrip.tsx`
- Create: `frontend/web/src/components/molecules/SessionSteps.tsx`
- Create: `frontend/web/src/components/molecules/LgOnly.tsx` (Task 2'de açılmadıysa)
- Modify: `frontend/web/src/components/molecules/ParticipantRow.tsx`
- Modify: `frontend/web/src/pages/LobbyPage.tsx`, `WaitingRoom.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `MidpointCard.test.tsx`

```tsx
it("orta nokta kartı: overline, yarıçap ve herkesin aralığı", () => {
  render(<MidpointCard view={view} />);
  expect(screen.getByText("ORTA NOKTA")).toBeInTheDocument();
  expect(screen.getByText("≤ 9 km · herkes ~25–35 dk")).toBeInTheDocument();
});

it("midpointLabel yoksa başlık 'Orta nokta'; varsa '{{label}} civarı'", () => {
  render(<MidpointCard view={view} />);
  expect(screen.getByRole("heading")).toHaveTextContent("Orta nokta");
  render(<MidpointCard view={{ ...view, midpointLabel: "Eindhoven" }} />);
  expect(screen.getByRole("heading", { name: "Eindhoven civarı" })).toBeInTheDocument();
});

it("ulaşım türü notu ada ek getirmez", () => {
  render(<MidpointCard view={bikeView} />);
  expect(screen.getByText("Orta nokta Ahmet tarafında · bisikletle geliyor")).toBeInTheDocument();
});
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `MidpointCard.tsx`**

```tsx
/* Karar dokümanı §5.C "Lobi/Bekle" — harita şeridi yerine orta nokta kartı.
   `.c-mark` glifi MapMark'tan; harita YOK (§4.7). */
import { useTranslation } from "react-i18next";
import type { View } from "../../lib/serverFields";
import { MODE_LABEL_KEY } from "../../lib/travelMode";
import { Note, Overline } from "../atoms";
import MapMark from "./MapMark";

export default function MidpointCard(props: { view: View }) {
  const { t } = useTranslation();
  const v = props.view;
  // B-7:T1 `midpointMinutes`: konumu olan HERKESİN orta noktaya dakikası (5 dk'ya yuvarlı).
  // Konumsuz katılımcı `null` döner ve aralığa girmez.
  const mins = (v.participants ?? [])
    .map((p) => p.midpointMinutes)
    .filter((m): m is number => m != null);
  const range = mins.length > 0 ? { min: Math.min(...mins), max: Math.max(...mins) } : null;
  const km = v.radiusKm != null ? Math.round(v.radiusKm) : null;
  // Orta nokta hıza ters ağırlıklı kaydığı için "kimin tarafında" bilgisi anlamlı (§4.5b).
  const near = nearestParticipant(v);

  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-card p-[1.125rem_1.25rem] shadow-sh1">
      <MapMark />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Overline>{t("midpoint.overline")}</Overline>
        <h2 className="text-[1.125rem]">
          {v.midpointLabel ? t("midpoint.near", { label: v.midpointLabel }) : t("midpoint.title")}
        </h2>
        <span className="text-[0.8125rem] text-ink2 tabular-nums">
          {km != null && range
            ? t("midpoint.meta", { km, min: range.min, max: range.max })
            : km != null
              ? t("midpoint.metaKm", { km })
              : t("midpoint.pending")}
        </span>
        {near?.travelMode && near.travelMode !== "CAR" && (
          // TÜRKÇE EK YOK: "… {{name}} tarafında · bisikletle geliyor"
          <Note>
            {t("midpoint.sideNote", {
              name: near.displayName ?? "",
              mode: t(MODE_LABEL_KEY[near.travelMode].coming),
            })}
          </Note>
        )}
      </div>
    </div>
  );
}
```

`nearestParticipant` yardımcısı aynı dosyada **saf fonksiyon** olarak export edilir ve testten
çağrılır (`distanceMeters(midpoint, p.approxLocation)` en küçük olan). Aralık için ayrı yardımcı
YOK — `midpointMinutes` min/max'ı iki satır.

- [ ] **Step 4: `ActivityStrip.tsx` + `SessionSteps.tsx`**

```tsx
/* "Kahve için buluşuyoruz" + vaat satırı (karar dokümanı §5.C). */
export default function ActivityStrip(props: { activity: string }) {
  const { t } = useTranslation();
  const I = ACTIVITY_ICONS[props.activity];
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-flame-wash px-4 py-3">
      {I && <I size={20} className="text-flame-deep" aria-hidden />}
      <div className="flex flex-col gap-0.5">
        <span className="text-[0.875rem] font-bold">
          {t("lobby.meetingFor", { activity: t(`activity.${props.activity}`) })}
        </span>
        <span className="text-[0.75rem] text-ink2">
          {t("lobby.promise", { activity: t(`activity.${props.activity}`) })}
        </span>
      </div>
    </div>
  );
}
```

`SessionSteps.tsx` — mevcut `StepList` **Landing'e özel** (`landing.step1..3` anahtarlarına
bağlı, 3 adım). Yeniden kullanılmaz; ayrı 4 adımlı bileşen yazılır:

```tsx
const STEPS = ["locations", "venues", "vote", "decide"] as const;

export default function SessionSteps(props: { current: (typeof STEPS)[number] }) {
  const { t } = useTranslation();
  const at = STEPS.indexOf(props.current);
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] font-head text-[0.6875rem] font-extrabold ${
            i <= at ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 text-ink3"
          }`}>{i + 1}</span>
          <span className={`text-[0.75rem] font-semibold ${i <= at ? "text-ink" : "text-ink3"}`}>
            {t(`steps.${s}`)}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-line2" />}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 5: `ParticipantRow` — şehir · ikon · dakika + `appear`**

```tsx
// subtitle satırı: "{{city}} · <icon> ~{{dk}} dk"
const Mode = p.travelMode ? MODE_ICON[p.travelMode] : null;
// …
<span className="flex items-center gap-1.5 text-[0.8125rem] text-ink2">
  {p.hasLocation ? p.locationLabel : t("waiting.waitingLocation")}
  {Mode && p.hasLocation && (
    <>
      <span aria-hidden>·</span>
      <Mode size={14} aria-hidden />
      <span className="sr-only">{t(MODE_LABEL_KEY[p.travelMode!].name)}</span>
      {props.minutes != null && <span className="tabular-nums">{t("travel.min", { min: props.minutes })}</span>}
    </>
  )}
</span>
```

Satır kabuğuna geliş animasyonu: `className="… animate-appear"` (token `--animate-appear`
`app.css`'te mevcut; reduced-motion `@layer base` kuralıyla zaten kapanıyor).

- [ ] **Step 6: `LobbyPage` / `WaitingRoom` kompozisyonu**

- `LobbyPage` sağ bölge sırası: `MidpointCard` → `LgOnly(Button "Haritayı aç")` → `Button
  "Mekanları bul"` → `Note` gizlilik satırı (`join.privacy` yeniden kullanılır) → geciken notu.
- `LobbyPage` sol bölge: `InviteCard` → `ActivityStrip` → `SessionSteps current="locations"` →
  `ParticipantList`.
- `WaitingRoom`: `MapView` **tamamen kaldırılır** (§4.7 — Bekle'de harita yok). Sağ bölge:
  `MidpointCard` → `WaitingStatus` (rev-2 kopyası Task 3'te girdi) → `SessionSteps current="locations"`.
  Sol bölge: `JoinedCard` → `ActivityStrip` → `ParticipantList`.

- [ ] **Step 7: i18n**

```json
  "midpoint": {
    "overline": "Orta nokta",
    "title": "Orta nokta",
    "near": "{{label}} civarı",
    "meta": "≤ {{km}} km · herkes ~{{min}}–{{max}} dk",
    "metaKm": "≤ {{km}} km",
    "pending": "Herkes konumunu atınca netleşir",
    "sideNote": "Orta nokta {{name}} tarafında · {{mode}}"
  },
  "steps": { "locations": "Konumlar", "venues": "Mekanlar", "vote": "Oylama", "decide": "Karar" },
  "lobby": {
    "meetingFor": "{{activity}} için buluşuyoruz",
    "promise": "Orta nokta çevresinde {{activity}} mekanları aranacak."
  }
```

(+ en/nl; `sideNote` EN `"Midpoint is toward {{name}} · {{mode}}"`, NL
`"Middelpunt ligt richting {{name}} · {{mode}}"` — hiçbirinde ek yok.)

- [ ] **Step 8: Run** — `rtk pnpm test:web` · `tsc --noEmit` ·
  `rtk grep -rn "MapView" frontend/web/src/pages/WaitingRoom.tsx` → boş
- [ ] **Expected:** Lobi ve Bekle'de harita şeridi yok, orta nokta kartı var; stepper 4 adım;
  roster satırlarında şehir + ulaşım ikonu; `midpointLabel` yokken "Orta nokta".

**Commit önerisi:** `feat(web): Lobi/Bekle orta nokta karti, aktivite seridi, 4 adimli stepper`

---

### Task 6b: Ulaşım türü girişi (Katıl / Yeni oturum / Konumlar / Bekle / Profil)

**Bağımlılık: B-7:T1** (`JoinRequest.travelMode`, `PointRequest.travelMode`,
`PUT /api/me { defaultTravelMode }`, `ParticipantDto.travelMode`).
**UI alan gelmeden gönderilebilir hâlde yazılır** ama **gönderim kapalıdır**: `travelMode` alanı
istek gövdesine yalnız `SEND_TRAVEL_MODE` bayrağı açıkken eklenir. Bayrak `lib/travelMode.ts`'te
tek satırdır; B-7:T1 birleşince `true` yapılır ve bayrak silinir.

**Files:**
- Modify: `frontend/web/src/lib/travelMode.ts` (Task 6a'da açıldı — burada `SEND_TRAVEL_MODE` + `withTravelMode` eklenir) · Create: `travelMode.test.ts`
- Create: `frontend/web/src/components/molecules/TravelModeField.tsx`, `TravelModeField.test.tsx`
- Modify: `frontend/web/src/components/molecules/JoinFormFields.tsx`
- Modify: `frontend/web/src/pages/JoinForm.tsx`
- Modify: `frontend/web/src/pages/NewSessionPage.tsx`, `store/newSessionStore.ts`
- Modify: `frontend/web/src/components/organisms/PointsEditor.tsx`
- Modify: `frontend/web/src/components/molecules/WaitingStatus.tsx`
- Modify: `frontend/web/src/components/organisms/ProfilePrefs.tsx`
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `TravelModeField.test.tsx`

```tsx
it("5 seçenek, varsayılan Arabayla, seçim geri çağrısı", () => {
  const onChange = vi.fn();
  render(<TravelModeField value="CAR" onChange={onChange} />);
  expect(screen.getAllByRole("radio")).toHaveLength(5);
  expect(screen.getByRole("radio", { name: "Arabayla" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("radio", { name: "Bisikletle" }));
  expect(onChange).toHaveBeenCalledWith("BIKE");
});
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `lib/travelMode.ts`**

```typescript
import { Bicycle, Car, Lightning, PersonSimpleWalk, Train, type Icon } from "@phosphor-icons/react";
import type { TravelMode } from "./serverFields";

/** B-7:T1 birleşip codegen koşana kadar `travelMode` istek gövdesine EKLENMEZ
    (bilinmeyen alan 400 döndürebilir). Alan geldiğinde bu sabit `true` olur, sonra silinir. */
export const SEND_TRAVEL_MODE = false;

export const TRAVEL_MODES: TravelMode[] = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"];
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";

export const MODE_ICON: Record<TravelMode, Icon> = {
  WALK: PersonSimpleWalk,
  BIKE: Bicycle,
  EBIKE: Lightning, // e-bisiklet: Lightning + Bicycle bileşimi TravelModeField'da çizilir
  TRANSIT: Train,
  CAR: Car,
};

/** İki metin: seçenek adı ("Bisikletle") ve "geliyor" cümlesi parçası ("bisikletle geliyor"). */
export const MODE_LABEL_KEY: Record<TravelMode, { name: string; coming: string }> = {
  WALK: { name: "travelMode.walk", coming: "travelMode.walkComing" },
  BIKE: { name: "travelMode.bike", coming: "travelMode.bikeComing" },
  EBIKE: { name: "travelMode.ebike", coming: "travelMode.ebikeComing" },
  TRANSIT: { name: "travelMode.transit", coming: "travelMode.transitComing" },
  CAR: { name: "travelMode.car", coming: "travelMode.carComing" },
};

/** Gövdeye ekleme yardımcısı — beş çağrı yerinde tek kural. */
export function withTravelMode<T extends object>(body: T, mode: TravelMode): T {
  return SEND_TRAVEL_MODE ? { ...body, travelMode: mode } : body;
}
```

- [ ] **Step 4: `TravelModeField.tsx`** (Segmented tabanlı; ikon + etiket)

```tsx
export default function TravelModeField(props: {
  value: TravelMode;
  onChange: (m: TravelMode) => void;
  label?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-semibold">{props.label ?? t("travelMode.question")}</span>
      <div role="radiogroup" aria-label={props.label ?? t("travelMode.question")}
        className="flex flex-wrap gap-2">
        {TRAVEL_MODES.map((m) => {
          const I = MODE_ICON[m];
          const on = m === props.value;
          return (
            <button key={m} type="button" role="radio" aria-checked={on}
              onClick={() => props.onChange(m)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-[0.875rem] font-semibold ${
                on ? "border-flame-deep bg-flame-wash text-flame-deep" : "border-line2 bg-card text-ink2"
              }`}>
              {m === "EBIKE" ? (
                <span className="inline-flex items-center" aria-hidden>
                  <Lightning size={13} /><Bicycle size={18} />
                </span>
              ) : (
                <I size={18} aria-hidden />
              )}
              {t(MODE_LABEL_KEY[m].name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Beş giriş noktası**

1. **`JoinFormFields`** — `LocationField`'ın hemen altına `TravelModeField`; `JoinForm` state'i
   tutar ve `join(withTravelMode({ displayName, lat, lng, locationLabel }, mode))`.
   Başlangıç değeri: `me.defaultTravelMode ?? DEFAULT_TRAVEL_MODE`.
2. **`NewSessionPage`** — kendi konumunun altında `TravelModeField`; `newSessionStore`'a
   `travelMode` alanı + `setTravelMode`; `submit()` `withTravelMode(...)` ile gönderir.
3. **`PointsEditor`** — her elle nokta satırında küçük mod seçici (satır sonunda `TravelModeField`
   yerine üç noktalı açılır liste yerine: satır **altında** aynı bileşen, `label` gizli
   `aria-label={t("travelMode.forName", { name })}`). Yeni nokta formuna da varsayılan CAR.
4. **`WaitingStatus`** — buton metni `waiting.changeLocation` → `waiting.changeLocationAndMode`
   ("Konum ve ulaşım"); panel açılınca `LocationField` + `TravelModeField`.
5. **`ProfilePrefs`** — yeni `PrefRow` "Varsayılan ulaşım" → `TravelModeField` →
   `updateMe({ defaultTravelMode })` (`SEND_TRAVEL_MODE` kapalıyken satır **gösterilir ama
   kaydetme butonu devre dışıdır** ve altında `Note` "yakında" yerine hiçbir metin yoktur —
   satır B-7:T1 gelene kadar `PrefRow`'a **hiç eklenmez**; koşul `SEND_TRAVEL_MODE &&`).

- [ ] **Step 6: i18n**

```json
  "travelMode": {
    "question": "Nasıl geliyorsun?",
    "forName": "{{name}} nasıl geliyor?",
    "walk": "Yürüyerek", "bike": "Bisikletle", "ebike": "E-bisikletle",
    "transit": "Toplu taşımayla", "car": "Arabayla",
    "walkComing": "yürüyerek geliyor", "bikeComing": "bisikletle geliyor",
    "ebikeComing": "e-bisikletle geliyor", "transitComing": "toplu taşımayla geliyor",
    "carComing": "arabayla geliyor"
  },
  "waiting": { "changeLocationAndMode": "Konum ve ulaşım" },
  "profile": { "defaultTravelMode": "Varsayılan ulaşım" }
```

(+ en/nl: `Walking/Cycling/E-bike/Public transport/Driving`,
`Lopend/Met de fiets/Met de e-bike/Met het OV/Met de auto`.)

- [ ] **Step 7: Run** — `rtk pnpm test:web` · `tsc --noEmit`
- [ ] **Expected:** beş yüzeyde de seçici görünüyor, varsayılan Arabayla; `SEND_TRAVEL_MODE`
  kapalıyken hiçbir istek gövdesinde `travelMode` yok (test: `api.join` çağrı argümanı denetlenir).

**Commit önerisi:** `feat(web): ulasim turu girisi (Katil/Yeni oturum/Konumlar/Bekle/Profil)`

---

### Task 7: Kart anatomisi, uyum satırı ve semt

**Bağımlılık: B-7:T4** (`category`, `locality`, `address`, `hoursToday`, `provider`).
Alan yoksa **o satır hiç çizilmez**; hiçbir yer tutucu metin yazılmaz.

**Files:**
- Modify: `frontend/web/src/lib/activity.ts` (beklenen kategori kümesi)
- Create: `frontend/web/src/components/molecules/FitLine.tsx`, `FitLine.test.tsx`
- Modify: `frontend/web/src/components/molecules/VenueCard.tsx`
- Modify: `frontend/web/src/components/molecules/VenueMeta.tsx`, `VenueRow.tsx`
- Modify: `frontend/web/src/components/molecules/LikedList.tsx`
- Modify: `frontend/web/src/components/organisms/VenueDeck.tsx` (son iki kart notu)
- Modify: `frontend/web/src/i18n/locales/{tr,en,nl}.json`

- [ ] **Step 1: Failing test** — `FitLine.test.tsx`

```tsx
it("destede tek kategori varsa satır çizilmez (12 aynı kart)", () => {
  const { container } = render(<FitLine venue={coffee} activity="COFFEE" categories={["Espresso bar"]} />);
  expect(container).toBeEmptyDOMElement();
});

it("≥2 farklı kategori varsa 'Kahve için: espresso bar'", () => {
  render(<FitLine venue={coffee} activity="COFFEE" categories={["Espresso bar", "Fırın"]} />);
  expect(screen.getByText("Kahve için: espresso bar")).toBeInTheDocument();
});

it("beklenen küme dışında amber uyarı", () => {
  render(<FitLine venue={bakery} activity="COFFEE" categories={["Espresso bar", "Fırın"]} />);
  expect(screen.getByText("Kahve değil: fırın").className).toContain("text-amber");
});

it("category yoksa satır yok", () => {
  const { container } = render(<FitLine venue={{ id: "x" }} activity="COFFEE" categories={[]} />);
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `lib/activity.ts` — beklenen kategori kümesi**

```typescript
/* Karar dokümanı §4.6 — "uyum satırı" için aktivite başına beklenen sağlayıcı kategorileri.
   Küçük harfe indirgenmiş, kısmi eşleşme (includes) ile bakılır: sağlayıcı taksonomileri
   ("Coffee Shop", "Café", "Espresso Bar") tam eşleşmez. Küme YOKSA uyarı basılmaz. */
export const EXPECTED_CATEGORIES: Partial<Record<string, string[]>> = {
  COFFEE: ["coffee", "café", "cafe", "espresso", "koffie", "kahve", "tea", "roaster"],
  FOOD: ["restaurant", "eetcafé", "bistro", "diner", "eatery", "lokanta", "pizzeria", "steakhouse"],
  BAR: ["bar", "pub", "brewery", "wine", "cocktail", "brouwerij", "meyhane"],
  WALK: ["park", "trail", "garden", "promenade", "forest", "bos", "natuur"],
  HIKE: ["trail", "nature", "forest", "hill", "reserve", "natuur"],
  SWIM: ["pool", "swim", "beach", "zwembad", "strand"],
  FITNESS: ["gym", "fitness", "sport", "climbing", "yoga"],
  ADVENTURE: ["adventure", "climbing", "karting", "paintball", "escape"],
  CINEMA: ["cinema", "movie", "theater", "bioscoop"],
  MUSEUM: ["museum", "gallery", "exhibition", "museum"],
  ART: ["gallery", "art", "atelier", "kunst"],
  ACTIVITY: ["bowling", "billiard", "arcade", "mini golf", "pool hall"],
  GAMES: ["board game", "arcade", "game", "spellen"],
  THEME_PARK: ["theme park", "amusement", "attractiepark", "pretpark"],
  NIGHTLIFE: ["club", "nightclub", "live music", "discotheek"],
};

/** Kategori aktivitenin beklenen kümesinde mi? Küme tanımsızsa "bilinmiyor" = true (uyarı yok). */
export function fitsActivity(activity: string, category: string | undefined): boolean {
  const set = EXPECTED_CATEGORIES[activity];
  if (!set || !category) return true;
  const c = category.toLocaleLowerCase("tr");
  return set.some((k) => c.includes(k));
}
```

- [ ] **Step 4: `FitLine.tsx`**

```tsx
export default function FitLine(props: {
  venue: Venue;
  activity: string;
  /** Destedeki TÜM kategoriler — ≥2 farklı değer yoksa satır gizlenir (§4.6). */
  categories: string[];
}) {
  const { t } = useTranslation();
  const c = props.venue.category;
  if (!c) return null;
  if (new Set(props.categories.filter(Boolean)).size < 2) return null;
  const ok = fitsActivity(props.activity, c);
  const activity = t(`activity.${props.activity}`);
  return (
    <span className={`text-[0.8125rem] ${ok ? "text-ink2" : "font-semibold text-amber"}`}>
      {ok
        ? t("venue.fitOk", { activity, category: c.toLocaleLowerCase("tr") })
        : t("venue.fitOff", { activity, category: c.toLocaleLowerCase("tr") })}
    </span>
  );
}
```

- [ ] **Step 5: `VenueCard` polaroid 390 sırası (§4.9)**

```
foto/monogram → ad → FitLine → "★ 4.6 · €€ · Best" → FairnessBadge → TravelChips → Attribution
```

```tsx
// meta satırı (semt yalnız orta nokta şehrinden FARKLIYSA):
<div className="flex flex-wrap items-center gap-[0.4375rem] text-[0.8125rem] leading-[1.45] text-ink2">
  {v.rating != null && <strong className="font-bold text-ink">★ {v.rating}</strong>}
  {hasPrice && <><span aria-hidden>·</span><span>{"€".repeat(v.priceLevel!)}</span></>}
  {locality && <><span aria-hidden>·</span><span>{locality}</span></>}
</div>
{v.hoursToday && <span className="text-[0.75rem] text-ink2">{t("venue.hoursToday", { hours: v.hoursToday })}</span>}
```

- `locality` **doğrudan** `venue.locality`'dir (B-7:T4; semt/kasaba kelimesi). Adres ayrıştırma
  YOK. `view.midpointLabel` ile **aynıysa** basılmaz:
  `const locality = v.locality && v.locality !== midpointLabel ? v.locality : null;`
  (`midpointLabel` prop olarak sayfadan geçer.)
- `ratingCount` **gösterilmez** — hiçbir artboard'da yok. Alan sözleşmede kalır, ekranda kullanılmaz.
- **"Açık"/"Şu an açık" durumu ASLA gösterilmez** (§4.9 — buluşma saati yok). `hoursToday`
  yalnız düz metin olarak ("Bugün 08–22") çizilir.
- `deck.photoTag` ("foto · Places") rozeti **kaldırılır**; yerine kart altında
  `<Attribution provider={v.provider} />`. `deck.photoTag` anahtarı üç dilden silinir ve
  `VenueCard.test.tsx`'teki üç "foto · Places" beklentisi atıf metnine göre güncellenir.

- [ ] **Step 6: `VenueRow` tür overline'ı** — ad üstüne `<Overline>{v.category}</Overline>`
  (yalnız `category` varken). `VenueMeta` de `locality` gösterir (`ratingCount` DEĞİL).

- [ ] **Step 7: `VenueDeck` son iki kart kalibrasyon notu**

```tsx
// kalan kart ≤ 2 ve hiç beğeni yoksa TEK HandNote (§5.C "Deste"):
{remaining <= 2 && likedCount === 0 && <HandNote>{t("deck.calibrateHand")}</HandNote>}
```

- [ ] **Step 8: `LikedList` — herkesin çipi + rozet + minimax sıra**

```tsx
const liked = props.venues.filter((v) => props.liked[v.id!]).sort(byFairness);
```

satır içeriği: `VenueThumb` → ad → `★` → `FairnessBadge` → `TravelChips size="sm"`.

- [ ] **Step 9: i18n**

```json
  "venue": {
    "fitOk": "{{activity}} için: {{category}}",
    "fitOff": "{{activity}} değil: {{category}}",
    "hoursToday": "Bugün {{hours}}"
  },
  "deck": { "calibrateHand": "hiç beğenmedin — kimse ortak beğenmezse sonuç boş kalır" }
```

(+ en/nl.) **Silinen:** `deck.photoTag`.

- [ ] **Step 10: Run** — `rtk pnpm test:web` · `tsc --noEmit` ·
  `rtk grep -rni "açık\|open now\|nu open" frontend/web/src/components` → yalnız beklenen eşleşmeler
- [ ] **Expected:** kart sırası §4.9'a birebir; tek kategorili destede uyum satırı yok; "Açık"
  hiçbir yerde yok; `ratingCount` hiçbir yerde yok; ≥4 kişide TravelChips **sarar** (ayrı bar YOK);
  "foto · Places" yerine gerçek atıf.

**Commit önerisi:** `feat(web): kart anatomisi, uyum satiri, semt, gercek atif`

---

### Task 8: Analitik olayları, anahtar paritesi ve kapanış

**Bağımlılık: B-7'den bağımsız.**

**Files:**
- Create: `frontend/web/src/lib/analytics.ts`, `frontend/web/src/lib/analytics.test.ts`
- Modify: `frontend/web/src/components/organisms/VenueBrowser.tsx` (harita dokunuşu)
- Modify: `frontend/web/src/lib/maps.ts` (Maps JS yüklemesi)
- Modify: `frontend/web/src/store/sessionStore.ts` (aşama geçişi)
- Create: `scripts/i18n-parity.mjs`
- Modify: `package.json` (kök `scripts`)

- [ ] **Step 1: Failing test** — `lib/analytics.test.ts`

```typescript
it("clarity/gtag yokken sessizce yutar (hata atmaz)", () => {
  expect(() => track("map_open", { screen: "venues" })).not.toThrow();
});

it("window.clarity varsa çağırır", () => {
  const clarity = vi.fn();
  (window as unknown as { clarity: unknown }).clarity = clarity;
  track("maps_js_load", { screen: "venues" });
  expect(clarity).toHaveBeenCalledWith("event", "maps_js_load");
});

it("window.gtag varsa parametrelerle çağırır", () => { /* … */ });

it("aynı aşama geçişi iki kez gönderilmez", () => {
  trackStatus("x", "BROWSING");
  trackStatus("x", "BROWSING");
  expect(sent).toHaveLength(1);
});
```

- [ ] **Step 2: FAIL doğrula**

- [ ] **Step 3: `lib/analytics.ts`**

```typescript
/* Karar dokümanı §5.A.8 — üç olay: "Haritada gör" dokunuşu, Maps JS yüklemesi, aşama geçişi.
   "Ölçmeden harita tasarrufu iddia edilemez" (bugün sıfır veri).
   Sağlayıcı yok: Clarity ve GA4 sayfaya sonradan eklenebilir; sarmalayıcı ikisini de
   koşullu çağırır ve hiçbir şey yoksa sessizce yutar. PII gönderilmez — yalnız enum'lar. */
type Props = Record<string, string | number | boolean>;

type ClarityFn = (command: "event", name: string) => void;
type GtagFn = (command: "event", name: string, props?: Props) => void;

export type EventName = "map_open" | "maps_js_load" | "session_status";

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
```

- [ ] **Step 4: Üç bağlantı noktası**

1. `VenueBrowser` — `onMapOpen` (Task 2'de prop olarak açıldı) `VenuesPage`'ten
   `() => track("map_open", { screen: "venues" })`.
2. `lib/maps.ts` — `loadMaps()` içinde ilk gerçek yükleme çözüldüğünde
   `track("maps_js_load")` (tekil `loading` promise'ı zaten bir kez koşuyor).
3. `sessionStore.refresh()` / `set({ view })` yollarının **tek** çıkışında:
   `if (view.slug && view.status) trackStatus(view.slug, view.status);`

- [ ] **Step 5: `scripts/i18n-parity.mjs`** (tr/en/nl anahtar paritesi)

```javascript
#!/usr/bin/env node
/* tr/en/nl anahtar paritesi — eksik ya da fazla anahtarı çıkışa yazar, farkta 1 döner. */
import { readFileSync } from "node:fs";

const dir = "frontend/web/src/i18n/locales";
const load = (l) => JSON.parse(readFileSync(`${dir}/${l}.json`, "utf8"));
const flat = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? flat(v, `${p}${k}.`) : [`${p}${k}`],
  );

const langs = ["tr", "en", "nl"];
const keys = Object.fromEntries(langs.map((l) => [l, new Set(flat(load(l)))]));
let bad = 0;
for (const l of langs.slice(1)) {
  for (const k of keys.tr) if (!keys[l].has(k)) (bad = 1), console.error(`eksik ${l}: ${k}`);
  for (const k of keys[l]) if (!keys.tr.has(k)) (bad = 1), console.error(`fazla ${l}: ${k}`);
}
console.log(langs.map((l) => `${l} ${keys[l].size}`).join(" · "));
process.exit(bad);
```

Kök `package.json` `scripts`'e: `"i18n:check": "node scripts/i18n-parity.mjs"`.

- [ ] **Step 6: Kapanış kapıları** — hepsi yeşil olmadan görev bitmez:

```
source ~/.nvm/nvm.sh && nvm use 22
rtk pnpm i18n:check
rtk pnpm --filter @bumpinto/web exec tsc --noEmit
rtk pnpm test:web
rtk pnpm build:web
rtk pnpm build:web:preprod
rtk grep -rn "className=\|style=" frontend/web/src/pages
rtk grep -rn "TODO\|FIXME\|XXX\|placeholder\|Lorem" frontend/web/src
rtk grep -rn "as any" frontend/web/src
```

- [ ] **Step 7: `serverFields.ts` köprüsü** — B-7 birleşmiş **ve** `rtk pnpm codegen` koşulmuşsa:
  `lib/serverFields.ts` silinir, importlar `@bumpinto/shared`'a döner, `SEND_TRAVEL_MODE` sabiti
  ve `withTravelMode` sarmalayıcısı kaldırılır (gövdeye `travelMode` doğrudan yazılır).
  B-7 henüz birleşmediyse **köprü kalır** ve INDEX'e `K-W<n>` görevi olarak "serverFields
  köprüsünü kaldır (B-7 codegen sonrası)" satırı önerilir (INDEX'i yürüten ajan yazar).

- [ ] **Expected:** tüm kapılar yeşil; `rtk pnpm i18n:check` üç dilde eşit anahtar sayısı basar;
  `grep` taramaları boş.

**Commit önerisi:** `feat(web): analitik olaylari, i18n parite betigi, W-6 kapanisi`

---

## Bilerek YAPMA listesi (karar dokümanı §6 — bağlayıcı)

Aşağıdakiler bu planda **açıkça yasaktır**. Bir görev bunlardan birine ihtiyaç duyuyorsa görev
yanlış anlaşılmıştır; ajan durur ve INDEX'e not düşer.

- ❌ **Gizli tahmin oyunu** ("bakalım hangisi çıkacak") — uzlaşmayı bozar.
- ❌ **Çift "uyum" yüzdesi** — birim gruptur, çift değil.
- ❌ **"Buluştunuz mu?" takibi** — 24 saatlik oturum ömrüyle çalışmaz.
- ❌ **Tinder tarzı tam ekran "match" ekranı** ve **isimli kalpler** — flört taklidi; oybirliği
  dışı yollarda yokluk ifşası.
- ❌ **Rastgele çark / şans oyunu.**
- ❌ **Sürükle-sırala ya da "Favorim"** — bireysel tercih grup kararını değiştirmez.
- ❌ **"ortaya X km" tokenı** — adaleti geometriye indirger; mesafe yalnız sıralama anahtarı,
  Karar'da tek satırlık bağlam (`Herkesin ortasına ~600 m`).
- ❌ **Yön/pusula çipi** ("kuzeyde", "batıda") — çoğu kişi için okunmaz.
- ❌ **Statik harita görseli** — hâlâ Google haritası, 110 px'te okunmaz.
- ❌ **"Hazırım" ile otomatik SWIPING geçişi.**
- ❌ **Wrapped tarzı 3 kartlık özet.**
- ❌ **Podium / "kazanan" dili / sıralama madalyası.**
- ❌ **Deste yarı yol kutlaması** ve **her kaydırmada eşleşme efekti.**
- ❌ **`runoffVotes` ("kim neyi seçti") gösterimi** — sunucu artık göndermiyor; istemci de
  türetmez.
- ❌ **390'da varsayılan harita** (hiçbir ekranda), **Karar ve Bekle'de harita** (hiçbir kırılımda).

---

## Plan sonu doğrulaması

Aşağıdaki liste yürütmenin **son** adımıdır. Her madde ya işaretlenir ya da INDEX'e `K-W<n>`
görevi olarak yazılır (plan gövdesinde açık kalem bırakılmaz — INDEX kural 10).

**Karar dokümanı §4 (9 karar + 5b) kapsaması**

- [ ] §4.1 Minimax birincil / fark ikincil — `frontend/shared/src/fairness.ts` `byFairness`; ekranda yazılan sayı "fark".
- [ ] §4.2 Tek rozet tek kural — `FairnessBadge`; meta satırında `Badge`, foto üstünde değil, `Sticker` değil, ada ek yok.
- [ ] §4.3 TravelChips beş yüzeyde aynı; 3. kişi düşmüyor; "~", "dk", 5 dk, sonda fark, ▲, renk yok; tek i18n anahtarı (`travel.min`).
- [ ] §4.4 Gizlilik — istemci **hiçbir** dakikayı koordinattan hesaplamıyor; yalnız `travelMinutes` okunuyor.
- [ ] §4.5 Adalet öncelikli sıra — deste sırası sunucudan (`deckOrder`), liste sırası `byFairness`; Segmented `Herkese adil · Puan`, varsayılan adil; HandNote tek.
- [ ] §4.5b Ulaşım türü — 5 seçenek, varsayılan CAR, 5 giriş noktası, roster ikonu + aria, orta nokta notu ek almadan.
- [ ] §4.6 Uyum satırı — `FitLine`, ≥2 kategori koşulu, amber "… değil: …", kategori yoksa satır yok.
- [ ] §4.7 Harita politikası — 390'da varsayılan yok; Mekanlar ghost + `React.lazy`; Lobi ghost; **Karar ve Bekle'de yok**.
- [ ] §4.8 Dil sözlüğü — `rtk grep -rni "kazanan\|eşleşme\|match\|favorin" frontend/web/src/i18n` → boş.
- [ ] §4.9 Kart anatomisi — sıra birebir; "Açık" yok; `hoursToday` düz metin; alt atıf satırı.

**§5.B (0–9) kapsaması**

- [ ] B.0 ulaşım türü (Task 6b) · B.1 VenueBrowser (Task 2) · B.2 Lobi haritası (Task 2)
- [ ] B.3 TravelChips + rozet (Task 1) · B.4 Bekle kopyası (Task 3, **K-W3 kapanır**)
- [ ] B.5 FinishedCard `sent` + dürtme + host devam (Task 3) · B.6 geciken notu + 390 beğeni (Task 3)
- [ ] B.7 Runoff treyler/amber/başlık/390 çelişkisi (Task 4) · B.8 Karar (Task 5) · B.9 atıf (Task 2 + 7)

**§5.C kapsaması**

- [ ] Lobi/Bekle: orta nokta kartı, roster satırı, aktivite şeridi + vaat, 4 adımlı stepper, gizlilik satırı, `appear`.
- [ ] Mekanlar: semt (`locality`), uyum satırı, SOLO satır-içi onay kartı (`.f-selcard`).
      **TravelRange (≥4 kişi bar+popover) BİLEREK YAPILMADI** — artboard'da yok, TravelChips sarar.
      **Konumsuz katılımcı notu** — `hasLocation === false` olan katılımcı varsa Mekanlar'da tek `Note`.
- [ ] Deste: uyum satırı, son iki kart kalibrasyonu, Beğendiklerin'de çip+rozet+minimax sıra, gerçek atıf.
- [ ] Deste bitti: 0 beğeni uyarısı, "Herkese adil" rozeti finalist ve kazananda.
- [ ] Runoff: overline, neden kopyası, sunucu-kapılı sayım, "Adil olana bırak", "Hatırlatma gönder".
- [ ] Karar v2: üç eksen, eyebrow, `~600 m`, HandNote, Yedek plan, tek seferlik açılış.

**Yer tutucu ve tip taraması**

- [ ] `rtk grep -rn "TODO\|FIXME\|placeholder\|Lorem\|coming soon\|yakında" frontend/web/src` → boş.
- [ ] `rtk grep -rn "as any\|@ts-ignore\|@ts-expect-error" frontend/web/src` → boş.
- [ ] B-7 alanlarına erişen **her** dosya `lib/serverFields.ts` üzerinden geçiyor (tek köprü).
- [ ] `rtk grep -rn "runoffVotes" frontend/web/src` → boş (sunucu artık göndermiyor).
- [ ] `rtk grep -rn "ratingCount\|TravelRange" frontend/web/src` → boş (ikisi de bilerek çizilmedi).
- [ ] `rtk pnpm test:web` çıktısında `../shared/src/fairness.test.ts` koşuyor (vite `test.include`).
- [ ] `rtk grep -rn "travelMinutes" frontend/web/src` → yalnız `TravelList.tsx` (dakika aritmetiği
      `frontend/shared/src/fairness.ts` içinde tek kaynakta; `MidpointCard` `midpointMinutes` okur).

**Yeşil kapılar**

- [ ] `rtk pnpm i18n:check` — tr/en/nl eşit anahtar sayısı.
- [ ] `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`
- [ ] `rtk pnpm test:web`
- [ ] `rtk pnpm build:web` · `rtk pnpm build:web:preprod`
- [ ] `rtk grep -rn "className=\|style=" frontend/web/src/pages` → boş.
- [ ] Maps anahtarı **yokken** tüm ekranlar hatasız (harita yer tutucu notu; 390'da hiç yüklenmiyor).

**Elle kontrol (kullanıcı ile)**

- [ ] 390 Mekanlar: Network sekmesinde `maps.googleapis.com` isteği **yok**; "Haritada gör"e
      basınca **bir** istek çıkıyor.
- [ ] Grup uçtan uca: Lobi (orta nokta kartı) → Mekanlar (adil sıra) → Deste → Deste bitti
      (gönderildi + dürtme) → Runoff (treyler + sayım) → Karar (neden burası + yedek plan).
- [ ] `prefers-reduced-motion: reduce` ile: sayım animasyonu yok, açılış efekti yok, roster
      `appear` yok.
- [ ] tr/en/nl üç dilde hiçbir metinde ada ek yok, hiçbir satır taşmıyor (390).

**Artboard geri yazımı (kullanıcı)**

- [ ] Claude Design `Web Ekranlar v2.dc.html`: güncellenen etiketler + yeni `Deste bitti 390`,
      `Gönderildi 1280`, `Gönderildi 390`, `Mekanlar grup 390 host`, `Runoff 1280 kilitli`,
      `Karar 1280 oylama`. Verisiz "Açık", şehir, adres, "Şu an açık" artboard'lardan kaldırılır.
