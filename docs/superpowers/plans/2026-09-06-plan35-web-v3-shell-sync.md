# v3 kabuk senkronu — Web (W-13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web istemcisini `Web Ekranlar v3` artboard'larına hizala: erişilebilirlik token'ları düzelir
(üstlük `ink2`, rozet metni ≥ `0.75rem`, amber/pembe rozet metni koyulaşır), seyahat sunumu çipten
**yol çubuğuna** geçer (`RangeBar` liste satırında, `TravelBars` kart ve karar ekranında), sesli
sohbet dock'u masaüstünde sağ altta yüzer ve süre dolumunu adıyla söyler, mekan satırı bugünün
saatini ve "neyle bilinir" satırını taşır, çevrimdışı şeridi ile mekan arama iskeleti gelir.

**Architecture:** Adalet metriğinin TEK kaynağı `frontend/shared/src/fairness.ts` kalır; bu plan onu
`travelMinutes` yerine `VenueDto.travel[]` üzerinden okutur (K-B26). Sunum ikiye ayrılır: `RangeBar`
(bant + baş harf noktaları + "25–35 dk" + `.rg-g` alt satırı) dar liste satırlarına, `TravelBars`
(kişi başı çubuk + fark satırı) kart/karar yüzeylerine. İkisinin yazdığı adalet cümlesi saf bir
modülde (`lib/travelText.ts`) yaşar — `FairnessBadge`'in kuralı oraya taşınır. `TravelChips`,
`FairnessBadge` ve `TravelList` silinir. Ağ durumu tek kancada (`lib/useOnline.ts`) toplanır,
`AppShell` tek şerit basar; mekan arama iskeleti host'un `findVenues` çağrısının `busy` penceresinde
gösterilir (sunucu `SUGGESTING`'i tek işlemde geçtiği için durum tabanlı dal ÖLÜ olurdu).

**Tech Stack:** React 18, zustand 5, Tailwind v4 (`@theme`), react-i18next (tr/en/nl),
vitest + RTL + jsdom, `@bumpinto/shared`, design-sync (DS önizlemeleri).

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` — §2 sözleşme kararları
(`travelMinutes` → `travel[]`, `VenueDto.tagline`), §3 "Web", §4 W-13 paketi. Gereksinimler:
**R-W16** (erişilebilirlik token'ları), **R-W1**/**R-W2** (`RangeBar` + `TravelBars`, 9 bileşenin
geçişi, DS önizlemeleri), **R-W7** (VoiceDock 1280 yerleşimi + 7. durum metni), **R-W8** (mekan
satırı 2.0), **R-W9** (`useOnline` + iskelet). Yeni kopya:
`docs/superpowers/specs/2026-09-06-mobile-design-direction.md` §7.

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya
`Web Ekranlar v3.dc.html`. Artboard'lar: **W3b** Mekanlar grup 1280 (`.rg` + `.rg-g` + `.f-note` +
`.f-attrs`), **W6** Deste 1280 (`.tb` + saat satırı), **W8** Karar 1280 (`.tb` "Herkesin yolu"
kartı), **W3e** Mekanlar yükleniyor 390 (`.sk`), **W10b** Çevrimdışı 390/1280 (amber şerit +
"Tekrar dene"), **W12** Ses dock'u 390 (7 durum), **v3 notları**. Ölçüler `.rg-*`/`.tb-*`/`.g-*`
CSS'inden birebir; rem karşılıkları görevlerde yazılı.

**Ön koşul:** **W-12 (plan31) `done`.** `travel[]` tipini ve `Attribution`'ın `sources[]` güdümlü
hâlini o plan üretir. Doğrula — üçü de ≥ 1 dönmeli:

```bash
grep -c "TravelDto" frontend/shared/src/api-types.ts
grep -c "providers" frontend/web/src/components/molecules/Attribution.tsx
grep -c "configStore" frontend/web/src/components/molecules/Attribution.tsx
```

Sıfır dönen varsa bu plan KOŞMAZ: önce plan31 biter (`TravelDto` yoksa ayrıca `pnpm codegen`).

**Bağlayıcı kurallar:**

- **Git yazma işlemi YOK.** `git add/commit/push/merge/rebase/reset/stash`, `git checkout -- x`,
  `git restore x`, `git show HEAD:x > x` hiçbir adımda kullanılmaz; silme `rm`, taşıma `mv`. Her
  görev "Değişen dosyalar" ile biter; commit'i KULLANICI atar.
- Test komutu (repo kökünden): `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>`
  — aşağıda `PNPM_TEST <yol>`. Kökten çıplak `vitest`/`pnpm test` KOŞMA (41 dosya "window is not
  defined"). Tam koşu: `pnpm test:web`; paylaşılan paket `pnpm --filter @bumpinto/shared test --run`.
- Tailwind utility'leri yalnız `components/` altında; `atoms`/`molecules`/`organisms` ayrımı korunur.
- i18n: `tr` taban, `en`/`nl` parite (`pnpm i18n:check`). Locale JSON'ları elle satır ekleyerek ya da
  şu kalıpla düzenlenir, başka biçimde ASLA:
  ```bash
  python3 - <<'PY'
  import json
  p = "frontend/web/src/i18n/locales/tr.json"
  d = json.load(open(p)); d["travel"]["range"] = "…"
  json.dump(d, open(p, "w"), ensure_ascii=False, indent=2); open(p, "a").write("\n")
  PY
  ```
- **Sunucu alanı yoksa satır çizilmez.** `tagline` (B-15/R-B7) ve oda uzunluğu (VoiceDto'da yok)
  için uydurma değer üretilmez.
- Testler önce yazılır, düştüğü görülür, sonra kod. Yorumlar KISA ve Türkçe.
- **Kapsam DIŞI:** yasal rotalar + `/account*` (W-14), bildir/engelle + dürt + presence 2.0, sonuç
  kartı görseli + ICS (W-15), Apple girişi (W-14). Backend'de `VenueDto.travelMinutes` alanının
  düşmesi K-B26'da (B-15) kalır — bu plan yalnız web'in OKUMAYI bırakmasını yapar.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `i18n/locales/{tr,en,nl}.json`, `styles/app.css`, `atoms/{Badge,Overline}.tsx`, `molecules/{Attribution,VenuePopCard,SessionSteps,InvitePreview,WinnerCard}.tsx`, `organisms/AppShell.tsx` | T1 | R-W16 token/kontrast + tüm yeni kopya |
| `frontend/shared/src/fairness.ts` (+test) | T2 | `travel[]` tek kaynak |
| `web/src/lib/travelText.ts` (+test) | T3 | Adalet cümlesi (eski `FairnessBadge` kuralı) |
| `molecules/RangeBar.tsx` (+test) | T4 | `.rg` bant + noktalar + `.rg-g` |
| `molecules/TravelBars.tsx` (+test) | T5 | `.tb` kişi başı çubuk |
| `lib/venueText.ts`, `molecules/{VenueMeta,VenueCard,LikedList,SelectionCard}.tsx`, silinen `TravelChips`/`FairnessBadge` | T6 | Liste/kart geçişi + R-W8 |
| `molecules/{WinnerCard,WhyHere}.tsx`, `pages/ResultScreen.tsx`, silinen `TravelList` | T7 | Karar/runoff geçişi |
| `store/voiceStore.ts` (+test), `organisms/VoiceDock.tsx` (+test) | T8 | R-W7 yüzen dock + süre ipucu |
| `lib/useOnline.ts` (+test), `molecules/OfflineBanner.tsx` (+test), `organisms/AppShell.tsx` (+test) | T9 | R-W9 çevrimdışı şeridi |
| `molecules/VenueRowSkeleton.tsx`, `organisms/VenuesLoading.tsx` (+test), `pages/{LobbyPage,SoloSetupPage}.tsx` | T10 | R-W9 iskelet |
| `components/index.ts`, `.design-sync/config.json`, `.design-sync/previews/*` | T11 | DS barrel + önizlemeler |
| `docs/superpowers/plans/INDEX.md` | T12 | Doğrulama ve kayıt |

---

### Task 1: R-W16 — erişilebilirlik token'ları ve tüm yeni kopya

**Files:**

- Modify: `frontend/web/src/i18n/locales/tr.json`, `en.json`, `nl.json`
- Modify: `frontend/web/src/styles/app.css`
- Modify: `frontend/web/src/components/atoms/Badge.tsx`, `Overline.tsx`
- Modify: `frontend/web/src/components/molecules/Attribution.tsx`, `VenuePopCard.tsx`,
  `SessionSteps.tsx`, `InvitePreview.tsx`, `WinnerCard.tsx`
- Modify: `frontend/web/src/components/organisms/AppShell.tsx`
- Test: `frontend/web/src/components/atoms/Badge.test.tsx` (yeni)

- [ ] **Step 1: `app.css` `@theme` — rozet metni için iki yeni token**

`--color-amber-wash` satırının ardına ekle:

```css
  /* Artboard `.g-am` / `.g-fl` ezmeleri (v3): rozet METNİ koyulaşır, zemin ve marka rengi
     DEĞİŞMEZ. Ölçüldü — #a96a0b/#fff1d6 = 3.96:1 (AA altı), #7e4f06 = 6.25:1;
     #de2456/#ffe9ef = 4.04:1, #c41c4b = 5.09:1. */
  --color-amber-ink: #7e4f06;
  --color-flame-ink: #c41c4b;
```

- [ ] **Step 2: `Badge.test.tsx` — başarısız testi yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badge from "./Badge";

describe("Badge — R-W16 kontrast ve punto", () => {
  it("amber ve flame rozet metni koyu token kullanır", () => {
    render(<><Badge tone="amber">Kerem için uzak</Badge><Badge tone="flame">Deste açık</Badge></>);
    expect(screen.getByText("Kerem için uzak").className).toContain("text-amber-ink");
    expect(screen.getByText("Deste açık").className).toContain("text-flame-ink");
  });

  it("11px `sm` boyutu kalktı — tek punto 0.75rem", () => {
    render(<Badge>Herkese ~aynı</Badge>);
    const cls = screen.getByText("Herkese ~aynı").className;
    expect(cls).toContain("text-[0.75rem]");
    expect(cls).not.toContain("0.6875rem");
  });
});
```

Run: `PNPM_TEST src/components/atoms/Badge.test.tsx` → 2 test düşer.

- [ ] **Step 3: `Badge.tsx` — tonlar ve tek punto**

`tones`/`sizes` bloklarını, `sizes` JSDoc'unu ve `props` tipini şununla DEĞİŞTİR (`size` prop'u
TAMAMEN kalkar; repoda çağıran yok — `<Badge size=` araması boş döner):

```tsx
const tones = {
  flame: "bg-flame-wash text-flame-ink",
  grass: "bg-grass-wash text-grass",
  amber: "bg-amber-wash text-amber-ink",
  violet: "bg-violet-wash text-violet",
  neutral: "bg-sand text-ink2",
};

export default function Badge(props: { tone?: keyof typeof tones; children: ReactNode }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full " +
        "px-[0.6875rem] py-[0.28125rem] text-[0.75rem] font-bold " + tones[props.tone ?? "neutral"]
      }
    >
      {props.children}
    </span>
  );
}
```

Run: `PNPM_TEST src/components/atoms/Badge.test.tsx` → 2/2 yeşil.

- [ ] **Step 4: `Overline.tsx` — ink3 → ink2, punto 11.5px**

`className`'i şununla değiştir (artboard `.ov { color: var(--ink2); font-size: 11.5px }`):

```tsx
      className={`m-0 text-[0.71875rem] font-bold tracking-[0.11em] uppercase ${
        props.tone === "flame" ? "text-flame-deep" : "text-ink2"
      }`}
```

- [ ] **Step 5: Kalan `ink3` METİN yüzeyleri (dekoratif olanlara DOKUNMA)**

Tek satırlık `text-ink3` → `text-ink2` değişimleri (puntolar DEĞİŞMEZ — artboard `.f-attr` yalnız
rengi ezer): `Attribution.tsx:9`, `VenuePopCard.tsx:48`, `InvitePreview.tsx:24`, `AppShell.tsx:16`
ve `SessionSteps.tsx:21` (`${i <= at ? "text-ink" : "text-ink3"}` → `"text-ink2"`). Dekoratif
`ink3` KALIR: `Avatar` bekleyen zemini, `PrefRow` caret'i, `TextInput` placeholder'ı,
`DecisionBurst` parçacığı, `MapMark` iğnesi, `app.css` `.c-mark-dot`.

- [ ] **Step 6: `WinnerCard` yerel üstlük sabitini `Overline` atomuna katla**

`const OVERLINE = …` satırını sil; `<p className={OVERLINE}>{eyebrow}</p>` →
`<Overline tone="flame">{eyebrow}</Overline>`; import'u
`import { Heading, Highlight, LinkButton, Note, Overline, Sticker } from "../atoms";` yap.
Gerekçe: aynı ölçüler iki yerde yaşıyordu; R-W16 ikisini birden değiştirmek zorunda kalırdı.

- [ ] **Step 7: i18n — planın TÜM yeni anahtarları**

Üç dosyada da `travel`'a üç, `voice`'a bir, `venues`'e dört anahtar EKLENİR (nesneler mevcut —
yerine koyma); `offline` yeni kök alanıdır. Karar kartının başlığı `travel.bars`'tır, `result`'a
anahtar eklenmez.

| Anahtar | tr | en | nl |
|---|---|---|---|
| `travel.range` | `{{min}}–{{max}} dk` | `{{min}}–{{max}} min` | `{{min}}–{{max}} min` |
| `travel.longestName` | `en uzun yol {{name}}` | `longest trip {{name}}` | `langste rit {{name}}` |
| `travel.bars` | `Herkesin yolu` | `Everyone's trip` | `Ieders rit` |
| `voice.endedTimeLimitHint` | `{{min}} dk sesli sohbet bitti` | `{{min}} minutes of voice chat are up` | `{{min}} minuten spraakchat zijn voorbij` |
| `venues.searching` | `mekanlar aranıyor…` | `looking for places…` | `plekken zoeken…` |
| `venues.searchingTitle` | `Çevredeki mekanlar aranıyor` | `Looking for places nearby` | `Plekken in de buurt zoeken` |
| `venues.searchingCopy` | `Herkesin yoluna göre sıralanıyor.` | `Sorted by everyone's trip.` | `Gesorteerd op ieders rit.` |
| `venues.searchingHand` | `genelde 5 saniye sürer` | `usually takes 5 seconds` | `duurt meestal 5 seconden` |
| `offline.title` | `Bağlantı yok` | `No connection` | `Geen verbinding` |
| `offline.hint` | `Son görülen hali gösteriliyor · {{time}}` | `Showing the last version you saw · {{time}}` | `Je ziet de laatst geladen versie · {{time}}` |

Run: `source ./init-nvm.sh && pnpm i18n:check` → `0 fark`.

- [ ] **Step 8: Derle ve tam koşu**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b && pnpm test:web`
Expected: tsc temiz (kalan bir `<Badge size=…>` varsa burada patlar); testler önceki sayı + 2.

- [ ] **Step 9: Değişen dosyalar**

`i18n/locales/{tr,en,nl}.json`, `styles/app.css`, `atoms/Badge.tsx` (+ yeni test),
`atoms/Overline.tsx`, `molecules/{Attribution,VenuePopCard,SessionSteps,InvitePreview,WinnerCard}.tsx`,
`organisms/AppShell.tsx`. Mesaj: `feat(a11y): darker badge ink, ink2 overline, v3 copy keys`.

---

### Task 2: `fairness.ts` tek kaynağı `travel[]`'a taşınır

**Files:**

- Modify: `frontend/shared/src/fairness.ts`
- Test: `frontend/shared/src/fairness.test.ts`

- [ ] **Step 1: Testi `travel[]`'a çevir ve iki kural ekle**

Dosyadaki her `travelMinutes: { a: 20, b: 30 }` sözlüğü
`travel: [{ participantId: "a", minutes: 20 }, { participantId: "b", minutes: 30 }]` olur
(aritmetik beklentileri AYNI). Sona ekle:

```ts
describe("fairnessOf — travel[] sözleşmesi", () => {
  it("participantId'si ya da minutes'i olmayan bacak yok sayılır", () => {
    const f = fairnessOf({ travel: [{ participantId: "a", minutes: 20 }, { minutes: 45 }] });
    expect(f!.entries).toEqual([{ id: "a", minutes: 20 }]);
    expect(f!.max).toBe(20);
  });

  it("hiç geçerli bacak kalmazsa sunucu fairness'ına düşer", () => {
    const f = fairnessOf({
      travel: [{ participantId: "a" }],
      fairness: { maxMinutes: 35, spreadMinutes: 10, longestParticipantId: "b" },
    });
    expect(f!.entries).toEqual([]);
    expect([f!.max, f!.min, f!.longestId]).toEqual([35, 25, "b"]);
  });
});
```

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/shared test --run` → tip hatası + düşen testler.

- [ ] **Step 2: `FairnessVenue`'yü ve `fairnessOf`'un girişini değiştir**

`FairnessVenue` tipini şununla DEĞİŞTİR (`travelMinutes` SİLİNİR):

```ts
/** `VenueDto.travel[]` bacağı (B-13/plan30). `estimated` UI'da kullanılmaz (spec §9). */
export type TravelLeg = { participantId?: string; minutes?: number; estimated?: boolean };

export type FairnessVenue = {
  id?: string;
  rating?: number;
  ratingScale?: number;
  deckOrder?: number;
  /** K-B26: `travelMinutes` yerine TEK kaynak. */
  travel?: TravelLeg[];
  fairness?: { maxMinutes?: number; spreadMinutes?: number; longestParticipantId?: string };
};
```

> `ratingScale` W-12'nin `byRating` normalizasyonundan gelir; W-12 tipe başka alan eklediyse
> SİLME. `byRating` ve `fairestOf` gövdelerine DOKUNULMAZ.

`fairnessOf`'un ilk satırını değiştir; devamı (`if (raw.length === 0) …` ve `const entries = raw.map(…)`)
AYNEN kalır — `raw` yine `[id, minutes]` çiftleri taşır:

```ts
export function fairnessOf(venue: FairnessVenue): Fairness | null {
  const raw = (venue.travel ?? [])
    .filter((leg): leg is { participantId: string; minutes: number } =>
      typeof leg.participantId === "string" && typeof leg.minutes === "number")
    .map((leg) => [leg.participantId, leg.minutes] as const);
```

Yorumlarda geçen `travelMinutes` sözcükleri `travel[]` olur.

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/shared test --run` → yeşil.

- [ ] **Step 3: Değişen dosyalar**

`frontend/shared/src/fairness.ts`, `fairness.test.ts`.
Mesaj: `refactor(fairness): read VenueDto.travel[] instead of travelMinutes`.

> Bu adımdan sonra web'de `venue.travelMinutes` okuyan yerler tsc'de KIRMIZI olur; T6/T7 kapatır.
> Arada `pnpm --filter @bumpinto/web exec tsc -b` koşma.

---

### Task 3: `lib/travelText.ts` — adalet cümlesi tek yerde

**Files:**

- Create: `frontend/web/src/lib/travelText.ts`
- Test: `frontend/web/src/lib/travelText.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { describe, expect, it } from "vitest";
import { fairnessOf } from "@bumpinto/shared";
import { fairnessLine, initialOf } from "./travelText";

const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}(${Object.values(o).join(",")})` : key);
const venue = (m: Record<string, number>) => ({
  travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };
const line = (m: Record<string, number>, tr = travel) => fairnessLine(fairnessOf(venue(m))!, tr, t);

describe("fairnessLine", () => {
  it("fark ≤ 10 dk → yeşil 'Herkese ~aynı' + fark + en uzun yol", () => {
    expect(line({ s: 30, k: 35, a: 25 })).toEqual({
      lead: "fairness.same", leadTone: "grass",
      rest: ["travel.gap(10)", "travel.longestName(Kerem)"],
    });
  });

  it("aykırı kişi varsa lead onu adlandırır, 'en uzun yol' TEKRAR EDİLMEZ", () => {
    expect(line({ s: 20, k: 45, a: 25 })).toEqual({
      lead: "fairness.far(Kerem)", leadTone: "amber", rest: ["travel.gap(25)"],
    });
    expect(line({ s: 45, k: 20, a: 25 }).lead).toBe("fairness.farSelf");
  });

  it("çapalıda lead yok; tek kişide hiçbiri yok; beraberlikte 'en uzun yol' yazılmaz", () => {
    expect(line({ s: 30, k: 35 }, { ...travel, anchored: true }))
      .toEqual({ lead: null, leadTone: null, rest: ["travel.gap(5)", "travel.longestName(Kerem)"] });
    expect(line({ s: 30 }).rest).toEqual([]);
    expect(line({ s: 30, k: 30 }).rest).toEqual(["travel.gap(0)"]);
  });

  it("initialOf ilk harfi locale'e saygılı büyütür; ad yoksa '?'", () => {
    expect([initialOf("ışıl", "tr"), initialOf("Kerem", "tr"), initialOf("", "tr")]).toEqual(["I", "K", "?"]);
  });
});
```

Run: `PNPM_TEST src/lib/travelText.test.ts` → modül yok, düşer.

- [ ] **Step 2: `travelText.ts`'i yaz**

```ts
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
    }
  }
  const rest: string[] = [];
  if (many) rest.push(t("travel.gap", { min: f.spread }));
  // Lead o kişiyi zaten adlandırdıysa tekrar etme ("Kerem için uzak · fark 20 dk").
  const longestName = travel.labels[f.longestId];
  if (many && f.spread !== 0 && longestName && leadTone !== "amber") {
    rest.push(t("travel.longestName", { name: longestName }));
  }
  return { lead, leadTone, rest };
}

/** Yol çubuğu noktasının harfi — ad yoksa "?" (uydurma baş harf yok). */
export function initialOf(label: string, locale: string): string {
  const first = [...label.trim()][0];
  return first ? first.toLocaleUpperCase(locale) : "?";
}
```

Run: `PNPM_TEST src/lib/travelText.test.ts` → 4/4 yeşil.

- [ ] **Step 3: Değişen dosyalar**

`lib/travelText.ts`, `lib/travelText.test.ts`. Mesaj: `feat(travel): pure fairness sentence module`.

---

### Task 4: `RangeBar` — liste satırının yol çubuğu

**Files:**

- Create: `frontend/web/src/components/molecules/RangeBar.tsx`
- Test: `frontend/web/src/components/molecules/RangeBar.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RangeBar from "./RangeBar";

const venue = (m: Record<string, number>) => ({
  id: "v1", name: "Café Berlage",
  travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };

describe("RangeBar", () => {
  it("aralığı, adalet satırını ve baş harfli noktaları basar", () => {
    render(<RangeBar venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    expect(screen.getByText("25–35 dk")).toBeInTheDocument();
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk · en uzun yol Kerem/)).toBeInTheDocument();
    expect(screen.getByTestId("range-dot-s")).toHaveTextContent("S");
    expect(screen.getByTestId("range-dot-s").className).toContain("bg-flame-deep");
    // Noktalar aria-hidden; dakikalar sr-only listede.
    expect(screen.getByText("Kerem ~35 dk")).toBeInTheDocument();
  });

  it("aykırı kişi varsa bant amber, o nokta işaretli", () => {
    render(<RangeBar venue={venue({ s: 20, k: 45, a: 25 })} travel={travel} />);
    expect(screen.getByTestId("range-span").className).toContain("bg-amber");
    expect(screen.getByTestId("range-dot-k").className).toContain("border-amber");
  });

  it("tek kişide bant yok; yol verisi yoksa hiç çizilmez", () => {
    const { rerender, container } = render(<RangeBar venue={venue({ s: 30 })} travel={travel} />);
    expect(screen.getByText("~30 dk")).toBeInTheDocument();
    expect(screen.queryByTestId("range-span")).not.toBeInTheDocument();
    rerender(<RangeBar venue={{ id: "v1", name: "X" }} travel={travel} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Run: `PNPM_TEST src/components/molecules/RangeBar.test.tsx` → düşer.

- [ ] **Step 2: `RangeBar.tsx`'i yaz** (ölçüler `.rg`: iz 6px, nokta 18px, değer 12.5px tabular)

```tsx
/* Artboard `.rg` (W3b/W6) — dar liste satırında TEK yol göstergesi: bant + baş harf noktaları +
   "25–35 dk", altında `.rg-g` adalet satırı. `TravelChips`in yerini alır: 3 kişide çipler satırı
   sarıyor ve rozetle aynı bilgiyi iki kez yazıyordu (v3 notları). */
import { useTranslation } from "react-i18next";
import { fairnessOf, type FairnessVenue } from "@bumpinto/shared";
import { fairnessLine, initialOf } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";

const DOT =
  "absolute top-1/2 -ml-[0.5625rem] flex h-[1.125rem] w-[1.125rem] -translate-y-1/2 items-center " +
  "justify-center rounded-full border-2 bg-white font-head text-[0.5625rem] font-extrabold text-ink shadow-sh1";

/** `.rg-g` satırı — `TravelBars` de aynısını basar, bu yüzden dışa açık (tek kopya). */
export function FairnessNote(props: { line: ReturnType<typeof fairnessLine> }) {
  const { lead, leadTone, rest } = props.line;
  if (!lead && rest.length === 0) return null;
  return (
    <span className="text-[0.75rem] text-ink2">
      {lead && (
        <strong className={leadTone === "amber" ? "font-bold text-amber-ink" : "font-bold text-ink"}>{lead}</strong>
      )}
      {lead && rest.length > 0 && " · "}
      {rest.join(" · ")}
    </span>
  );
}

/** İz uçlarında 10% pay — uç noktalar kırpılmasın (artboard 15%…85%). */
function pos(minutes: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.min(100, Math.max(0, 10 + (80 * (minutes - min)) / (max - min)));
}

export default function RangeBar(props: { venue: FairnessVenue & { name?: string }; travel: TravelInfo }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length === 0) return null;
  const lo = f.entries[f.entries.length - 1].minutes;
  const hi = f.entries[0].minutes;
  const many = f.entries.length > 1;
  const line = fairnessLine(f, props.travel, t);
  const value = f.min === f.max
    ? t("travel.min", { min: f.max })
    : t("travel.range", { min: f.min, max: f.max });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-[1.375rem] items-center gap-2">
        <div className="relative h-1.5 flex-1 rounded-full bg-line2">
          {many && (
            <span
              data-testid="range-span"
              className={`absolute top-0 h-1.5 rounded-full ${f.outlierId ? "bg-amber" : "bg-grass"}`}
              style={{
                left: `${pos(lo, f.min, f.max)}%`,
                width: `${pos(hi, f.min, f.max) - pos(lo, f.min, f.max)}%`,
              }}
            />
          )}
          {f.entries.map((e) => (
            <span
              key={e.id}
              data-testid={`range-dot-${e.id}`}
              aria-hidden
              className={[
                DOT,
                props.travel.selfId && e.id === props.travel.selfId
                  ? "border-flame-deep bg-flame-deep !text-white"
                  : "border-grass",
                e.id === f.outlierId ? "border-amber" : "",
              ].join(" ")}
              style={{ left: `${pos(e.minutes, f.min, f.max)}%` }}
            >
              {initialOf(props.travel.labels[e.id] ?? t("travel.friend"), locale)}
            </span>
          ))}
        </div>
        <span className="min-w-[4rem] text-right text-[0.78125rem] font-bold text-ink tabular-nums">{value}</span>
      </div>
      {/* Noktalar aria-hidden — kişi başı dakika ekran okuyucuya burada verilir. */}
      <ul className="sr-only">
        {f.entries.map((e) => (
          <li key={e.id}>
            {`${props.travel.labels[e.id] ?? t("travel.friend")} ${t("travel.min", { min: e.minutes })}`}
          </li>
        ))}
      </ul>
      <FairnessNote line={line} />
    </div>
  );
}
```

Run: `PNPM_TEST src/components/molecules/RangeBar.test.tsx` → 3/3 yeşil.

- [ ] **Step 3: Değişen dosyalar**

`molecules/RangeBar.tsx` (+test). Mesaj: `feat(travel): RangeBar list gauge`.

---

### Task 5: `TravelBars` — kart ve karar ekranında kişi başı çubuk

**Files:**

- Create: `frontend/web/src/components/molecules/TravelBars.tsx`
- Test: `frontend/web/src/components/molecules/TravelBars.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TravelBars from "./TravelBars";

const venue = (m: Record<string, number>) => ({
  id: "v1", travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
const travel = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };

describe("TravelBars", () => {
  it("herkes için bir satır, kendin en üstte; fark satırı altta", () => {
    render(<TravelBars venue={venue({ s: 30, k: 35, a: 25 })} travel={travel} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Sen")).toBeInTheDocument();
    expect(within(rows[0]).getByText("~30 dk")).toBeInTheDocument();
    expect(screen.getByText(/fark 10 dk/)).toBeInTheDocument();
  });

  it("en uzun yol flame ve en geniş; başlık üstlük olur; veri yoksa hiç çizilmez", () => {
    const { rerender, container } = render(
      <TravelBars venue={venue({ s: 30, k: 40 })} travel={travel} title="Herkesin yolu" />,
    );
    expect(screen.getByText("Herkesin yolu")).toBeInTheDocument();
    expect(screen.getByTestId("travel-fill-k").className).toContain("bg-flame");
    expect(screen.getByTestId("travel-fill-s").className).toContain("bg-grass");
    expect(screen.getByTestId("travel-fill-k")).toHaveStyle({ width: "88%" });
    expect(screen.getByTestId("travel-fill-s")).toHaveStyle({ width: "66%" });
    rerender(<TravelBars venue={{ id: "v1" }} travel={travel} title="Herkesin yolu" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

Run: `PNPM_TEST src/components/molecules/TravelBars.test.tsx` → düşer.

- [ ] **Step 2: `TravelBars.tsx`'i yaz** (ölçüler `.tb`: ızgara `56px 1fr 48px`, çubuk 8px)

```tsx
/* Artboard `.tb` (W6 deste kartı, W8 karar sağ kartı) — kişi başı yol çubuğu. Dar liste
   satırında DEĞİL (orada `RangeBar`): burada yatay yer var, herkes ayrı satır. */
import { useTranslation } from "react-i18next";
import { fairnessOf, type FairnessVenue } from "@bumpinto/shared";
import { fairnessLine } from "../../lib/travelText";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { Overline } from "../atoms";
import { FairnessNote } from "./RangeBar";

const ROW = "grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-[0.78125rem] text-ink2";

export default function TravelBars(props: {
  venue: FairnessVenue;
  travel: TravelInfo;
  /** Kart içinde üstlük (ör. "Herkesin yolu"); deste kartında verilmez. */
  title?: string;
}) {
  const { t } = useTranslation();
  const f = fairnessOf(props.venue);
  if (!f || f.entries.length === 0) return null;
  // Kendi satırın en üstte; kalanlar `fairnessOf` sırasında (en uzun yol önce) — kararlı.
  const rows = [...f.entries].sort(
    (a, b) => Number(b.id === props.travel.selfId) - Number(a.id === props.travel.selfId),
  );
  const line = fairnessLine(f, props.travel, t);

  return (
    <div className="flex flex-col gap-1.5">
      {props.title && <Overline>{props.title}</Overline>}
      <ul className="m-0 flex list-none flex-col gap-[0.3125rem] p-0">
        {rows.map((e) => (
          <li key={e.id} className={ROW}>
            <b className="truncate font-bold text-ink">{props.travel.labels[e.id] ?? t("travel.friend")}</b>
            <span className="relative h-2 overflow-hidden rounded-full bg-line2">
              <i
                data-testid={`travel-fill-${e.id}`}
                className={`absolute inset-y-0 left-0 rounded-full ${e.id === f.longestId ? "bg-flame" : "bg-grass"}`}
                style={{ width: `${Math.max(8, Math.round((e.minutes / (f.max || e.minutes)) * 88))}%` }}
              />
            </span>
            <span className="text-right font-bold text-ink tabular-nums">
              {t("travel.min", { min: e.minutes })}
            </span>
          </li>
        ))}
      </ul>
      <FairnessNote line={line} />
    </div>
  );
}
```

Run: `PNPM_TEST src/components/molecules/TravelBars.test.tsx` → 2/2 yeşil.

- [ ] **Step 3: Değişen dosyalar**

`molecules/TravelBars.tsx` (+test). Mesaj: `feat(travel): TravelBars per-person gauge`.

---

### Task 6: Liste ve kart yüzeyleri geçer; R-W8 mekan satırı 2.0

**Files:**

- Create: `frontend/web/src/lib/venueText.ts`
- Modify: `frontend/web/src/components/molecules/VenueMeta.tsx`, `VenueCard.tsx`, `LikedList.tsx`,
  `SelectionCard.tsx`; `frontend/web/src/lib/useTravelLabels.ts`
- Delete: `frontend/web/src/components/molecules/TravelChips.tsx`, `TravelChips.test.tsx`,
  `FairnessBadge.tsx`, `FairnessBadge.test.tsx`
- Test: `VenueCard.test.tsx`, `LikedList.test.tsx`, `SelectionCard.test.tsx`, `RunoffTie.test.tsx`,
  `RunoffTrailer.test.ts`, `WhyHere.test.tsx`, `useTravelLabels.test.ts`,
  `organisms/VenueBrowser.test.tsx`

- [ ] **Step 1: `venueText.ts` — "neyle bilinir" erişimcisi**

`VenueDto.tagline` sözleşmede karar verildi (§2) ama alanı **B-15/R-B7** üretecek; `api-types.ts`'te
henüz yok. Cast tek yerde durur:

```ts
/* R-W8 — "neyle bilinir" satırı. Alan sözleşmede (§2) ama B-15'e kadar openapi'de YOK; bu dosya
   alan geldiğinde silinir. Boş dize satırı çizdirmez: uydurma metin yazılmaz. */
import type { VenueDto } from "@bumpinto/shared";

export function taglineOf(venue: VenueDto): string | null {
  const raw = (venue as VenueDto & { tagline?: unknown }).tagline;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  return text === "" ? null : text;
}
```

- [ ] **Step 2: `VenueMeta.tsx`'i yeniden yaz** (R-W1 liste satırı + R-W8 saat/tagline)

```tsx
import { useTranslation } from "react-i18next";
import type { VenueDto } from "@bumpinto/shared";
import { formatRating } from "../../lib/format";
import type { TravelInfo } from "../../lib/useTravelLabels";
import { taglineOf } from "../../lib/venueText";
import RangeBar from "./RangeBar";

/** Mekan satırı gövdesi (artboard `.vrow`): ★ puan · fiyat · bugünün saati · semt, altında
    "neyle bilinir" ve yol çubuğu. Adalet rozeti KALKTI (v3): aynı cümle `RangeBar`ın `.rg-g`
    satırında yaşıyor. `ratingCount` kasıtlı olarak YOK (§4.9). */
export default function VenueMeta(props: { venue: VenueDto; travel: TravelInfo; midpointLabel?: string }) {
  const { t } = useTranslation();
  const v = props.venue;
  const hasPrice = v.priceLevel != null && v.priceLevel > 0;
  // Semt YALNIZ orta nokta etiketinden farklıysa (§4.9).
  const locality = v.locality && v.locality !== props.midpointLabel ? v.locality : null;
  const tagline = taglineOf(v);
  // Artboard W3b: "★ 4.6 · €€ · Bugün 08:00–18:00 · merkez" — saat listede de basılır (R-W8).
  const parts = [
    v.rating != null ? `★ ${formatRating(v.rating)}` : null,
    hasPrice ? "€".repeat(v.priceLevel!) : null,
    v.hoursToday ? t("venue.hoursToday", { hours: v.hoursToday }) : null,
    locality,
  ].filter((p): p is string => !!p);

  return (
    <>
      {parts.length > 0 && <span className="text-[0.75rem] text-ink2 tabular-nums">{parts.join(" · ")}</span>}
      {/* Alan gelmezse satır HİÇ çizilmez (R-W8). */}
      {tagline && <span className="text-[0.75rem] text-ink2">{tagline}</span>}
      <RangeBar venue={v} travel={props.travel} />
    </>
  );
}
```

> `formatRating`'in imzası W-12'de `(rating, scale)` olduysa çağrıyı
> `formatRating(v.rating, v.ratingScale)` yap — tsc bunu Step 6'da yakalar.

- [ ] **Step 3: `VenueCard.tsx` — iki dalın seyahat sunumu + tagline**

`row` dalında (07 Runoff satır kartı): `<FairnessBadge …/>` **sil**;
`<TravelChips venue={v} travel={travel} size="sm" />` → `<RangeBar venue={v} travel={travel} />`.
`polaroid` dalında: `<FairnessBadge …/>` + `<TravelChips …/>` ikilisi **tek**
`<TravelBars venue={v} travel={travel} />` olur (artboard W6) ve satır 230–231'deki "Badge zaten
inline-flex …" yorumu silinir. `{v.hoursToday && …}` bloğundan HEMEN SONRA:

```tsx
              {taglineOf(v) && <span className="text-[0.75rem] text-ink2">{taglineOf(v)}</span>}
```

`FitLine` ("Kahve için: espresso bar") YERİNDE KALIR — o kategori uyumu, bu betimleme.
Import'lardan `FairnessBadge` ve `TravelChips` çıkar; `RangeBar`, `TravelBars`, `taglineOf` girer.

- [ ] **Step 4: `LikedList.tsx` ve `SelectionCard.tsx`**

`LikedList.tsx`: `FairnessBadge` + `TravelChips` çifti → `<RangeBar venue={v} travel={travel} />`
(artboard W6 "Beğendiklerin" `.f-lk` satırı `.rg` + `.rg-g` taşıyor). `SelectionCard.tsx`:
`<TravelChips … size="sm" />` → `<RangeBar venue={props.venue} travel={props.travel} />`.
İki dosyada da import'lar güncellenir.

- [ ] **Step 5: Eski bileşenleri sil**

```bash
rm frontend/web/src/components/molecules/TravelChips.tsx \
   frontend/web/src/components/molecules/TravelChips.test.tsx \
   frontend/web/src/components/molecules/FairnessBadge.tsx \
   frontend/web/src/components/molecules/FairnessBadge.test.tsx
```

`lib/useTravelLabels.ts`: JSDoc'ta "TravelChips/FairnessBadge girdisi" → "RangeBar/TravelBars
girdisi", `travelMinutes` → `travel[]`, `anchored` yorumundaki bileşen listesi
"(`RangeBar`, `TravelBars`)" olur. `useTravelLabels.test.ts`'te `FairnessBadge` geçen test
adları `RangeBar` olarak yeniden adlandırılır (davranış aynı).

- [ ] **Step 6: Etkilenen testleri çevir**

Şu dosyalarda HER `travelMinutes: { … }` fixture'ı `travel: [{ participantId, minutes }, …]`
olur: `VenueCard.test.tsx`, `LikedList.test.tsx`, `SelectionCard.test.tsx`, `RunoffTie.test.tsx`,
`RunoffTrailer.test.ts`, `WhyHere.test.tsx`, `VenueBrowser.test.tsx`, `useTravelLabels.test.ts`.
Örnek: `travelMinutes: { h: 34, a: 28 }` →
`travel: [{ participantId: "h", minutes: 34 }, { participantId: "a", minutes: 28 }]`.

Beklenti düzeltmeleri: `"Sen ~30 dk"` arayanlar `RangeBar`ın sr-only listesinde aynı metni bulur
(değişiklik yok) · `"fark 10 dk"` artık lead ile aynı `<span>` içinde → `getByText(/fark 10 dk/)` ·
adalet rozetini `Badge` olarak arayanlar metne çevrilir (`getByText("Herkese ~aynı")`).
`VenueBrowser.test.tsx`'e R-W8 için iki test ekle (ilk mekana `hoursToday: "08:00 – 18:00"` vererek):

```tsx
  it("satırda bugünün saati basılır", () => {
    expect(screen.getByText(/Bugün 08:00 – 18:00/)).toBeInTheDocument();
  });

  it("tagline alanı yoksa o satır hiç çizilmez", () => {
    expect(screen.queryByText(/Sakin, oturmalı/)).not.toBeInTheDocument();
  });
```

Run: `PNPM_TEST src/components/molecules src/components/organisms/VenueBrowser.test.tsx src/lib`
Expected: hepsi yeşil. (`tsc -b` HENÜZ temiz değil — `TravelList`/`ResultScreen` T7'de kapanır.)

- [ ] **Step 7: Değişen dosyalar**

`lib/{venueText,useTravelLabels}.ts` (+`useTravelLabels.test.ts`),
`molecules/{VenueMeta,VenueCard,LikedList,SelectionCard}.tsx`, silinen
`molecules/{TravelChips,FairnessBadge}.tsx` (+testleri), 8 test dosyası.
Mesaj: `feat(venues): RangeBar rows with hours and tagline, drop TravelChips/FairnessBadge`.

> `VenueRow.tsx` DEĞİŞMEZ: satır gövdesini `VenueMeta` taşıyor. R-W2'nin listesinde olmasının
> sebebi dokunulan yüzeyler arasında olması; kod değişikliği çıkmadı.

---

### Task 7: Karar ve runoff yüzeyleri; `TravelList` kalkar

**Files:**

- Modify: `frontend/web/src/components/molecules/WinnerCard.tsx`, `WhyHere.tsx`,
  `frontend/web/src/pages/ResultScreen.tsx`, `DeckScreen.tsx`
- Delete: `frontend/web/src/components/molecules/TravelList.tsx`
- Test: `pages/ResultScreen.test.tsx`, `RunoffScreen.test.tsx`, `DeckScreen.test.tsx`,
  `SessionPage.test.tsx`, `VenuesPage.test.tsx`

- [ ] **Step 1: `ResultScreen.test.tsx`'i yeni sunuma göre yaz**

`travelMinutes` fixture'ları `travel[]`'a çevrilir. `data-testid="travel-list"` arayan testler
şununla değiştirilir:

```tsx
  it("karar ekranı herkesin yolunu çubuk olarak basar", () => {
    show(decided());
    expect(screen.getByText("Herkesin yolu")).toBeInTheDocument();
    expect(screen.getByTestId("travel-fill-h")).toBeInTheDocument();
    expect(screen.getByTestId("travel-fill-a")).toBeInTheDocument();
    expect(screen.queryByTestId("travel-list")).not.toBeInTheDocument();
  });
```

Run: `PNPM_TEST src/pages/ResultScreen.test.tsx` → düşer.

- [ ] **Step 2: `ResultScreen.tsx` — `TravelList` yerine `TravelBars`**

`import TravelList …` → `import TravelBars from "../components/molecules/TravelBars";`.
Sağ bölgedeki `<TravelList … />` satırını değiştir:

```tsx
            <div className="rounded-card border border-line bg-card p-[1rem_1.125rem] shadow-sh1">
              <TravelBars venue={winner} travel={travel} title={t("travel.bars")} />
            </div>
```

`selfId` değişkeni artık kullanılmıyorsa satırını sil (`travel.selfId` aynı bilgiyi taşıyor).
Satır 48'deki `// travelMinutes …` yorumu `travel[]` olur. Sonra:

```bash
rm frontend/web/src/components/molecules/TravelList.tsx
```

- [ ] **Step 3: Yorum ve kalan test temizliği**

`WinnerCard.tsx` JSDoc'unda "seyahat çipleri" → "yol çubukları" (kart gövdesini zaten `VenueCard`
basıyor; kod değişmez). `WhyHere.tsx` ve `DeckScreen.tsx` yorumlarında `travelMinutes` → `travel[]`.
`RunoffScreen.test.tsx`, `DeckScreen.test.tsx`, `SessionPage.test.tsx`, `VenuesPage.test.tsx`
fixture'ları `travel[]`'a çevrilir.

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b`
Expected: temiz. Doğrula:

```bash
grep -rn "travelMinutes" frontend/web/src frontend/shared/src | grep -v api-types.ts
```

Expected: çıktı YOK (`api-types.ts` sunucudan üretilir; alan K-B26'da düşer).

Run: `source ./init-nvm.sh && pnpm test:web` → tüm süit yeşil.

- [ ] **Step 4: Değişen dosyalar**

`molecules/{WinnerCard,WhyHere}.tsx`, silinen `molecules/TravelList.tsx`,
`pages/{ResultScreen,DeckScreen}.tsx`, 5 test dosyası.
Mesaj: `feat(result): TravelBars on decision screen, retire TravelList`.

---

### Task 8: R-W7 — VoiceDock masaüstünde yüzer + süre dolumu ipucu

**Files:**

- Modify: `frontend/web/src/store/voiceStore.ts`,
  `frontend/web/src/components/organisms/VoiceDock.tsx`
- Test: `frontend/web/src/store/voiceStore.test.ts`,
  `frontend/web/src/components/organisms/VoiceDock.test.tsx`

- [ ] **Step 1: `voiceStore.test.ts`'e oda uzunluğu testlerini ekle**

```ts
import { resetVoiceRoom } from "./voiceStore";

const withVoice = (min: number) => ({
  ...base, voice: { endsAt: new Date(Date.now() + min * 60_000).toISOString() },
});

describe("voiceStore — oda uzunluğu (limitMinutes)", () => {
  it("oda GÖZ ÖNÜNDE açılırsa uzunluk türetilir", () => {
    resetVoiceRoom();
    useSessionStore.setState({ slug: "x", view: { ...base, voice: null } as never });
    useSessionStore.setState({ slug: "x", view: withVoice(30) as never });
    expect(useVoiceStore.getState().limitMinutes).toBe(30);
  });

  it("oda ZATEN açıkken sayfaya gelindiyse uzunluk bilinmez", () => {
    resetVoiceRoom();
    useSessionStore.setState({ slug: "x", view: withVoice(12) as never });
    expect(useVoiceStore.getState().limitMinutes).toBeNull();
  });
});
```

> İkinci test `lastEndsAt`'in null OLMADIĞI durumu kurar: `resetVoiceRoom()` modül hafızasını
> sıfırlar, ardından ilk görünüm zaten dolu `endsAt` taşır → "açılış" gözlenmemiştir.
> Bu testin doğru çalışması için `beforeEach` içinde başka bir görünüm yazılmamalı.

- [ ] **Step 2: `voiceStore.ts` — `limitMinutes` alanı ve gözlemci**

`VoiceState` tipine ekle, başlangıç değerini (`connectFailed: false` satırından sonra)
`limitMinutes: null,` yap:

```ts
  /** Odanın toplam uzunluğu (dk). `VoiceDto` yalnız `endsAt` taşıdığı için ancak odanın
      AÇILDIĞI an gözlenerek türetilir; oda açıkken gelen kişide `null` kalır ve dock süre
      ipucunu HİÇ basmaz (uydurma yok). */
  limitMinutes: number | null;
```

Dosyanın SONUNA, mevcut `useSessionStore.subscribe(…)` bloğundan sonra ekle:

```ts
/* Oda açılışını izleyen ikinci abonelik — roster aboneliği "in/joining" dışında erken dönüyor,
   uzunluk ise oda kapalıyken (idle) yakalanmak zorunda. */
let lastEndsAt: string | null = null;

/** Test kancası: modül düzeyindeki oda hafızasını sıfırlar. */
export function resetVoiceRoom() {
  lastEndsAt = null;
  useVoiceStore.setState({ limitMinutes: null });
}

useSessionStore.subscribe((state) => {
  const endsAt = state.view?.voice?.endsAt ?? null;
  if (endsAt === lastEndsAt) return;
  const opened = lastEndsAt === null && endsAt !== null;
  lastEndsAt = endsAt;
  if (!opened) return;
  const minutes = Math.round((new Date(endsAt).getTime() - Date.now()) / 60_000);
  useVoiceStore.setState({ limitMinutes: minutes > 0 ? minutes : null });
});
```

Run: `PNPM_TEST src/store/voiceStore.test.ts` → yeşil.

- [ ] **Step 3: `VoiceDock.test.tsx`'e üç test ekle**

`dock()` yardımcısının `useVoiceStore.setState({ … })` çağrısına `limitMinutes: null,`
varsayılanını EKLE (aksi hâlde `useShallow` seçicisi tanımsız okur).

```tsx
  it("süre dolunca uzunluk biliniyorsa ipucu basılır, bilinmiyorsa satır çizilmez", () => {
    const view = { ...base, voice: null, viewer: { participantId: "a", host: false } };
    const { unmount } = dock(view, { endedReason: "TIME_LIMIT", limitMinutes: 30 });
    expect(screen.getByText("Süre doldu")).toBeInTheDocument();
    expect(screen.getByText("30 dk sesli sohbet bitti")).toBeInTheDocument();
    unmount();
    dock(view, { endedReason: "TIME_LIMIT", limitMinutes: null });
    expect(screen.queryByText(/sesli sohbet bitti/)).not.toBeInTheDocument();
  });

  it("masaüstünde dock sağ altta yüzer", () => {
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "a", host: false } });
    const region = screen.getByRole("region", { name: "Sesli sohbet" });
    expect(region.className).toContain("lg:fixed");
    expect(region.className).toContain("lg:right-6");
    expect(region.className).toContain("lg:bottom-6");
  });
```

Run: `PNPM_TEST src/components/organisms/VoiceDock.test.tsx` → 2 test düşer.

- [ ] **Step 4: `VoiceDock.tsx` — yüzen kabuk ve ipucu**

`Bar`'ın `className`'ini değiştir (artboard W12: 390'da alt şerit, 1280'de sağ altta yüzen kart):

```tsx
      className={
        "order-last sticky bottom-0 z-40 border-t border-line bg-card shadow-sh1 " +
        "pb-[max(0.75rem,env(safe-area-inset-bottom))] " +
        // lg+: akıştan çıkar, sağ altta yüzer kart olur (artboard 1280 dock).
        "lg:fixed lg:right-6 lg:bottom-6 lg:left-auto lg:z-50 lg:w-auto lg:max-w-[32rem] " +
        "lg:rounded-card lg:border lg:border-line lg:pb-3 lg:shadow-sh2"
      }
```

İç sarmalayıcıda `lg:max-w-[80rem] xl:max-w-[96rem]` sınıflarını SİL, yerine
`lg:max-w-none lg:px-4 lg:pt-3` yaz. `voice` seçicisine `limitMinutes: s.limitMinutes,` ekle.
Bitiş sebebi bloğundaki `aria-live` `<span>`'inin ALTINA:

```tsx
        {voice.endedReason === "TIME_LIMIT" && voice.limitMinutes != null && (
          <span className="text-[0.8125rem] text-ink2">
            {t("voice.endedTimeLimitHint", { min: voice.limitMinutes })}
          </span>
        )}
```

Run: `PNPM_TEST src/components/organisms/VoiceDock.test.tsx` → tümü yeşil.

- [ ] **Step 5: Değişen dosyalar**

`store/voiceStore.ts` (+test), `organisms/VoiceDock.tsx` (+test).
Mesaj: `feat(voice): floating desktop dock and time-limit hint`.

---

### Task 9: R-W9 — `useOnline` kancası ve çevrimdışı şeridi

**Files:**

- Create: `frontend/web/src/lib/useOnline.ts`,
  `frontend/web/src/components/molecules/OfflineBanner.tsx`
- Modify: `frontend/web/src/components/organisms/AppShell.tsx`
- Test: `lib/useOnline.test.ts`, `molecules/OfflineBanner.test.tsx`, `organisms/AppShell.test.tsx`

- [ ] **Step 1: `useOnline.test.ts` — başarısız test**

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnline } from "./useOnline";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}
afterEach(() => setOnline(true));

describe("useOnline", () => {
  it("başlangıç değeri navigator.onLine", () => {
    setOnline(false);
    expect(renderHook(() => useOnline()).result.current.online).toBe(false);
  });

  it("olayları izler ve düşüş anını damgalar", () => {
    vi.setSystemTime(new Date("2026-09-06T12:38:00Z"));
    const { result } = renderHook(() => useOnline());
    expect(result.current.online).toBe(true);
    act(() => setOnline(false));
    expect(result.current.online).toBe(false);
    expect(result.current.lastOnlineAt).toBe(Date.parse("2026-09-06T12:38:00Z"));
    act(() => setOnline(true));
    expect(result.current.online).toBe(true);
    vi.useRealTimers();
  });

  it("dinleyiciler unmount'ta sökülür", () => {
    const off = vi.spyOn(window, "removeEventListener");
    renderHook(() => useOnline()).unmount();
    expect(off).toHaveBeenCalledWith("offline", expect.any(Function));
    off.mockRestore();
  });
});
```

Run: `PNPM_TEST src/lib/useOnline.test.ts` → düşer.

- [ ] **Step 2: `useOnline.ts`'i yaz**

```ts
/* R-W9 — ağ durumunun TEK kaynağı; şerit ve iskelet `navigator.onLine`ı kendi başlarına okumaz. */
import { useEffect, useState } from "react";

export type OnlineState = {
  online: boolean;
  /** Çevrimdışına düşülen an (epoch ms); hiç düşülmediyse `null`. */
  lastOnlineAt: number | null;
};

export function useOnline(): OnlineState {
  const [state, setState] = useState<OnlineState>(() => ({
    // Desteklenmiyorsa (eski WebView) ÇEVRİMİÇİ say — yanlış şerit basmak, basmamaktan kötüdür.
    online: typeof navigator.onLine === "boolean" ? navigator.onLine : true,
    lastOnlineAt: null,
  }));
  useEffect(() => {
    const goOffline = () => setState((s) => (s.online ? { online: false, lastOnlineAt: Date.now() } : s));
    const goOnline = () => setState((s) => ({ online: true, lastOnlineAt: s.lastOnlineAt }));
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);
  return state;
}
```

Run: `PNPM_TEST src/lib/useOnline.test.ts` → 3/3 yeşil.

- [ ] **Step 3: `OfflineBanner.test.tsx` — başarısız test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfflineBanner from "./OfflineBanner";

describe("OfflineBanner", () => {
  it("çevrimiçiyken hiç çizilmez", () => {
    const { container } = render(<OfflineBanner online lastOnlineAt={null} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("çevrimdışında başlık ve saatli ipucu basar", () => {
    render(<OfflineBanner online={false} lastOnlineAt={Date.parse("2026-09-06T12:38:00Z")} onRetry={vi.fn()} />);
    expect(screen.getByText("Bağlantı yok")).toBeInTheDocument();
    expect(screen.getByText(/Son görülen hali gösteriliyor ·/)).toBeInTheDocument();
  });

  it("saat bilinmiyorsa yalnız başlık; 'Tekrar dene' geri çağrıyı çalıştırır", () => {
    const retry = vi.fn();
    render(<OfflineBanner online={false} lastOnlineAt={null} onRetry={retry} />);
    expect(screen.queryByText(/Son görülen hali/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
```

Run: `PNPM_TEST src/components/molecules/OfflineBanner.test.tsx` → düşer.

- [ ] **Step 4: `OfflineBanner.tsx`'i yaz**

```tsx
/* Artboard W10b (1280 + 390) — amber şerit sayfanın ÜSTÜNDE durur, içerik silinmez.
   Yeniden deneme gerçek bir eylemdir: sayfa yeniden yüklenir, store'lar baştan çeker. */
import { WifiSlash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Button } from "../atoms";

export default function OfflineBanner(props: {
  online: boolean;
  lastOnlineAt: number | null;
  onRetry: () => void;
}) {
  const { t, i18n } = useTranslation();
  if (props.online) return null;
  const time = props.lastOnlineAt == null ? null
    : new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
        hour: "2-digit", minute: "2-digit",
      }).format(props.lastOnlineAt);

  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-center gap-3 rounded-[0.875rem] border border-line2 bg-amber-wash px-4 py-2.5 lg:mx-12"
    >
      <WifiSlash size={21} aria-hidden className="flex-none text-amber-ink" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[0.875rem] font-bold">{t("offline.title")}</span>
        {time && <span className="text-[0.75rem] text-ink2 tabular-nums">{t("offline.hint", { time })}</span>}
      </div>
      <Button type="button" kind="white" size="sm" onClick={props.onRetry}>{t("common.retry")}</Button>
    </div>
  );
}
```

Run: `PNPM_TEST src/components/molecules/OfflineBanner.test.tsx` → 3/3 yeşil.

- [ ] **Step 5: `AppShell.tsx`'e bağla ve test et**

`TopBar`'ın hemen ardına şerit girer (import'lara `useOnline` + `OfflineBanner` eklenir):

```tsx
  const { online, lastOnlineAt } = useOnline();
  …
      <TopBar />
      {/* Tek yer, tek kural: /sessions, oturum ekranları ve profil aynı şeridi görür. */}
      <OfflineBanner online={online} lastOnlineAt={lastOnlineAt} onRetry={() => location.reload()} />
      <Outlet />
```

`AppShell.test.tsx` (yoksa oluştur):

```tsx
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import AppShell from "./AppShell";

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}
afterEach(() => setOnline(true));

const shell = () =>
  render(
    <MemoryRouter initialEntries={["/sessions"]}>
      <Routes>
        <Route element={<AppShell />}><Route path="/sessions" element={<p>liste</p>} /></Route>
      </Routes>
    </MemoryRouter>,
  );

describe("AppShell — çevrimdışı şeridi", () => {
  it("şerit yalnız çevrimdışında çıkar; sayfa içeriği kalır", () => {
    shell();
    expect(screen.queryByText("Bağlantı yok")).not.toBeInTheDocument();
    act(() => setOnline(false));
    expect(screen.getByText("Bağlantı yok")).toBeInTheDocument();
    expect(screen.getByText("liste")).toBeInTheDocument();
  });
});
```

Run: `PNPM_TEST src/components/organisms/AppShell.test.tsx` → 1/1 yeşil.

- [ ] **Step 6: Değişen dosyalar**

`lib/useOnline.ts` (+test), `molecules/OfflineBanner.tsx` (+test), `organisms/AppShell.tsx` (+test).
Mesaj: `feat(offline): useOnline hook and offline banner`.

---

### Task 10: R-W9 — mekan arama iskeleti

**Files:**

- Create: `frontend/web/src/components/molecules/VenueRowSkeleton.tsx`,
  `frontend/web/src/components/organisms/VenuesLoading.tsx`
- Modify: `frontend/web/src/pages/LobbyPage.tsx`, `SoloSetupPage.tsx`
- Test: `organisms/VenuesLoading.test.tsx`, `pages/LobbyPage.test.tsx`

- [ ] **Step 1: `VenuesLoading.test.tsx` — başarısız test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenuesLoading from "./VenuesLoading";

describe("VenuesLoading", () => {
  it("arama başlığını, kopyayı ve dört iskelet satırı basar", () => {
    render(<VenuesLoading name="Cuma kahvesi" />);
    expect(screen.getByText("Cuma kahvesi")).toBeInTheDocument();
    expect(screen.getByText("mekanlar aranıyor…")).toBeInTheDocument();
    expect(screen.getByText("Çevredeki mekanlar aranıyor")).toBeInTheDocument();
    expect(screen.getAllByTestId("venue-skeleton")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    // Nabız yalnız hareket açıkken (app.css reduced-motion kuralını okunur kılar).
    expect(screen.getAllByTestId("venue-skeleton")[0].querySelector("span")!.className)
      .toContain("motion-safe:animate-pulse");
  });
});
```

Run: `PNPM_TEST src/components/organisms/VenuesLoading.test.tsx` → düşer.

- [ ] **Step 2: `VenueRowSkeleton.tsx` ve `VenuesLoading.tsx`'i yaz**

```tsx
/* Artboard W3e `.sk` — mekan satırı iskeleti: 56×64 görsel kutusu + üç metin şeridi. Nabız
   `motion-safe:` ile: `app.css` `prefers-reduced-motion`da tüm animasyonları zaten kapatıyor,
   sınıf o kararı OKUNUR ve test edilebilir kılar. */
const BLOCK = "block rounded-[0.625rem] bg-sand motion-safe:animate-pulse";

export default function VenueRowSkeleton() {
  return (
    <div data-testid="venue-skeleton" aria-hidden className="flex items-center gap-3 px-3.5 py-[0.6875rem]">
      <span className={`${BLOCK} h-16 w-14 flex-none rounded-xl`} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`${BLOCK} h-3.5 w-[70%]`} />
        <span className={`${BLOCK} h-3 w-1/2`} />
        <span className={`${BLOCK} h-2 w-full`} />
      </span>
    </div>
  );
}
```

```tsx
/* Artboard W3e — host "Mekanları bul"a bastığı andan liste gelene kadar. Durum tabanlı DEĞİL:
   sunucu SUGGESTING'i tek işlemde geçiyor (DeckFlow.findVenues), ekran istemcinin bekleyen
   çağrısına bağlıdır. */
import { useTranslation } from "react-i18next";
import { HandNote, Lead, Page } from "../atoms";
import SessionHeader from "../molecules/SessionHeader";
import VenueRowSkeleton from "../molecules/VenueRowSkeleton";

export default function VenuesLoading(props: { name?: string }) {
  const { t } = useTranslation();
  return (
    <Page>
      <SessionHeader as="h1" title={props.name} meta={t("venues.searching")} />
      <div role="status" aria-busy="true" className="flex flex-col items-center gap-1.5 py-1">
        <h2 className="text-center">{t("venues.searchingTitle")}</h2>
        <Lead>{t("venues.searchingCopy")}</Lead>
      </div>
      <div className="flex flex-col rounded-card border border-line bg-card py-1 shadow-sh1">
        {[0, 1, 2, 3].map((i) => <VenueRowSkeleton key={i} />)}
      </div>
      <HandNote center>{t("venues.searchingHand")}</HandNote>
    </Page>
  );
}
```

> `Lead` `center` prop'u TAŞIMAZ (`HandNote` taşır) — yeni prop EKLEME; başlık bloğu zaten
> `items-center` ile ortalanıyor.

Run: `PNPM_TEST src/components/organisms/VenuesLoading.test.tsx` → 1/1 yeşil.

- [ ] **Step 3: `LobbyPage.test.tsx`'e bekleme testi ekle**

```tsx
  it("'Mekanları bul' basılınca istek sürerken iskelet gösterilir", async () => {
    let resolve!: () => void;
    const findVenues = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    useSessionStore.setState({ findVenues } as never);
    render(<LobbyPage view={ready as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Mekanları bul" }));
    expect(await screen.findByText("mekanlar aranıyor…")).toBeInTheDocument();
    await act(async () => { resolve(); });
  });
```

Run: `PNPM_TEST src/pages/LobbyPage.test.tsx` → düşer.

- [ ] **Step 4: `LobbyPage.tsx` ve `SoloSetupPage.tsx`'e dalı ekle**

`LobbyPage.tsx`'te `const { run, busy, error } = useSessionAction();` satırından SONRA, `return`'den
ÖNCE (import: `import VenuesLoading from "../components/organisms/VenuesLoading";`):

```tsx
  // İstek uçarken tüm ekran iskelete döner (artboard W3e): "Mekanları bul" tek yönlü bir kapı,
  // arkasında lobi tazelenmiyor.
  if (busy) return <VenuesLoading name={view.name} />;
```

`SoloSetupPage.tsx`'te aynı deseni uygula — mekan aramasını yürüten `useSessionAction()` örneğinin
`busy` alanını kullan. Sayfada birden çok `useSessionAction()` varsa ve `busy` başka bir eylemi de
kapsıyorsa bu adımı SoloSetup için ATLA ve "Değişen dosyalar" notuna
"SoloSetup tek `run` kullanmıyor — K-W kaydı açılsın" yaz.

Run: `PNPM_TEST src/pages/LobbyPage.test.tsx src/pages/SoloSetupPage.test.tsx` → yeşil.

- [ ] **Step 5: Değişen dosyalar**

`molecules/VenueRowSkeleton.tsx`, `organisms/VenuesLoading.tsx` (+test),
`pages/{LobbyPage,SoloSetupPage}.tsx`, `pages/LobbyPage.test.tsx`.
Mesaj: `feat(venues): searching skeleton while findVenues is in flight`.

---

### Task 11: DS barrel, `.design-sync` yapılandırması ve önizlemeler

**Files:**

- Modify: `frontend/web/src/components/index.ts`, `.design-sync/config.json`
- Modify: `.design-sync/previews/_fixtures.ts`, `VenueCard.tsx`, `VenueCheckRow.tsx`,
  `WinnerCard.tsx`, `LikedList.tsx`, `RunoffList.tsx`
- Create: `.design-sync/previews/RangeBar.tsx`, `TravelBars.tsx`, `OfflineBanner.tsx`,
  `VenuesLoading.tsx`
- Delete: `.design-sync/previews/TravelList.tsx`

- [ ] **Step 1: Barrel'ı güncelle**

`components/index.ts`'te `TravelList` satırını SİL; alfabetik yerlerine ekle:

```ts
export { default as OfflineBanner } from "./molecules/OfflineBanner";
export { default as RangeBar } from "./molecules/RangeBar";
export { default as TravelBars } from "./molecules/TravelBars";
export { default as VenueRowSkeleton } from "./molecules/VenueRowSkeleton";
export { default as VenuesLoading } from "./organisms/VenuesLoading";
```

- [ ] **Step 2: `.design-sync/config.json#overrides` — yeni bileşenler**

Ürün kolonu kart ızgarasından geniş (NOTES §6) → hepsi `cardMode: column`:

```json
    "RangeBar": { "cardMode": "column" },
    "TravelBars": { "cardMode": "column" },
    "OfflineBanner": { "cardMode": "column", "viewport": "1280x700" },
    "VenuesLoading": { "cardMode": "column" },
    "VenueRowSkeleton": { "cardMode": "column" }
```

- [ ] **Step 3: `_fixtures.ts` — `travel[]` ve iki yeni alan**

Dört mekan sabitindeki `travelMinutes: { … }` satırı `travel: [{ participantId, minutes }, …]`
olur; dakikalar AYNI kalır. Örnek (MODA):

```ts
  travel: [
    { participantId: SELF, minutes: 28 },
    { participantId: ELIF, minutes: 34 },
    { participantId: DENIZ, minutes: 21 },
  ],
```

`KARAKOY`'a `tagline: "Sakin, oturmalı, iyi filtre kahve"`, `MODA`'ya
`hoursToday: "08:00 – 18:00"` eklenir (R-W8'in DOLU dalı); `BEBEK`/`BALAT` alansız kalır ve
"satır çizilmez" dalını gösterir. Dosya başındaki yorumda `travelMinutes` → `travel[]`.

- [ ] **Step 4: Bayat önizlemeleri onar**

`.design-sync/previews/VenueCard.tsx` kendi yerel `MODA/KARAKOY/BEBEK` sabitlerini taşıyor —
üçünün `travelMinutes` satırı Step 3'teki biçime çevrilir (`_fixtures`'a bağlanmaz: NOTES §1'e göre
`sourceKeyFor` yalnız `<Ad>.tsx`'i hash'ler). `VenueCheckRow/WinnerCard/LikedList/RunoffList`
`_fixtures`'tan besleniyor → kod değişmez, ama JSDoc'larındaki "seyahat rozetleri/çipleri" ifadesi
"yol çubuğu" olur (hash değişmeli ki grade yeniden hesaplansın). Sonra:

```bash
rm .design-sync/previews/TravelList.tsx
```

- [ ] **Step 5: Dört yeni önizleme**

`RangeBar.tsx` — `Fair` (`MODA` + `TRAVEL`), `Outlier` (üçüncü bacağı 62 dk'ya çıkarılmış kopya),
`Anchored` (`TRAVEL_ANCHORED`):

```tsx
import type { ReactNode } from "react";
import { RangeBar } from "@bumpinto/web";
import { MODA, TRAVEL, TRAVEL_ANCHORED } from "./_fixtures";

const COL = { width: "27.75rem", background: "var(--color-paper)", padding: "1rem" } as const;
const Col = ({ children }: { children: ReactNode }) => <div style={COL}>{children}</div>;
const FAR = { ...MODA, travel: [MODA.travel[0], MODA.travel[1], { ...MODA.travel[2], minutes: 62 }] };

/** W3b · liste satırının yol çubuğu: bant + baş harf noktaları + aralık + adalet satırı. */
export function Fair() { return <Col><RangeBar venue={MODA} travel={TRAVEL} /></Col>; }
/** Biri çok uzaktaysa bant amber, o nokta amber halkalı, baş cümle onu adlandırır. */
export function Outlier() { return <Col><RangeBar venue={FAR} travel={TRAVEL} /></Col>; }
/** Çapalı oturum: baş cümle çizilmez, olgu (aralık + fark) kalır. */
export function Anchored() { return <Col><RangeBar venue={MODA} travel={TRAVEL_ANCHORED} /></Col>; }
```

`TravelBars.tsx` — aynı `Col` deseniyle üç hücre: `Card` (`KARAKOY` + `TRAVEL`), `WithTitle`
(`title="Herkesin yolu"`), `TwoPeople` (iki bacaklı kopya).
`OfflineBanner.tsx` — `Offline` (`lastOnlineAt={Date.parse("2026-09-06T12:38:00Z")}`) ve
`NoTimestamp` (`lastOnlineAt={null}`); `online={false}`, `onRetry={() => {}}`; sarmalayıcı
`style={{ width: "60rem" }}` (viewport `1280x700`).
`VenuesLoading.tsx` — tek `Searching` hücresi (`<VenuesLoading name="Cuma kahvesi" />`).

- [ ] **Step 6: Preview tip kapısı (NOTES §1'in tek mekanik kapısı)**

```bash
source ./init-nvm.sh
node node_modules/typescript/bin/tsc -p .design-sync/tsconfig.previews.json
```

Expected: `.design-sync/previews/` altında **sıfır** hata. `@bumpinto/shared` çözülmüyorsa NOTES
§2'deki bağı kur: `mkdir -p node_modules/@bumpinto && ln -sfn ../../frontend/shared node_modules/@bumpinto/shared`.

- [ ] **Step 7: CSS'i yeniden üret ve derle**

```bash
source ./init-nvm.sh
sh .design-sync/build-css.sh
pnpm --filter @bumpinto/web exec tsc -b
pnpm --filter @bumpinto/web build
grep -c "amber-ink\|flame-ink" frontend/web/.ds-css/ds-styles.css
```

Expected: hepsi yeşil; son komut ≥ 1 (yeni token'lar üretilen CSS'te).

> **Yeniden senkron kullanıcıya bırakılır** (sürücü + Claude Design yazma izni). Yeniden
> derecelendirilecekler — yeni: `RangeBar`, `TravelBars`, `OfflineBanner`, `VenuesLoading`,
> `VenueRowSkeleton`; değişen: `VenueCard`, `VenueCheckRow`, `WinnerCard`, `LikedList`,
> `RunoffList`, `Badge`, `Overline`, `Attribution`; silinen: `TravelList`.

- [ ] **Step 8: Değişen dosyalar**

`components/index.ts`, `.design-sync/config.json`, `.design-sync/previews/_fixtures.ts`,
`.design-sync/previews/{VenueCard,VenueCheckRow,WinnerCard,LikedList,RunoffList}.tsx`, yeni
`{RangeBar,TravelBars,OfflineBanner,VenuesLoading}.tsx`, silinen `TravelList.tsx`.
Mesaj: `chore(ds): barrel and previews for RangeBar/TravelBars/offline/skeleton`.

---

### Task 12: Doğrulama ve INDEX kaydı

**Files:**

- Modify: `docs/superpowers/plans/INDEX.md` (W tablosu + K-B26 + K-W14)

- [ ] **Step 1: Tam doğrulama** (repo kökünden)

```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/shared test --run
pnpm --filter @bumpinto/web exec tsc -b
pnpm test:web
pnpm i18n:check
pnpm --filter @bumpinto/web build
node node_modules/typescript/bin/tsc -p .design-sync/tsconfig.previews.json
grep -rn "travelMinutes\|TravelChips\|FairnessBadge\|TravelList" frontend/web/src frontend/shared/src
```

Expected: shared testleri +2; tsc temiz; web süiti **net ≈ +25** (yeni: Badge 2, travelText 4,
RangeBar 4, TravelBars 3, useOnline 3, OfflineBanner 3, AppShell 2, VoiceDock 2, voiceStore 2,
VenuesLoading 2, LobbyPage 1, VenueBrowser 2, ResultScreen 1 = 31; silinen: TravelChips 6,
FairnessBadge 7 = 13 → **+18**, hedef ≈ 430); i18n parite 0 fark; build yeşil; preview kapısı
sıfır hata; son `grep` **hiçbir şey basmamalı**.

- [ ] **Step 2: INDEX.md W tablosuna W-13 satırını ekle** (W-12'den sonra)

```markdown
| W-13 | **v3 kabuk senkronu** — R-W16 token'ları (`--color-amber-ink`/`--color-flame-ink`, `Overline` ink2, rozet tek punto 0.75rem), R-W1/R-W2 `RangeBar` + `TravelBars` (`TravelChips`/`FairnessBadge`/`TravelList` silindi, `lib/travelText.ts` tek adalet cümlesi, `shared/fairness.ts` artık `travel[]` okuyor), R-W7 dock lg+ sağ altta yüzer + `voice.endedTimeLimitHint`, R-W8 satırda `hoursToday` + `tagline` (alan yoksa satır yok), R-W9 `useOnline` + `OfflineBanner` + `VenuesLoading` iskeleti | `2026-09-06-plan35-web-v3-shell-sync.md` | Plan 35 | ready | **W-12** (`travel[]`, `Attribution sources[]`) | — | Gereksinim dok. `2026-09-06-v3-requirements.md` §2/§4. `tagline` alanı B-15/R-B7'de gelir; gelene kadar satır çizilmez (`lib/venueText.ts` cast'i o zaman silinir). DS kartlarının yeniden çekilmesi kullanıcıda |
```

- [ ] **Step 3: `K-B26` ve `K-W14` satırlarını güncelle**

- `K-B26` `Not`'una ekle: *"W-13 (plan35) web tarafını `travel[]`'a taşıdı — `travelMinutes`'ı okuyan
  istemci kalmadı; alanın DTO'dan düşmesi B-15'te."*
- `K-W14` `Durum` → `kısmen`, `Not`'una ekle: *"Token + yol çubuğu + dock + mekan satırı + iskelet
  W-13'te yapıldı; sonuç kartı görseli / presence UI / yasal sayfalar W-14 ve W-15'te."*

- [ ] **Step 4: Elle görsel kontrol listesi** (kullanıcıya bırakılır; ajan doğrulayamaz)

1. 1280 Mekanlar: her satırda tek bant + üç baş harf noktası; adalet rozeti YOK; alt satır
   "Herkese ~aynı · fark 10 dk · en uzun yol Kerem"; satırda "Bugün 08:00–18:00".
2. Deste kartı: kişi başı çubuk, en uzun yol flame; altında fark satırı.
3. Karar 1280: sağ kartta "Herkesin yolu" + çubuklar; eski `travel-list` kutusu yok.
4. Sesli sohbet: 1280'de sağ altta yüzen kart, 390'da alt şerit — ikisi de içeriği kapatmıyor.
5. `VOICE_MAX_DURATION=PT3M` ile başlat, süre dolsun → "Süre doldu · 3 dk sesli sohbet bitti".
   Odaya ODA AÇIKKEN katılan ikinci sekmede bu ipucu ÇIKMAMALI.
6. DevTools "Offline" → amber şerit; "Tekrar dene" sayfayı yeniden yüklüyor. "Mekanları bul" →
   dört iskelet satır; macOS "Hareketi azalt" açıkken nabız durmalı.
7. DevTools kontrast denetimi: "Herkese ~aynı" ve "… için uzak" rozetlerinde ≥ 4.5:1.

- [ ] **Step 5: Değişen dosyalar**

`docs/superpowers/plans/INDEX.md`. Mesaj: `docs(web): register W-13 v3 shell sync plan`.

---

## Plan öz-incelemesi

**Spec kapsamı:** R-W16 → T1 (token + `Badge`/`Overline`/`Attribution`/`AppShell`/`VenuePopCard`/
`SessionSteps`/`InvitePreview`/`WinnerCard`) + T11 Step 6-7 (DS önizlemelerinin yeniden üretimi).
R-W1 → T3 (adalet cümlesi), T4 (`RangeBar`), T5 (`TravelBars`). R-W2 → T6 + T7 (`TravelChips`,
`FairnessBadge`, `VenueMeta`, `VenueRow`, `VenueCard`, `VenueCheckRow`, `WinnerCard`, `TravelList`,
`RunoffList`; artı planın bulduğu `LikedList`, `SelectionCard`, `VenuePopCard`), `fairness.ts`
`travel[]` T2, DS barrel + overrides + previews T11, ~35 test T6/T7. R-W7 → T8. R-W8 → T6 Step 1-3
(`hoursToday` liste satırında, `tagline` alan yoksa çizilmez; foto zaten `VenueThumb`ta,
"Powered by Foursquare" zaten `VenueBrowser`ın liste altı `Attribution`ında). R-W9 → T9 + T10.
i18n tr/en/nl T1 Step 7 (yön dok. §7). INDEX T12. Boşluk yok.

**Bilinçli kapsam kararları:**

- `SUGGESTING` durumuna dayalı iskelet YAZILMADI: `DeckFlow.findVenues` tek `@Transactional`
  içinde `SUGGESTING`→`BROWSING` yazıyor, ara durum hiçbir istemciye görünmüyor — dal ölü olurdu.
  İskelet istemcinin bekleyen çağrısına bağlandı (T10).
- Oda uzunluğu istemcide GÖZLEMLE türetiliyor (`VoiceDto`'da alan yok); gözlemlenemediğinde ipucu
  satırı hiç basılmıyor (T8) — "alan yoksa satır yok" kuralının aynısı.
- `--color-amber` / `--color-flame-deep` DEĞİŞMEDİ (zemin, kenarlık, marka gradyanı, harita iğnesi
  onlara bağlı); yalnız rozet METNİ için iki yeni token eklendi.

**Yer tutucu taraması:** her adımda gerçek kod ya da kesin düzenleme yönergesi var; belirsiz
ifade, açık uçlu iş ya da "önceki göreve benzer" yönlendirmesi yok. Tek koşullu adım T10 Step 4'ün
SoloSetup dalı — koşulu ve alternatifi (K-W kaydı) yazılı.

**Tip tutarlılığı:** `TravelLeg`/`FairnessVenue` T2 = T4 = T5 girdisi · `Fairness` (`entries`,
`min`, `max`, `spread`, `longestId`, `outlierId`) T2 üretir, T3/T4/T5 tüketir · `Translate`
(`(key, opts?) => string`) T3 tanımlar, T3 testi ve T4/T5 `t`'si karşılar · `TravelInfo`
(`labels`, `selfId`, `anchored`) T3–T7 aynı · `FairnessLine` (`lead`, `leadTone`, `rest`)
T3 = T4 = T5 · `OnlineState` (`online`, `lastOnlineAt`) T9 kanca = bileşen = `AppShell` ·
`VoiceState.limitMinutes: number \| null` T8 store = dock seçicisi = testleri ·
`taglineOf(VenueDto) => string \| null` T6 = `VenueMeta` = `VenueCard`.
