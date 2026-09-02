# Plan 14: Web — Deste Kaydırma Jesti ve Karar Animasyonları

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deste ekranına Tinder benzeri sürükle-bırak: kart sağa sürüklenirse **beğen**, sola sürüklenirse **geç**; eşik altında bırakılırsa yerine döner. Buton ve klavye kararları da aynı uçuş animasyonunu alır; geri al'da kart gittiği yönden geri süzülür. Sürükleme sırasında kart döner, "BEĞEN / GEÇ" damgası belirir, arkadaki kart öne yaklaşır.

**Architecture:** Kütüphane yok. Pointer Events (`pointerdown/move/up` + `setPointerCapture`; fare, dokunma, kalem tek yol) + CSS transition/keyframes. Saf geometri `lib/swipeMath.ts`'te (test edilir); jest davranışı `molecules/SwipeCard.tsx` (sürüklenebilir sarmalayıcı + damgalar; sıcak yolda React state yok, DOM'a doğrudan yazar); yığın/uçuş/geri-al orkestrasyonu `organisms/VenueDeck.tsx`. Karar **iyimser**: eşik aşılınca `deckStore.decide()` hemen çağrılır, çıkan kart ayrı "uçan" katmanda `animationend`'e dek kalır — hızlı ardışık kaydırma kilitlenmez, çift karar riski yok.

**Tech Stack:** React 18, Tailwind v4 (`@theme --animate-*` + `@keyframes`), vitest + RTL (`fireEvent.pointer*`).

---

## UI Kaynağı

Artboard `W3 · Deste 1280/390` (Claude Design `719fcd5f-…`) kart yığınını (d1/d2/d3) ve aksiyon satırını çizer; **jest ve damga çizilmemiştir**. Bu plan damga ve hareket dilini DS token'larıyla türetir (damga: beğen = `--grad` dolgu, geç = `ink2` kontur; `font-head` 800, uppercase). **Bilinçli sapma** — Claude Design'a geri yazımı kullanıcı kararıdır.

## Bu plana özel kurallar

- W-3/W-4 kuralları aynen: INDEX güncelle, git yok, utility yalnız `components/`, metin `t()` ile, gate'ler `rtk pnpm test:web` + `rtk pnpm build:web`.
- **`git show HEAD:x > x`, `git checkout`, `git restore` YASAK.**
- Yeni i18n anahtarı yok: damgalar mevcut `deck.like` / `deck.pass` (`uppercase`).
- `prefers-reduced-motion`: `app.css` küresel kuralı animasyonu kapatır → `animationend` gelmez; uçan katman **atlanır**, karar yine anında işlenir.
- Dikey kaydırma bozulmaz: kartta `touch-action: pan-y`; yatay 8px aşılmadan sürükleme başlamaz.

## Geometri (tek kaynak: `lib/swipeMath.ts`)

| Sabit | Değer | Not |
|---|---|---|
| `DRAG_START_PX` | 8 | tıklama/sürükleme ayrımı |
| `SWIPE_THRESHOLD_PX` | 120 · `min(120, 0.35·kartGenişliği)` | jsdom'da genişlik 0 → 120 |
| `FLING_VELOCITY` | 0.5 px/ms | eşik altında da hızlı fırlatma karar sayılır |
| `MAX_ROTATE_DEG` | 16 | `dx / 18`, ±16 kesme |
| ilerleme `p` | `min(|dx| / eşik, 1)` | damga opaklığı; arka kart scale 0.97→1, opacity .75→1, rotate 2.6°→0 |
| dikey sürükleme | `dy · 0.3` | Tinder hissi, yatay baskın |

---

### Task 1: `lib/swipeMath.ts` — saf geometri (TDD)

**Files:**
- Create: `frontend/web/src/lib/swipeMath.ts`
- Create: `frontend/web/src/lib/swipeMath.test.ts`

- [x] **Step 1: Failing test** — `swipeThreshold(0)=120`, `swipeThreshold(300)=105`; `dragRotation(-1000)=-16`, `dragRotation(90)=5`; `dragProgress(60,120)=0.5`, `dragProgress(400,120)=1`; `releaseDecision(130,0,120)="right"`, `releaseDecision(-130,0,120)="left"`, `releaseDecision(40,0.9,120)="right"` (fırlatma), `releaseDecision(40,0,120)=null`.
- [x] **Step 2: FAIL doğrula** → `rtk pnpm test:web`.
- [x] **Step 3: Uygula** — dört saf fonksiyon + sabitler, `SwipeDir = "left" | "right"`.
- [x] **Step 4: PASS doğrula.**

### Task 2: `molecules/SwipeCard.tsx` — sürüklenebilir sarmalayıcı + damgalar

**Files:**
- Create: `frontend/web/src/components/molecules/SwipeCard.tsx`
- Modify: `frontend/web/src/components/index.ts` (barrel)
- Modify: `frontend/web/src/styles/app.css` (`@theme` `--animate-fly-out`, `--animate-fly-in-left/right` + keyframes; `from` konumu `--fx/--fr` custom property'lerinden)

- [x] **Step 1: Bileşen** — props: `onSwipe(dir, from: {dx, rot})`, `onProgress?(p)`, `enterFrom?: SwipeDir | null`, `className`, `children`. Pointer state ref'te (`startX/Y`, `lastX`, `lastT`, `vx`, `active`). `pointerdown` → capture; `pointermove` → 8px sonra `dragging`, `style.transform = translate(dx, dy·0.3) rotate(rot)`, damga opaklıkları, `onProgress(p)`; `pointerup/cancel` → `releaseDecision`: yön varsa `onSwipe`, yoksa `transition: transform .3s` ile sıfırla ve `onProgress(0)`.
- [x] **Step 2: Damgalar** — sol üstte beğen (`bg-[image:var(--grad)] text-white`, `-rotate-12`), sağ üstte geç (`border-2 border-ink2 text-ink2 bg-white/90`, `rotate-12`); `aria-hidden`, opaklık 0'dan başlar.
- [x] **Step 3: Giriş animasyonu** — `enterFrom` doluysa `animate-fly-in-right/left` sınıfı (geri al).

### Task 3: `organisms/VenueDeck.tsx` — uçan katman, tek karar yolu, geri al yönü

**Files:**
- Modify: `frontend/web/src/components/organisms/VenueDeck.tsx`
- Create: `frontend/web/src/components/organisms/VenueDeck.test.tsx`

- [x] **Step 1: Failing test** — `vi.mock("../../lib/api")`; `useDeckStore.setState({slug:"s", index:0, liked:{}})`; kart üzerinde `pointerDown(0)` → `pointerMove(200)` → `pointerUp` ⇒ `api.swipe` `{venueId:"a", liked:true}` ile çağrılır ve `index` 1 olur; ikinci test: `pointerMove(40)` → `pointerUp` ⇒ `api.swipe` çağrılmaz, `index` 0 kalır; üçüncü: sola 200px ⇒ `liked:false`.
- [x] **Step 2: FAIL doğrula.**
- [x] **Step 3: Uygula** — `commit(dir, from?)`: reduced-motion değilse `flying`'e ekle (`{venue, dir, dx, rot}`), `enterFrom=null`, `decide()`. Buton/klavye → `commit`. `undo` → `enterFrom = liked[prev] ? "right" : "left"`. Üst kart `<SwipeCard key={current.id}>` içinde; d2 kartı `--swipe-p`'ye bağlı inline transform/opacity (container'a `onProgress` ile yazılır); uçan kartlar `z-3 pointer-events-none animate-fly-out`, `style={{"--fx","--fr","--dir"}}`, `onAnimationEnd` ile silinir.
- [x] **Step 4: PASS doğrula** + `rtk pnpm build:web` (tsc dahil).

### Task 5 (kullanıcı isteği, 2026-09-02 gece): daha yavaş kaybolma + karar efektleri

**Files:**
- Create: `frontend/web/src/components/molecules/DecisionBurst.tsx`
- Modify: `organisms/VenueDeck.tsx`, `styles/app.css`, `components/index.ts`

- [x] Uçuş 0.4s → **0.7s**, geri geliş 0.35s → 0.5s.
- [x] **Akıcılık** ("daha yavaş" = daha smooth): yığın terfisi animasyonlu (`promote` d3→d2, `appear` yeni d3, `rise` d2→üst; hepsi 0.32s `--ease-stack`), uçuş hedefi 120vw → 90vw ve opaklık %45'ten sonra düşer, sürüklemede ease-out (`--ease-swipe`) hızı sürdürür, buton/klavyede `animationTimingFunction` satır-içi `--ease-stack` (duran kart fırlamaz), geri dönüş 0.45s `--ease-snap` (hafif esneme).
- [x] `DecisionBurst` — beğen: gradyan kalp rozeti `pop` + 14 konfeti (DS: sun/flame/violet/grass/flame2, deterministik açı/mesafe); geç: beyaz × rozeti `pop` + 8 gri toz (`poof`, yerçekimiyle düşer). Kap `burst-life` (0.9s) bitince kendini kaldırır; reduced-motion'da hiç eklenmez (uçan katmanla aynı kapı).

### Task 4: Kapanış

- [x] `rtk pnpm test:web` (tüm testler) + `rtk pnpm build:web` yeşil; INDEX W-5 `done`, Not'a tek satır.
- [x] Opus inceleme (spec → kalite tek dispatch); bulgular aynı turda kapatılır.
- [ ] Elle kontrol (kullanıcı): 1280'de fare ile sürükleme, 390'da dokunma; dikey scroll bozulmuyor; ← → ⌫ uçuş/geri gelme; reduced-motion'da kart anında değişiyor.
