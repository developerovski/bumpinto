# Kurma ve Katılım — Yeni Buluşma, İzin Akışı, Katıl, Lobi/Bekle, Mekanlar (M-7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Bu plan v3 mobil izinin ikinci üçte biridir.** Temel (Expo iskeleti, tema/atomlar, shared taşıması,
Google girişi, Oturumlar/Profil) **M-4** (`2026-09-06-plan38-mobile-shell-v3.md`); deste, runoff, karar,
çevrimdışı/hata ve e2e **M-8** (`2026-09-06-plan42-mobile-decision-flow.md`). Yürütme sırası:
**M-4 → M-7 → M-8**. Mağaza/yasal paketi **M-5**, sesli sohbet **M-6**; ikisi de bu planda yok.

**Goal:** M-4'ün kabuğu üzerine oturum **kurma** ve **katılma** akışı: grup/bireysel + çapalı/orta
noktalı yeni buluşma (3 etkinlik sınırı, tembel harita seçici), Play uyumlu konum izni ön-ekranı ve
red kurtarması, bireysel kurulum, derin linkten katılım (100 km reddi dahil), oturum durumuna göre
yönlendirme, lobi/bekle ekranları ve mekan listesi + yol çubuğu — P3–P13 ile O3/O6 artboard'larına
sadık, adalet gösterimi `frontend/shared/src/fairness.ts` üzerinden web ile tek uygulamada.

**Architecture:** M-4'ün expo-router **tek stack** kabuğu sürdürülür; bu planın modal sayfaları
`app/(sheets)` grubunda (`presentation: "modal"`) toplanır. **Atomic design**: `app/*` ve
`src/screens/*` yalnız kompozisyon + store bağlama. Yeni state: **zustand 5** `newSessionStore`,
`locationStore` (M-4'ün `authStore`/`sessionStore`/`netStore`'una eklenir; `deckStore` M-8'de).
Canlı veri: `useSessionLive` ile 3 sn polling (STOMP köprüsü M-6). Ters geocode ve adres arama
**backend üzerinden** (`/api/geocode`, `/api/geocode/reverse` — M-4 T7'de shared api'ye eklendi).

**Tech Stack:** Expo SDK 54 (dev build), expo-router 6, expo-location (foreground), expo-clipboard,
`react-native-maps` (yalnız tam ekran alt sayfada, `React.lazy`), react-native-safe-area-context,
`phosphor-react-native` + react-native-svg, zustand 5, i18next/react-i18next, `@bumpinto/shared`
(axios istemcisi + saf mantık), jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç adları
**değiştirilmez**), §3 Mobil, §4 (M-7 satırı). Karşılananlar: **R-M14** çapalı oturum + 3 etkinlik ·
**R-M2** izin ön-ekranı + red kurtarma · **R-M8** yol çubuğu · **R-M9'un statik kısmı** (presence
noktası, roster; dürt B-15/K-M4). Kapsam dışı: **R-M13 → M-8**; R-M1/R-M3–R-M7/R-M15 → **M-5**;
R-M10 + dock → **M-6**; R-M11/R-M12/R-M17 → M-9 (plan43). Yardımcı kaynaklar:
`2026-09-03-map-free-group-decision-ux.md` (ürün tezi, §4 adalet dili),
`2026-09-06-mobile-design-direction.md` (kabuk kararları).

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosyalar
**`Mobil Ekranlar v3.dc.html`** (P1–P24) ve **`Mobil Onboarding, İzinler ve Yasal.dc.html`** (O2, O3, O6).
Yerel kopya + ölçüler: `.../scratchpad/design/m3/{A,B}/*.html`, `m3/native.css`, `m3/GUIDE.md`.

| Artboard | Ekran |
|---|---|
| O3 Konum ön-bilgi · O6 Konum reddedildi | `app/(sheets)/location-primer.tsx` · `LocationDeniedCard` |
| P3/P4 Yeni buluşma · P5 Bireysel kurulum | `app/sessions/new.tsx` + `app/(sheets)/map-picker.tsx` · `SoloSetupScreen` |
| P6/P7 Lobi · P8/P9 Katıl · P10 Bekle | `LobbyScreen` · `app/j/[slug].tsx` · `WaitingScreen` |
| P11/P12/P13 Mekanlar | `VenuesScreen` |
| O2 · P1/P2 · P22 | **M-4'te bitti** |
| P14–P20 · P23 · P24 | **bu planda YOK** → M-8 |
| P21 kart görseli · P25 dock · P26 Live Activity | **bu planda YOK** (M-9 (plan43) / M-6 / sonraki iz) |

**Ön koşul: M-4 done** (`2026-09-06-plan38-mobile-shell-v3.md`). Bu plan M-4'ün ürettiği şu
dosya/sembolleri **tüketir**: `src/theme.ts` (`colors`, `fonts`, `radius`, `space`, `size`, `shadow`,
`photoTints`) · `src/icons.ts` (`ACTIVITY_ICON`, `MODE_ICON`) · `src/components/atoms/index.ts`
(`AppText`, `Button`, `IconButton`, `Badge`, `Card`, `Avatar`, `Sticker`, `HandNote`, `Chip`,
`Segmented`, `Progress`, `Input`, `Skeleton`) · `src/components/molecules/ScreenHeader.tsx` ·
`src/i18n/index.ts` · `src/lib/api.ts` (`api`, `rememberParticipantToken`, `hasParticipantToken`,
`webBase`; `api.geocode`/`api.reverseGeocode` M-4 T7'de eklendi) · `src/lib/tokenStore.ts` ·
`src/store/authStore.ts` · `src/store/sessionStore.ts` (`useSessionStore`, `ctaFor`) ·
`src/store/netStore.ts` (`useNetStore`; `watchNetwork` M-8) · `@bumpinto/shared` (`TravelMode`,
`TRAVEL_MODES`, `DEFAULT_TRAVEL_MODE`, `MODE_LABEL_KEY`, `fairnessOf`, `SAME_FOR_ALL`, `byFairness`,
`byRating`, `monogram`, `venueLink`, `formatRating`, `Schemas`) + `shared/src/i18n/locales/{tr,en,nl}.json`.
**Durum yönlendirici (`app/sessions/[slug].tsx`) M-4'te YOKTUR; bu planın T4'ünde doğar.**
Doğrula (repo kökünden):

```bash
test -f frontend/mobile/src/theme.ts && test -f frontend/mobile/src/icons.ts \
  && test -f frontend/mobile/src/components/atoms/index.ts \
  && test -f frontend/mobile/src/components/molecules/ScreenHeader.tsx \
  && test -f frontend/mobile/src/i18n/index.ts \
  && test -f frontend/mobile/src/lib/api.ts && test -f frontend/mobile/src/lib/tokenStore.ts \
  && test -f frontend/mobile/src/store/authStore.ts \
  && test -f frontend/mobile/src/store/sessionStore.ts \
  && test -f frontend/mobile/src/store/netStore.ts \
  && test -f frontend/mobile/app/sessions/index.tsx && test -f frontend/mobile/app/profile.tsx \
  && test -f frontend/shared/src/i18n/locales/tr.json && echo "M-4 dosyalari TAM"
for s in photoTints ACTIVITY_ICON MODE_ICON; do printf '%s: ' "$s"; \
  rtk grep -c "$s" frontend/mobile/src/theme.ts frontend/mobile/src/icons.ts; done
rtk grep -c "rememberParticipantToken" frontend/mobile/src/lib/api.ts
rtk grep -c "reverseGeocode" frontend/shared/src/api.ts
rtk grep -c "export function ctaFor" frontend/mobile/src/store/sessionStore.ts
rtk grep -c "useNetStore" frontend/mobile/src/store/netStore.ts
for s in TRAVEL_MODES DEFAULT_TRAVEL_MODE MODE_LABEL_KEY fairnessOf monogram venueLink; do \
  printf '%s: ' "$s"; rtk grep -c "$s" frontend/shared/src/index.ts; done
```

Expected: `M-4 dosyalari TAM` satırı ve tüm sayaçlar ≥1. Herhangi biri 0/eksikse **bu plan
başlamaz**, M-4 tamamlanır.

**Bağlayıcı kurallar:**

- **Git yazma YOK** (`git mv`/`commit`/`push` yasak); her görev sonunda **dosya listesi**, kullanıcı commit eder. Taşımada `mv`.
- Test komutu (repo kökü): `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test -- <yol>` — aşağıda **`MTEST <yol>`**. Web regresyonu: `rtk pnpm test:web`.
- Sözleşme (`api-types.ts` alan adları, uç yolları) **değiştirilmez**; eksik alanda ekran o satırı gizler, alan icat edilmez.
- Ekran dosyalarında ham `Pressable`/`TextInput`/`Text` ve kopya stil YASAK. Store'a yalnız ekranlar ve organizmalar bağlanır.
- i18n: metin sabiti yasak; taban `tr`, yeni anahtar **üç dile birden** (`rtk pnpm i18n:check` yeşil).
- **Rozet çorbası yasak:** adalet yalnız `RangeBar` (liste) / `TravelBars` (kart, M-8) ile gösterilir; `Sen ~30 dk ▲` rozeti üretilmez (karar dok. §4, GUIDE kural 10).
- Harita 390'da varsayılan değil: `react-native-maps` yalnız `app/(sheets)/map-picker.tsx` içinde `React.lazy` ile yüklenir.
- Metin ≥12px, dokunma hedefi ≥44px, her ekranda tek birincil düğme.
- Sesli sohbet dock'u **yer tutucudur** (`VoiceDockSlot` hiçbir şey çizmez); gerçek dock M-6.
- **M-8 ekranlarının iskeletleri burada açılır:** T4'ün durum yönlendiricisi `DeckScreen`, `SentScreen`, `RunoffScreen`, `TieScreen`, `ResultScreen` ve `ErrorScreen` dosyalarını adlandırır. T4'te bu dosyalar `src/screens/` altında **`export default function X() { return null; }`** iskeletiyle açılır; M-8 T1–T4 aynı dosyaları gerçek ekranla doldurur, yönlendirici M-8'de yeniden yazılmaz. **Tek istisna `ErrorScreen`:** T4'ün yönlendirici testi `EXPIRED` dalında `error.hmm` metnini arar, bu yüzden `src/screens/ErrorScreen.tsx` T4'te ilk sürümüyle yazılır (`kind` prop'u + `error.hmm` başlığı + `error.home` CTA → `router.replace("/sessions")`); M-8 T4 aynı dosyayı P23'ün tüm dallarıyla tamamlar.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `mobile/src/store/{newSessionStore,locationStore}.ts`, `app/sessions/new.tsx`, `app/(sheets)/{_layout,map-picker,location-primer}.tsx`, `src/screens/SoloSetupScreen.tsx`, `src/components/molecules/{ActivityPicker,TravelModeField,LocationField,LocationDeniedCard,MidpointCard}.tsx` | T1/T2 | Yeni buluşma + izin akışı + bireysel kurulum |
| `mobile/app/j/[slug].tsx`, `src/components/organisms/JoinForm.tsx` | T3 | Katıl + derin link |
| `mobile/app/sessions/[slug].tsx`, `src/store/useSessionLive.ts`, `src/screens/{Lobby,Waiting}Screen.tsx`, `src/components/molecules/{ParticipantRow,InviteCard,StepBar}.tsx`, `src/components/organisms/VoiceDockSlot.tsx` | T4 | Durum yönlendirici, lobi, bekle |
| `mobile/src/components/molecules/{RangeBar,VenueRow,VenueThumb,Attribution}.tsx`, `src/screens/VenuesScreen.tsx` | T5 | Mekanlar + yol çubuğu |
| `docs/superpowers/plans/INDEX.md` | T6 | Tam doğrulama + kayıt |

---

### Task 1: Yeni buluşma (P3/P4) — 3 etkinlik sınırı, çapa, harita alt sayfası

**Files:** Create `frontend/mobile/src/store/newSessionStore.ts`,
`src/components/molecules/{ActivityPicker,TravelModeField,LocationField}.tsx`,
`app/(sheets)/{_layout,map-picker}.tsx`; Modify `app/sessions/new.tsx`;
Test `src/store/newSessionStore.test.ts`

- [ ] **Step 1: Başarısız test**

```ts
import { useNewSessionStore as store } from "./newSessionStore";

const s = () => store.getState();
beforeEach(() => store.setState(store.getInitialState()));

test("3 etkinlik sınırı: 4. seçim yok sayılır, seçili olan kapanabilir", () => {
  (["COFFEE", "FOOD", "CINEMA"] as const).forEach((a) => s().toggleActivity(a));
  s().toggleActivity("BAR");
  expect(s().activityTypes).toEqual(["COFFEE", "FOOD", "CINEMA"]);
  expect(s().isActivityLocked("BAR")).toBe(true);
  s().toggleActivity("FOOD");
  expect(s().activityTypes).toEqual(["COFFEE", "CINEMA"]);
});
test("çapalı oturumda kendi konumu zorunlu değil, çapa zorunlu", () => {
  s().toggleActivity("COFFEE"); s().setVenueMode("ANCHOR");
  expect(s().canSubmit()).toBe(false);
  s().setAnchor({ lat: 51.44, lng: 5.47, label: "Kleine Berg" });
  expect(s().canSubmit()).toBe(true);
  expect(s().toRequest("Mehmet").originPresent).toBe(false);
});
test("orta noktalı oturumda kendi konumu zorunlu", () => {
  s().toggleActivity("COFFEE");
  expect(s().canSubmit()).toBe(false);
  s().setOrigin({ lat: 51.7, lng: 5.3, label: "'s-Hertogenbosch" });
  expect(s().canSubmit()).toBe(true);
  expect(s().toRequest("Mehmet").originPresent).toBe(true);
});
```

Run: `MTEST src/store/newSessionStore.test.ts` — Expected: kırmızı.

- [ ] **Step 2: `src/store/newSessionStore.ts`**

```ts
import { DEFAULT_TRAVEL_MODE, type Schemas, type TravelMode } from "@bumpinto/shared";
import { create } from "zustand";

type Activity = NonNullable<Schemas["CreateSessionRequest"]["activityTypes"]>[number];
type Point = { lat: number; lng: number; label?: string };
export const MAX_ACTIVITIES = 3;

export const useNewSessionStore = create<{
  sessionType: "GROUP" | "SOLO"; venueMode: "MIDPOINT" | "ANCHOR"; activityTypes: Activity[];
  name: string; origin: Point | null; anchor: Point | null; travelMode: TravelMode;
  setSessionType: (t: "GROUP" | "SOLO") => void; setVenueMode: (m: "MIDPOINT" | "ANCHOR") => void;
  toggleActivity: (a: Activity) => void; isActivityLocked: (a: Activity) => boolean;
  setName: (n: string) => void; setOrigin: (p: Point | null) => void;
  setAnchor: (p: Point | null) => void; setTravelMode: (m: TravelMode) => void;
  canSubmit: () => boolean; toRequest: (displayName: string) => Schemas["CreateSessionRequest"];
}>((set, get) => ({
  sessionType: "GROUP", venueMode: "MIDPOINT", activityTypes: [], name: "",
  origin: null, anchor: null, travelMode: DEFAULT_TRAVEL_MODE,
  setSessionType: (sessionType) => set({ sessionType }),
  setVenueMode: (venueMode) => set({ venueMode }),
  setName: (name) => set({ name }), setOrigin: (origin) => set({ origin }),
  setAnchor: (anchor) => set({ anchor }), setTravelMode: (travelMode) => set({ travelMode }),
  toggleActivity: (a) => set((s) => ({ activityTypes: s.activityTypes.includes(a)
    ? s.activityTypes.filter((x) => x !== a)
    : s.activityTypes.length >= MAX_ACTIVITIES ? s.activityTypes : [...s.activityTypes, a] })),
  isActivityLocked: (a) =>
    !get().activityTypes.includes(a) && get().activityTypes.length >= MAX_ACTIVITIES,
  // Çapalı oturumda kendi konumu OPSİYONEL (P4: "İstersen; çapalı buluşmada zorunlu değil")
  canSubmit: () => { const s = get(); return s.activityTypes.length > 0
    && (s.venueMode === "ANCHOR" ? !!s.anchor : !!s.origin); },
  toRequest: (displayName) => { const s = get(); return {
    displayName, activityTypes: s.activityTypes, name: s.name.trim() || undefined,
    sessionType: s.sessionType, travelMode: s.travelMode,
    lat: s.origin?.lat, lng: s.origin?.lng, locationLabel: s.origin?.label,
    anchor: s.venueMode === "ANCHOR" && s.anchor
      ? { lat: s.anchor.lat, lng: s.anchor.lng, label: s.anchor.label } : undefined,
    originPresent: !!s.origin, locationWhole: true }; },
}));
```

- [ ] **Step 3: `app/sessions/new.tsx` (P3/P4)** — artboard sırası: tip `Segmented`
(`newSession.group`/`solo`) + alt kopya → **`newSession.what`** başlığı, sağda `newSession.whatHint`
("En fazla 3 tane seç") → `ActivityPicker` (4 grup: Yeme-içme · Hareket · Kültür · Eğlence; her `Chip`
`ACTIVITY_ICON`'lu, `isActivityLocked` → `disabled`) → `newSession.name` (`Input`, opsiyonel) →
**`newSession.meetWhere`** `Segmented` (`modeMidpoint`/`modeAnchor`); `MIDPOINT`'te "Herkesin
konumundan adil orta nokta" notu, `ANCHOR`'da adres `Input` + `Button small` "Haritadan seç"
(→ `router.push("/(sheets)/map-picker")`) + `newSession.anchorHint` → **`newSession.where`**
`LocationField` (`ANCHOR`'da alt not `newSession.ownHint`; izin reddi dalı T2'de eklenir) → **`travelMode.question`**
`TravelModeField`. CTA `newSession.createGroup`, `canSubmit()` false iken `disabled`. Gönderim:
`api.createSession(toRequest(displayName))` → `rememberParticipantToken` → `SOLO` ise
`SoloSetupScreen`, değilse `router.replace("/sessions/" + slug)`.

- [ ] **Step 4: `app/(sheets)/` grubu** — `_layout.tsx`:
`<Stack screenOptions={{ presentation: "modal", headerShown: false }} />`.
`map-picker.tsx`: harita **tembel** (`const MapView = lazy(() => import("react-native-maps"))`,
`Suspense` yedeği `Skeleton`); başlık `map.pickOnMap`, alt kopya `map.pickHint`; pin sürüklenince ya
da haritaya dokununca `api.reverseGeocode({ lat, lng })` etiketi alınır; altta adres satırı +
`attribution.google`; iki düğme `map.pickCancel` / `map.pickConfirm` (`setAnchor` + `router.back()`).

- [ ] **Step 5: PASS** — Run: `MTEST src/store/newSessionStore.test.ts` — Expected: 3 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/store/newSessionStore.{ts,test.ts}`, `src/components/molecules/{ActivityPicker,TravelModeField,LocationField}.tsx`, `app/sessions/new.tsx`, `app/(sheets)/{_layout,map-picker}.tsx`. Mesaj: `feat(mobile): yeni bulusma - 3 etkinlik siniri, capali mod, harita secici`.

---

### Task 2: Konum izni akışı (O3 → sistem → O6) + Bireysel kurulum (P5)

**Files:** Create `frontend/mobile/src/store/locationStore.ts`, `app/(sheets)/location-primer.tsx`,
`src/components/molecules/{LocationDeniedCard,MidpointCard}.tsx`, `src/screens/SoloSetupScreen.tsx`;
Test `src/store/locationStore.test.ts`

- [ ] **Step 1: Başarısız test**

```ts
jest.mock("expo-location", () => ({ requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 51.7, longitude: 5.3 } })),
  Accuracy: { Balanced: 3 } }));
jest.mock("../lib/api", () => ({ api: {
  reverseGeocode: jest.fn(async () => ({ label: "'s-Hertogenbosch" })) } }));

import * as Location from "expo-location";
import { useLocationStore as store } from "./locationStore";

beforeEach(() => store.setState({ phase: "idle", point: null }));

test("açılışta izin İSTENMEZ; request() etiketi backend'den alır", async () => {
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  await store.getState().request();
  expect(store.getState().point).toEqual({ lat: 51.7, lng: 5.3, label: "'s-Hertogenbosch" });
  expect(store.getState().phase).toBe("granted");
});
test("red: phase=denied ve nokta yok — ekranlar O6 kurtarmasını gösterir", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
  await store.getState().request();
  expect(store.getState().phase).toBe("denied");
  expect(store.getState().point).toBeNull();
});
```

Run: `MTEST src/store/locationStore.test.ts` — Expected: kırmızı.

- [ ] **Step 2: `src/store/locationStore.ts`**

```ts
import * as Location from "expo-location";
import { create } from "zustand";
import { api } from "../lib/api";

type Point = { lat: number; lng: number; label?: string };

export const useLocationStore = create<{
  phase: "idle" | "asking" | "granted" | "denied" | "failed"; point: Point | null;
  request: () => Promise<Point | null>; clear: () => void;
}>((set) => ({
  phase: "idle", point: null,
  async request() {
    set({ phase: "asking" });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") { set({ phase: "denied", point: null }); return null; }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      // Ters geocode BACKEND üzerinden (OSMF mobil trafik politikası — gereksinim dok. §3)
      const label = (await api.reverseGeocode({ lat: pos.coords.latitude,
        lng: pos.coords.longitude }).catch(() => null))?.label;
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, label };
      set({ phase: "granted", point });
      return point;
    } catch { set({ phase: "failed", point: null }); return null; }
  },
  clear: () => set({ phase: "idle", point: null }),
}));
```

- [ ] **Step 3: `app/(sheets)/location-primer.tsx` (O3)** — Play "prominent disclosure" ekranı: kapat
(`X`), `mark` işareti, `permission.locTitle`, `permission.locBody` (kalın "yalnız uygulama açıkken"),
üç `why` satırı (`UsersThree`/`ClockCountdown`/`Keyboard` + `permission.locWhy*`),
`permission.locNext` + gizlilik bağlantısı. CTA `permission.locContinue` →
`useLocationStore.request()` → `router.back()`; ikincil `permission.locTypeInstead` (`ghost`) →
`router.back()` ve alan adres moduna geçer. **Ekran açılışında izin istenmez** — sistem diyaloğu
yalnız "Devam et"e basınca çıkar.

- [ ] **Step 4: `LocationDeniedCard.tsx` (O6)** — amber kart: `MapPinLine`,
`permission.deniedTitle`, `permission.deniedCopy`, iki küçük düğme (`permission.openSettings` →
`Linking.openSettings()`, `join.locRetry` → `request()`), altında `Input`
(`join.addressPlaceholder`) — girilen adres `api.geocode({ query })` ile noktaya çevrilir.
`LocationField` `phase === "denied"` iken bu kartı gösterir; Katıl ve Yeni buluşma **aynı** bileşeni
kullanır (iki yerde ayrı kurtarma yazılmaz).

- [ ] **Step 5: `src/screens/SoloSetupScreen.tsx` (P5)** — `Badge` "Bireysel" + etkinlik rozetleri;
`newSession.points` başlığı + `newSession.pointsCount` sayacı; roster kartı (host satırı + elle
eklenenler; her elle satırda `Badge newSession.manual` ve `X` → `api.removePoint(slug, participantId)`);
ekleme kartı: `Input newSession.pointPlaceholder` + `TravelModeField` + `Button small newSession.add`
→ `api.geocode({ query })` → `api.addPoint(slug, { displayName, lat, lng, locationLabel, travelMode })`;
`MidpointCard` (bu görevde yazılır; T4 Lobi/Bekle'de aynı bileşeni tüketir) canlı orta noktayı gösterir; `HandNote newSession.soloHand`; CTA
`newSession.findVenues`, `< 2` konumda `disabled` + `newSession.needTwo` notu.

- [ ] **Step 6: PASS** — Run: `MTEST src/store/locationStore.test.ts` — Expected: 2 test yeşil.

- [ ] **Step 7: Dosya listesi** — `src/store/locationStore.{ts,test.ts}`, `app/(sheets)/location-primer.tsx`, `src/components/molecules/LocationDeniedCard.tsx`, `src/screens/SoloSetupScreen.tsx`. Mesaj: `feat(mobile): konum izni on-ekrani, red kurtarma, bireysel kurulum`.

---

### Task 3: Katıl (P8/P9) + derin link

**Files:** Create `frontend/mobile/app/j/[slug].tsx`, `src/components/organisms/JoinForm.tsx`;
Test `app/j/join.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
jest.mock("../../src/lib/api", () => ({ api: { preview: jest.fn(), join: jest.fn() },
  rememberParticipantToken: jest.fn(), hasParticipantToken: () => false }));
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../src/lib/api";
import JoinScreen from "./[slug]";

const preview = { slug: "x7k2m", name: "Cuma kahvesi", hostDisplayName: "Mehmet",
  participantCount: 2, activityTypes: ["COFFEE"], status: "COLLECTING" };

test("host çevrimdışıysa uyarı notu çıkar", async () => {
  (api.preview as jest.Mock).mockResolvedValue({ ...preview, hostOnline: false });
  render(<JoinScreen />);
  await waitFor(() => expect(screen.getByText(/şu an oturumda değil/)).toBeTruthy());
});
test("100 km hatasında (409) uyarı çıkar, form kaybolmaz", async () => {
  (api.preview as jest.Mock).mockResolvedValue({ ...preview, hostOnline: true });
  (api.join as jest.Mock).mockRejectedValue({ response: { status: 409 } });
  render(<JoinScreen />);
  await waitFor(() => screen.getByRole("button", { name: "Katıl" }));
  fireEvent.press(screen.getByRole("button", { name: "Katıl" }));
  await waitFor(() => expect(screen.getByText(/çok uzaktasın/)).toBeTruthy());
  expect(screen.getByRole("button", { name: "Katıl" })).toBeTruthy();
});
```

Run: `MTEST app/j/join.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `app/j/[slug].tsx` (P8)** — `useLocalSearchParams<{ slug: string }>()` →
`api.preview(slug)`. Kabuk: wordmark + dil düğmesi; davet satırı (`Avatar` + `join.invitedBy`);
başlık vurgulu oturum adı; etkinlik rozetleri + `join.joinedCount`; **Kimler var** kartı
(`join.whoCopy`); `preview.hostOnline === false` ise amber `join.hostAway` kartı; sonra `JoinForm`.
Oturum yoksa/süresi dolduysa `ErrorScreen` (ilk sürümü T4'te yazılır; tam metni **M-8 T4**).
`hasParticipantToken(slug)` ya da `viewer` dönerse doğrudan `router.replace("/sessions/" + slug)`.

- [ ] **Step 3: `JoinForm.tsx`** — alanlar: `Input` (`join.nameLabel`), `LocationField`
(`join.whereLabel`; primer akışı T2), `TravelModeField`; CTA `join.submit` + `join.privacy` notu.

```tsx
try {
  const res = await api.join(slug, { displayName, lat, lng, locationLabel, travelMode });
  rememberParticipantToken(slug, res.participantToken!);
  router.replace(`/sessions/${slug}`);
} catch (e) {
  const status = (e as { response?: { status?: number } }).response?.status;
  setError(status === 409 ? "join.errTooFar" : "join.errJoin");
}
```

**P9 (409):** flame kartı — `join.errTooFar` metni, "Buluşma yeri: {{label}} · sen ~{{km}} km" satırı
(`preview` etiketi + `distanceMeters`), `ChatCircle` ikonlu ikincil düğme (`Share.share` ile host'a
mesaj). Form **kaybolmaz**: kullanıcı adres değiştirip yeniden dener.

- [ ] **Step 4: Derin link** — `https://bumpinto.app/j/x7k2m` ve `bumpinto://j/x7k2m` aynı rotaya
düşer (expo-router dosya yolu + **M-4 T2** `intentFilters`/`associatedDomains`). Jest içindeki `Linking`
taklidi **yeterli sayılmaz**; gerçek istemci doğrulaması **M-8 T5** Step 2'de (untested-seam kuralı).

- [ ] **Step 5: PASS** — Run: `MTEST app/j/join.test.tsx` — Expected: 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `app/j/{[slug].tsx,join.test.tsx}`, `src/components/organisms/JoinForm.tsx`. Mesaj: `feat(mobile): katil ekrani + derin link`.

---

### Task 4: Durum yönlendirici + Lobi (P6/P7) + Bekle (P10)

**Files:** Create `frontend/mobile/src/store/useSessionLive.ts`,
`src/screens/{LobbyScreen,WaitingScreen}.tsx`,
`src/components/molecules/{ParticipantRow,InviteCard,StepBar}.tsx`,
`src/components/organisms/VoiceDockSlot.tsx`, `src/screens/ErrorScreen.tsx` (ilk sürüm),
`src/screens/{DeckScreen,SentScreen,RunoffScreen,TieScreen,ResultScreen}.tsx` (M-8 iskeletleri);
Modify `app/sessions/[slug].tsx`, `src/components/molecules/MidpointCard.tsx` (T2);
Test `app/sessions/router.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
jest.mock("../../src/lib/api", () => ({ api: { getSession: jest.fn() } }));
import { render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../src/lib/api";
import SessionRoute from "./[slug]";

const base = { slug: "x7k2m", name: "Cuma kahvesi", sessionType: "GROUP",
  participants: [], venues: [], viewer: { host: true } };

test.each([["COLLECTING", "Mekanları bul"], ["BROWSING", "Karıştır ve kaydır"],
  ["EXPIRED", "Hmm."]])("%s durumu doğru ekrana düşer", async (status, marker) => {
  (api.getSession as jest.Mock).mockResolvedValue({ ...base, status });
  render(<SessionRoute />);
  await waitFor(() => expect(screen.getByText(marker)).toBeTruthy());
});
```

Run: `MTEST app/sessions/router.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `src/store/useSessionLive.ts`** — 3 sn polling (STOMP köprüsü M-6):

```ts
import { useEffect } from "react";
import { AppState } from "react-native";
import { useNetStore } from "./netStore";
import { useSessionStore } from "./sessionStore";

export function useSessionLive(slug: string | undefined) {
  const loadView = useSessionStore((s) => s.loadView);
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    const tick = () => {
      if (!alive || AppState.currentState !== "active" || !useNetStore.getState().online) return;
      void loadView(slug);
    };
    tick();
    const id = setInterval(tick, 3000);
    const sub = AppState.addEventListener("change", (s) => s === "active" && tick());
    return () => { alive = false; clearInterval(id); sub.remove(); };
  }, [slug, loadView]);
}
```

- [ ] **Step 3: `app/sessions/[slug].tsx`** — durum yönlendirici:

```tsx
const SCREENS = {
  COLLECTING: LobbyOrWaiting, SUGGESTING: LobbyOrWaiting, BROWSING: VenuesScreen,
  SWIPING: DeckRouter, RUNOFF: RunoffRouter, DECIDED: ResultScreen, EXPIRED: ErrorScreen,
} as const;
```

`LobbyOrWaiting`: `viewer.host` → `LobbyScreen`, değilse `WaitingScreen`.
`DeckRouter`: viewer katılımcısı `deckDone` ise `SentScreen`, değilse `DeckScreen`.
`RunoffRouter`: `runoffVenueIds` boş ve karar yoksa host'a `TieScreen`, diğerlerine `RunoffScreen`.
`useSessionLive(slug)`; `view == null` → `Skeleton` kabuk; `error` → `ErrorScreen`.
Haritanın adlandırdığı `DeckScreen`, `SentScreen`, `RunoffScreen`, `TieScreen`, `ResultScreen`
**M-8'in ekranlarıdır**: bu adımda `src/screens/` altında `export default function X() { return null; }`
iskeletleriyle açılırlar (M-8 T1–T3 gövdelerini doldurur, yönlendirici M-8'de yeniden yazılmaz).
`ErrorScreen.tsx` istisnadır — Step 1 testi `EXPIRED` dalında `error.hmm` metnini aradığı için burada
ilk sürümüyle yazılır (`kind` prop'u + `error.hmm` başlığı + `error.home` CTA →
`router.replace("/sessions")`); M-8 T4 aynı dosyayı P23'ün tüm dallarıyla tamamlar.

- [ ] **Step 4: Moleküller**

- `ParticipantRow` — `Avatar` (`online` noktası), ad (+`(sen)`), alt satır `locationLabel · <ulaşım ikonu> ~{{n}} dk` (`midpointMinutes`); çevrimdışıysa satır `opacity: .55` ve alt satıra `· {{waiting.offline}}`; `hasLocation === false` → `Avatar waiting` (nabız) + `waiting.waitingLocation`; sağda `Badge` (`waiting.ready`/`waitingBadge`/`host`).
- `MidpointCard` (T2'de yazıldı, burada çapa dalı eklenir) — `mark` işareti, `midpoint.overline`, `midpointLabel`, `midpoint.metaKm` (`≤ {{km}} km · herkes ~{{lo}}–{{hi}} dk`, aralık `fairnessOf`'tan), sağda harita `IconButton`. **Çapalı oturumda** (`view.anchored`) üstlük `midpoint.anchorOverline`, metin `midpoint.anchorMeta` — **M-4 T2** bulgusu gereği yer adı yine `midpointLabel`'dan gelir.
- `InviteCard` — flame-wash: `lobby.invite` üstlüğü, `webBase + "/j/" + slug` (tek satır, ellipsis), kopyala `IconButton` (`Clipboard.setStringAsync` + `lobby.copied`), paylaş `Button small` (`Share.share`); `participants.length > 1` ise `compact` (P6: kart küçülür).
- `StepBar` — `steps.locations/venues/vote/decide`, aktif adım kalın, `accessibilityRole="progressbar"`.
- `VoiceDockSlot` — **yer tutucu**: `return null;` + dosya başında `// M-6 (R-M10) gerçek dock'u buraya koyar; yeri CTA'nın üstü (native.css .dock bottom:104).` Ekranlar şimdiden mount eder ki M-6 tek dosyada bitsin.

- [ ] **Step 5: Ekranlar** — `LobbyScreen` (P6/P7, host): etkinlik rozetleri + `lobby.collecting`,
`InviteCard`, `MidpointCard`, "Kimler var" + `waiting.readyCount` + `Progress` + `StepBar`, roster
kartı, `lobby.promise` notu, `VoiceDockSlot`, CTA `lobby.findVenues` (`api.findVenues(slug)`) +
`lobby.late` notu. Grup + orta noktalı oturumda `< 2` hazır konumda CTA `disabled`; **çapalı**
oturumda (`view.anchored`) tek kişiyle de etkin ve `needTwo` notu gösterilmez.
`WaitingScreen` (P10, davetli): yeşil `waiting.joined` kartı, `MidpointCard`, `waiting.preparing`
bloğu, hazır sayacı + `StepBar` + roster, `waiting.changeLocationAndMode` düğmesi (→ `(sheets)`
konum/ulaşım sayfası), `VoiceDockSlot`, altta `waiting.copy`. **"Dürt" düğmesi çizilmez** — uç
`POST …/nudge` B-15'te açılır; uydurma çağrı yapılmaz (K-M4).

- [ ] **Step 6: PASS** — Run: `MTEST app/sessions/router.test.tsx` — Expected: 3 test yeşil.

- [ ] **Step 7: Dosya listesi** — `src/store/useSessionLive.ts`, `src/screens/{LobbyScreen,WaitingScreen,ErrorScreen}.tsx`, `src/screens/{DeckScreen,SentScreen,RunoffScreen,TieScreen,ResultScreen}.tsx` (M-8 iskeletleri), `src/components/molecules/{ParticipantRow,MidpointCard,InviteCard,StepBar}.tsx`, `src/components/organisms/VoiceDockSlot.tsx`, `app/sessions/{[slug].tsx,router.test.tsx}`. Mesaj: `feat(mobile): durum yonlendirici, lobi ve bekle ekranlari`.

---

### Task 5: Mekanlar (P11/P12/P13) + `RangeBar`

**Files:** Create `frontend/mobile/src/components/molecules/{RangeBar,VenueRow,VenueThumb,Attribution}.tsx`,
`src/screens/VenuesScreen.tsx`; Test `src/components/molecules/RangeBar.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
import { render, screen } from "@testing-library/react-native";
import RangeBar from "./RangeBar";

const names = { me: "Sen", a: "Ayşe", k: "Kerem" };

test("bant + baş harf noktaları + aralık; rozet YOK", () => {
  render(<RangeBar venue={{ id: "v1", travelMinutes: { me: 25, a: 30, k: 35 } }}
    names={names} selfId="me" />);
  expect(screen.getByText("25–35 dk")).toBeTruthy();
  expect(screen.queryByText(/▲/)).toBeNull();
  expect(screen.getByLabelText("Kerem ~35 dk, Ayşe ~30 dk, Sen ~25 dk")).toBeTruthy();
});
test("adaletsizde uzak kişi yazılır", () => {
  render(<RangeBar venue={{ id: "v2", travelMinutes: { me: 20, a: 20, k: 40 } }}
    names={names} selfId="me" />);
  expect(screen.getByText(/Kerem için uzak/)).toBeTruthy();
});
```

Run: `MTEST src/components/molecules/RangeBar.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `RangeBar.tsx`** (native.css `.rg`/`.rg-t`/`.rg-v`/`.rg-g`) — tüm dakika aritmetiği
`fairnessOf`'tan; burada ikinci hesap yok:

```tsx
import { fairnessOf, SAME_FOR_ALL, type FairnessVenue } from "@bumpinto/shared";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "../atoms";
import { colors, fonts } from "../../theme";

export default function RangeBar(p: { venue: FairnessVenue; names: Record<string, string>;
  selfId?: string }) {
  const { t } = useTranslation();
  const f = fairnessOf(p.venue);
  if (!f || f.entries.length === 0) return null;
  const span = Math.max(1, f.max - f.min);
  const at = (m: number) => 0.18 + (0.64 * (m - f.min)) / span; // bant iç payı
  const unfair = !!f.outlierId;
  const a11y = f.entries.map((e) => `${p.names[e.id] ?? "?"} ~${e.minutes} dk`).join(", ");
  return (
    <View>
      <View accessibilityLabel={a11y}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 }}>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.track }}>
          <View style={{ position: "absolute", left: `${at(f.min) * 100}%`, height: 6,
            width: `${(at(f.max) - at(f.min)) * 100}%`, borderRadius: 3,
            backgroundColor: unfair ? colors.amber : colors.grass }} />
          {f.entries.map((e) => (
            <View key={e.id} style={{ position: "absolute", left: `${at(e.minutes) * 100}%`,
              marginLeft: -9, top: -6, width: 18, height: 18, borderRadius: 9, borderWidth: 2,
              alignItems: "center", justifyContent: "center",
              backgroundColor: e.id === p.selfId ? colors.flameDeep : "#fff",
              borderColor: e.id === f.outlierId ? colors.amber
                : e.id === p.selfId ? colors.flameDeep : colors.grass }}>
              <AppText style={{ fontFamily: fonts.head, fontSize: 9,
                color: e.id === p.selfId ? "#fff" : colors.ink }}>
                {(p.names[e.id] ?? "?")[0]}</AppText>
            </View>))}
        </View>
        <AppText variant="num" style={{ minWidth: 64, textAlign: "right" }}>
          {t("travel.min", { lo: f.min, hi: f.max })}</AppText>
      </View>
      <AppText variant="muted"
        style={{ fontSize: 12, color: unfair ? colors.amberInk : colors.ink2 }}>
        {(unfair ? t("fairness.far", { name: p.names[f.outlierId!] })
          : f.spread < SAME_FOR_ALL ? t("fairness.same") : "")
          + ` · ${t("travel.gap", { n: f.spread })}`
          + (f.longestId ? ` · ${t("travel.longest", { name: p.names[f.longestId] })}` : "")}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 3: `VenueThumb` + `VenueRow` + `Attribution`** — `VenueThumb`: `photoUrl` varsa `Image`,
yoksa `photoTints[(deckOrder ?? 0) % 4]` gradyanı + `monogram(name)` (shared).
`VenueRow`: 56×64 thumb + ad + meta (`★ {{rating}} · {{price}} · {{hoursToday}} · {{category}}`,
eksik parça **atlanır**) + uyum uyarısı (`venue.fitOff`, `activityType` oturumun türlerinde yoksa) +
`RangeBar` + isteğe bağlı sağ `chk` işareti.
`Attribution`: `unionProvider` sonucuna göre `attribution.google` / `attribution.foursquare` /
`attribution.osm` satırı — mekan verisi olan **her** ekranda zorunlu (GUIDE kural 8).

- [ ] **Step 4: `src/screens/VenuesScreen.tsx` (P11/P12/P13)** — başlıkta oturum adı + `venues.meta`
(`{{n}} mekan · {{label}} · ≤ {{km}} km`), sağda harita `IconButton`; `Segmented` sıralama
(`venues.sortFair`/`sortRating` → shared `byFairness`/`byRating`) + bant açıklaması; liste `Card` +
`VenueRow`; sonda `Attribution`; `VoiceDockSlot`. Host CTA `venues.shuffle` (`api.shuffle(slug)`) +
`venues.everyoneSees`; davetlide CTA yok, `venues.guestWait` notu. **Bireysel (P12):**
`venues.soloBadge` + her satırda `venues.lockIn` (`api.forceDecision(slug, { venueId })`).
**Yükleniyor (P13):** durum `SUGGESTING` ya da `venues` boşsa `MidpointCard` + `venues.searching` +
4 `Skeleton` satırı + `HandNote venues.searchingHand`, CTA `disabled`.

- [ ] **Step 5: PASS** — Run: `MTEST src/components/molecules/RangeBar.test.tsx` — 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/components/molecules/{RangeBar,RangeBar.test,VenueRow,VenueThumb,Attribution}.tsx`, `src/screens/VenuesScreen.tsx`. Mesaj: `feat(mobile): mekanlar ekrani + yol cubugu (RangeBar)`.

---

### Task 6: Tam doğrulama + INDEX kaydı

**Files:** Modify `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Tam koşu** — Run (repo kökünden):

```bash
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile typecheck
rtk pnpm test:web && rtk pnpm i18n:check
```

Expected: mobil süit yeşil (M-4'ün testleri + bu planın `newSessionStore`, `locationStore`, `join`,
`router`, `RangeBar` testleri), tip hatası yok, web regresyonu temiz, i18n paritesi tam.
Kırmızıysa görev **kapanmaz**.

- [ ] **Step 2: İskelet ve yer tutucu taraması** — Run:

```bash
rtk grep -rn "TODO\|FIXME\|TBD" frontend/mobile/src frontend/mobile/app
rtk grep -rn "return null;" frontend/mobile/src/screens
```

Expected: birinci komutta yalnız `VoiceDockSlot.tsx`'teki M-6 notu. İkinci komutta yalnız M-8'in
dolduracağı iskeletler (`DeckScreen`, `SentScreen`, `RunoffScreen`, `TieScreen`, `ResultScreen`) —
`ErrorScreen` ve bu planın ekranları listede **çıkmaz**. Başka eşleşmede görev kapanmaz.

- [ ] **Step 3: M-8 devir kontrolü** — M-8'in tükettiği semboller hazır mı? Run:

```bash
for f in src/store/useSessionLive.ts src/components/molecules/RangeBar.tsx \
  src/components/molecules/VenueRow.tsx src/components/molecules/VenueThumb.tsx \
  src/components/molecules/Attribution.tsx src/components/molecules/ParticipantRow.tsx \
  src/components/organisms/VoiceDockSlot.tsx src/screens/VenuesScreen.tsx \
  src/screens/ErrorScreen.tsx; do test -f "frontend/mobile/$f" || echo "EKSIK: $f"; done
rtk grep -c "SCREENS" "frontend/mobile/app/sessions/[slug].tsx"
```

Expected: `EKSIK:` satırı yok, `SCREENS` sayacı ≥1.

- [ ] **Step 4: INDEX kaydı** — `docs/superpowers/plans/INDEX.md` **M — Mobil** tablosunda:

- M-7 satırının **Durum**u → `done`; **Not** sonuna: `6 görev; R-M14, R-M2, R-M8, R-M9(statik). M-8 ekranlarının iskeletleri T4'te açıldı.`
- K-görevi: `| K-M4 | "Dürt" (`POST …/nudge`) + `lastSeenAt`/`linkOpenedAt` mobil UI'ı — P6/P10/P17'de tasarımda var, uç yok | aday | M-9 (plan43) | B-15 açar |`
- Üst blokta `Sıradakiler:` satırında M-7 → **M-8**.

- [ ] **Step 5: Dosya listesi** — `docs/superpowers/plans/INDEX.md`.
Mesaj: `docs(plans): M-7 tamamlandi, K-M4 kaydi`.
