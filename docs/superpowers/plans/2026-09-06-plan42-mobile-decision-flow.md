# Karar Akışı — Deste, Runoff, Karar, Çevrimdışı/Hata, E2E (M-8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Bu plan v3 mobil izinin son üçte biridir.** Temel (Expo iskeleti, tema/atomlar, shared taşıması,
Google girişi, Oturumlar/Profil) **M-4** (`2026-09-06-plan38-mobile-shell-v3.md`); kurma ve katılım
(yeni buluşma, izin akışı, katıl, durum yönlendirici, lobi/bekle, mekanlar) **M-7**
(`2026-09-06-plan41-mobile-create-join.md`). Yürütme sırası: **M-4 → M-7 → M-8**. Mağaza/yasal paketi
**M-5**, sesli sohbet **M-6**; ikisi de bu planda yok.

**Goal:** Oturumun karar yarısı: desteyi kaydıran (damga, haptik, geri al), beğenileri gönderen,
runoff'ta oy veren, beraberliği host'a çözdüren ve kararı gösteren ekranlar; üstüne çevrimdışı şeridi
ile hata ekranı ve gerçek istemcide koşan Maestro e2e akışları — P14–P20 ve P23/P24 artboard'larına
sadık, adalet gösterimi `frontend/shared/src/fairness.ts` üzerinden web ile tek uygulamada.

**Architecture:** M-7'nin durum yönlendiricisi (`app/sessions/[slug].tsx`) bu planın ekranlarını
**zaten adlandırır**; M-8 o iskeletleri doldurur, yönlendiriciyi yeniden yazmaz. **Atomic design**:
`src/screens/*` yalnız kompozisyon + store bağlama. Yeni state: **zustand 5** `deckStore`; `netStore`
M-4'te doğdu, `watchNetwork` aboneliği burada eklenir — `lastSyncAt`'in tek sahibi `sessionStore`
kalır. Deste geometrisi (`swipeThreshold`, `dragRotation`, `dragProgress`, `releaseDecision`) ve karar
mantığı (`backupOf`, `isDeciding`, `venueLink`, `votersOf`) `@bumpinto/shared`'dan gelir; ikinci eşik
ya da ikinci hesap tanımı yasak. Canlı veri: M-7'nin `useSessionLive` polling'i (STOMP köprüsü M-6).

**Tech Stack:** **Expo SDK 57** (RN 0.86 / React 19.2, dev build, New Arch), expo-router 57, **gesture-handler 2.32 + reanimated 4** (+ `react-native-worklets`; kaydırma),
expo-haptics, `@react-native-community/netinfo`, react-native-safe-area-context,
`phosphor-react-native` + react-native-svg, zustand 5, i18next/react-i18next, `@bumpinto/shared`,
jest-expo 57 + @testing-library/react-native 14 + **Maestro**.

**Kaydırma API'si (2026-09-07, BAĞLAYICI — sahada doğrulandı):** SDK 57 gesture-handler'ı **~2.32.0**
(3.x değil), reanimated **4.x**. Deste kaydırması **Gesture API**'siyle (`Gesture.Pan()` +
`GestureDetector`) yazılır; eski `<PanGestureHandler>` / `useAnimatedGestureHandler` deseni
**kullanılmaz**. Worklet'ler `react-native-worklets` üstünden çalışır; `babel-preset-expo` eklentiyi
otomatik ekler, `babel.config.js` yazılmaz.

**Test kuralı (RNTL 14):** `render` Promise döndürür — bu plandaki tüm test parçacıklarında
**`await render(...)`** kullanılır (M-4 T1 saha notu #3).

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç adları
**değiştirilmez**), §3 Mobil, §4 (M-8 satırı). Karşılananlar: **R-M13** çevrimdışı + iskelet.
Kapsam dışı: R-M1/R-M3–R-M7/R-M15 → **M-5**; R-M10 + dock → **M-6**; R-M11/R-M12/R-M17 (sonuç kartı
görseli, takvim, paylaşım) → M-9 (plan43). Yardımcı kaynaklar:
`2026-09-03-map-free-group-decision-ux.md` (ürün tezi, §4 adalet dili),
`2026-09-06-mobile-design-direction.md` (kabuk kararları).

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya
**`Mobil Ekranlar v3.dc.html`** (P1–P24). Yerel kopya + ölçüler:
`.../scratchpad/design/m3/{A,B}/*.html`, `m3/native.css`, `m3/GUIDE.md`.

| Artboard | Ekran |
|---|---|
| P14/P15/P16/P17 Deste akışı | `DeckScreen` · `DeckDoneScreen` · `ListScreen` · `SentScreen` |
| P18/P19/P20 Runoff–Karar | `RunoffScreen` · `TieScreen` · `ResultScreen` |
| P23 Hata · P24 Çevrimdışı | `ErrorScreen` · `OfflineBanner` |
| O2 · P1/P2 · P22 | **M-4'te bitti** |
| O3/O6 · P3–P13 | **M-7'de bitti** |
| P21 kart görseli · P25 dock · P26 Live Activity | **bu planda YOK** (M-9 (plan43) / M-6 / sonraki iz) |

**Ön koşul: M-7 done** (`2026-09-06-plan41-mobile-create-join.md`, dolayısıyla M-4 de done). Bu plan
M-7'nin ürettiği şu dosya/sembolleri **tüketir**: `app/sessions/[slug].tsx` (`SCREENS` yönlendiricisi
+ `DeckRouter`/`RunoffRouter` dalları) · `src/store/useSessionLive.ts` ·
`src/components/molecules/{RangeBar,VenueRow,VenueThumb,Attribution,ParticipantRow,StepBar,MidpointCard}.tsx` ·
`src/components/organisms/VoiceDockSlot.tsx` · `src/screens/VenuesScreen.tsx` ·
`src/screens/{DeckScreen,SentScreen,RunoffScreen,TieScreen,ResultScreen}.tsx` (M-7 T4'te açılan
`return null;` iskeletleri — bu planın T1/T2/T3'ü bunları doldurur) · `src/screens/ErrorScreen.tsx`
(M-7 T4'ün ilk sürümü; T4 tamamlar). M-4'ten: `src/theme.ts`, `src/icons.ts`,
`src/components/atoms/*`, `src/lib/api.ts`, `src/store/{sessionStore,netStore}.ts`, `src/i18n`.
Shared'dan: `swipeThreshold`, `dragRotation`, `dragProgress`, `releaseDecision`, `SWIPE_THRESHOLD_PX`,
`FLING_VELOCITY`, `SwipeDir`, `backupOf`, `isDeciding`, `votersOf`, `allVoted`, `venueLink`,
`monogram`, `fairnessOf`, `fairestOf`. Doğrula (repo kökünden):

```bash
for f in "app/sessions/[slug].tsx" src/store/useSessionLive.ts \
  src/components/molecules/RangeBar.tsx src/components/molecules/VenueRow.tsx \
  src/components/molecules/VenueThumb.tsx src/components/molecules/Attribution.tsx \
  src/components/molecules/ParticipantRow.tsx src/components/molecules/StepBar.tsx \
  src/components/organisms/VoiceDockSlot.tsx src/screens/VenuesScreen.tsx \
  src/screens/ErrorScreen.tsx src/screens/DeckScreen.tsx src/screens/SentScreen.tsx \
  src/screens/RunoffScreen.tsx src/screens/TieScreen.tsx src/screens/ResultScreen.tsx \
  src/store/netStore.ts src/lib/api.ts src/theme.ts src/icons.ts; do \
  test -f "frontend/mobile/$f" || echo "EKSIK: $f"; done
rtk grep -c "SCREENS" "frontend/mobile/app/sessions/[slug].tsx"
rtk grep -c "useSessionLive" frontend/mobile/src/store/useSessionLive.ts
for s in swipeThreshold releaseDecision backupOf isDeciding votersOf venueLink fairestOf; do \
  printf '%s: ' "$s"; rtk grep -c "$s" frontend/shared/src/index.ts; done
```

Expected: hiç `EKSIK:` satırı yok ve tüm sayaçlar ≥1. Herhangi biri 0/eksikse **bu plan başlamaz**,
M-7 tamamlanır.

**Bağlayıcı kurallar:**

- **Git yazma YOK** (`git mv`/`commit`/`push` yasak); her görev sonunda **dosya listesi**, kullanıcı commit eder.
- Test komutu (repo kökü): `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test -- <yol>` — aşağıda **`MTEST <yol>`**. Web regresyonu: `rtk pnpm test:web`.
- Sözleşme (`api-types.ts` alan adları, uç yolları) **değiştirilmez**; eksik alanda ekran o satırı gizler, alan icat edilmez.
- Ekran dosyalarında ham `Pressable`/`TextInput`/`Text` ve kopya stil YASAK. Store'a yalnız ekranlar ve organizmalar bağlanır.
- i18n: metin sabiti yasak; taban `tr`, yeni anahtar **üç dile birden** (`rtk pnpm i18n:check` yeşil).
- **Rozet çorbası yasak:** adalet yalnız `RangeBar` (liste) / `TravelBars` (kart) ile gösterilir; `Sen ~30 dk ▲` rozeti üretilmez (karar dok. §4, GUIDE kural 10).
- Deste geometrisi ve karar mantığı yalnız `@bumpinto/shared`'dan okunur; ikinci eşik/hesap tanımı yasak.
- **M-7'nin yönlendiricisi yeniden yazılmaz:** bu planın ekranları M-7 T4'te açılan dosya adlarını korur, yalnız gövdelerini doldurur.
- Metin ≥12px, dokunma hedefi ≥44px, her ekranda tek birincil düğme.
- Sesli sohbet dock'u **yer tutucudur** (`VoiceDockSlot` hiçbir şey çizmez); gerçek dock M-6.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `mobile/src/store/deckStore.ts`, `src/components/molecules/TravelBars.tsx`, `src/components/organisms/{SwipeCard,SwipeDeck}.tsx`, `src/screens/DeckScreen.tsx` | T1 | Deste: kaydırma, damga, haptik |
| `mobile/src/screens/{DeckDone,List,Sent}Screen.tsx` | T2 | Deste bitti, liste, gönderildi |
| `mobile/src/screens/{Runoff,Tie,Result}Screen.tsx`, `src/components/organisms/{RunoffCard,ResultCard}.tsx` | T3 | Runoff, berabere, karar |
| `mobile/src/store/netStore.ts` (M-4 T8'de doğdu), `src/components/molecules/OfflineBanner.tsx`, `src/screens/ErrorScreen.tsx` | T4 | Çevrimdışı + hata |
| `mobile/.maestro/*.yaml`, `docs/superpowers/plans/INDEX.md` | T5 | e2e + kayıt |

---

### Task 1: Deste (P14) — kaydırma, damga, haptik, `TravelBars`

**Files:** Create `frontend/mobile/src/store/deckStore.ts`,
`src/components/molecules/TravelBars.tsx`, `src/components/organisms/{SwipeCard,SwipeDeck}.tsx`,
`src/screens/DeckScreen.tsx`; Test `src/store/deckStore.test.ts`

- [ ] **Step 1: Başarısız test**

```ts
jest.mock("../lib/api", () => ({ api: { swipe: jest.fn(async () => undefined),
  undoSwipe: jest.fn(async () => undefined), deckDone: jest.fn(async () => undefined) } }));
import * as Haptics from "expo-haptics";
import { api } from "../lib/api";
import { useDeckStore as store } from "./deckStore";

beforeEach(() => store.getState().start("x7k2m", [{ id: "a" }, { id: "b" }] as never));

test("beğeni: haptik + sunucuya yazma + sonraki kart", async () => {
  await store.getState().decide("right");
  expect(Haptics.impactAsync).toHaveBeenCalled();
  expect(api.swipe).toHaveBeenCalledWith("x7k2m", { venueId: "a", liked: true });
  expect(store.getState().index).toBe(1);
  expect(store.getState().liked).toEqual(["a"]);
});
test("geri al son kararı siler ve sunucudan kaldırır", async () => {
  await store.getState().decide("right");
  await store.getState().undo();
  expect(api.undoSwipe).toHaveBeenCalledWith("x7k2m", "a");
  expect(store.getState().index).toBe(0);
  expect(store.getState().liked).toEqual([]);
});
```

Run: `MTEST src/store/deckStore.test.ts` — Expected: kırmızı.

- [ ] **Step 2: `src/store/deckStore.ts`**

```ts
import type { VenueDto } from "@bumpinto/shared";
import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { api } from "../lib/api";

export const useDeckStore = create<{
  slug: string | null; venues: VenueDto[]; index: number; liked: string[];
  history: { venueId: string; liked: boolean }[]; sending: boolean;
  start: (slug: string, venues: VenueDto[]) => void;
  decide: (dir: "left" | "right") => Promise<void>;
  undo: () => Promise<void>; send: () => Promise<void>;
}>((set, get) => ({
  slug: null, venues: [], index: 0, liked: [], history: [], sending: false,
  start: (slug, venues) => set({ slug, venues, index: 0, liked: [], history: [] }),
  async decide(dir) {
    const { slug, venues, index } = get();
    const venue = venues[index];
    if (!slug || !venue?.id) return;
    const liked = dir === "right";
    void Haptics.impactAsync(liked ? Haptics.ImpactFeedbackStyle.Medium
      : Haptics.ImpactFeedbackStyle.Light);
    set((s) => ({ index: s.index + 1, liked: liked ? [...s.liked, venue.id!] : s.liked,
      history: [...s.history, { venueId: venue.id!, liked }] }));
    await api.swipe(slug, { venueId: venue.id, liked }).catch(() => undefined);
  },
  async undo() {
    const { slug, history } = get();
    const last = history[history.length - 1];
    if (!slug || !last) return;
    set((s) => ({ index: Math.max(0, s.index - 1), history: s.history.slice(0, -1),
      liked: s.liked.filter((id) => id !== last.venueId) }));
    await api.undoSwipe(slug, last.venueId).catch(() => undefined);
  },
  async send() {
    const { slug } = get();
    if (!slug) return;
    set({ sending: true });
    try { await api.deckDone(slug); } finally { set({ sending: false }); }
  },
}));
```

- [ ] **Step 3: `TravelBars.tsx`** (native.css `.tb` — kart/karar yüzeyi) — her katılımcı için
`56px ad | dolgu çubuğu | 48px dakika` satırı; genişlik `minutes / f.max`; en uzun yol `colors.flame`,
diğerleri `colors.grass`; altında tek satır `travel.gap` + `travel.longest`. **Rozet yok.**

- [ ] **Step 4: `SwipeCard` + `SwipeDeck` + `DeckScreen` (P14)** — `SwipeCard`: gesture-handler `Pan`
+ reanimated; geometri **shared'dan** (`swipeThreshold`, `dragRotation`, `dragProgress`,
`releaseDecision` — **M-4 T6**'da taşındı; ikinci eşik tanımı yasak). Sürüklerken damga: sağa `deck.like`
yeşil (-14°), sola `deck.pass` flame (+12°), opaklık `dragProgress`. Anatomi: 236px görsel
(`VenueThumb` + `pdots` foto noktaları + `pho-tag` **yalnız `photoUrl` varsa**), ad + adalet `Badge`,
meta satırı, kategori notu, `TravelBars`, alt satırda fark/en uzun + `Attribution`.
`SwipeDeck`: üstteki üç kart (`d1/d2/d3` ölçek+kayma) + üç eylem düğmesi
(`deck.ariaUndo/ariaPass/ariaLike`) — dokunmayla da karar verilir (erişilebilirlik).
`DeckScreen`: başlıkta `deck.cardsOf` + `deck.likesN`, `deck.seeAll` düğmesi (→ `ListScreen`),
`Progress`, deste, `HandNote deck.swipeHand`. Deste bitince `DeckDoneScreen`.

- [ ] **Step 5: PASS** — Run: `MTEST src/store/deckStore.test.ts` — Expected: 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/store/deckStore.{ts,test.ts}`, `src/components/molecules/TravelBars.tsx`, `src/components/organisms/{SwipeCard,SwipeDeck}.tsx`, `src/screens/DeckScreen.tsx`. Mesaj: `feat(mobile): deste - kaydirma, damga, haptik, travelbars`.

---

### Task 2: Deste bitti (P15) + Liste (P16) + Gönderildi (P17)

**Files:** Create `frontend/mobile/src/screens/{DeckDoneScreen,ListScreen,SentScreen}.tsx`;
Test `src/screens/DeckDoneScreen.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
import { render, screen } from "@testing-library/react-native";
import DeckDoneScreen from "./DeckDoneScreen";

test("0 beğenide 'yine de gönder' seçeneği çıkar", () => {
  render(<DeckDoneScreen liked={[]} venues={[]} names={{}} onSend={jest.fn()} onBack={jest.fn()} />);
  expect(screen.getByRole("button", { name: "Yine de gönder" })).toBeTruthy();
});
test("beğenilenler listelenir ve gönder CTA'sı çıkar", () => {
  render(<DeckDoneScreen liked={["a"]} venues={[{ id: "a", name: "Café Berlage" }] as never}
    names={{}} onSend={jest.fn()} onBack={jest.fn()} />);
  expect(screen.getByText("Café Berlage")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Beğenilerimi gönder" })).toBeTruthy();
});
```

Run: `MTEST src/screens/DeckDoneScreen.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `DeckDoneScreen` (P15)** — kutlama kartı (`Sticker deck.finishedSticker`,
`deck.likedTitle` `{{n}} mekan beğendin`, `deck.likedNote`), **Beğendiklerin** kartı (`VenueRow` +
`chk on`), CTA `deck.send` + ikincil `deck.backToList`. `liked.length === 0` → amber
`deck.emptyWarn` kartı ve CTA `deck.sendAnyway`.

- [ ] **Step 3: `ListScreen` (P16)** — başlık `deck.listTitle`, sağda `deck.backToDeck`;
`{{n}} mekan · {{k}} beğeni`; tüm mekanlar `VenueRow` + dokunulabilir `chk` (dokunma →
`api.swipe(slug, { venueId, liked })`, `deckStore.liked` güncellenir); `Attribution`; CTA `deck.send`.

- [ ] **Step 4: `SentScreen` (P17)** — `deck.sentBadge` kilit satırı, başlık `deck.sentTitleWaiting`
(`{{name}} kaydırıyor`) ya da herkes bittiyse `deck.sentTitleAllDone`, `deck.sentCopy`, `StepBar`
(Oylama aktif); ilerleme kartı: her katılımcı `ParticipantRow` + `deck.rowDone`/`rowSwiping` rozeti,
kaydıranın altında `Progress`; **"Dürt" çizilmez** (B-15). Altta "Beğendiklerin" kartı +
`Attribution` + `VoiceDockSlot`.

- [ ] **Step 5: PASS** — Run: `MTEST src/screens/DeckDoneScreen.test.tsx` — 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/screens/{DeckDoneScreen,DeckDoneScreen.test,ListScreen,SentScreen}.tsx`. Mesaj: `feat(mobile): deste bitti, liste ve gonderildi ekranlari`.

---

### Task 3: Runoff (P18) + Berabere (P19) + Karar (P20)

**Files:** Create `frontend/mobile/src/screens/{RunoffScreen,TieScreen,ResultScreen}.tsx`,
`src/components/organisms/{RunoffCard,ResultCard}.tsx`; Test `src/screens/RunoffScreen.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
jest.mock("../lib/api", () => ({ api: { runoffVote: jest.fn(async () => undefined) } }));
import { fireEvent, render, screen } from "@testing-library/react-native";
import { api } from "../lib/api";
import RunoffScreen from "./RunoffScreen";

const view = { slug: "x7k2m", runoffVenueIds: ["a", "b"],
  venues: [{ id: "a", name: "Café Berlage", travelMinutes: { m: 25, k: 35 } },
           { id: "b", name: "Koffie Top Hundred", travelMinutes: { m: 30, k: 35 } }],
  participants: [{ id: "m", displayName: "Mehmet", hasLocation: true },
                 { id: "k", displayName: "Kerem", hasLocation: true }],
  runoffVotedParticipantIds: [], viewer: { participantId: "m" } };

test("oy verilir", () => {
  render(<RunoffScreen view={view as never} />);
  fireEvent.press(screen.getByText("Café Berlage"));
  expect(api.runoffVote).toHaveBeenCalledWith("x7k2m", { venueId: "a" });
});
test("oy verdikten sonra kilit kartı ve sayaç görünür", () => {
  render(<RunoffScreen view={{ ...view, runoffVotedParticipantIds: ["m"],
    viewer: { participantId: "m", runoffVoteVenueId: "a" } } as never} />);
  expect(screen.getByText("Seçimin kilitli")).toBeTruthy();
  expect(screen.getByText("1 / 2 kilitledi")).toBeTruthy();
});
```

Run: `MTEST src/screens/RunoffScreen.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `RunoffScreen` (P18)** — üstlük `runoff.overline`, başlık `runoff.titleTwo`,
`runoff.copy`; her finalist `RunoffCard`: 70px eğik görsel, ad + meta, `chk`, `RangeBar`, alt satır
`runoff.trailer` (toplam/fark) — `isDeciding(venue, finalists)` (shared) true ise amber-wash vurgu.
Seçili kart flame kenarlı, diğeri `opacity: .75`. Altta `runoff.countOf` (`votersOf` +
`runoffVotedParticipantIds`) + `runoff.who`; `Attribution`. Kilitliyken CTA yerine
`runoff.lockedTitle`/`lockedCopyName` kartı + `runoff.remind` düğmesi (`Share.share`).

- [ ] **Step 3: `TieScreen` (P19)** — host: `runoff.tieTitle`, `runoff.tieHostCopy`,
`runoff.tallyTitle` altında iki kart (`voteTally` oyları `Badge`, `RangeBar`, daha adil olanda
`runoff.tieNote`), `HandNote`; iki CTA: `runoff.tieFair` → `fairestOf(finalists)` (shared) →
`api.forceDecision(slug, { venueId })`, ve `runoff.tieDecide` → seçim alt sayfası → seçilen `venueId`
ile aynı uç. Host değilse yalnız `runoff.tieGuestCopy`, düğme yok.

- [ ] **Step 4: `ResultScreen` (P20) + `ResultCard`** — üstlük `result.overline`, başlık kazanan adı
vurgulu. `ResultCard` (native.css `.rc`): -1.2° eğik kart, iki `Sticker` (`result.likedSticker`,
`result.decidedAtSticker`), 150px görsel, meta satırı + adalet `Badge`, kişi satırları (`Avatar` + ad
+ ulaşım ikonu + `~{{n}} dk`), alt bilgi (wordmark + `herkes ~{{lo}}–{{hi}} dk · fark {{n}} dk`).
Altında `result.whyTitle` üç ekseni (`axisFair`/`axisFit`/`axisPlace`; verisi olmayan satır
**gizlenir**), `HandNote result.leaveEarlyHand`, `backupOf` varsa `result.backup` satırı, en altta
`result.viralTitle` kartı (→ `/sessions/new`). **Sonuç kartı statik:** "Takvime ekle" ve "Kartı
paylaş" düğmeleri çizilmez (R-M11 → M-9 (plan43)); üst çubuktaki paylaş düğmesi yalnız `Share.share`
(`result.shareText` + link). CTA `venue.openInMaps` → `venueLink(venue)` (shared) → `Linking.openURL`.

- [ ] **Step 5: PASS** — Run: `MTEST src/screens/RunoffScreen.test.tsx` — Expected: 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/screens/{RunoffScreen,RunoffScreen.test,TieScreen,ResultScreen}.tsx`, `src/components/organisms/{RunoffCard,ResultCard}.tsx`. Mesaj: `feat(mobile): runoff, berabere ve karar ekranlari`.

---

### Task 4: Çevrimdışı (P24) + Hata (P23)

**Files:** Create `frontend/mobile/src/components/molecules/OfflineBanner.tsx`,
`src/screens/ErrorScreen.tsx`; Modify `src/store/netStore.ts`;
Modify `app/_layout.tsx`, `app/sessions/index.tsx`;
Test `src/components/molecules/OfflineBanner.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
import { render, screen } from "@testing-library/react-native";
import { useNetStore } from "../../store/netStore";
import OfflineBanner from "./OfflineBanner";

test("çevrimiçiyken hiçbir şey çizmez", () => {
  useNetStore.setState({ online: true, lastSyncAt: null });
  render(<OfflineBanner onRetry={jest.fn()} />);
  expect(screen.queryByText("Bağlantı yok")).toBeNull();
});
test("çevrimdışıyken son senkron saatiyle şerit çizer", () => {
  useNetStore.setState({ online: false, lastSyncAt: new Date("2026-09-06T12:38:00").getTime() });
  render(<OfflineBanner onRetry={jest.fn()} />);
  expect(screen.getByText("Bağlantı yok")).toBeTruthy();
  expect(screen.getByText(/12:38/)).toBeTruthy();
});
```

Run: `MTEST src/components/molecules/OfflineBanner.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `src/store/netStore.ts`'e `watchNetwork` ekle** (durum **M-4 T8**'de oluşturuldu)

```ts
import NetInfo from "@react-native-community/netinfo";

/** Kökte bir kez bağlanır; abonelik kaldırıcıyı döndürür. */
export function watchNetwork() {
  return NetInfo.addEventListener((s) => useNetStore.setState({
    online: !!s.isConnected && s.isInternetReachable !== false }));
}
```

`sessionStore` her başarılı yüklemede `lastSyncAt` yazar (**M-4 T8**) — şerit ve ekranlar **aynı** saati
gösterir, ikinci bir zaman kaynağı tutulmaz. `app/_layout.tsx`: `useEffect(() => watchNetwork(), [])`.

- [ ] **Step 3: `OfflineBanner.tsx` (P24 şeridi)** — amber kart: `WifiSlash`, `offline.title`,
`offline.seenAt` (`toLocaleTimeString` HH:mm), `Button small offline.retry`. Şerit üst çubuğun
**altında**, kaydırma alanının dışında sabit durur.

- [ ] **Step 4: Çevrimdışı davranışı** — `app/sessions/index.tsx`: `online === false` iken liste son
görülen hâliyle `opacity: .6` çizilir ve tüm CTA'lar `disabled` (P24: "Yeni buluşma kur" ve "Desteye
git" pasif). `useSessionLive` zaten çevrimdışıyken polling yapmaz (**M-7 T4**).

- [ ] **Step 5: `ErrorScreen.tsx` (P23)** — ortalanmış soluk `mark` işareti, `error.hmm`, `kind`
prop'una göre `session.notFound` / `session.expired` / `error.lostCopy`, alt not `error.expiredHint`,
CTA `error.home` → `router.replace("/sessions")`.

- [ ] **Step 6: PASS** — Run: `MTEST src/components/molecules/OfflineBanner.test.tsx` — 2 test yeşil.

- [ ] **Step 7: Dosya listesi** — `src/store/netStore.ts`, `src/components/molecules/OfflineBanner.{tsx,test.tsx}`, `src/screens/ErrorScreen.tsx`, `app/_layout.tsx`, `app/sessions/index.tsx`. Mesaj: `feat(mobile): cevrimdisi seridi ve hata ekrani`.

---

### Task 5: Maestro e2e (gerçek istemci akışları) + kapanış + INDEX

**Files:** Create `frontend/mobile/.maestro/{01-signin-join-deck-decide,02-deeplink,03-location-permission}.yaml`,
`.maestro/README.md`; Modify `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Ana akış** (`01-signin-join-deck-decide.yaml`) — "giriş → katıl → deste → karar"

```yaml
appId: app.bumpinto.mobile
---
- launchApp: { clearState: true }
- assertVisible: "Ortada"
- tapOn: "Google ile devam et"
- assertVisible: { text: "Nereye", timeout: 20000 }
- openLink: "https://bumpinto.app/j/${MAESTRO_SLUG}"
- assertVisible: "seni buluşmaya çağırdı"
- tapOn: { id: "join-name" }
- inputText: "Ayşe"
- tapOn: "Mevcut konumun"
- tapOn: "Devam et"
- tapOn: { text: "Allow.*|İzin Ver.*", optional: true }
- tapOn: "Katıl"
- assertVisible: { text: "Katıldın!", timeout: 20000 }
- assertVisible: { text: "kart", timeout: 60000 }
- repeat: { times: 12, commands: [{ swipe: { direction: RIGHT, duration: 300 } }] }
- tapOn: "Beğenilerimi gönder"
- assertVisible: { text: "Ortak nokta", timeout: 120000 }
```

- [ ] **Step 2: Derin link akışı** (`02-deeplink.yaml`) — framework-glue testsiz bırakılmaz: uygulama
kapalıyken ve açıkken, hem `https` hem `bumpinto://` şemasıyla Katıl ekranı açılmalı.

```yaml
appId: app.bumpinto.mobile
---
- stopApp
- openLink: "https://bumpinto.app/j/${MAESTRO_SLUG}"
- assertVisible: { text: "seni buluşmaya çağırdı", timeout: 30000 }
- stopApp
- launchApp
- openLink: "bumpinto://j/${MAESTRO_SLUG}"
- assertVisible: "seni buluşmaya çağırdı"
```

- [ ] **Step 3: İzin akışı** (`03-location-permission.yaml`) — açılışta izin **istenmediği**,
ön-ekranın sistem diyaloğundan **önce** çıktığı ve redde O6 kurtarmasının göründüğü doğrulanır.

```yaml
appId: app.bumpinto.mobile
---
- launchApp: { clearState: true, permissions: { location: unset } }
- assertNotVisible: { text: "Allow.*location.*|.*Konum.*izin.*" }
- tapOn: "Google ile devam et"
- tapOn: "Yeni buluşma kur"
- tapOn: "Mevcut konumun"
- assertVisible: "Konumun, orta noktayı bulmak için"
- tapOn: "Devam et"
- tapOn: { text: "Don.t Allow|İzin Verme" }
- assertVisible: "Konum izni kapalı"
- assertVisible: "Ayarlar'a git"
```

`.maestro/README.md`: dev build kurulumu (`eas build --profile development`), `maestro test .maestro`,
`MAESTRO_SLUG` için backend'de örnek oturum kurma komutu (`curl -X POST …/api/sessions`).

- [ ] **Step 4: Tam koşu** — Run (repo kökünden):

```bash
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile typecheck
rtk pnpm test:web && rtk pnpm i18n:check
```

Expected: mobil süit yeşil (M-4 ve M-7'nin testleri + bu planın T1/T2/T3/T4 testleri), tip hatası
yok, web regresyonu temiz, i18n paritesi tam. Maestro'nun üç akışı dev build'de elle koşulur, sonuç
INDEX notuna yazılır.

- [ ] **Step 5: Yer tutucu taraması** — Run:
`rtk grep -rn "TODO\|FIXME\|TBD" frontend/mobile/src frontend/mobile/app`
Expected: yalnız `VoiceDockSlot.tsx`'teki M-6 notu; başka eşleşmede görev **kapanmaz**.

- [ ] **Step 6: INDEX kaydı** — `docs/superpowers/plans/INDEX.md` **M — Mobil** tablosunda:

- M-8 satırının **Durum**u → `done`; **Not** sonuna: `5 görev; R-M13. Maestro'nun üç akışı dev build'de elle koşuldu (sonuç: <tarih> / cihaz).`
- Maestro sonucu **Not** alanına yazılır: `01-signin-join-deck-decide`, `02-deeplink`, `03-location-permission` — her biri için `geçti`/`kaldı` + kısa neden.
- K-görevi kontrolü: `K-M4` (dürt, B-15 açar) `aday` kalır — P17'nin "Dürt" satırı bu planda da çizilmedi.
- Üst blokta `Sıradakiler:` satırında M-8 → **M-5** (mağaza/yasal paketi). v3 mobil izi (M-4 → M-7 → M-8) burada kapanır.

- [ ] **Step 7: Dosya listesi** — `frontend/mobile/.maestro/*` (3 akış + README),
`docs/superpowers/plans/INDEX.md`.
Mesaj: `test(mobile): maestro e2e akislari + INDEX kaydi (M-8)`.
