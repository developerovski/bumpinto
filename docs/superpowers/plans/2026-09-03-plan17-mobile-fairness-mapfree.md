# Plan 17: Mobil — Adalet, Ulaşım Türü ve Haritasız Uzlaşma (M-3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M-2'nin bıraktığı mobil uygulamayı W-6'nın web'e getirdiği **haritasız değerlendirme + grup uzlaşması** paketiyle eşitlemek: her mekan yüzeyinde tek adalet rozeti + tek `TravelChips` bileşeni, katılımcı başına **ulaşım türü** (WALK/BIKE/EBIKE/TRANSIT/CAR), telefonda **varsayılan harita yok** (Lobi/Bekle'de orta nokta kartı, Mekanlar'da liste-önce + "Haritada gör"), yeni deste kartı anatomisi, "Deste bitti" bekleme lobisi, Runoff v2 ve Karar v2. Saf adalet mantığı web ile **tek uygulamada** (`frontend/shared/src/fairness.ts`) toplanır.

**Architecture:** Bu bir **parite planıdır** — yeni ekran açmaz, M-2'nin ekranlarını değiştirir. Saf mantık (adalet metriği, sıralama karşılaştırıcıları, chip satırları, rozet kuralı, uyum satırı sınıflandırması) `@bumpinto/shared`'da tek kaynak; web ve mobil yalnız **sunum** yazar. Harita `react-native-maps` + `PROVIDER_GOOGLE` olarak kalır (K-W4/K-M2 kararı değişmedi) ama **hiçbir ekranda varsayılan mount edilmez**; yalnız "Haritada gör" ile açılan `MapSheet` modalinde. Veri sözleşmesi B-7'den gelir (aşağıda); istemci hesabı yalnız B-7 alanı boşsa devreye giren yedektir. i18n hâlâ `frontend/shared/src/i18n/locales/*.json` (M-2 Task 1).

**Tech Stack:** M-2 ile aynı — Expo SDK 54+, expo-router, react-native-maps, expo-location, expo-localization, i18next/react-i18next, zustand 5, `phosphor-react-native`, jest-expo + @testing-library/react-native. Bu planda ek olarak: `react-native-reanimated` (M-1'de zaten var), RN çekirdeğinden `Share`, `Linking`, `AccessibilityInfo`, `Modal`.

**INDEX kimliği:** `M-3` (Eski # = **Plan 17**) · Bağımlılık: `M-2`, `B-7`, `W-6:T1` · Dosya: `2026-09-03-plan17-mobile-fairness-mapfree.md`

**Ön koşul:** **M-2 `done`** (ekranlar, store'lar, `MapView`, shared i18n), **B-7 `done`** (sözleşme aşağıda), **W-6:T1 `done`** — `frontend/shared/src/fairness.ts` ve testlerini **W-6 yazar**, M-3 tüketir (Task 1). W-6'nın geri kalanı (web ekranları) M-3 için bloke edici değildir. Ekran kararlarının kaynağı her hâlde `docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md` (**BAĞLAYICI**).

---

## Backend sözleşmesi (B-7 — bu plan bunu tüketir, değiştirmez)

| Alan | Tip / değer | Kullanıldığı yer |
|---|---|---|
| `ParticipantDto.travelMode` | `'WALK' \| 'BIKE' \| 'EBIKE' \| 'TRANSIT' \| 'CAR'` (varsayılan `CAR`) | Task 2 (seçici, roster ikonu), Task 3 (orta nokta notu) |
| `ParticipantDto.midpointMinutes` | katılımcı → orta nokta dakikası, **5 dk'ya yuvarlı**; konumu yoksa `null` | Task 3 (orta nokta kartı `herkes ~25–35 dk`) |
| `VenueDto.fairness` | `{ maxMinutes, spreadMinutes, longestParticipantId }` | Task 1/2/4/5 (rozet, sıra, chip kuyruğu) |
| `VenueDto.provider` | `'GOOGLE' \| 'FOURSQUARE' \| …` | Task 4 (atıf satırı) |
| `VenueDto.category` | sağlayıcı kategorisi (metin) | Task 4 (uyum satırı) |
| `VenueDto.locality` | semt / mahalle adı | Task 4 (`★ · €€ · semt` slotu) |
| `VenueDto.address` | kısa adres | Task 5 (Karar YER ekseni) |
| `VenueDto.ratingCount` | tam sayı | Task 4 (`★ 4.6 (128)`) |
| `VenueDto.hoursToday` | `"08–22"` ya da yok | Task 4 (**yalnız veri varsa** `Bugün 08–22`; "Açık" **asla**) |
| `VenueDto.placeLink` | API'siz Maps URL | Task 5 ("Google Maps'te aç") |
| `SessionView.decisionKind` | `'UNANIMOUS' \| 'SINGLE_LIKE' \| 'RUNOFF' \| 'FORCED' \| 'PARTIAL'` | Task 5 (eyebrow, "Neden burası?") |
| `SessionView.decidedAt` | ISO tarih | Task 5 (canlı DECIDED geçişi tespiti) |
| `SessionView.runoffReason` | `'INTERSECTION' \| 'FALLBACK'` | Task 5 (Runoff kopyası) |
| `SessionView.likeCounts` | `{ [venueId]: number }`, **yalnız DECIDED** | Task 5 (ADALET/beğeni kanıtı) |
| `SessionView.midpointLabel` | `"Eindhoven"` | Task 3 (orta nokta kartı) |
| `VenueDto.travelMinutes` | **herkes için 5 dk'ya yuvarlanmış**, yuvarlanmış konumdan | Task 1/2 |
| `POST /participants`, `POST /points`, `PUT /api/me` | `travelMode` / `defaultTravelMode` alanı kabul eder | Task 2 |

Alanlar `@bumpinto/shared/src/api-types.ts`'e **codegen**'den gelir (`rtk pnpm codegen`, backend ayakta). Elle tip yazılmaz.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

Mobil artboard'lar (`Mobil Ekranlar v2.dc.html`, project `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`)
**04–08 ekranları bu paket için henüz güncellenmedi**; güncelleme web artboard'ları onaylandıktan
sonra yapılacak (Claude Design işi, bu planın dışında). Bu plan yürürken **bağlayıcı kaynak**:

| Öncelik | Kaynak |
|---|---|
| 1 | `docs/superpowers/specs/2026-09-03-map-free-group-decision-ux.md` **§4 kararlar** (5b dahil), **§5.B / §5.C** maddeleri, **§6 YAPMA** listesi |
| 2 | **Web 390 artboard'ları** — aynı project, `Web Ekranlar v2.dc.html`, `data-screen-label` `… 390` ile biten bloklar (Mekanlar grup 390, Deste 390, Deste bitti 390, Runoff 390, Karar 390, Lobi 390, Bekle 390) |
| 3 | DS v2 (`Design System v2.dc.html`, project `b536b3aa-8945-4865-b7e5-e693f8d5a588`) — **08 çipler**, **10 harita dili**, Badge/Sticker ayrımı |
| 4 | Mobil artboard 04–08 (yalnız yerleşim iskeleti; **veri ve kopya için değil** — eski "Açık"/şehir/adres mock'ları geçersiz) |

Okuma: `mcp__claude_design__read_file` (`offset`/`limit`, blokları `data-screen-label`'dan bul).
Çelişkide sıra yukarıdaki gibidir; **karar dokümanı her zaman kazanır**.
Kaynakların hiçbirinde olmayan bir durum **icat edilmez** → INDEX `blocked` + kullanıcıya sor.

---

## Bu plana özel kurallar

- **INDEX güncelle** (M-3 satırı: `in-progress` → `Son adım` → `done`); **Git yazma YOK** — commit, `git mv`, `git checkout`, `git restore`, `git stash` hiçbiri ajan tarafından çalıştırılmaz. Her görev sonunda yalnız **"Commit önerisi"** satırı bırakılır.
- Komutlar `rtk` ile ve repo kökünden: `rtk pnpm --filter @bumpinto/mobile test`, `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit`, `rtk pnpm test:web`. Node 22 PATH.
- M-1 mimari kuralları (atomic design; ekran dosyaları yalnız kompozisyon; yalnız `@bumpinto/shared` client; Zustand store'lar) ve M-2'nin store sözleşmesi aynen geçerli.
- **Saf mantık mobilde yazılmaz.** Adalet, sıralama, chip satırı, rozet kuralı, uyum sınıflandırması `@bumpinto/shared`'dan import edilir (Task 1). Mobilde aynı işi yapan ikinci bir fonksiyon görülürse **bug**'dır.
- Koordinat gizliliği: yalnız `approxLocation` çizilir; dakikalar sunucudan gelir (B-7 §4.4).
- **Dil sözlüğü (§4.8):** "kazanan", "eşleşme", "match", "favorin" hiçbir ekranda geçmez. "Ortak nokta", "Herkes için", "Karar verildi". Kutlanan tek an grubun **birlikte** vardığı andır. Geciken kişiye tek, adlı, pozitif not; sayaç/"geç" etiketi/suçluluk yok.
- Her görev sonunda: `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit` + `rtk pnpm --filter @bumpinto/mobile test` yeşil; **dev build**'de görsel doğrulama (Expo Go Google Maps'i desteklemez → `npx expo run:ios` / `npx expo run:android` ya da EAS dev client — M-2 Task 2 notu).
- Yeni i18n anahtarı **üç dile birden** (`frontend/shared/src/i18n/locales/{tr,en,nl}.json`) eklenir; W-6 aynı anahtarı eklediyse **yeniden yazılmaz**, tüketilir.

### §6 — YAPMA (karar dokümanı, bilerek yapılmayanlar)

Bu plan hiçbir görevde şunları getirmez; artboard'da görünseler bile uygulanmaz:

- Gizli tahmin oyunu · çift "uyum" yüzdesi · "Buluştunuz mu?" · Tinder tarzı tam ekran "match" ve isimli kalpler
- Rastgele çark · sürükle-sırala / "Favorim" · "ortaya X km" tokenı (yalnız sıralama anahtarı, ekranda token yok)
- Yön/pusula çipi · **statik harita görseli** (Static Maps kullanılmaz — hâlâ Google haritası, 110px'te okunmaz; K-W6 mobile taşınmaz)
- "Hazırım" ile otomatik SWIPING geçişi · Wrapped tarzı 3 kartlık özet · podium / "kazanan" dili · Deste yarı yol kutlaması · her kaydırmada eşleşme
- Mekan kartında **"Açık" durumu** (buluşma saati yok) — yalnız `hoursToday` verisi varsa `Bugün 08–22` metni

---

### Task 1: Ortak saf mantığı tüket — `frontend/shared/src/fairness.ts`

**Files:**
- **Doğrula (W-6 yazdı):** `frontend/shared/src/fairness.ts`, `frontend/shared/src/fairness.test.ts`, `frontend/shared/src/index.ts`, `frontend/web/vite.config.ts`
- Modify (yalnız eksik varsa): yukarıdakiler — eksik dışa aktarım / eksik test eklenir
- **Yeni dosya beklenmiyor.** Bu görev normal koşulda **sıfır satır kod** yazar.

**Ön kontrol (bu görevin şekli buna göre değişir):**

**Bu görevin varsayılanı: dosya zaten var.** `frontend/shared/src/fairness.ts` ve testlerini
**W-6 Task 1 yazar** (W-3/W-4 gibi web izinde koşar ve M-3'ten önce biter). M-3 bu dosyayı
**tüketir**; yalnız eksik kalan yüzeyi tamamlar. Aşağıdaki Step 1–3 blokları **referans
sözleşmedir** — W-6'nın yazdığı dosya bu imzaları ve davranışı karşılıyor mu diye okunur,
karşılıyorsa **kod yazılmaz**.

- [ ] **Step 0: Durum kontrolü** — Run: `ls frontend/shared/src/fairness.ts frontend/web/src/lib/fairness.ts 2>&1`
  - **Beklenen (varsayılan dal):** `frontend/shared/src/fairness.ts` var, `frontend/web/src/lib/fairness.ts` yok → Step 1'deki imza listesini ve Step 2'deki test matrisini dosyayla karşılaştır; **eksik olanı ekle**, eşleşenlere dokunma; Step 3 (tam gövde) **atlanır**.
  - **Sapma dalı A** — yalnız `frontend/web/src/lib/fairness.ts` var (W-6 shared'a taşımamış): dosyayı `frontend/shared/src/fairness.ts`'e `mv` ile taşı, web import'larını `@bumpinto/shared`'a çevir, `rtk pnpm test:web` yeşil bırak. **`git mv` kullanılmaz** (git yazma yasağı) — kullanıcı yeniden adlandırmayı commit'te görür.
  - **Sapma dalı B** — ikisi de yok (W-6 hiç koşmamış): **INDEX'te M-3 `blocked`** + kullanıcıya sor. Ön koşul `W-6:T1` sağlanmadan bu plan yürümez; Step 3'ün gövdesi ancak kullanıcı "sen yaz" derse kullanılır.

- [ ] **Step 1: Sözleşme** — dışa aktarılan yüzey (mobil ve web yalnız bunu görür):

```typescript
// frontend/shared/src/fairness.ts
import type { ParticipantDto, VenueDto } from "./api";

export const TRAVEL_MODES = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";

/** §4.2/§4.5: rozet ve sıra bu üçlüden türer. B-7 `venue.fairness` verir; yoksa istemci hesaplar. */
export type Fairness = { maxMinutes: number; spreadMinutes: number; longestParticipantId: string | null };

export type BadgeKind = { kind: "same" } | { kind: "farFor"; participantId: string } | { kind: "none" };

export type TravelRow = {
  participantId: string;
  name: string;
  minutes: number;
  self: boolean;
  longest: boolean;
};

export function roundTo5(minutes: number): number;
export function fairnessOf(venue: VenueDto, participantIds: string[]): Fairness | null;
export function fairnessBadge(f: Fairness | null, minutesByParticipant: Record<string, number>): BadgeKind;
export function travelRows(venue: VenueDto, participants: ParticipantDto[], selfId?: string): TravelRow[];
export function compareByFairness(seed: string): (a: VenueDto, b: VenueDto) => number;
export function compareByRating(a: VenueDto, b: VenueDto): number;
export function sortVenues(venues: VenueDto[], sort: "fair" | "rating", seed: string): VenueDto[];
export function pickFairest(venues: VenueDto[]): VenueDto | null;
export function fitLine(venue: VenueDto, deck: VenueDto[], expected: readonly string[]): { kind: "fit" | "mismatch"; category: string } | null;
```

- [ ] **Step 2: Failing test** — `frontend/shared/src/fairness.test.ts` (vitest; karar dokümanı §4.5 örnekleri birebir):

```typescript
import { describe, expect, test } from "vitest";
import type { ParticipantDto, VenueDto } from "./api";
import {
  compareByFairness, fairnessBadge, fairnessOf, fitLine, pickFairest, roundTo5, sortVenues, travelRows,
} from "./fairness";

const v = (id: string, mins: Record<string, number>, rating?: number): VenueDto => ({
  id, name: id, rating, travelMinutes: mins,
});
const P: ParticipantDto[] = [
  { id: "a", displayName: "Ayşe" },
  { id: "b", displayName: "Kerem" },
  { id: "c", displayName: "Mehmet" },
];
const ids = ["a", "b", "c"];

test("5 dk yuvarlama", () => {
  expect(roundTo5(33)).toBe(35);
  expect(roundTo5(32)).toBe(30);
});

test("A 30/25/35 → en uzun 35, fark 10 → Herkese ~aynı", () => {
  const f = fairnessOf(v("A", { a: 30, b: 25, c: 35 }), ids)!;
  expect(f).toEqual({ maxMinutes: 35, spreadMinutes: 10, longestParticipantId: "c" });
  expect(fairnessBadge(f, { a: 30, b: 25, c: 35 })).toEqual({ kind: "same" });
});

test("B 10/15/50 → Kerem için uzak (medyanı ≥ 10 dk aşan kişi)", () => {
  const mins = { a: 10, b: 50, c: 15 };
  const f = fairnessOf(v("B", mins), ids)!;
  expect(fairnessBadge(f, mins)).toEqual({ kind: "farFor", participantId: "b" });
});

test("C 40/40/40 → eşit ama rozet yok değil: fark 0 → Herkese ~aynı; A'dan az adil (sıra)", () => {
  const A = v("A", { a: 30, b: 25, c: 35 });
  const C = v("C", { a: 40, b: 40, c: 40 });
  expect(fairnessBadge(fairnessOf(C, ids)!, { a: 40, b: 40, c: 40 })).toEqual({ kind: "same" });
  expect([C, A].sort(compareByFairness("s"))[0]!.id).toBe("A"); // en uzun yol 35 < 40
});

test("rozet yok dalı: fark 20 ama kimse medyanı 10 dk aşmıyor", () => {
  const mins = { a: 20, b: 35, c: 40 }; // medyan 35; en uzun 40 → 40−35 = 5 < 10
  expect(fairnessOf(v("D", mins), ids)!.spreadMinutes).toBe(20);
  expect(fairnessBadge(fairnessOf(v("D", mins), ids)!, mins)).toEqual({ kind: "none" });
});

test("sıra: en uzun yol artan → fark artan", () => {
  const list = [v("x", { a: 40, b: 40 }), v("y", { a: 20, b: 30 }), v("z", { a: 22, b: 24 })];
  const once = sortVenues(list, "fair", "sess-1").map((s) => s.id);
  const twice = sortVenues([...list].reverse(), "fair", "sess-1").map((s) => s.id);
  expect(once).toEqual(twice); // aynı oturumda herkese aynı sıra, girdi sırasından bağımsız
  expect(once).toEqual(["z", "y", "x"]); // en uzun 25 (yuvarlı) < 30 < 40
});

test("aynı bant + aynı fark: sıra oturuma göre karışır, oturum içinde sabit", () => {
  // ikisi de bant 6 (30 dk), fark 0 → ayrımı yalnız Random(session.id) yapar
  const list = [v("m", { a: 30, b: 30 }), v("n", { a: 30, b: 30 })];
  const s1 = sortVenues(list, "fair", "sess-1").map((s) => s.id);
  const s1again = sortVenues([...list].reverse(), "fair", "sess-1").map((s) => s.id);
  expect(s1).toEqual(s1again);
  const firsts = Array.from({ length: 20 }, (_, i) => sortVenues(list, "fair", `sess-${i}`).map((x) => x.id)[0]);
  expect(new Set(firsts).size).toBe(2); // tohum değişince bant içi sıra da değişiyor
});

test("puan sıralaması: puansız mekan sona", () => {
  const list = [v("p", { a: 10 }), v("q", { a: 10 }, 4.6), v("r", { a: 10 }, 4.1)];
  expect(sortVenues(list, "rating", "s").map((s) => s.id)).toEqual(["q", "r", "p"]);
});

test("TravelChips satırları: en uzun önce, Sen işaretli, herkes görünür", () => {
  const rows = travelRows(v("A", { a: 30, b: 25, c: 35 }), P, "b");
  expect(rows.map((r) => r.participantId)).toEqual(["c", "a", "b"]);
  expect(rows.find((r) => r.self)!.participantId).toBe("b");
  expect(rows[0]!.longest).toBe(true);
  expect(rows).toHaveLength(3); // 3. kişi asla düşmez
});

test("uyum satırı yalnız destede ≥ 2 farklı kategori varsa", () => {
  const same = [{ id: "1", category: "espresso bar" }, { id: "2", category: "espresso bar" }] as VenueDto[];
  expect(fitLine(same[0]!, same, ["espresso bar", "kafe"])).toBeNull();
  const mixed = [{ id: "1", category: "espresso bar" }, { id: "2", category: "fırın" }] as VenueDto[];
  expect(fitLine(mixed[0]!, mixed, ["espresso bar", "kafe"])).toEqual({ kind: "fit", category: "espresso bar" });
  expect(fitLine(mixed[1]!, mixed, ["espresso bar", "kafe"])).toEqual({ kind: "mismatch", category: "fırın" });
  expect(fitLine({ id: "3" } as VenueDto, mixed, [])).toBeNull(); // kategori yoksa satır yok
});

test("pickFairest: min fark → min toplam → puan → id (Adil olana bırak)", () => {
  const a = v("a", { x: 30, y: 30 }, 4.2);
  const b = v("b", { x: 20, y: 40 }, 4.9);
  expect(pickFairest([b, a])!.id).toBe("a");
});
```

- [ ] **Step 3: `frontend/shared/src/fairness.ts`**

```typescript
import type { ParticipantDto, VenueDto } from "./api";

export const TRAVEL_MODES = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";

export type Fairness = {
  maxMinutes: number;
  spreadMinutes: number;
  longestParticipantId: string | null;
};

export type BadgeKind = { kind: "same" } | { kind: "farFor"; participantId: string } | { kind: "none" };

export type TravelRow = {
  participantId: string;
  name: string;
  minutes: number;
  self: boolean;
  longest: boolean;
};

/** §4.3/§4.4: ekranda görünen her dakika 5'e yuvarlıdır (sunucu da yuvarlar; bu ikinci kalkan). */
export function roundTo5(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function minutesOf(venue: VenueDto, participantIds: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of participantIds) {
    const raw = venue.travelMinutes?.[id];
    if (raw != null) out[id] = roundTo5(raw);
  }
  return out;
}

/** B-7 `venue.fairness` varsa o kazanır; yoksa dakikalardan türetilir (§5.B.3 istemci yedeği). */
export function fairnessOf(venue: VenueDto, participantIds: string[]): Fairness | null {
  const server = (venue as { fairness?: Fairness }).fairness;
  if (server && server.maxMinutes != null) return server;

  const mins = minutesOf(venue, participantIds);
  const entries = Object.entries(mins);
  if (entries.length === 0) return null;

  let longest = entries[0]!;
  let min = entries[0]![1];
  for (const e of entries) {
    if (e[1] > longest[1]) longest = e;
    if (e[1] < min) min = e[1];
  }
  return { maxMinutes: longest[1], spreadMinutes: longest[1] - min, longestParticipantId: longest[0] };
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/**
 * §4.2 — TEK kural, TEK rozet:
 *   fark ≤ 10 dk                       → "Herkese ~aynı"
 *   bir kişi grup medyanını ≥ 10 aşıyor → "{ad} için uzak"
 *   aksi hâlde                          → rozet yok
 */
export function fairnessBadge(f: Fairness | null, minutesByParticipant: Record<string, number>): BadgeKind {
  if (!f) return { kind: "none" };
  if (f.spreadMinutes <= 10) return { kind: "same" };

  const values = Object.values(minutesByParticipant);
  if (values.length === 0) return { kind: "none" };
  const med = median(values);
  const over = Object.entries(minutesByParticipant).filter(([, m]) => m - med >= 10);
  if (over.length === 0) return { kind: "none" };
  const worst = over.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { kind: "farFor", participantId: worst[0] };
}

/** §4.3 — herkes görünür, en uzun önce, "Sen" işaretli. Sunum (kalın/▲/"~") çağıranın işi. */
export function travelRows(venue: VenueDto, participants: ParticipantDto[], selfId?: string): TravelRow[] {
  const ids = participants.map((p) => p.id).filter((id): id is string => !!id);
  const mins = minutesOf(venue, ids);
  const f = fairnessOf(venue, ids);
  return participants
    .filter((p) => p.id && mins[p.id] != null)
    .map((p) => ({
      participantId: p.id!,
      name: p.displayName ?? "?",
      minutes: mins[p.id!]!,
      self: p.id === selfId,
      longest: p.id === f?.longestParticipantId,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
}

/** Oturum id'sine bağlı deterministik karıştırma anahtarı — herkes aynı sırayı görür (§4.5). */
function seededKey(seed: string, id: string): number {
  let h = 2166136261;
  for (const ch of `${seed}:${id}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** §4.5 — birincil en uzun yol artan, ikincil fark artan, 5 dk bandı içinde Random(session.id). */
export function compareByFairness(seed: string) {
  return (a: VenueDto, b: VenueDto): number => {
    const ids = new Set([...Object.keys(a.travelMinutes ?? {}), ...Object.keys(b.travelMinutes ?? {})]);
    const list = [...ids];
    const fa = fairnessOf(a, list);
    const fb = fairnessOf(b, list);
    if (!fa && !fb) return 0;
    if (!fa) return 1;
    if (!fb) return -1;
    const bandA = Math.floor(fa.maxMinutes / 5);
    const bandB = Math.floor(fb.maxMinutes / 5);
    if (bandA !== bandB) return bandA - bandB;
    if (fa.spreadMinutes !== fb.spreadMinutes) return fa.spreadMinutes - fb.spreadMinutes;
    return seededKey(seed, a.id ?? "") - seededKey(seed, b.id ?? "");
  };
}

/** Puansız mekan sona (OSM destesi puan vermez — §5.A.5). */
export function compareByRating(a: VenueDto, b: VenueDto): number {
  const ra = a.rating ?? -1;
  const rb = b.rating ?? -1;
  return rb - ra || (a.id ?? "").localeCompare(b.id ?? "");
}

export function sortVenues(venues: VenueDto[], sort: "fair" | "rating", seed: string): VenueDto[] {
  return [...venues].sort(sort === "rating" ? compareByRating : compareByFairness(seed));
}

/** Runoff beraberliğinde "Adil olana bırak": min fark → min toplam → puan → id. */
export function pickFairest(venues: VenueDto[]): VenueDto | null {
  if (venues.length === 0) return null;
  const total = (v: VenueDto) => Object.values(v.travelMinutes ?? {}).reduce((s, m) => s + roundTo5(m), 0);
  return [...venues].sort((a, b) => {
    const ids = [...new Set([...Object.keys(a.travelMinutes ?? {}), ...Object.keys(b.travelMinutes ?? {})])];
    const sa = fairnessOf(a, ids)?.spreadMinutes ?? Number.MAX_SAFE_INTEGER;
    const sb = fairnessOf(b, ids)?.spreadMinutes ?? Number.MAX_SAFE_INTEGER;
    return sa - sb || total(a) - total(b) || compareByRating(a, b);
  })[0]!;
}

/** §4.6 — uyum satırı yalnız destede ≥ 2 farklı kategori varsa; kategori yoksa satır yok. */
export function fitLine(
  venue: VenueDto,
  deck: VenueDto[],
  expected: readonly string[],
): { kind: "fit" | "mismatch"; category: string } | null {
  const category = (venue as { category?: string }).category;
  if (!category) return null;
  const distinct = new Set(deck.map((v) => (v as { category?: string }).category).filter(Boolean));
  if (distinct.size < 2) return null;
  const norm = (s: string) => s.toLocaleLowerCase("tr");
  const inCluster = expected.some((e) => norm(category).includes(norm(e)) || norm(e).includes(norm(category)));
  return { kind: inCluster ? "fit" : "mismatch", category };
}
```

`frontend/shared/src/index.ts` sonuna:

```typescript
export {
  DEFAULT_TRAVEL_MODE,
  TRAVEL_MODES,
  compareByFairness,
  compareByRating,
  fairnessBadge,
  fairnessOf,
  fitLine,
  pickFairest,
  roundTo5,
  sortVenues,
  travelRows,
  type BadgeKind,
  type Fairness,
  type TravelMode,
  type TravelRow,
} from "./fairness";
```

- [ ] **Step 4: Shared testleri koştur** — `frontend/web/vite.config.ts` içindeki `test` bloğuna:

```typescript
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    // Shared'daki saf mantık web ve mobilin ortak kaynağı; testi tek yerde (web vitest) koşar.
    include: ["src/**/*.test.{ts,tsx}", "../shared/src/**/*.test.ts"],
  },
```

Mobil tarafta ayrıca bir kopya test **yazılmaz**; Task 2'deki bileşen testleri shared'ı zaten
gerçek implementasyonla kullanır (mock yok).

- [ ] **Step 5: PASS** — Run: `rtk pnpm test:web` → shared testleri dahil yeşil. Run: `rtk pnpm --filter @bumpinto/web exec tsc --noEmit`. Web'de `lib/fairness.ts` taşındıysa Run: `rg -n "lib/fairness" frontend/web/src || true` → **çıktı boş**.

**Expected:** `frontend/shared/src/fairness.ts` tek kaynak; 11 test yeşil (varsayılan dalda **hiç kod yazılmadı**, yalnız doğrulandı); web ve mobil aynı dosyadan import ediyor; `frontend/web/src/lib/fairness.ts` yok.

- [ ] **Step 6: INDEX güncelle + Commit önerisi (kullanıcı yapar)** — `refactor(shared): adalet ve siralama saf mantigi shared'a`

---

### Task 2: `TravelChips` + `FairnessBadge` + ulaşım türü seçici (RN)

**Files:**
- Create: `frontend/mobile/src/lib/travelMode.tsx` (mod → Phosphor ikon eşlemesi)
- Create: `frontend/mobile/src/components/molecules/TravelChips.tsx`
- Create: `frontend/mobile/src/components/molecules/FairnessBadge.tsx`
- Create: `frontend/mobile/src/components/molecules/TravelModePicker.tsx`
- Create: `frontend/mobile/src/components/molecules/TravelChips.test.tsx`
- Modify: `frontend/mobile/app/sessions/new.tsx` (kendi konumu kartına seçici)
- Modify: `frontend/mobile/src/components/organisms/PointsEditor.tsx` (nokta başına mod)
- Modify: `frontend/mobile/src/screens/WaitingScreen.tsx` ("Konum ve ulaşım")
- Modify: `frontend/mobile/app/profile.tsx` (varsayılan tercih → `api.updateMe({ defaultTravelMode })`)
- Modify: `frontend/mobile/src/components/molecules/ParticipantRow.tsx` (roster satırı: ikon + `{{şehir}} · ~{{dk}} dk`)

> **Katıl formu notu:** karar dokümanı §4.5b giriş noktaları arasında "Katıl formu"nu sayar; **mobilde Katıl ekranı yoktur** (davetli akışı web'dir — M-2 "UI Kaynağı" tablosu). Mobilde giriş noktaları: Yeni buluşma, Bireysel konum listesi, Bekle, Profil. Bu bilinçli sapma INDEX notuna yazılır.

- [ ] **Step 1: Failing test** — `TravelChips.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import TravelChips from "./TravelChips";

const participants = [
  { id: "a", displayName: "Ayşe" },
  { id: "b", displayName: "Kerem" },
  { id: "c", displayName: "Mehmet" },
];
const venue = { id: "v1", name: "Café Berlage", travelMinutes: { a: 30, b: 25, c: 35 } };

test("herkes görünür, en uzun önce ▲, kendisi Sen, sonda fark", () => {
  render(<TravelChips venue={venue as never} participants={participants as never} selfId="b" />);
  expect(screen.getByText("▲ Mehmet ~35 dk")).toBeTruthy();
  expect(screen.getByText("Ayşe ~30 dk")).toBeTruthy();
  expect(screen.getByText("Sen ~25 dk")).toBeTruthy();
  expect(screen.getByText("fark 10 dk")).toBeTruthy();
});

test("3. kişi asla düşmez (dar kutuda da)", () => {
  render(<TravelChips venue={venue as never} participants={participants as never} selfId="a" compact />);
  expect(screen.getAllByTestId("travel-chip")).toHaveLength(3);
});
```

- [ ] **Step 2: `molecules/TravelChips.tsx`** — beş yüzeyde (Mekanlar satırı, deste kartı, Beğendiklerin, finalist, Karar) aynı bileşen; **renk yok**, `tabular-nums` yerine RN'de `fontVariant: ["tabular-nums"]`:

```tsx
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { fairnessOf, travelRows } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

export default function TravelChips(props: {
  venue: VenueDto;
  participants: ParticipantDto[];
  selfId?: string;
  /** Dar yüzeyde (deste kartı) satır sarar; kimse düşmez. */
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const rows = travelRows(props.venue, props.participants, props.selfId);
  if (rows.length === 0) return null;
  const ids = props.participants.map((p) => p.id!).filter(Boolean);
  const spread = fairnessOf(props.venue, ids)?.spreadMinutes ?? 0;

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
      {rows.map((r) => (
        <View
          key={r.participantId}
          testID="travel-chip"
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.line2,
            backgroundColor: colors.card,
            paddingHorizontal: props.compact ? 7 : 9,
            paddingVertical: props.compact ? 2 : 3,
          }}
        >
          <AppText
            style={{
              fontSize: props.compact ? 11.5 : 12.5,
              color: colors.ink2,
              fontFamily: r.self ? fonts.bodyBold : fonts.bodyMedium,
              fontVariant: ["tabular-nums"],
            }}
          >
            {t("travel.chip", {
              lead: r.longest ? "▲ " : "",
              who: r.self ? t("travel.self") : r.name,
              min: r.minutes,
            })}
          </AppText>
        </View>
      ))}
      {rows.length > 1 && (
        <AppText style={{ fontSize: 11.5, color: colors.ink3, fontVariant: ["tabular-nums"] }}>
          {t("travel.spread", { min: spread })}
        </AppText>
      )}
    </View>
  );
}
```

i18n (üç dile): `travel.chip` = `"{{lead}}{{who}} ~{{min}} dk"`, `travel.self` = `"Sen"`,
`travel.spread` = `"fark {{min}} dk"`. **Ad ek almaz** (tr/en/nl güvenli — §4.2).

- [ ] **Step 3: `molecules/FairnessBadge.tsx`** — meta satırında `Badge`, foto üstünde değil, `Sticker` değil:

```tsx
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { fairnessBadge, fairnessOf, roundTo5 } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Badge } from "../atoms";

export default function FairnessBadge(props: {
  venue: VenueDto;
  participants: ParticipantDto[];
  selfId?: string;
}) {
  const { t } = useTranslation();
  const ids = props.participants.map((p) => p.id!).filter(Boolean);
  const mins: Record<string, number> = {};
  for (const id of ids) {
    const raw = props.venue.travelMinutes?.[id];
    if (raw != null) mins[id] = roundTo5(raw);
  }
  const badge = fairnessBadge(fairnessOf(props.venue, ids), mins);
  if (badge.kind === "none") return null;
  if (badge.kind === "same") return <Badge tone="grass" label={t("fairness.same")} />;

  const self = badge.participantId === props.selfId;
  const name = props.participants.find((p) => p.id === badge.participantId)?.displayName ?? "?";
  return (
    <Badge tone="neutral" label={self ? t("fairness.farForSelf") : t("fairness.farFor", { name })} />
  );
}
```

i18n: `fairness.same` = `"Herkese ~aynı"`, `fairness.farFor` = `"{{name}} için uzak"`,
`fairness.farForSelf` = `"Senin için uzak"`.
(`Badge` atomunda `tone` yoksa `"grass" | "neutral" | "amber"` eklenir — DS v2 renkleri.)

- [ ] **Step 4: `lib/travelMode.tsx` + `molecules/TravelModePicker.tsx`**

```tsx
// src/lib/travelMode.tsx
import { TRAVEL_MODES, type TravelMode } from "@bumpinto/shared";
import { Bicycle, Car, Lightning, PersonSimpleWalk, Train } from "phosphor-react-native";
import { View } from "react-native";

export { TRAVEL_MODES, type TravelMode };

export function TravelModeIcon(props: { mode: TravelMode; size?: number; color: string }) {
  const size = props.size ?? 18;
  switch (props.mode) {
    case "WALK":
      return <PersonSimpleWalk size={size} color={props.color} />;
    case "BIKE":
      return <Bicycle size={size} color={props.color} />;
    case "EBIKE":
      // §4.5b: e-bisiklet = Lightning + Bicycle
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: -2 }}>
          <Lightning size={size * 0.7} color={props.color} weight="fill" />
          <Bicycle size={size} color={props.color} />
        </View>
      );
    case "TRANSIT":
      return <Train size={size} color={props.color} />;
    default:
      return <Car size={size} color={props.color} />;
  }
}
```

```tsx
// src/components/molecules/TravelModePicker.tsx — "Nasıl geliyorsun?" (segmented, 5 seçenek)
import type { TravelMode } from "@bumpinto/shared";
import { TRAVEL_MODES } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { TravelModeIcon } from "../../lib/travelMode";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

export default function TravelModePicker(props: {
  value: TravelMode;
  onChange: (m: TravelMode) => void;
  label?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="label">{props.label ?? t("travel.question")}</AppText>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", gap: 6, backgroundColor: "#F4EEE6", borderRadius: 999, padding: 3 }}
      >
        {TRAVEL_MODES.map((m) => {
          const on = m === props.value;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled: props.disabled }}
              accessibilityLabel={t(`travel.mode.${m}`)}
              disabled={props.disabled}
              onPress={() => props.onChange(m)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                paddingVertical: 6,
                backgroundColor: on ? colors.card : "transparent",
                shadowOpacity: on ? 0.08 : 0,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <TravelModeIcon mode={m} color={on ? colors.flameDeep : colors.ink2} />
              <AppText
                numberOfLines={1}
                style={{ fontSize: 10.5, fontFamily: fonts.bodyMedium, color: on ? colors.flameDeep : colors.ink2 }}
              >
                {t(`travel.mode.${m}`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
```

i18n: `travel.question` = `"Nasıl geliyorsun?"`; `travel.mode.WALK|BIKE|EBIKE|TRANSIT|CAR` =
`"Yürüyerek" | "Bisiklet" | "E-bisiklet" | "Toplu taşıma" | "Araba"`.

- [ ] **Step 5: Giriş noktalarını bağla** (dördü de aynı desen — seçim anında sunucuya yazılır, iyimser değil):
  - `app/sessions/new.tsx`: kendi konumu kartının altına `TravelModePicker`; değer `newSessionStore.travelMode` (varsayılan: `me.defaultTravelMode ?? "CAR"`); `create` gövdesine `travelMode` eklenir.
  - `organisms/PointsEditor.tsx`: her satıra küçük mod seçici (`disabled` değil; **elle konumlar da `CAR` varsayılanı** — §4.5b); `mode: "remote"` iken `sessionStore.addPoint({ …, travelMode })`.
  - `screens/WaitingScreen.tsx`: "Konum ve ulaşım" kartı — mevcut konum satırının altında `TravelModePicker` → `sessionStore.updateLocation({ travelMode })`.
  - `app/profile.tsx`: "Varsayılan ulaşım" satırı → `api.updateMe({ defaultTravelMode })`; PUT tam değiştirme sözleşmesi (K-B10) gereği form **tam durumu** yollar.
  - `molecules/ParticipantRow.tsx`: ad satırının altına `<TravelModeIcon …/>` + `t("lobby.rosterMeta", { city: p.locationLabel, min })` = `"{{city}} · ~{{min}} dk"`; dakika yoksa yalnız şehir.

- [ ] **Step 6: PASS + görsel** — Run: `rtk pnpm --filter @bumpinto/mobile test` ve `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit`.
**Expected:** iki `TravelChips` testi yeşil; dev build'de Yeni buluşma / Bireysel / Bekle / Profil'de seçici görünür, seçim `PUT`/`POST` gövdesinde `travelMode` taşır (ağ günlüğünde doğrula); Lobi roster satırında ikon + `Someren · ~25 dk`.

- [ ] **Step 7: INDEX güncelle + Commit önerisi (kullanıcı yapar)** — `feat(mobile): TravelChips, FairnessBadge, ulasim turu secici`

---

### Task 3: Haritasız varsayılanlar — orta nokta kartı, liste-önce Mekanlar

**Files:**
- Create: `frontend/mobile/src/components/molecules/MidpointCard.tsx`
- Create: `frontend/mobile/src/components/organisms/MapSheet.tsx`
- Modify: `frontend/mobile/src/screens/LobbyScreen.tsx`
- Modify: `frontend/mobile/src/screens/WaitingScreen.tsx`
- Modify: `frontend/mobile/src/screens/VenuesScreen.tsx`
- Modify: `frontend/mobile/src/components/molecules/VenueRow.tsx`
- Modify: `frontend/mobile/src/components/molecules/VenueStripCard.tsx`
- Create: `frontend/mobile/src/screens/VenuesScreen.mapfree.test.tsx`

> **Maliyet gerçeği — plana yazılı sınır:** web'de "haritayı mount etme" gerçek bir tasarruftur
> (Maps **JS** yüklenmez → Dynamic Maps yüklemesi faturalanmaz). **Mobilde böyle değil:**
> `react-native-maps` + `PROVIDER_GOOGLE` Google Maps SDK'sını uygulama başlarken **linkler ve
> yükler**; bileşeni butonun arkasına almak SDK'yı yüklemekten kurtarmaz. Mobil tarafta kazanç
> **UX tutarlılığı** (aynı ekran, aynı karar yüzeyi, harita bir "araç") ve pil/bellek; **para
> tasarrufu iddia edilmez**. Static Maps de kullanılmaz (§6: hâlâ Google haritası, 110px'te
> okunmaz). Ölçüm §5.A.8'e göre: "Haritada gör" dokunuşu Clarity/GA4'e olay olarak gider.

- [ ] **Step 1: Failing test** — `VenuesScreen.mapfree.test.tsx` (`react-native-maps` mock'u M-2 Task 2 Step 3'teki gibi):

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import VenuesScreen from "./VenuesScreen";

const view = (over: object) => ({
  slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP", status: "BROWSING",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, travelMode: "CAR", approxLocation: { lat: 51.7, lng: 5.3 } },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, travelMode: "BIKE", approxLocation: { lat: 51.4, lng: 5.4 } },
  ],
  venues: [
    { id: "v1", name: "Café Berlage", rating: 4.6, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 40, a: 20 } },
    { id: "v2", name: "Koffie & Co", rating: 4.1, lat: 51.45, lng: 5.48, deckOrder: 1, travelMinutes: { h: 25, a: 25 } },
  ],
  midpoint: { lat: 51.5, lng: 5.5 }, midpointLabel: "Eindhoven", radiusKm: 4,
  runoffVenueIds: [], voteTally: {}, ...over,
});

test("varsayılan: liste açık, harita mount edilmedi", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  expect(screen.queryByTestId("map")).toBeNull();
  expect(screen.getByText("Haritada gör")).toBeTruthy();
});

test("adil sıralama varsayılan: fark 0 olan üstte", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  const rows = screen.getAllByTestId("venue-row-name");
  expect(rows[0]!.props.children).toBe("Koffie & Co"); // en uzun 25 · fark 0
});

test("Puan sekmesi sıralamayı çevirir", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  fireEvent.press(screen.getByText("Puan"));
  expect(screen.getAllByTestId("venue-row-name")[0]!.props.children).toBe("Café Berlage");
});

test("grupta 'Bunu seç' yok, SOLO'da var", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  expect(screen.queryByText("Bunu seç")).toBeNull();
  render(<VenuesScreen view={view({ sessionType: "SOLO", viewer: { participantId: "h", host: true } }) as never} />);
  expect(screen.getAllByText("Bunu seç").length).toBeGreaterThan(0);
});

test("Haritada gör → harita mount olur", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  fireEvent.press(screen.getByText("Haritada gör"));
  expect(screen.getByTestId("map")).toBeTruthy();
});
```

- [ ] **Step 2: `molecules/MidpointCard.tsx`** — Lobi/Bekle'de harita şeridinin yerini alır (§5.C):

```tsx
import type { ParticipantDto } from "@bumpinto/shared";
import { roundTo5, type TravelMode } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { TravelModeIcon } from "../../lib/travelMode";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";
import MapMark from "./MapMark";

/** Orta noktaya en yakın kişi hıza ters ağırlıklı merkezi çeken kişidir (§4.5b şeffaflık notu). */
function pullNote(participants: ParticipantDto[]): { name: string; mode: TravelMode } | null {
  const slow: TravelMode[] = ["WALK", "BIKE", "EBIKE"];
  const cands = participants.filter((p) => slow.includes((p.travelMode ?? "CAR") as TravelMode));
  if (cands.length !== 1) return null; // birden çoksa tek cümle kurulamaz → not yok
  return { name: cands[0]!.displayName ?? "?", mode: (cands[0]!.travelMode ?? "CAR") as TravelMode };
}

export default function MidpointCard(props: {
  label?: string;
  radiusKm?: number;
  participants: ParticipantDto[];
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  // B-7 `ParticipantDto.midpointMinutes`: 5 dk'ya yuvarlı, konumu olmayanda null.
  const mins = props.participants
    .map((p) => p.midpointMinutes)
    .filter((m): m is number => m != null)
    .map(roundTo5);
  const note = pullNote(props.participants);

  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
        borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card,
      }}
    >
      <MapMark />
      <View style={{ flex: 1, gap: 3 }}>
        <AppText style={{ fontFamily: fonts.headBold, fontSize: 15 }}>
          {props.label ? t("lobby.midpointTitle", { place: props.label }) : t("lobby.midpointTitleNoPlace")}
        </AppText>
        <AppText style={{ fontSize: 12.5, color: colors.ink2, fontVariant: ["tabular-nums"] }}>
          {[
            props.radiusKm != null ? t("lobby.midpointRadius", { km: props.radiusKm }) : null,
            mins.length > 0 ? t("lobby.midpointRange", { min: Math.min(...mins), max: Math.max(...mins) }) : null,
          ].filter(Boolean).join(" · ")}
        </AppText>
        {note && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
            <TravelModeIcon mode={note.mode} size={14} color={colors.ink3} />
            <AppText style={{ fontSize: 12, color: colors.ink3 }}>
              {t(`lobby.midpointPull.${note.mode}`, { name: note.name })}
            </AppText>
          </View>
        )}
      </View>
      {props.action}
    </View>
  );
}
```

i18n: `lobby.midpointTitle` = `"{{place}} civarı"`, `lobby.midpointTitleNoPlace` = `"Orta nokta"`,
`lobby.midpointRadius` = `"≤ {{km}} km"`, `lobby.midpointRange` = `"herkes ~{{min}}–{{max}} dk"`,
`lobby.midpointPull.BIKE` = `"Orta nokta {{name}}'e yakın: bisikletle geliyor"` (WALK/EBIKE/TRANSIT
karşılıkları; `CAR` anahtarı **yok** — not yalnız yavaş modda çıkar).

- [ ] **Step 3: `organisms/MapSheet.tsx`** — harita yalnız burada mount edilir:

```tsx
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../theme";
import { AppText } from "../atoms";
import MapView from "./MapView";

type LatLng = { lat: number; lng: number };

export default function MapSheet(props: {
  open: boolean;
  onClose: () => void;
  title?: string;
  participants: ParticipantDto[];
  venues: VenueDto[];
  midpoint: LatLng | null;
  radiusKm: number | null;
  selectedVenueId?: string | null;
  onSelectVenue?: (id: string) => void;
  pinLabels?: Record<string, string>;
  tint?: number;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!props.open) return null; // mount YOK — açılmadan MapView ağaca girmez

  return (
    <Modal visible animationType="slide" onRequestClose={props.onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 }}>
          <AppText variant="h2">{props.title ?? t("venues.showMap")}</AppText>
          <Pressable accessibilityRole="button" onPress={props.onClose} hitSlop={12} style={{ minHeight: 44, justifyContent: "center" }}>
            <AppText style={{ color: colors.flameDeep, fontSize: 15 }}>{t("common.close")}</AppText>
          </Pressable>
        </View>
        <View style={{ flex: 1, padding: 14, paddingTop: 0 }}>
          <MapView
            height="100%"
            participants={props.participants}
            venues={props.venues}
            midpoint={props.midpoint}
            radiusKm={props.radiusKm}
            selectedVenueId={props.selectedVenueId}
            onSelectVenue={props.onSelectVenue}
            pinLabels={props.pinLabels}
            tint={props.tint}
          />
        </View>
        <AppText style={{ padding: 14, fontSize: 11, color: colors.ink3 }}>{t("map.attribution")}</AppText>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 4: `LobbyScreen` ve `WaitingScreen`** — `MapView` doğrudan kullanımı **kaldırılır**:

```tsx
// LobbyScreen: eski `<MapView height={110} … />` yerine
const [mapOpen, setMapOpen] = useState(false);
…
<MidpointCard
  label={view.midpointLabel}
  radiusKm={view.radiusKm}
  participants={view.participants ?? []}
  action={
    <Button
      kind="ghost"
      small
      title={t("venues.showMap")}
      onPress={() => setMapOpen(true)}
      disabled={!view.midpoint}
    />
  }
/>
<MapSheet
  open={mapOpen}
  onClose={() => setMapOpen(false)}
  participants={view.participants ?? []}
  venues={[]}
  midpoint={view.midpoint ?? null}
  radiusKm={view.radiusKm ?? null}
/>
```

`WaitingScreen`: aynı desen (`MapView height={200}` düşer); ek olarak **rev-2 kopyası** (K-W3,
§5.B.4): `t("waiting.copy")` = `"Mekanlar geliyor — önce liste, sonra oylama. Sayfayı kapatma
yeter."` (üç dile birden; W-6 aynı anahtarı yazdıysa dokunma).

Lobi ve Bekle'ye §5.C'nin kalan kalemleri:
  - **Aktivite şeridi + vaat:** `t("lobby.activityStrip", { activity })` = `"Kahve için buluşuyoruz"` + `t("lobby.promise")` = `"Orta nokta çevresinde kahve mekanları aranacak"`.
  - **4 adımlı stepper** (Konumlar → Mekanlar → Oylama → Karar): mevcut `molecules/StepList.tsx` deseni; aktif adım `view.status`'tan türetilir.
  - **Gizlilik satırı:** `t("lobby.privacy")` = `"Tam konumun kimseye gösterilmez — yaklaşık nokta ve süre paylaşılır"` (§4.4 vaadinin ekrandaki karşılığı).
  - **Geliş animasyonu:** roster satırı `Bekliyor → Hazır` geçişinde `Animated` `appear` (200 ms); `useReduceMotion()` (Task 5 Step 2) true ise atlanır.
  - **Atıf:** orta nokta adı ters geocode'dan geldiği için ekranın altına `t("map.attributionOsm")` = `"© OpenStreetMap contributors"` (§2 politika; Nominatim çağrısı B-7'de sunucuda, istemci çağırmaz).

**Bileşen ön koşulları:** `MapMark` (DS `.c-mark`) ve `Button kind="ghost"` M-1/M-2'de yoksa bu
görevde eklenir — `MapMark`: 34×34 `View`, `borderRadius [17,17,17,4]`, `rotate 45deg`,
`backgroundColor colors.flame`, beyaz 2.5px kenar; `ghost`: dolgusuz, `borderWidth 1.5`,
`borderColor colors.line2`, metin `colors.ink2`.

- [ ] **Step 5: `VenuesScreen` — liste-önce + adalet sıralaması + harita düğmesi**

```tsx
import type { SessionView } from "@bumpinto/shared";
import { sortVenues } from "@bumpinto/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { GROUP_TINT, groupOf } from "../lib/activity";
// W-4 sapması #2 uyarınca shuffle/pick deckStore'da değil sessionStore'da (slug orada bağlı).
// M-2 gövdesi deckStore diyorsa bu görevde sessionStore'a çekilir — tek yer, tek `mutate()` sayacı.
import { isHost, useSessionStore, viewerId } from "../store/sessionStore";
import { colors } from "../theme";
import { AppText, Badge, Button } from "../components/atoms";
import Segmented from "../components/molecules/Segmented";
import VenueRow from "../components/molecules/VenueRow";
import MapSheet from "../components/organisms/MapSheet";

export default function VenuesScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const host = isHost(view);
  const solo = view.sessionType === "SOLO";
  const me = viewerId(view);
  const shuffle = useSessionStore((s) => s.shuffle);
  const pick = useSessionStore((s) => s.pick);

  const [sort, setSort] = useState<"fair" | "rating">("fair");
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const venues = useMemo(
    () => sortVenues(view.venues ?? [], sort, view.slug ?? ""),
    [view.venues, sort, view.slug],
  );
  const tint = GROUP_TINT[groupOf(view.activityType!)];

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ padding: 14, gap: 10 }}>
        <AppText variant="h2">{view.name ?? t(`activity.${view.activityType}`)}</AppText>
        <AppText variant="muted">
          {t("venues.meta", { count: venues.length, place: view.midpointLabel ?? "", km: view.radiusKm ?? 0 })}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: "fair", label: t("venues.sortFair") },
              { value: "rating", label: t("venues.sortRating") },
            ]}
          />
          <View style={{ flex: 1 }} />
          <Button kind="ghost" small title={t("venues.showMap")} onPress={() => setMapOpen(true)} />
        </View>
        {!host && !solo && <Badge tone="amber" label={t("venues.guestWait")} />}
      </View>

      <FlatList
        data={venues}
        keyExtractor={(v) => v.id!}
        contentContainerStyle={{ padding: 14, paddingTop: 0, gap: 10 }}
        renderItem={({ item }) => (
          <VenueRow
            venue={item}
            deck={venues}
            activityType={view.activityType!}
            participants={view.participants ?? []}
            selfId={me}
            tint={tint}
            selected={item.id === selected}
            onPress={() => setSelected(item.id!)}
            /* §5.B.1: grup satırından "Bunu seç" KALKAR; yalnız SOLO'da kalır. */
            action={solo ? <Button small title={t("venues.pick")} onPress={() => void pick(item.id!)} /> : undefined}
          />
        )}
      />

      {host && !solo && (
        <View style={{ padding: 14 }}>
          <Button title={t("venues.shuffle")} onPress={() => void shuffle()} />
        </View>
      )}

      <MapSheet
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        participants={view.participants ?? []}
        venues={venues}
        midpoint={view.midpoint ?? null}
        radiusKm={view.radiusKm ?? null}
        selectedVenueId={selected}
        onSelectVenue={setSelected}
        tint={tint}
      />
    </View>
  );
}
```

`VenueStripCard` yalnız `MapSheet` içinde anlamlıydı; **şerit kaldırılır** (harita artık tam ekran
modal, kart şeridi ile aynı anda karar yüzeyi olmaya çalışmaz). Dosya silinmez — `MapSheet`
içinde seçili mekanın tek kartı olarak kalabilir; kullanılmıyorsa **silinir** (ölü kod bırakma).

i18n: `venues.sortFair` = `"Herkese adil"`, `venues.sortRating` = `"Puan"`,
`venues.showMap` = `"Haritada gör"`, `venues.meta` = `"{{count}} mekan · {{place}} civarı · ≤ {{km}} km"`.
`venues.list` / `venues.map` anahtarları **artık kullanılmaz** (sekme yok) — W-6 web'de de
kaldırdıysa üç dilden de düşer; kaldırmadıysa mobilde yalnız kullanılmaz.

Aynı ekranda §5.C'nin kalan iki kalemi:
  - **Konumsuz katılımcı notu:** `participants.some(p => !p.hasLocation)` ise liste başlığının altında tek satır `t("venues.noLocationNote", { names })` = `"{{names}} henüz konum vermedi — süreler onlar katılınca güncellenir"`. Sayaç yok, suçlama yok (§4.8).
  - **SOLO "Bunu seç" onayı:** basınca doğrudan `pick` çağrılmaz; satırın altında **satır içi onay kartı** açılır (`t("venues.confirmTitle", { name })` + "Evet, burası" / "Vazgeç"). Grup oturumunda bu yol hiç yok.

- [ ] **Step 6: PASS + görsel** — Run: `rtk pnpm --filter @bumpinto/mobile test` + `… exec tsc --noEmit`.
**Expected:** 5 test yeşil; dev build'de Lobi ve Bekle'de harita **yok**, orta nokta kartı var; Mekanlar liste ile açılıyor, "Herkese adil" varsayılan seçili, "Haritada gör" modali açıyor; grup oturumunda hiçbir satırda "Bunu seç" yok.

- [ ] **Step 7: INDEX güncelle + Commit önerisi (kullanıcı yapar)** — `feat(mobile): haritasiz varsayilanlar, orta nokta karti, liste-once Mekanlar`

---

### Task 4: Deste kartı anatomisi, "Deste bitti" bekleme lobisi, 0-beğeni uyarısı

**Files:**
- Create: `frontend/mobile/src/components/molecules/VenueFitLine.tsx`
- Create: `frontend/mobile/src/components/molecules/VenueAttribution.tsx`
- Modify: `frontend/mobile/src/components/molecules/VenuePolaroid.tsx` (kart gövdesi; M-1'de ad farklıysa o dosya)
- Modify: `frontend/mobile/src/components/molecules/VenueRow.tsx` (aynı slot sırası)
- Modify: `frontend/mobile/src/components/organisms/SwipeDeck.tsx` (meta bloğu + kalibrasyon notu)
- Modify: `frontend/mobile/src/components/molecules/FinishedCard.tsx` (gönderildi hâli + kişi satırları + dürtme + host devam)
- Modify: `frontend/mobile/src/components/molecules/LikedList.tsx` (chip + rozet + adil sıra)
- Modify: `frontend/mobile/src/store/deckStore.ts` (`sent` durumu)
- Create: `frontend/mobile/src/components/molecules/FinishedCard.test.tsx`

- [ ] **Step 1: Failing test** — `FinishedCard.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Share } from "react-native";
import FinishedCard from "./FinishedCard";

const participants = [
  { id: "h", displayName: "Mehmet", host: true, deckDone: true, hasLocation: true, manual: false },
  { id: "a", displayName: "Ayşe", host: false, deckDone: false, hasLocation: true, manual: false },
];

const base = {
  likedCount: 3, sending: false, sent: false, host: true, selfId: "h",
  participants, inviteUrl: "https://bumpinto.app/j/x", activityLabel: "Kahve", venueCount: 12,
  onSend: jest.fn(), onList: jest.fn(), onProceedWithout: jest.fn(),
};

test("0 beğenide uyarı ve birincil 'Listeye dön'", () => {
  render(<FinishedCard {...base} likedCount={0} />);
  expect(screen.getByText("Hiç mekan beğenmedin")).toBeTruthy();
  expect(screen.getByTestId("finished-primary").props.children).toBe("Listeye dön");
});

test("gönderildikten sonra kutlama değil bekleme lobisi", () => {
  render(<FinishedCard {...base} sent />);
  expect(screen.queryByTestId("confetti")).toBeNull();
  expect(screen.getByText("Beğenilerin gönderildi")).toBeTruthy();
  expect(screen.getByText("Mehmet bitirdi")).toBeTruthy();
  expect(screen.getByText("Ayşe kaydırıyor")).toBeTruthy();
  expect(screen.queryByTestId("finished-send")).toBeNull(); // tekrar gönderilemez
});

test("dürtme Share açar, host 'olmadan devam et' görür", () => {
  const spy = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as never);
  render(<FinishedCard {...base} sent />);
  fireEvent.press(screen.getByText("Bekleyenleri dürt"));
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ message: expect.stringContaining("Kahve için 12 mekan hazır") }),
  );
  expect(screen.getByText("Ayşe olmadan devam et")).toBeTruthy();
});

test("host değilse devam butonu yok", () => {
  render(<FinishedCard {...base} sent host={false} selfId="a" />);
  expect(screen.queryByText("Ayşe olmadan devam et")).toBeNull();
});
```

- [ ] **Step 2: `molecules/VenueFitLine.tsx` + `molecules/VenueAttribution.tsx`**

```tsx
// VenueFitLine.tsx — §4.6: ad altında sağlayıcı kategorisi; küme dışıysa amber
import type { VenueDto } from "@bumpinto/shared";
import { fitLine } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { EXPECTED_CATEGORIES } from "../../lib/activity";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

export default function VenueFitLine(props: { venue: VenueDto; deck: VenueDto[]; activityType: string }) {
  const { t } = useTranslation();
  const line = fitLine(props.venue, props.deck, EXPECTED_CATEGORIES[props.activityType] ?? []);
  if (!line) return null;
  const activity = t(`activity.${props.activityType}`);
  return (
    <AppText
      numberOfLines={1}
      style={{
        fontSize: 12.5,
        fontFamily: fonts.bodyMedium,
        color: line.kind === "fit" ? colors.ink2 : colors.amber,
      }}
    >
      {line.kind === "fit"
        ? t("deck.fitFor", { activity, category: line.category })
        : t("deck.fitNot", { activity, category: line.category })}
    </AppText>
  );
}
```

```tsx
// VenueAttribution.tsx — §2 politika: Google içeriğinde "Google Maps", FSQ'da "Powered by Foursquare"
import type { VenueDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { colors } from "../../theme";
import { AppText } from "../atoms";

export default function VenueAttribution(props: { venue: VenueDto; fallbackProvider?: string }) {
  const { t } = useTranslation();
  const provider = (props.venue as { provider?: string }).provider ?? props.fallbackProvider;
  if (!provider) return null;
  return (
    <AppText style={{ fontSize: 10.5, color: colors.ink3 }}>
      {provider === "FOURSQUARE" ? t("venues.attrFsq") : t("venues.attrGoogle")}
    </AppText>
  );
}
```

`lib/activity.ts`'e `EXPECTED_CATEGORIES: Record<ActivityType, readonly string[]>` eklenir
(ör. `COFFEE: ["kafe", "espresso bar", "kahveci", "coffee shop"]`). **Sağlayıcı puanları
karıştırılmaz** (§2): FSQ 0–10 ölçeklemesi yapılmaz; `rating` sunucudan ne geldiyse odur ve
atıf satırı hangi sağlayıcı olduğunu söyler.

i18n: `deck.fitFor` = `"{{activity}} için: {{category}}"`, `deck.fitNot` = `"{{activity}} değil: {{category}}"`,
`venues.attrGoogle` = `"Google Maps"`, `venues.attrFsq` = `"Powered by Foursquare"`.

- [ ] **Step 3: Kart anatomisi (§4.9) — beş yüzeyde aynı slot sırası** — `VenuePolaroid` (deste kartı) ve `VenueRow` (liste) meta bloğu şu sıraya çekilir:

```tsx
{/* foto/monogram (üstte, mevcut) */}
<AppText variant="h3" numberOfLines={1}>{v.name}</AppText>
<VenueFitLine venue={v} deck={deck} activityType={activityType} />
<AppText style={{ fontSize: 12.5, color: colors.ink2, fontVariant: ["tabular-nums"] }}>
  {[
    v.rating != null ? `★ ${v.rating.toFixed(1)}${v.ratingCount ? ` (${v.ratingCount})` : ""}` : null,
    v.priceLevel ? "€".repeat(v.priceLevel) : null,
    /* semt: B-7 `VenueDto.locality`; yalnız orta nokta şehrinden FARKLIYSA yazılır.
       Adres AYRIŞTIRILMAZ — `address` Karar ekranının YER eksenine aittir (§4.9). */
    v.locality && v.locality !== view.midpointLabel ? v.locality : null,
    /* "Açık" YOK — yalnız veri varsa saat metni (§4.9, §6) */
    v.hoursToday ? t("venues.hoursToday", { hours: v.hoursToday }) : null,
  ].filter(Boolean).join(" · ")}
</AppText>
<FairnessBadge venue={v} participants={participants} selfId={selfId} />
<TravelChips venue={v} participants={participants} selfId={selfId} compact />
<VenueAttribution venue={v} />
```

`VenueRow`'da ad `testID="venue-row-name"` alır (Task 3 testleri bunu okur).
Deste kartındaki eski `"foto · Places"` metni **kaldırılır**, yerine `VenueAttribution` gelir.
Destede son iki kartta kalibrasyon notu (`HandNote`): `t("deck.zeroLikeHint")` =
`"Kimse ortak bir yer beğenmezse sonuç boş kalır"` — **yalnız o ana kadar 0 beğeni varsa**.
Destenin başındaki HandNote: `t("deck.fairHand")` = `"Önce herkese en adil olanlar"` (§4.5).
390 başlığına `· {{n}} beğeni` eklenir (§5.B.6).

- [ ] **Step 4: `deckStore` `sent` durumu** — `finish()` yalnız `sending` çevirmez:

```typescript
// store/deckStore.ts (ilgili kısım)
finish: async () => {
  if (get().sending || get().sent) return; // tekrar gönderme yok (§1 bulgusu)
  set({ sending: true, error: null });
  try {
    await api.deckDone(get().slug!);
    set({ sending: false, sent: true });
  } catch (e) {
    set({ sending: false, error: toMessage(e) });
  }
},
```

- [ ] **Step 5: `molecules/FinishedCard.tsx` — bekleme lobisi**

```tsx
import type { ParticipantDto } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { colors, fonts } from "../../theme";
import { AppText, Avatar, Button, Sticker } from "../atoms";

export default function FinishedCard(props: {
  likedCount: number;
  sending: boolean;
  sent: boolean;
  host: boolean;
  selfId?: string;
  participants: ParticipantDto[];
  inviteUrl: string;
  activityLabel: string;
  venueCount: number;
  onSend: () => void;
  onList: () => void;
  onProceedWithout: () => void;
}) {
  const { t } = useTranslation();
  const present = props.participants.filter((p) => p.hasLocation && !p.manual);
  const waiting = present.filter((p) => !p.deckDone);
  const names = waiting.map((p) => p.displayName ?? "?").join(", ");
  const zero = props.likedCount === 0;

  const nudge = () =>
    void Share.share({
      message: t("deck.nudgeText", {
        activity: props.activityLabel,
        count: props.venueCount,
        url: props.inviteUrl,
      }),
    });

  return (
    <View style={{ gap: 14, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
      {/* §4.8: "Deste bitti" BİREYSEL an — kutlama yok, konfeti yok, sticker tek ve sakin */}
      <Sticker>{props.sent ? t("deck.sentSticker") : t("deck.finishedSticker")}</Sticker>
      <AppText style={{ fontFamily: fonts.headBold, fontSize: 26 }}>
        {props.sent ? t("deck.sentTitle") : t("deck.finishedTitle", { count: props.likedCount })}
      </AppText>

      {zero && !props.sent && (
        <View style={{ gap: 4, padding: 12, borderRadius: 14, backgroundColor: colors.amberWash }}>
          <AppText style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.amber }}>
            {t("deck.zeroLikeTitle")}
          </AppText>
          <AppText style={{ fontSize: 13, color: colors.ink2 }}>{t("deck.zeroLikeCopy")}</AppText>
        </View>
      )}

      {props.sent ? (
        <>
          <AppText style={{ fontSize: 14, color: colors.ink2 }}>{t("deck.sentCopy")}</AppText>
          <View style={{ gap: 2 }}>
            {present.map((p, i) => (
              <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }}>
                <Avatar name={p.displayName ?? "?"} index={i} waiting={!p.deckDone} />
                <AppText style={{ flex: 1, fontSize: 14, fontFamily: fonts.bodyMedium }}>
                  {p.deckDone
                    ? t("deck.rowDone", { name: p.displayName })
                    : t("deck.rowSwiping", { name: p.displayName })}
                </AppText>
              </View>
            ))}
          </View>
          {waiting.length > 0 && (
            <>
              {/* §4.8: tek, adlı, pozitif not — sayaç ve "geç" etiketi yok */}
              <AppText style={{ fontSize: 12.5, color: colors.ink3 }}>{t("deck.laggardNote", { names })}</AppText>
              <Button kind="white" title={t("deck.nudge")} onPress={nudge} />
              {props.host && present.some((p) => p.deckDone) && (
                <Button kind="ghost" title={t("deck.proceedWithout", { names })} onPress={props.onProceedWithout} />
              )}
            </>
          )}
        </>
      ) : (
        <View style={{ gap: 10 }}>
          {zero ? (
            <>
              <Button testID="finished-primary" title={t("deck.backToList")} onPress={props.onList} />
              <Button testID="finished-send" kind="white" title={t("deck.send")} disabled={props.sending} onPress={props.onSend} />
            </>
          ) : (
            <>
              <Button testID="finished-primary" title={t("deck.send")} disabled={props.sending} onPress={props.onSend} />
              <Button testID="finished-send" kind="white" title={t("deck.backToList")} onPress={props.onList} />
            </>
          )}
        </View>
      )}
    </View>
  );
}
```

`onProceedWithout` → `sessionStore.forceDecision(null)` (koşul zaten kartta: host ∧ ≥1 bitiren ∧
≥1 bitirmeyen). `DeckProgressNote` bileşeni **buraya taşındığı için** aktif destede yalnız
gecikene tek HandNote kalır (`t("deck.laggardHand", { name, n })` =
`"{{name}}, herkes seni bekliyor — {{n}} kart kaldı"`).

i18n eklenenler: `deck.sentSticker`, `deck.sentTitle` = `"Beğenilerin gönderildi"`,
`deck.sentCopy`, `deck.rowDone` = `"{{name}} bitirdi"`, `deck.rowSwiping` = `"{{name}} kaydırıyor"`,
`deck.laggardNote`, `deck.nudge` = `"Bekleyenleri dürt"`,
`deck.nudgeText` = `"{{activity}} için {{count}} mekan hazır, seni bekliyoruz: {{url}}"`,
`deck.proceedWithout` = `"{{names}} olmadan devam et"`, `deck.zeroLikeTitle` = `"Hiç mekan beğenmedin"`,
`deck.zeroLikeCopy`, `deck.finishedTitle` = `"{{count}} mekan beğendin"`, `deck.fairHand`,
`deck.zeroLikeHint`, `deck.laggardHand`, `venues.hoursToday` = `"Bugün {{hours}}"`.

- [ ] **Step 6: `LikedList`** — her satırda `TravelChips` + `FairnessBadge`, sıra `sortVenues(liked, "fair", view.slug)`.

- [ ] **Step 7: PASS + görsel** — Run: `rtk pnpm --filter @bumpinto/mobile test` + `… exec tsc --noEmit`.
**Expected:** 4 `FinishedCard` testi yeşil; dev build'de deste kartında sıra `ad → uyum → ★·€€·semt → rozet → chip'ler → atıf`, hiçbir kartta "Açık" yok; gönderdikten sonra buton kaybolur, kişi satırları görünür, dürtme sistem paylaşım sayfasını açar.

- [ ] **Step 8: INDEX güncelle + Commit önerisi (kullanıcı yapar)** — `feat(mobile): deste kart anatomisi, deste bitti bekleme lobisi`

---

### Task 5: Runoff v2 ve Karar v2

**Files:**
- Create: `frontend/mobile/src/lib/useCountUp.ts`
- Create: `frontend/mobile/src/lib/revealOnce.ts`
- Modify: `frontend/mobile/src/screens/RunoffScreen.tsx`
- Modify: `frontend/mobile/src/components/molecules/RunoffStatus.tsx`
- Modify: `frontend/mobile/src/components/molecules/RunoffTie.tsx`
- Modify: `frontend/mobile/src/screens/ResultScreen.tsx`
- Create: `frontend/mobile/src/components/molecules/WhyHere.tsx`
- Create: `frontend/mobile/src/components/molecules/TravelList.tsx`
- Create: `frontend/mobile/src/screens/ResultScreen.test.tsx`

- [ ] **Step 1: Failing test** — `ResultScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import ResultScreen from "./ResultScreen";

const view = (over: object) => ({
  slug: "x", activityType: "COFFEE", sessionType: "GROUP", status: "DECIDED",
  decisionKind: "UNANIMOUS", decidedAt: "2026-09-03T18:00:00Z",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true, manual: false, travelMode: "CAR" },
    { id: "k", displayName: "Kerem", host: false, hasLocation: true, deckDone: true, manual: false, travelMode: "TRANSIT" },
  ],
  venues: [{
    id: "v1", name: "Café Berlage", rating: 4.6, category: "espresso bar",
    address: "Kleine Berg 16, Eindhoven", placeLink: "https://maps.google.com/?cid=1",
    lat: 51.44, lng: 5.47, travelMinutes: { h: 20, k: 35 },
  }],
  decidedVenueId: "v1", likeCounts: { v1: 2 }, midpoint: { lat: 51.45, lng: 5.47 },
  midpointLabel: "Eindhoven", viewer: { participantId: "h", host: true }, ...over,
});

test("harita yok; adres + Google Maps'te aç var", () => {
  render(<ResultScreen view={view({}) as never} />);
  expect(screen.queryByTestId("map")).toBeNull();
  expect(screen.getByText("Kleine Berg 16, Eindhoven")).toBeTruthy();
  expect(screen.getByText("Google Maps'te aç")).toBeTruthy();
});

test("Neden burası? üç eksen ve davetlinin de herkesin yolunu görmesi", () => {
  render(<ResultScreen view={view({ viewer: { participantId: "k", host: false } }) as never} />);
  expect(screen.getByText("Neden burası?")).toBeTruthy();
  expect(screen.getByText("Sen ~35 dk")).toBeTruthy();
  expect(screen.getByText("Mehmet ~20 dk")).toBeTruthy();
});

test("eyebrow decisionKind'a göre; 'kazanan' dili yok", () => {
  render(<ResultScreen view={view({}) as never} />);
  expect(screen.getByText("HEPİNİZ AYNI YERİ BEĞENDİ")).toBeTruthy();
  render(<ResultScreen view={view({ decisionKind: "FORCED" }) as never} />);
  expect(screen.queryByText(/kazanan/i)).toBeNull();
});

test("en uzaktan gelene erken çıkış notu", () => {
  render(<ResultScreen view={view({}) as never} />);
  expect(screen.getByText("Kerem en uzaktan geliyor — ~15 dk önce çıkarsa herkes aynı anda varır")).toBeTruthy();
});
```

- [ ] **Step 2: `lib/useCountUp.ts` + `lib/revealOnce.ts`**

```typescript
// useCountUp.ts — 320 ms sayım; reduced-motion'da anında son değer (§5.C)
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v));
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** `enabled` false iken 0 döner; true olunca 0 → target arası 320 ms sayar (bir kez). */
export function useCountUp(target: number, enabled: boolean, ms = 320): number {
  const reduce = useReduceMotion();
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled) {
      started.current = false;
      setValue(0);
      return;
    }
    if (reduce) {
      setValue(target);
      return;
    }
    if (started.current) {
      setValue(target);
      return;
    }
    started.current = true;
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setValue(Math.round(target * p));
      if (p === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, enabled, reduce, ms]);

  return value;
}
```

```typescript
// revealOnce.ts — yakınsama açılışı oturum başına BİR kez (web sessionStorage'ın RN karşılığı;
// uygulama ömrü boyunca bellekte tutulur, yeniden açılışta tekrar oynamaz çünkü DECIDED zaten geçmiştir).
const shown = new Set<string>();

/** Canlı DECIDED geçişinde true döner; aynı slug için ikinci çağrıda false. */
export function claimReveal(slug: string, live: boolean): boolean {
  if (!live || shown.has(slug)) return false;
  shown.add(slug);
  return true;
}
```

`live` ölçütü: ekran ilk mount olduğunda `status` DECIDED **değildi** ve poll/STOMP ile DECIDED'a
geçti (`decidedAt` mount anından sonra). Uygulamayı zaten DECIDED oturuma açan kullanıcıya
açılış oynatılmaz.

- [ ] **Step 3: Runoff v2** — `RunoffScreen` + `RunoffStatus` + `RunoffTie`:
  - **Overline:** `t("runoff.overline", { activity, count, place })` = `"KAHVE · 3 KİŞİ · ORTA NOKTA ÇEVRESİ"` (harf aralığı, büyük harf DS'ten).
  - **Başlık kopyası:** iki finalist → `t("runoff.titleTwo")` = `"İkisi de güzel, biri seçilecek"`; ≥ 3 finalist → `t("runoff.titleMany")` = `"Hepsi güzel, biri seçilecek"` (sayı enterpolasyonu yok). **"Son düzlük" sticker'ı YOK** — yarışma/podium dili kullanılmaz (§4.8, §6).
  - **Neden dalı:** `view.runoffReason === "FALLBACK"` → `t("runoff.reasonFallback", { count })` = `"Henüz ortak nokta yok — en çok beğenilen {{count}} mekan finalde"`; `INTERSECTION` → `t("runoff.reasonIntersection")`.
  - **Fragman satırı (finalist kartı altı):** `t("runoff.trailer", { total, spread })` = `"toplam ~{{total}} dk · fark ~{{spread}} dk"`; **karar verici fark** (finalistler arasında en küçük fark) amber-wash arka plan alır.
  - **Sayım kapısı:** `voteTally` yalnız sunucu verdiğinde (DECIDED ya da herkes kilitlediyse) gösterilir; geldiği anda `useCountUp(tally[id], visible)`. Kilitlenmemişken **hiç sayı yok** ("3/3 seçti ama bekliyoruz" çelişkisi kapanır).
  - **`RunoffTie` ikinci buton:** `t("runoff.tieFair")` = `"Adil olana bırak"` → host'ta `sessionStore.forceDecision(pickFairest(finalists)!.id!)`. **Bilinçli sapma:** sunucunun son beraberlik kırıcısı `SecureRandom`; istemci belirlenimci olmak zorunda olduğu için `pickFairest` son adımda `id` ile kırar — aynı finalist kümesinde host'un butonu ile sunucunun otomatik kararı **farklı** mekan seçebilir; bu buton zaten host'un açık kararıdır, çelişki değildir. INDEX notuna yazılır.
  - **Kilit sonrası:** `t("runoff.remind")` = `"Hatırlatma gönder"` → `Share.share({ message: t("runoff.remindText", { url }) })`.

```tsx
// RunoffScreen içinde sayım kapısı (özet)
const finalists = (view.venues ?? []).filter((v) => view.runoffVenueIds?.includes(v.id!));
const everyoneLocked =
  (view.runoffVotedParticipantIds?.length ?? 0) >= (view.participants ?? []).filter((p) => p.hasLocation && !p.manual).length;
const tallyVisible = view.status === "DECIDED" || (everyoneLocked && Object.keys(view.voteTally ?? {}).length > 0);
…
{finalists.map((v) => {
  const count = useCountUp(view.voteTally?.[v.id!] ?? 0, tallyVisible);
  return (
    <View key={v.id}>
      {/* kart: VenueFitLine + meta + FairnessBadge + TravelChips + VenueAttribution (Task 4 sırası) */}
      <AppText style={{ fontSize: 12.5, color: colors.ink2, fontVariant: ["tabular-nums"] }}>
        {t("runoff.trailer", { total: totalOf(v), spread: spreadOf(v) })}
      </AppText>
      {tallyVisible && <Badge tone="neutral" label={t("runoff.votes", { count })} />}
    </View>
  );
})}
```

(Kanca kural gereği `map` içinde çağrılamaz → her finalist ayrı `RunoffFinalistCard` bileşenine
çıkarılır; yukarıdaki blok o bileşenin gövdesidir.)

- [ ] **Step 4: Karar v2** — `ResultScreen` + `WhyHere` + `TravelList`:

```tsx
// molecules/WhyHere.tsx — üç eksen (§5.C)
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { fairnessOf, roundTo5 } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

export default function WhyHere(props: {
  venue: VenueDto;
  participants: ParticipantDto[];
  activityType: string;
  midpointLabel?: string;
}) {
  const { t } = useTranslation();
  const ids = props.participants.map((p) => p.id!).filter(Boolean);
  const f = fairnessOf(props.venue, ids);
  const mins = ids.map((id) => props.venue.travelMinutes?.[id]).filter((m): m is number => m != null).map(roundTo5);
  const longest = props.participants.find((p) => p.id === f?.longestParticipantId)?.displayName;
  const category = (props.venue as { category?: string }).category;
  const address = (props.venue as { address?: string }).address;

  const axes = [
    mins.length > 0
      ? { key: "fair", label: t("result.axisFair"), value: t("result.axisFairValue", { min: Math.min(...mins), max: Math.max(...mins), name: longest ?? "" }) }
      : null,
    category ? { key: "fit", label: t("result.axisFit"), value: t("deck.fitFor", { activity: t(`activity.${props.activityType}`), category }) } : null,
    address ? { key: "place", label: t("result.axisPlace"), value: address } : null,
  ].filter(Boolean) as { key: string; label: string; value: string }[];

  return (
    <View style={{ gap: 10, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
      <AppText style={{ fontFamily: fonts.headBold, fontSize: 16 }}>{t("result.whyTitle")}</AppText>
      {axes.map((a) => (
        <View key={a.key} style={{ gap: 2 }}>
          <AppText style={{ fontSize: 11, letterSpacing: 0.8, color: colors.ink3 }}>{a.label.toLocaleUpperCase("tr")}</AppText>
          <AppText style={{ fontSize: 14, color: colors.ink }}>{a.value}</AppText>
        </View>
      ))}
    </View>
  );
}
```

`ResultScreen` değişiklikleri:
  - **`MapView` kaldırılır** (§4.7: Karar'da harita **yok**).
  - Adres satırı + `Button kind="white"` `t("result.openInMaps")` = `"Google Maps'te aç"` → `Linking.openURL(v.placeLink ?? v.mapsUrl ?? \`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}\`)` (B-7 `mapsUrl` fallback'i zaten sunucuda; istemci üçüncü kalkan).
  - `TravelList` **herkes için** (davetli dahil, km yok, `~dk`) — `travelRows` ile aynı sıra, `Sen` işaretli.
  - `WhyHere` üç eksen.
  - **Eyebrow** `decisionKind`'a göre: `UNANIMOUS` → `t("result.eyebrow.UNANIMOUS")` = `"HEPİNİZ AYNI YERİ BEĞENDİ"`; `RUNOFF` → `t("result.eyebrow.RUNOFF", { a, b })` = `"Oylamayla {{a}}–{{b}}"`; `FORCED`/`PARTIAL` → `t("result.eyebrow.FORCED", { names })` = `"{{names}} olmadan"`; `SINGLE_LIKE` → `t("result.eyebrow.SINGLE_LIKE")`. **Diğer dallarda oybirliği iddiası yoktur** (§6: yokluk ifşası yok).
  - **Orta nokta uzaklığı:** `t("result.midpointDistance", { m })` = `"Herkesin ortasına ~{{m}} m"` — `midpoint` ile mekan arası haversine, 100 m'ye yuvarlı; 1 km üstünde `~{{km}} km`.
  - **Erken çıkış notu (HandNote):** `t("result.leaveEarly", { name, min })` = `"{{name}} en uzaktan geliyor — ~{{min}} dk önce çıkarsa herkes aynı anda varır"`; `min = spreadMinutes` (5 dk yuvarlı), `spreadMinutes === 0` ise **not yok**.
  - **Yedek plan:** runoff ikincisi varsa `t("result.backup", { name })` = `"Yedek plan: {{name}}"` + tek satır meta.
  - **Paylaşım metni viewer-bağımsız (§5.B.8):** `Share.share({ message: t("result.shareText", { name, address, time }) })` = `"Karar verildi: {{name}} — {{address}}"`; metinde "sen/senin" geçmez, kimin paylaştığından bağımsız aynı cümle çıkar. `url` alanı `placeLink`.
  - **`likeCounts` (yalnız DECIDED):** ADALET ekseninin altında tek satır `t("result.likes", { count, total })` = `"{{count}}/{{total}} kişi beğendi"`; **`UNANIMOUS` dışındaki dallarda kimin beğendiği yazılmaz** (§6: yokluk ifşası yok).
  - **`FairnessBadge`** kazanan kartında da görünür (§5.C "Herkese adil rozeti finalist ve kazananda").
  - **Yakınsama açılışı:** `claimReveal(view.slug!, live)` true ise ≤ 1,5 s `Animated`/`Reanimated` giriş (kartlar orta noktaya yakınsar); `useReduceMotion()` true ise **atlanır**, içerik anında son hâlinde.

- [ ] **Step 5: PASS + görsel** — Run: `rtk pnpm --filter @bumpinto/mobile test` + `… exec tsc --noEmit`.
**Expected:** 4 `ResultScreen` testi yeşil; dev build'de Karar'da harita yok, "Google Maps'te aç" gerçek uygulamayı açıyor, davetli de herkesin dakikasını görüyor; Runoff'ta kimse kilitlemeden sayı görünmüyor, herkes kilitleyince 320 ms sayım oynuyor, Ayarlar → Hareketi azalt açıkken sayım ve açılış oynamıyor.

- [ ] **Step 6: INDEX güncelle + Commit önerisi (kullanıcı yapar)** — `feat(mobile): runoff v2 ve karar v2 (haritasiz, neden burasi)`

---

### Task 6: Kapanış — i18n paritesi, duman testi, plan sonu

**Files:**
- Modify: `frontend/shared/src/i18n/locales/{tr,en,nl}.json`
- Modify: `docs/superpowers/plans/INDEX.md` (M-3 satırı + `K-M*` yeni kalemler)

- [ ] **Step 1: Anahtar paritesi** — Run (repo kökü):

```bash
rtk node -e '
const fs=require("fs");
const p="frontend/shared/src/i18n/locales/";
const flat=(o,pre="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"&&v?flat(v,pre+k+"."):[pre+k]);
const L=["tr","en","nl"].map(l=>[l,new Set(flat(JSON.parse(fs.readFileSync(p+l+".json","utf8"))))]);
const base=L[0][1];
for(const [l,s] of L.slice(1)){
  const miss=[...base].filter(k=>!s.has(k)), extra=[...s].filter(k=>!base.has(k));
  if(miss.length||extra.length){console.log(l,"eksik:",miss,"fazla:",extra);process.exitCode=1;}
}
console.log("anahtar sayisi:",L.map(([l,s])=>l+"="+s.size).join(" "));'
```

**Expected:** üç dilde eşit anahtar sayısı, eksik/fazla listesi boş. Eksikse **üç dile birden**
yazılır (en/nl çevirileri W-2'deki `_status` işaretiyle tasarım onayına bırakılır — K-W1).

- [ ] **Step 2: Kullanılmayan anahtar taraması** — Run:

```bash
rtk node -e '
const fs=require("fs"),cp=require("child_process");
const flat=(o,pre="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"&&v?flat(v,pre+k+"."):[pre+k]);
const keys=flat(JSON.parse(fs.readFileSync("frontend/shared/src/i18n/locales/tr.json","utf8")));
const src=cp.execSync("cat $(find frontend/web/src frontend/mobile/src frontend/mobile/app -name \"*.ts*\")",{encoding:"utf8",maxBuffer:1e8});
const dead=keys.filter(k=>!src.includes(k.split(".").slice(0,2).join(".")));
console.log("supheli kullanilmayan:",dead);'
```

Şablonlu anahtarlar (`travel.mode.*`, `result.eyebrow.*`, `lobby.midpointPull.*`) yanlış pozitif
verir — elle doğrula, gerçekten ölü olanı (ör. `venues.list`, `venues.map`) üç dilden **sil**.

- [ ] **Step 3: Yer tutucu ve dil taraması** — Run:

```bash
rtk rg -n "TODO|FIXME|XXX|placeholder|lorem" frontend/mobile/src frontend/mobile/app || echo "temiz"
rtk rg -ni "kazanan|eşleşme|match|favorin" frontend/shared/src/i18n/locales/tr.json || echo "dil sozlugu temiz"
rtk rg -n "from \"react-native-maps\"" frontend/mobile/src
```

**Expected:** TODO yok; §4.8 yasak kelimeleri yok; `react-native-maps` yalnız
`organisms/MapView.tsx` ve `lib/mapStyle.ts`'te — **hiçbir ekran dosyasında değil** (ekranlar
`MapSheet` üzerinden erişir).

- [ ] **Step 4: Duman testi (dev build)** — M-2 Task 5 Step 3 ile aynı yöntem:
  - iOS simülatörü: `rtk pnpm --filter @bumpinto/mobile exec npx expo run:ios`
  - Android emülatörü: `rtk pnpm --filter @bumpinto/mobile exec npx expo run:android`
  - Uçtan uca **Grup** (mobil host ↔ web davetli): Yeni buluşma (ulaşım türü seçilir) → Lobi (orta nokta kartı, roster ikonu) → Mekanlar (liste-önce, adil sıra, "Haritada gör") → Deste (uyum satırı, rozet, chip'ler) → Deste bitti (gönderildi, kişi satırları, dürtme) → Runoff (sayım kapısı) → Karar (harita yok, "Google Maps'te aç", "Neden burası?").
  - Uçtan uca **Bireysel**: elle konumlar + mod, liste, "Bunu seç" (SOLO'da **kalır**).
  - Erişilebilirlik: Hareketi azalt açıkken sayım/açılış yok; VoiceOver/TalkBack ile `TravelModePicker` radyo grubu okunur.
  - Maps anahtarı **yokken**: `MapSheet` boş gri harita gösterir, akış kırılmaz (M-2 kuralı).

- [ ] **Step 5: INDEX** — M-3 satırı `done`; **Not** alanına tek satır özet + bu planın bilinçli sapmaları:
  1. Mobilde Katıl ekranı yok → §4.5b'nin "Katıl formu" girişi web'de karşılanır.
  2. Mobilde haritayı butonun arkasına almak **para tasarrufu değildir** (Maps SDK uygulama başında yüklenir); kazanç UX tutarlılığı.
  3. "Adil olana bırak" istemci tarafında son beraberliği `id` ile kırar (sunucu `SecureRandom`).
  4. `VenueStripCard` kaldırıldı (harita şeridi yerine tam ekran `MapSheet`).
  5. Mobil artboard 04–08 bu paket için henüz güncellenmedi → kaynak web 390 + karar dokümanı.
  Yeni `K-M*` kalemleri (tablonun **sonuna**): mobil artboard 04–08 parite güncellemesi; `hoursToday`
  metni için veri gelince görsel doğrulama; Clarity/GA4 "Haritada gör" olayının mobil karşılığı (§5.A.8).

- [ ] **Step 6: Commit önerisi (kullanıcı yapar)** — `feat(mobile): i18n paritesi ve M-3 kapanisi`

---

## Plan sonu doğrulaması

- [ ] **Tek kaynak:** adalet metriği, sıralama, chip satırı, rozet kuralı, uyum satırı yalnız `frontend/shared/src/fairness.ts`'te; mobilde ikinci uygulama yok (`rg -n "spreadMinutes|maxMinutes" frontend/mobile/src` → yalnız import satırları).
- [ ] **§4.2 tek rozet:** fark ≤ 10 → `Herkese ~aynı`; medyanı ≥ 10 aşan varsa `{{ad}} için uzak`; aksi hâlde rozet yok. Rozet meta satırında `Badge`; foto üstünde ya da `Sticker` olarak **hiçbir yerde** değil.
- [ ] **§4.3 TravelChips:** beş yüzeyde (Mekanlar satırı, deste kartı, Beğendiklerin, runoff finalisti, Karar) aynı bileşen; 3. kişi hiçbir yerde düşmüyor; "Sen" kalın; en uzunda ▲; sonda `fark N dk`; renk yok.
- [ ] **§4.5 sıra:** deste ve liste adalet öncelikli (en uzun yol → fark → 5 dk bandı içinde `Random(session.id)`); listede Segmented `Herkese adil · Puan`, varsayılan adil; aynı oturumda herkes aynı sırayı görüyor.
- [ ] **§4.5b ulaşım türü:** Yeni buluşma, Bireysel konumlar, Bekle ve Profil'de seçici; roster satırında ikon + `{{şehir}} · ~{{dk}} dk`; orta nokta kartında tek şeffaflık notu; dakikalar sunucudan mod-uyumlu.
- [ ] **§4.7 harita politikası:** hiçbir ekran varsayılan harita mount etmiyor; `react-native-maps` yalnız `MapView.tsx` içinde; harita yalnız "Haritada gör" ile açılan `MapSheet`'te; **Karar ve Bekle'de harita hiç yok**; Static Maps kullanılmadı.
- [ ] **§4.8 dil:** "kazanan/eşleşme/match/favorin" hiçbir dilde yok; kutlama yalnız Karar ve runoff sonucunda; "Deste bitti" sakin; geciken kişiye tek, adlı, pozitif not.
- [ ] **§4.9 kart anatomisi:** slot sırası beş yüzeyde aynı; "Açık" yok; `hoursToday` varsa `Bugün 08–22`; atıf satırı her kartta.
- [ ] **§6 YAPMA listesi:** hiçbir maddesi uygulanmadı (yukarıdaki liste tek tek gözden geçirildi).
- [ ] **Kapılar:** `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit` + `rtk pnpm --filter @bumpinto/mobile test` + `rtk pnpm test:web` (shared testleri dahil) yeşil; tr/en/nl anahtar sayıları eşit; sıfır TODO.
- [ ] **INDEX:** M-3 `done`, bilinçli sapmalar ve yeni `K-M*` kalemleri yazıldı; **hiçbir git komutu çalıştırılmadı** (commit'ler kullanıcıda).
