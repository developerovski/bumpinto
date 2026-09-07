# Mobil Temel — Expo İskeleti, Kabuk, Kimlik, Oturumlar (M-4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Bu plan M-1 (`2026-09-01-plan4-mobile.md`), M-2 (`2026-09-02-plan13-mobile-parity-map.md`) ve M-3
(`2026-09-03-plan17-mobile-fairness-mapfree.md`) planlarını SUPERSEDE eder** (INDEX'te T9'da
işaretlenir). O üç planın gövdesi yalnız kod parçası kaynağıdır, bağlayıcı değildir: M-1'in ekran
eşlemesi 9 artboard'lık `Mobil Ekranlar v2`'ye ve "Apple girişi yok" varsayımına dayanıyor
(gereksinim dok. §0). Mağaza/yasal paketi **M-5**, sesli sohbet **M-6**; ikisi de bu planda yok.

**Bu plan v3 mobil izinin ilk üçte biridir.** Kurma ve katılım akışı **M-7**
(`2026-09-06-plan41-mobile-create-join.md`), deste/runoff/karar akışı **M-8**
(`2026-09-06-plan42-mobile-decision-flow.md`). Yürütme sırası: **M-4 → M-7 → M-8**.

**Goal:** `frontend/mobile` içinde ayakta duran Expo SDK 57 CNG uygulaması: derin link + edge-to-edge
config'i üretilmiş, v3 tema/ikon/atom katmanı kurulu, web'in saf mantığı ve dil dosyaları
`frontend/shared`'a taşınmış (web bozulmadan), Google girişiyle açılan, Oturumlar listesini ve Profil
ekranını gösteren kabuk — O2/P1/P2/P22 artboard'larına sadık, adalet/mekan/deste ekranları M-7 ve M-8.

**Architecture:** expo-router **tek stack** (alt sekme yok; Oturumlar kök, Profil sağ üst avatardan,
alt sayfalar `app/(sheets)` grubu `presentation: "modal"`). **Atomic design**:
`src/components/atoms|molecules|organisms`; `app/*` ve `src/screens/*` yalnız kompozisyon + store
bağlama. State: **zustand 5** — bu planda `authStore`, `sessionStore` ve `netStore` (asgari durum);
`newSessionStore`/`locationStore` M-7'de, `deckStore` M-8'de doğar. HTTP: `@bumpinto/shared` axios
istemcisi, `createHttp(..., { client: "mobile" })`. Saf mantık (adalet, deste geometrisi, monogram,
yedek plan, runoff kuyruğu, ulaşım sözlüğü, i18n JSON'ları) web'den `frontend/shared`'a taşınır; web
dosyaları shim olarak re-export eder — web bozulmaz.

**Tech Stack:** **Expo SDK 57** (`expo` 57.0.x → React Native **0.86**, React **19.2**; CNG prebuild,
**Expo Go yok — dev build zorunlu**, **New Architecture zorunlu ve kapatılamaz**), expo-router 57,
react-native-safe-area-context 5 (edge-to-edge), `@react-native-google-signin/google-signin` 16,
expo-secure-store, expo-location (foreground), expo-haptics, expo-clipboard, expo-localization,
expo-font + `@expo-google-fonts/{bricolage-grotesque,figtree,caveat}`, `phosphor-react-native` 3 +
react-native-svg 15, `react-native-maps` 1.27 (kurulur; tembel kullanımı M-7),
`@react-native-community/netinfo` 12, **react-native-gesture-handler 3** + **react-native-reanimated 4**
(+ zorunlu eş paket `react-native-worklets`), zustand 5, i18next 26 / react-i18next 17,
axios (shared), jest-expo 57 + @testing-library/react-native 14.

**Sürüm politikası (BAĞLAYICI — kullanıcı talimatı 2026-09-07):** *her paket latest.* "latest"in bu
depoda **iki** anlamı var, karıştırma:

1. **Expo'nun yönettiği yerel modüller** — `expo-*`, `react-native-{maps,svg,screens,safe-area-context,gesture-handler,reanimated,worklets,view-shot}`,
   `@react-native-community/*`, `jest-expo`: latest = **`expo install`in SDK 57 için çözdüğü sürüm**,
   npm `latest` **DEĞİL**. Bunlara `pnpm add <paket>@latest` yazmak prebuild'i/derlemeyi kırar
   (SDK dışı reanimated/maps ikilisi klasik kırılma). Plan gövdesinde bu paketlere **sürüm yazılmaz**;
   daima `npx expo install` çağrılır.
2. **Saf JS / Expo dışı paketler** — zustand, i18next, react-i18next, axios, `@stomp/stompjs`,
   `phosphor-react-native`, `@react-native-google-signin/google-signin`, `react-native-webrtc`,
   `react-native-incall-manager`, `react-native-qrcode-svg`, `@testing-library/react-native`,
   `eas-cli`: latest = npm `latest` (`@latest` ile kur).

**Kapı:** her görev kapanışında `npx expo install --check` **temiz** dönmeli (sürüm sapması yok).

**New Architecture sonuçları (RN 0.82+ ile mimari kapatılamaz — bare RN'de de kapatılamaz):**

- `react-native-reanimated` **4** ayrı `react-native-worklets` paketi ister ve `babel.config.js`
  eklentisi artık `"react-native-reanimated/plugin"` değil **`"react-native-worklets/plugin"`**tir.
- `react-native-gesture-handler` **3** majör atlama (2.x → 3.x); `GestureHandlerRootView` ve Gesture
  API'si durur, eski `<PanGestureHandler>` bileşen sarmalayıcıları kullanılmaz — M-8 deste kaydırması
  Gesture API'siyle yazılır.
- Eski (legacy) yerel modüller interop katmanından geçer; M-6'nın `react-native-incall-manager`'ı
  bu katmana bağımlıdır → M-6 T2'de doğrulama kapısı var.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç adları
**değiştirilmez**), §3 Mobil, §4 (M-4 satırı). Karşılananlar: **R-M16'nın config kısmı** (edge-to-edge,
AASA/assetlinks, EAS; purpose string'ler ve PrivacyInfo M-5). Kapsam dışı: **R-M2/R-M8/R-M9/R-M14 →
M-7**; **R-M13 → M-8**; R-M1/R-M3–R-M7/R-M15 → **M-5**; R-M10 + dock → **M-6**;
R-M11/R-M12/R-M17 → M-9 (plan43). Yardımcı kaynaklar:
`2026-09-03-map-free-group-decision-ux.md` (ürün tezi, §4 adalet dili),
`2026-09-06-mobile-design-direction.md` (kabuk kararları).

**UI Kaynağı:** Claude Design projesi `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosyalar
**`Mobil Ekranlar v3.dc.html`** (P1–P24) ve **`Mobil Onboarding, İzinler ve Yasal.dc.html`** (O2, O3, O6).
Yerel kopya + ölçüler: `.../scratchpad/design/m3/{A,B}/*.html`, `m3/native.css`, `m3/GUIDE.md`.

| Artboard | Ekran |
|---|---|
| O2 Giriş | `app/index.tsx` |
| P1/P2 Oturumlar · P22 Profil | `app/sessions/index.tsx` · `app/profile.tsx` |
| O3/O6 · P3–P13 | **bu planda YOK** → M-7 |
| P14–P20 · P23 · P24 | **bu planda YOK** → M-8 |
| P21 kart görseli · P25 dock · P26 Live Activity | **bu planda YOK** (M-9 (plan43) / M-6 / sonraki iz) |

**Ön koşul:** B-6 ✓ (mevcut API). Google OAuth istemci kimlikleri ve Maps SDK anahtarları kullanıcıda.

**İki React majörü — DOĞRULAMA KAPISI, ön koşul DEĞİL (2026-09-07).** Depo
`pnpm-workspace.yaml`'da `nodeLinker: hoisted`; `frontend/web` **React 18.3.1**'de (root'ta hoisted,
web nested kopya tutmuyor), Expo SDK 57 ise **React 19.2.3** ister. Bu **M-4'ü bloklamaz**, çünkü:

- `frontend/shared` 6 saf `.ts` dosyasıdır ve **React'i hiç import etmez** — paylaşılan kod React
  çözümlemesi taşımıyor (doğrulandı 2026-09-07).
- Root 18'i tuttuğu için pnpm 19'u `frontend/mobile/node_modules/react` altına **yuvalar**; Metro
  proje kökünden yukarı çözdüğü için önce yuvalanmış 19'u bulur.

T1 Step 1'den hemen sonra **kapı** (üçü de geçmeli, aksi halde M-4 `blocked` ve kullanıcıya bildirilir):

```bash
rtk node -pe 'require("./frontend/mobile/node_modules/react/package.json").version'        # 19.x
rtk node -pe 'require("./frontend/mobile/node_modules/@types/react/package.json").version' # 19.x
rtk pnpm test:web    # web regresyonu: 412 test hâlâ yeşil (mobil kurulumu web'i bozmamalı)
```

`metro.config.js` monorepo için `watchFolders` (repo kökü) + `resolver.nodeModulesPaths`
(`frontend/mobile/node_modules`, sonra kök) ile yazılır — bu zaten React sürümünden bağımsız
olarak gerekli. **Ayrıca `resolver.disableHierarchicalLookup` KULLANILMAZ**; kök `node_modules`
`@bumpinto/shared` için gerekli.

**Web tarafı ayrı iş:** `frontend/web`'in React 19'a çekilmesi bu planın kapsamında **değildir**
(kullanıcı talimatı 2026-09-07: web ayrı ajanın işi). Yukarıdaki kapı kırmızıya dönerse çözüm
web'i 19'a almaktır — o zaman M-4 durur ve iş web izine devredilir.
Doğrula (repo kökünden, üçü de ≥1):
`rtk grep -c "AnchorDto" frontend/shared/src/api-types.ts` ·
`rtk grep -c "originPresent" frontend/shared/src/api-types.ts` ·
`rtk grep -c "hostOnline" frontend/shared/src/api-types.ts`

**Bağlayıcı kurallar:**

- **Git yazma YOK** (`git mv`/`commit`/`push` yasak); her görev sonunda **dosya listesi**, kullanıcı commit eder. Taşımada `mv`.
- Test komutu (repo kökü): `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test -- <yol>` — aşağıda **`MTEST <yol>`**. Web regresyonu: `rtk pnpm test:web`.
- Sözleşme (`api-types.ts` alan adları, uç yolları) **değiştirilmez**; eksik alanda ekran o satırı gizler, alan icat edilmez.
- Ekran dosyalarında ham `Pressable`/`TextInput`/`Text` ve kopya stil YASAK. Store'a yalnız ekranlar ve organizmalar bağlanır.
- i18n: metin sabiti yasak; taban `tr`, yeni anahtar **üç dile birden** (`rtk pnpm i18n:check` yeşil).
- Harita 390'da varsayılan değil: bu planda **hiçbir ekran** `react-native-maps` import etmez; tembel harita alt sayfası M-7'de gelir.
- Metin ≥12px, dokunma hedefi ≥44px, her ekranda tek birincil düğme.
- M-7/M-8'e ait ekran ve bileşenler burada **yazılmaz**; bu plandaki notlar yalnız erteleme kaydıdır.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `mobile/{package.json,app.config.ts,eas.json,tsconfig.json,jest.setup.ts}` | T1/T2 | CNG iskeleti, derin link, EAS |
| `mobile/src/{theme,icons}.ts`, `src/components/atoms/*` | T3/T4 | v3 token'ları, Phosphor eşlemesi, atomlar |
| `shared/src/{i18n/locales/*.json,travelMode,serverEnums,venueLink,format,monogram,swipeMath,voters,backupPlan,runoffTrailer,index}.ts` | T5/T6 | Paylaşılan saf mantık + dil dosyaları |
| `mobile/src/lib/{tokenStore,api}.ts`, `src/store/authStore.ts`, `app/index.tsx` | T7 | Giriş, SecureStore, axios bağlama |
| `mobile/src/store/{sessionStore,netStore}.ts`, `src/components/molecules/{SessionCard,PastSessionRow,ScreenHeader}.tsx`, `app/sessions/index.tsx`, `app/profile.tsx` | T8 | Oturumlar + Profil |
| `docs/superpowers/plans/INDEX.md` | T9 | Tam doğrulama + kayıt |

---

### Task 1: Expo SDK 57 CNG iskeleti + workspace

**Files:** Create `frontend/mobile/` (create-expo-app), `frontend/mobile/{tsconfig.json,jest.setup.ts}`;
Modify `frontend/mobile/package.json`

- [ ] **Step 1: Oluştur ve bağımlılıkları kur** (repo kökünden)

```bash
cd frontend && rtk pnpm create expo-app@latest mobile --template default --no-install && cd ..
rtk pnpm install && cd frontend/mobile
rtk pnpm exec npx expo install expo-router expo-secure-store expo-location expo-haptics \
  expo-clipboard expo-localization expo-font expo-linking expo-dev-client expo-constants \
  expo-build-properties react-native-safe-area-context react-native-screens react-native-svg \
  react-native-maps react-native-gesture-handler react-native-reanimated react-native-worklets \
  @react-native-community/netinfo
rtk pnpm add @bumpinto/shared@workspace:* zustand@latest i18next@latest react-i18next@latest \
  phosphor-react-native@latest @react-native-google-signin/google-signin@latest \
  @expo-google-fonts/bricolage-grotesque@latest @expo-google-fonts/figtree@latest \
  @expo-google-fonts/caveat@latest
rtk pnpm add -D jest @types/jest @testing-library/react-native@latest
rtk pnpm exec npx expo install jest-expo
rtk pnpm exec npx expo install --check     # BOŞ çıktı beklenir; sapma varsa önerdiği sürümü al
```

`babel.config.js` (create-expo-app'in ürettiği dosya) `plugins` dizisine
**`"react-native-worklets/plugin"`** eklenir — Reanimated 4 kendi eklentisini artık dışa aktarmaz;
eski `"react-native-reanimated/plugin"` satırı varsa **silinir**.

`package.json`: `"name": "@bumpinto/mobile"`, `"private": true`; scriptler `start: "expo start
--dev-client"`, `prebuild: "expo prebuild --clean"`, `test: "jest"`, `typecheck: "tsc --noEmit"`;
`"jest": { "preset": "jest-expo", "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"] }`.
`tsconfig.json`: `extends "expo/tsconfig.base"`, `compilerOptions: { strict, resolveJsonModule,
jsx: "react-jsx" }`, `include: ["app", "src", "*.ts"]`.

- [ ] **Step 2: `jest.setup.ts`** — RN modüllerinin test ikizleri. Bunlar yalnız YÜZEY taklidi;
izin ve derin link akışının kendisi **M-8 T5**'te gerçek istemciyle koşar (untested-seam kuralı).

```ts
import "@testing-library/react-native/extend-expect";

jest.mock("expo-secure-store", () => {
  const m = new Map<string, string>();
  return { getItemAsync: jest.fn(async (k: string) => m.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void m.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void m.delete(k)) };
});
jest.mock("expo-haptics", () => ({ impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" } }));
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => () => undefined) }));
jest.mock("expo-constants", () => ({ expoConfig: { extra: { apiUrl: "http://localhost:8060",
  webBase: "https://bumpinto.app", googleWebClientId: "web", googleIosClientId: "ios" } } }));
jest.mock("expo-router", () => ({ router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ slug: "x7k2m" }) }));
```

- [ ] **Step 3: Doğrula** — Run: `rtk pnpm --filter @bumpinto/mobile typecheck`
Expected: hata yok (şablon ekranları henüz duruyor).

- [ ] **Step 4: Dosya listesi** — `frontend/mobile/{package.json,tsconfig.json,jest.setup.ts}`, `pnpm-lock.yaml`. Mesaj: `chore(mobile): expo sdk 54 cng iskeleti`.

---

### Task 2: `app.config.ts` (derin link, edge-to-edge) + EAS + sözleşme denetimi

**Files:** Create `frontend/mobile/{app.config.ts,eas.json,.env.example}`; Delete `frontend/mobile/app.json`

- [ ] **Step 1: Sözleşme denetimi** (gereksinim dok. §6 son madde). Run (repo kökünden):

```bash
for f in AnchorDto originPresent locationWhole "anchored?: boolean" hostOnline midpointLabel \
  emptyActivityTypes "travel?: components"; do printf '%s: ' "$f"; \
  rtk grep -c "$f" frontend/shared/src/api-types.ts; done
```

Expected: hepsi ≥1. **Denetim bulgusu (bağlayıcı):** `SessionView`'da çapa koordinatı ya da etiketi
**yok** — yalnız `anchored: boolean`; çapalı oturumda yer adı `midpointLabel`, yarıçap `radiusKm`
alanından okunur (P7 "Buluşma yeri" satırı bunları kullanır, yeni alan icat edilmez). Herhangi biri 0
dönerse görev **durur**, INDEX'e K-M görevi yazılır, kullanıcıya sorulur.

- [ ] **Step 2: `app.config.ts`**

```ts
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "BumpInto", slug: "bumpinto", scheme: "bumpinto", version: "0.1.0",
  orientation: "portrait", userInterfaceStyle: "light", newArchEnabled: true,
  ios: { bundleIdentifier: "app.bumpinto.mobile", supportsTablet: false,
    associatedDomains: ["applinks:bumpinto.app"],
    config: { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY } },
  android: { package: "app.bumpinto.mobile", edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: true,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } },
    intentFilters: [{ action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"],
      data: [{ scheme: "https", host: "bumpinto.app", pathPrefix: "/j" }] }] },
  plugins: ["expo-router", "expo-secure-store", "expo-font",
    "@react-native-google-signin/google-signin",
    ["expo-location", { isIosBackgroundLocationEnabled: false }]],
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8060",
    webBase: process.env.EXPO_PUBLIC_WEB_BASE ?? "https://bumpinto.app",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID },
};
export default config;
```

`expo-location` purpose string'leri (O3/O7 metinleri) ve `PrivacyInfo.xcprivacy` **M-5'te** eklenir —
burada eklenirse iki planda iki farklı metin oluşur. `app.json` silinir.

- [ ] **Step 3: `eas.json` + `.env.example`** — dev build zorunlu (Expo Go yok):

```json
{ "cli": { "version": ">= 12.0.0" }, "build": {
  "development": { "developmentClient": true, "distribution": "internal",
    "env": { "EXPO_PUBLIC_API_URL": "http://localhost:8060" } },
  "preprod": { "distribution": "internal",
    "env": { "EXPO_PUBLIC_API_URL": "https://preprod.bumpinto.app" } },
  "production": { "env": { "EXPO_PUBLIC_API_URL": "https://bumpinto.app" } } } }
```

`.env.example`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_BASE`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_MAPS_IOS_KEY`, `GOOGLE_MAPS_ANDROID_KEY`.

- [ ] **Step 4: Doğrula** — Run: `rtk pnpm --filter @bumpinto/mobile prebuild -- --platform android`
sonra `rtk grep -c "bumpinto.app" frontend/mobile/android/app/src/main/AndroidManifest.xml`
Expected: ≥1 (derin link intent filter'ı üretildi).

- [ ] **Step 5: Dosya listesi** — `frontend/mobile/{app.config.ts,eas.json,.env.example}`, silinen `app.json`. Mesaj: `feat(mobile): derin link + edge-to-edge config, eas profilleri`.

---

### Task 3: v3 teması + Phosphor ikon eşlemesi

**Files:** Create `frontend/mobile/src/{theme.ts,icons.ts}`; Modify `app/_layout.tsx`;
Test `frontend/mobile/src/icons.test.ts`

- [ ] **Step 1: Başarısız test** (`src/icons.test.ts`)

```ts
import { ACTIVITY_ICON, MODE_ICON } from "./icons";

const ACTIVITIES = ["COFFEE", "FOOD", "BAR", "WALK", "ACTIVITY", "SWIM", "HIKE", "FITNESS",
  "CINEMA", "MUSEUM", "ART", "NIGHTLIFE", "THEME_PARK", "ADVENTURE", "GAMES"] as const;

test("15 etkinlik türünün hepsinde ikon var", () =>
  ACTIVITIES.forEach((a) => expect(ACTIVITY_ICON[a]).toBeDefined()));
test("EBIKE iki glifle temsil edilir (Phosphor'da e-bisiklet glifi yok)", () => {
  expect(MODE_ICON.EBIKE).toHaveLength(2);
  expect(MODE_ICON.CAR).toHaveLength(1);
});
```

Run: `MTEST src/icons.test.ts` — Expected: `Cannot find module './icons'`.

- [ ] **Step 2: `src/theme.ts`** — kaynak `m3/native.css` + `web-base.css` `:root`; ekranlarda çıplak
renk/ölçü yazılmaz.

```ts
export const colors = {
  paper: "#FFFBF6", card: "#FFFFFF", ink: "#27203B", ink2: "#6E6584", ink3: "#A79DB8",
  flame: "#FD3E6B", flame2: "#FF7854", flameDeep: "#DE2456", flameWash: "#FFE9EF",
  sun: "#FFC93C", highlight: "#FFE27A", grass: "#0B7A44", grassWash: "#DFF5E9",
  violet: "#6234D8", violetWash: "#F1EBFF", amber: "#A96A0B", amberWash: "#FFF1D6",
  amberInk: "#7E4F06", line: "#F1E8DE", line2: "#E4D9CD", track: "#EFE7DC",
} as const;
export const fonts = {
  head: "BricolageGrotesque_800ExtraBold", headBold: "BricolageGrotesque_700Bold",
  body: "Figtree_400Regular", bodyMedium: "Figtree_600SemiBold", hand: "Caveat_600SemiBold",
} as const;
export const radius = { card: 22, sheet: 28, input: 16, thumb: 12, pill: 999 } as const;
export const space = { screenX: 18, cardX: 16, rowY: 11, gap: 12 } as const;
export const size = { button: 52, buttonSm: 44, iconButton: 40, avatar: 36, thumb: 56 } as const;
export const shadow = {
  s1: { shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  s2: { shadowColor: colors.ink, shadowOpacity: 0.12, shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 }, elevation: 6 },
} as const;
/** Fotoğrafsız kart gradyanları (GUIDE pA/pB/pC/pD) — deste sırasıyla döner. */
export const photoTints = [["#FFD3DE", "#FFB8A6"], ["#D9E7FF", "#BFD3FF"],
  ["#DCF3E4", "#B8E3C8"], ["#FFE08A", "#F2A93B"]] as const;
```

- [ ] **Step 3: `src/icons.ts`** — GUIDE "Ulaşım/Etkinlik ikonları" listesi birebir.

```ts
import { Bank, Barbell, BeerStein, Bicycle, BowlingBall, Car, Coffee, Compass, FilmSlate,
  ForkKnife, GameController, Lightning, MoonStars, Mountains, Palette, PersonSimpleWalk,
  SwimmingPool, Ticket, Train, type IconProps } from "phosphor-react-native";
import type { ComponentType } from "react";
import type { Schemas } from "@bumpinto/shared";

type Glyph = ComponentType<IconProps>;
type ActivityType = NonNullable<Schemas["SessionView"]["activityTypes"]>[number];
// T6 `TravelMode`'u shared'a taşıyana kadar geçici türetme; T6 Step 2 bunu
// `import type { TravelMode } from "@bumpinto/shared"` ile değiştirir (tek kaynak kuralı).
type TravelMode = NonNullable<Schemas["ParticipantDto"]["travelMode"]>;

export const ACTIVITY_ICON: Record<ActivityType, Glyph> = {
  COFFEE: Coffee, FOOD: ForkKnife, BAR: BeerStein, WALK: PersonSimpleWalk, HIKE: Mountains,
  SWIM: SwimmingPool, FITNESS: Barbell, ADVENTURE: Compass, CINEMA: FilmSlate, MUSEUM: Bank,
  ART: Palette, ACTIVITY: BowlingBall, GAMES: GameController, THEME_PARK: Ticket,
  NIGHTLIFE: MoonStars };
/** EBIKE = Bicycle + Lightning(9px); çağıran sırayla basar (web `lib/travelMode.ts` ile aynı desen). */
export const MODE_ICON: Record<TravelMode, Glyph[]> = { WALK: [PersonSimpleWalk], BIKE: [Bicycle],
  EBIKE: [Bicycle, Lightning], TRANSIT: [Train], CAR: [Car] };
```

- [ ] **Step 4: `app/_layout.tsx`** — font + safe-area + tek stack (i18n satırı T5'te eklenir):

```tsx
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold }
  from "@expo-google-fonts/bricolage-grotesque";
import { Caveat_600SemiBold } from "@expo-google-fonts/caveat";
import { Figtree_400Regular, Figtree_600SemiBold, useFonts } from "@expo-google-fonts/figtree";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../src/theme";

export default function RootLayout() {
  const [loaded] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    Figtree_400Regular, Figtree_600SemiBold, Caveat_600SemiBold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false,
          contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(sheets)" options={{ presentation: "modal" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: PASS** — Run: `MTEST src/icons.test.ts` — Expected: 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/{theme.ts,icons.ts,icons.test.ts}`, `app/_layout.tsx`. Mesaj: `feat(mobile): v3 tema tokenlari + phosphor ikon eslemesi`.

---

### Task 4: Atomlar

**Files:** Create `frontend/mobile/src/components/atoms/{AppText,Button,IconButton,Badge,Card,Avatar,Sticker,HandNote,Chip,Segmented,Progress,Input,Skeleton}.tsx` + `index.ts`;
Test `.../atoms/atoms.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
import { render, screen } from "@testing-library/react-native";
import { Avatar, Badge, Button } from "./index";

test("Button min 52px ve devre dışıyken basılamaz", () => {
  render(<Button title="Katıl" onPress={jest.fn()} disabled />);
  const btn = screen.getByRole("button", { name: "Katıl" });
  expect(btn).toBeDisabled();
  expect(btn.props.style.flat().some((s: { minHeight?: number }) => s?.minHeight === 52)).toBe(true);
});
test("Avatar baş harfi ve çevrimiçi noktası", () => {
  render(<Avatar name="Ayşe" tint={1} online />);
  expect(screen.getByText("A")).toBeTruthy();
  expect(screen.getByLabelText("online")).toBeTruthy();
});
test("Badge metni 12px altına inmez (erişilebilirlik düzeltmesi)", () => {
  render(<Badge tone="grass">Hazır</Badge>);
  expect(screen.getByText("Hazır").props.style.fontSize).toBeGreaterThanOrEqual(12);
});
```

Run: `MTEST src/components/atoms/atoms.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `AppText.tsx`** — tipografi tek atomdan:

```tsx
import { StyleSheet, Text, type TextProps } from "react-native";
import { colors, fonts } from "../../theme";

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "muted" | "label" | "over" | "hand" | "num";

export default function AppText({ variant = "body", style, ...rest }:
  TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[s[variant], style]} />;
}

const s = StyleSheet.create({
  display: { fontFamily: fonts.head, fontSize: 33, lineHeight: 37, color: colors.ink, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.head, fontSize: 26, lineHeight: 30, color: colors.ink, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.headBold, fontSize: 19, color: colors.ink },
  h3: { fontFamily: fonts.headBold, fontSize: 15.5, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink2 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  // native.css `.ov` — erişilebilirlik düzeltmesi: ink3 DEĞİL ink2 (2.5:1 → 5.3:1)
  over: { fontFamily: fonts.bodyMedium, fontSize: 11.5, letterSpacing: 0.08,
    textTransform: "uppercase", color: colors.ink2 },
  hand: { fontFamily: fonts.hand, fontSize: 19, color: colors.ink2, transform: [{ rotate: "-1.5deg" }] },
  num: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.ink, fontVariant: ["tabular-nums"] },
});
```

- [ ] **Step 3: `Button.tsx`** (`.btn` b-fl/b-wh/b-gh/b-dg):

```tsx
import { Pressable, StyleSheet, View } from "react-native";
import AppText from "./AppText";
import { colors, radius, shadow, size } from "../../theme";

type Kind = "flame" | "white" | "ghost" | "danger";

export default function Button(p: { title: string; onPress: () => void; kind?: Kind;
  disabled?: boolean; small?: boolean; icon?: React.ReactNode; style?: object }) {
  const kind = p.kind ?? "flame";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={p.title}
      accessibilityState={{ disabled: !!p.disabled }} onPress={p.onPress} disabled={p.disabled}
      style={({ pressed }) => [s.base, s[kind], { minHeight: p.small ? size.buttonSm : size.button },
        p.disabled && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.97 }] }, p.style]}>
      {p.icon ? <View style={{ marginRight: 8 }}>{p.icon}</View> : null}
      <AppText variant="h3" style={[{ fontSize: 16 }, kind === "flame" && { color: "#fff" },
        kind === "ghost" && { color: colors.flameDeep },
        kind === "danger" && { color: "#B3261E" }]}>{p.title}</AppText>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: { minHeight: size.button, borderRadius: radius.pill, alignItems: "center", width: "100%",
    justifyContent: "center", flexDirection: "row", paddingHorizontal: 22, borderWidth: 1.5,
    borderColor: "transparent" },
  flame: { backgroundColor: colors.flameDeep, ...shadow.s2 },
  white: { backgroundColor: colors.card, borderColor: colors.line2, ...shadow.s1 },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "transparent", borderColor: "#EFC9C2" },
});
```

- [ ] **Step 4: Kalan atomlar** (her biri kendi dosyasında; `index.ts` hepsini dışa aktarır)

- `IconButton` 40×40 daire (`card` + `line2` + `shadow.s1`, `gh` varyantı saydam), **`hitSlop={6}`** — görsel 40, dokunma 52 (GUIDE kural 4).
- `Badge` `tone: "flame"|"grass"|"amber"|"neutral"`; `fontSize: 12` (11px yasak), `radius.pill`; zemin `flameWash/grassWash/amberWash/#F4EEE6`, metin `flameDeep/grass/amberInk/ink2`.
- `Card` `card` + `radius.card` + 1px `line` + `shadow.s1`; `tone?: "flame"|"amber"|"grass"`; `padded?` (varsayılan 16, liste kartlarında `false`).
- `Avatar` baş harf (`name.trim()[0]?.toUpperCase()`), `tint: 0|1|2|3` → `photoTints`, `size?: "s"|"m"|"xl"`, `ring?`, `waiting?` (kesikli kenar + nabız), `online?` → 12px yeşil nokta + 2px beyaz kenar + `accessibilityLabel="online"`, `speaking?` → nokta çevresinde yeşil halka.
- `Sticker` `fonts.hand`, -3°, `sun` zemin, mutlak konumlanır (`.stk`). `HandNote` = `AppText variant="hand"` + `align`.
- `Chip` min 44px, ikon + etiket, `on`/`disabled` (`opacity: .45`), `accessibilityState={{ selected, disabled }}`.
- `Segmented` `options/value/onChange`, `accessibilityRole="tablist"`, seçilide beyaz kabarcık + `shadow.s1` (`.seg`, `.f-seg.icn`).
- `Progress` 6px, `track` zemin + `flame` dolgu, `accessibilityRole="progressbar"`.
- `Input` 48px, `radius.input`, `line2` kenar; `invalid` → `flameDeep` kenar + `flameWash` halka. **Ham `TextInput` yalnız burada.**
- `Skeleton` `track` zemin, `Animated.loop` 1.4 sn opaklık nabzı, `accessibilityElementsHidden`.

- [ ] **Step 5: PASS** — Run: `MTEST src/components/atoms/atoms.test.tsx` — Expected: 3 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/components/atoms/*` (13 bileşen + `index.ts` + test). Mesaj: `feat(mobile): v3 atomlari`.

---

### Task 5: Dil dosyalarını `frontend/shared`'a taşı

**Files:** Move `frontend/web/src/i18n/locales/{tr,en,nl}.json` → `frontend/shared/src/i18n/locales/`;
Modify `frontend/web/src/i18n/index.ts`, `scripts/i18n-parity.mjs`, `frontend/mobile/app/_layout.tsx`;
Create + Test `frontend/mobile/src/i18n/{index.ts,index.test.ts}`

- [ ] **Step 1: Taşı** (git yazma yasağı — `mv`, `git mv` DEĞİL)

```bash
mkdir -p frontend/shared/src/i18n/locales
mv frontend/web/src/i18n/locales/*.json frontend/shared/src/i18n/locales/
rmdir frontend/web/src/i18n/locales
```

Web `i18n/index.ts` import'ları `./locales/tr.json` → `@bumpinto/shared/src/i18n/locales/tr.json`
(web `tsconfig` `resolveJsonModule: true`; Vite JSON'u destekler). `scripts/i18n-parity.mjs`
içindeki klasör yolu da güncellenir.

- [ ] **Step 2: Web regresyonu — tek kapı** — Run: `rtk pnpm test:web && rtk pnpm i18n:check`
Expected: ikisi de yeşil. Kırmızıysa **devam etme**, yolu düzelt.

- [ ] **Step 3: Başarısız test** (`frontend/mobile/src/i18n/index.test.ts`)

```ts
import nl from "@bumpinto/shared/src/i18n/locales/nl.json";
import i18n from "./index";

test("cihaz dili desteklenmiyorsa en; tr/nl anahtarları yüklü", async () => {
  expect(i18n.options.fallbackLng).toEqual(["en"]);
  await i18n.changeLanguage("tr");
  expect(i18n.t("sessions.new")).toBe("Yeni buluşma kur");
  await i18n.changeLanguage("nl");
  expect(i18n.t("sessions.new")).toBe(nl.sessions.new);
});
```

Run: `MTEST src/i18n/index.test.ts` — Expected: modül bulunamadı.

- [ ] **Step 4: `frontend/mobile/src/i18n/index.ts`**

```ts
import en from "@bumpinto/shared/src/i18n/locales/en.json";
import nl from "@bumpinto/shared/src/i18n/locales/nl.json";
import tr from "@bumpinto/shared/src/i18n/locales/tr.json";
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const SUPPORTED = ["tr", "en", "nl"];
const device = getLocales()[0]?.languageCode ?? "en";

void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
  lng: SUPPORTED.includes(device) ? device : "en",
  fallbackLng: "en", interpolation: { escapeValue: false }, returnNull: false });
export default i18n;
```

`app/_layout.tsx`'e `import "../src/i18n";` satırı eklenir (fontlardan önce).

- [ ] **Step 5: v3 kopya anahtarlarını üç dile ekle** — `tr` taban (`en`/`nl` aynı anahtarlarla):

```jsonc
"offline": { "title": "Bağlantı yok",
  "seenAt": "Son görülen hali gösteriliyor · {{time}}", "retry": "Tekrar dene" },
"permission": {
  "locTitle": "Konumun, orta noktayı bulmak için",
  "locBody": "BumpInto konumunu yalnız uygulama açıkken, herkese adil orta noktayı hesaplamak ve çevresindeki mekanları bulmak için kullanır.",
  "locWhyApprox": "Arkadaşlarına yaklaşık gösterilir",
  "locWhyApproxCopy": "~1 km yuvarlanır; tam adres kimseye gitmez.",
  "locWhyTtl": "Buluşmayla birlikte silinir",
  "locWhyTtlCopy": "Oturum 24 saatte kapanır, 30 günde silinir.",
  "locWhyType": "İstemezsen adres yaz",
  "locWhyTypeCopy": "Konum izni vermeden de katılabilirsin.",
  "locNext": "Sonraki adımda telefonun izin soracak.",
  "locContinue": "Devam et", "locTypeInstead": "Adres yazacağım",
  "deniedTitle": "Konum izni kapalı",
  "deniedCopy": "Adres yazarak devam edebilirsin ya da Ayarlar'dan izni açabilirsin.",
  "openSettings": "Ayarlar'a git" },
"venues": { "searching": "Çevredeki mekanlar aranıyor", "searchingHand": "genelde 5 saniye sürer" },
"travel": { "min": "{{lo}}–{{hi}} dk" }
```

`travel.min` mevcut anahtarı bu biçime getirilir (üç dilde). Run: `rtk pnpm i18n:check` → yeşil.

- [ ] **Step 6: PASS** — Run: `MTEST src/i18n/index.test.ts` ve `rtk pnpm test:web` — ikisi de yeşil.

- [ ] **Step 7: Dosya listesi** — `frontend/shared/src/i18n/locales/{tr,en,nl}.json`, `frontend/web/src/i18n/index.ts`, `scripts/i18n-parity.mjs`, `frontend/mobile/src/i18n/{index.ts,index.test.ts}`, `app/_layout.tsx`. Mesaj: `refactor(i18n): dil dosyalari shared'a, mobil i18n kurulumu`.

---

### Task 6: Web `lib/` saf modüllerini shared'a taşı (web'i bozmadan)

**Files:** Create `frontend/shared/src/{travelMode,serverEnums,venueLink,format,monogram,swipeMath,voters,backupPlan,runoffTrailer}.ts`;
Modify `frontend/shared/src/index.ts`, `frontend/shared/package.json`, `frontend/web/src/lib/` aynı dokuz dosya (shim);
Move `frontend/web/src/lib/{swipeMath,venueLink}.test.ts` → `frontend/shared/src/`;
Test `frontend/shared/src/backupPlan.test.ts`

- [ ] **Step 1: Taşı ve React/DOM bağını kes** — dokuz dosya `mv` ile `frontend/shared/src/`'e alınır;
`@bumpinto/shared` import'ları `./api` / `./fairness` olur. İkisi saflaştırılır:

```ts
// shared/src/travelMode.ts — ikonlar İSTEMCİDE kalır (Phosphor web ≠ Phosphor RN)
import type { ParticipantDto } from "./api";

export type TravelMode = NonNullable<ParticipantDto["travelMode"]>;
export const TRAVEL_MODES: readonly TravelMode[] = ["WALK", "BIKE", "EBIKE", "TRANSIT", "CAR"];
export const DEFAULT_TRAVEL_MODE: TravelMode = "CAR";
export const MODE_LABEL_KEY: Record<TravelMode, { name: string; coming: string }> =
  Object.fromEntries(TRAVEL_MODES.map((m) => [m,
    { name: `travelMode.${m}.name`, coming: `travelMode.${m}.coming` }])) as never;
```

```ts
// shared/src/format.ts — i18n örneğine bağlanamaz; dil PARAMETRE olur.
export function formatRating(locale: string | undefined, rating: number): string {
  return new Intl.NumberFormat(locale,
    { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}
```

`shared/src/index.ts` dışa aktarır: `TravelMode`, `TRAVEL_MODES`, `DEFAULT_TRAVEL_MODE`,
`MODE_LABEL_KEY`, `DecisionKind`, `RunoffReason`, `venueLink`, `formatRating`, `monogram`,
`swipeThreshold`, `dragRotation`, `dragProgress`, `releaseDecision`, `SWIPE_THRESHOLD_PX`,
`FLING_VELOCITY`, `type SwipeDir`, `votersOf`, `allVoted`, `backupOf`, `isDeciding`,
`DECIDING_MINUTES`, `DECIDING_RATING`.

- [ ] **Step 2: Web shim'leri** — import yolları değişmez, web bozulmaz:

```ts
// web/src/lib/travelMode.ts
import { Bicycle, Car, Lightning, PersonSimpleWalk, Train, type Icon } from "@phosphor-icons/react";
import type { TravelMode } from "@bumpinto/shared";

export { DEFAULT_TRAVEL_MODE, MODE_LABEL_KEY, TRAVEL_MODES, type TravelMode } from "@bumpinto/shared";
export const MODE_ICON: Record<TravelMode, Icon[]> = { WALK: [PersonSimpleWalk], BIKE: [Bicycle],
  EBIKE: [Lightning, Bicycle], TRANSIT: [Train], CAR: [Car] };
```

```ts
// web/src/lib/format.ts — dil bağını web tarafında bağlar
import { formatRating as fmt } from "@bumpinto/shared";
import i18n from "../i18n";
export function formatRating(rating: number): string { return fmt(i18n.resolvedLanguage, rating); }
```

Kalan yedi shim yalnız kendi sembollerini yeniden dışa aktarır (ör.
`export { backupOf } from "@bumpinto/shared";`) — `export *` kullanılmaz (isim çakışması ve Fast
Refresh riski).

Aynı adımda mobil `src/icons.ts`'teki geçici `type TravelMode = …` satırı silinir ve
`import type { TravelMode } from "@bumpinto/shared";` ile değiştirilir (T3 notu kapanır).

- [ ] **Step 3: Yeni test** (`frontend/shared/src/backupPlan.test.ts`; `vitest` shared'a devDependency)

```ts
import { describe, expect, it } from "vitest";
import type { SessionView } from "./api";
import { backupOf } from "./backupPlan";

const venue = (id: string) => ({ id, name: id });

describe("backupOf", () => {
  it("runoff ikincisini seçer, eşitlikte id sırasıyla kararlı", () => {
    const view = { venues: [venue("a"), venue("b"), venue("c")],
      voteTally: { a: 3, b: 1, c: 1 } } as unknown as SessionView;
    expect(backupOf(view, "a")?.id).toBe("b");
  });
  it("oy yoksa ≥2 beğeni ve ≥3 oy veren şartını arar", () => {
    const view = { venues: [venue("a"), venue("b")], likeCounts: { a: 3, b: 2 },
      participants: [] } as unknown as SessionView;
    expect(backupOf(view, "a")).toBeNull();
  });
});
```

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/shared exec vitest run src/`
Expected: `backupPlan`, `swipeMath`, `venueLink`, `fairness` testleri yeşil.

- [ ] **Step 4: Web regresyonu** — Run: `rtk pnpm test:web` ve
`source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` — ikisi de temiz.

- [ ] **Step 5: Dosya listesi** — `frontend/shared/src/*` (9 modül + 3 test + `index.ts` + `package.json`), `frontend/web/src/lib/*` (9 shim). Mesaj: `refactor(shared): saf lib modulleri shared'a, web shim'leri`.

---

### Task 7: Google girişi + SecureStore + api + `authStore` + Giriş (O2)

**Files:** Create `frontend/mobile/src/lib/{tokenStore,api}.ts`, `src/store/authStore.ts`;
Modify `app/index.tsx`, `frontend/shared/src/api.ts`; Test `src/store/authStore.test.ts`

- [ ] **Step 1: Başarısız test**

```ts
jest.mock("@react-native-google-signin/google-signin", () => ({ GoogleSignin: {
  configure: jest.fn(), hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(async () => ({ data: { idToken: "ID_TOKEN" } })),
  signOut: jest.fn(async () => undefined) } }));
jest.mock("../lib/api", () => ({ api: {
  loginGoogle: jest.fn(async () => ({ accessToken: "ACCESS", userId: "u1" })),
  me: jest.fn(async () => ({ language: "nl" })), logout: jest.fn(async () => undefined) } }));

import * as SecureStore from "expo-secure-store";
import { api } from "../lib/api";
import { useAuthStore } from "./authStore";

test("giriş: id_token takas edilir, SADECE access token saklanır", async () => {
  await useAuthStore.getState().signIn();
  expect(api.loginGoogle).toHaveBeenCalledWith("ID_TOKEN");
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith("bumpinto.accessToken", "ACCESS");
  expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith("bumpinto.idToken", expect.anything());
  expect(useAuthStore.getState().status).toBe("in");
});
test("çıkış: token silinir ve durum out olur", async () => {
  await useAuthStore.getState().signOut();
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("bumpinto.accessToken");
  expect(useAuthStore.getState().status).toBe("out");
});
```

Run: `MTEST src/store/authStore.test.ts` — Expected: kırmızı.

- [ ] **Step 2: `src/lib/tokenStore.ts` + `src/lib/api.ts`**

```ts
// tokenStore.ts — Google id_token cihazda SAKLANMAZ; yalnız /api/auth/google takasında kullanılır.
import * as SecureStore from "expo-secure-store";
const KEY = "bumpinto.accessToken";
export const getAccessToken = () => SecureStore.getItemAsync(KEY);
export const setAccessToken = (t: string) => SecureStore.setItemAsync(KEY, t);
export const clearAccessToken = () => SecureStore.deleteItemAsync(KEY);
```

```ts
// api.ts
import { createBumpintoApi, createHttp } from "@bumpinto/shared";
import Constants from "expo-constants";
import { getAccessToken } from "./tokenStore";

const extra = Constants.expoConfig?.extra as { apiUrl: string; webBase: string };
const participantTokens = new Map<string, string>();

export const rememberParticipantToken = (slug: string, t: string) =>
  void participantTokens.set(slug, t);
export const hasParticipantToken = (slug: string) => participantTokens.has(slug);
export const webBase = extra.webBase;
export const api = createBumpintoApi(createHttp(extra.apiUrl, {
  getIdToken: () => getAccessToken(),
  getParticipantToken: (slug) => participantTokens.get(slug) }, { client: "mobile" }));
```

- [ ] **Step 3: shared'a geocode uçları** — sözleşme §3: ters geocode **backend'e** alınır (OSMF mobil
trafik politikası). `frontend/shared/src/api.ts` nesnesine:

```ts
    geocode: (body: Schemas["GeocodeRequest"]) =>
      http.post<Schemas["GeocodeResponse"]>("/api/geocode", body).then((r) => r.data),
    reverseGeocode: (body: Schemas["ReverseGeocodeRequest"]) =>
      http.post<Schemas["ReverseGeocodeResponse"]>("/api/geocode/reverse", body).then((r) => r.data),
```

- [ ] **Step 4: `src/store/authStore.ts`**

```ts
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { create } from "zustand";
import i18n from "../i18n";
import { api } from "../lib/api";
import { clearAccessToken, getAccessToken, setAccessToken } from "../lib/tokenStore";

const e = Constants.expoConfig?.extra as { googleWebClientId: string; googleIosClientId: string };
GoogleSignin.configure({ webClientId: e.googleWebClientId, iosClientId: e.googleIosClientId });

export const useAuthStore = create<{
  status: "unknown" | "in" | "out" | "busy"; userId: string | null; error: string | null;
  restore: () => Promise<void>; signIn: () => Promise<void>; signOut: () => Promise<void>;
}>((set) => ({
  status: "unknown", userId: null, error: null,
  async restore() { set({ status: (await getAccessToken()) ? "in" : "out" }); },
  async signIn() {
    set({ status: "busy", error: null });
    try {
      await GoogleSignin.hasPlayServices();
      const idToken = (await GoogleSignin.signIn()).data?.idToken;
      if (!idToken) return set({ status: "out" });
      const login = await api.loginGoogle(idToken);
      await setAccessToken(login.accessToken!);
      const me = await api.me().catch(() => null);
      if (me?.language) await i18n.changeLanguage(me.language);
      set({ status: "in", userId: login.userId ?? null });
    } catch { set({ status: "out", error: "landing.errLogin" }); }
  },
  async signOut() {
    await api.logout().catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await clearAccessToken();
    set({ status: "out", userId: null });
  },
}));
```

Access token TTL dolunca 401 gelir → ekranlar `status: "out"` yapıp köke döner (sessiz yenileme v1.1 —
belgeli taviz, M-1'den devralındı).

- [ ] **Step 5: `app/index.tsx` (O2)** — giriş sahnesi (3 avatar + orta nokta işareti, `Sticker`
"herkes ~30 dk"), `landing.title`, `landing.copy`, `HandNote landing.hand`; CTA `landing.google`
(`kind="white"`) → `signIn()`; altında `landing.terms` (`Linking.openURL(webBase + "/terms" |
"/privacy")`). **Apple düğmesi bu planda çizilmez** (R-M1 → M-5). `useEffect` → `restore()`;
`status === "in"` ise `router.replace("/sessions")`.

- [ ] **Step 6: PASS** — Run: `MTEST src/store/authStore.test.ts` — Expected: 2 test yeşil.

- [ ] **Step 7: Dosya listesi** — `src/lib/{tokenStore,api}.ts`, `src/store/authStore.{ts,test.ts}`, `app/index.tsx`, `frontend/shared/src/api.ts`. Mesaj: `feat(mobile): google girisi, securestore, api baglama`.

---

### Task 8: Oturumlar (P1/P2) + Profil (P22)

**Files:** Create `frontend/mobile/src/store/{sessionStore.ts,netStore.ts}`,
`src/components/molecules/{SessionCard,PastSessionRow,ScreenHeader}.tsx`;
Modify `app/sessions/index.tsx`, `app/profile.tsx`; Test `app/sessions/index.test.tsx`

- [ ] **Step 1: Başarısız test**

```tsx
jest.mock("../../src/lib/api", () => ({ api: { listSessions: jest.fn() } }));
import { render, screen, waitFor } from "@testing-library/react-native";
import { api } from "../../src/lib/api";
import SessionsScreen from "./index";

test("boş listede P2 kopyası ve davet kutusu", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ open: [], past: [] });
  render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Henüz buluşma yok")).toBeTruthy());
  expect(screen.getByPlaceholderText("Kod ya da link yapıştır")).toBeTruthy();
});
test("açık oturum kartında hazır sayısı ve duruma uygun CTA", async () => {
  (api.listSessions as jest.Mock).mockResolvedValue({ past: [], open: [{ slug: "x7k2m",
    name: "Cuma kahvesi", sessionType: "GROUP", status: "SWIPING", participantCount: 3,
    doneCount: 2, activityTypes: ["COFFEE", "FOOD"] }] });
  render(<SessionsScreen />);
  await waitFor(() => expect(screen.getByText("Cuma kahvesi")).toBeTruthy());
  expect(screen.getByText("2/3 bitirdi")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Desteye git" })).toBeTruthy();
});
```

Run: `MTEST app/sessions/index.test.tsx` — Expected: kırmızı.

- [ ] **Step 2: `src/store/netStore.ts` (asgari) + `src/store/sessionStore.ts`**

`netStore.ts` burada yalnız durumu tutar; `watchNetwork` aboneliği ve şerit **M-8 T4**'te eklenir —
`lastSyncAt`'in TEK sahibi baştan bu store olsun diye (iki ayrı zaman kaynağı doğmaz):

```ts
import { create } from "zustand";
export const useNetStore = create<{ online: boolean; lastSyncAt: number | null }>(() => ({
  online: true, lastSyncAt: null }));
```

```ts
import type { SessionListResponse, SessionView } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { useNetStore } from "./netStore";

const synced = () => useNetStore.setState({ lastSyncAt: Date.now() });

export const useSessionStore = create<{
  list: SessionListResponse | null; view: SessionView | null;
  loading: boolean; error: string | null;
  loadList: () => Promise<void>; loadView: (slug: string) => Promise<void>;
}>((set) => ({
  list: null, view: null, loading: false, error: null,
  async loadList() {
    set({ loading: true, error: null });
    try { set({ list: await api.listSessions() }); synced(); }
    catch { set({ error: "sessions.errLoad" }); }
    finally { set({ loading: false }); }
  },
  async loadView(slug) {
    try { set({ view: await api.getSession(slug), error: null }); synced(); }
    catch { set({ error: "session.notFound" }); }
  },
}));

/** Durum → CTA anahtarı. P1 kartı ve derin link yönlendirici AYNI eşlemeyi okur. */
export function ctaFor(status: SessionView["status"]): string {
  return status === "SWIPING" ? "sessions.goDeck"
    : status === "BROWSING" ? "sessions.goVenues" : "sessions.goLobby";
}
```

- [ ] **Step 3: `app/sessions/index.tsx` (P1/P2)** — üst çubukta wordmark + sağda `Avatar`
(→ `/profile`); başlık `sessions.title`; `sessions.open` üstlüğü altında `SessionCard` listesi,
`sessions.past` altında `PastSessionRow` listesi, `sessions.retention` notu; CTA `sessions.new`.
Liste boşsa **P2**: `mark` işareti + `sessions.emptyTitle/emptyCopy/emptyHand` + davet kutusu
(`Input` + `Button small`; girilen metinden slug ayıklanır — son `/` sonrası ya da 5 haneli kodun
küçük harfi → `router.push("/j/" + slug)`).
`SessionCard`: ilk açık oturumda `flameDeep` kenar + `Sticker sessions.deckOpen`; etkinlik+tip+kişi
satırı, `Progress` (`doneCount/participantCount`), `Avatar` yığını (-9px), `sessions.doneOf`, sağda
`ctaFor(status)` düğmesi. `PastSessionRow`: 48px görsel (foto yoksa `photoTints` + `monogram`), ad,
`decidedVenueName · {{n}} kişi`, sağda `Badge` (`sessions.went`/`noDecision`/`full`).

- [ ] **Step 4: `app/profile.tsx` (P22)** — `ScreenHeader` (geri + `profile.title`); ortada
`Avatar size="xl" ring`, ad + e-posta + `Badge profile.googleLogin`; iki eğik istatistik kartı
(`stats.sessionsHosted`, `stats.friendsMet`); **Tercihler** kartı: varsayılan konum / etkinlik /
ulaşım / dil satırları (`api.me()` okur, `api.updateMe()` yazar; dil satırı üç dilli alt sayfa açar,
seçim `i18n.changeLanguage` + `updateMe({ language })`); **Hesap** kartı: "Hesap ve veriler" ve
"Destek" satırları **`disabled`** çizilir (`accessibilityState={{ disabled: true }}`) — ekranları M-5
getirir; tasarımdaki satır silinmez, sahte ekran da icat edilmez. CTA
`Button kind="danger" profile.logout` → `signOut()` + `router.replace("/")`.

- [ ] **Step 5: PASS** — Run: `MTEST app/sessions/index.test.tsx` — Expected: 2 test yeşil.

- [ ] **Step 6: Dosya listesi** — `src/store/sessionStore.ts`, `src/components/molecules/{SessionCard,PastSessionRow,ScreenHeader}.tsx`, `app/sessions/index.{tsx,test.tsx}`, `app/profile.tsx`. Mesaj: `feat(mobile): oturumlar listesi + profil`.

---

### Task 9: Tam doğrulama + INDEX kaydı

**Files:** Modify `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Tam koşu** — Run (repo kökünden):

```bash
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test
source ./init-nvm.sh && pnpm --filter @bumpinto/mobile typecheck
source ./init-nvm.sh && pnpm --filter @bumpinto/shared exec vitest run src/
rtk pnpm test:web && rtk pnpm i18n:check
source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b
```

Expected: mobil süit yeşil (T3–T8 testleri: `icons`, `atoms`, `i18n`, `authStore`, `sessions/index`),
shared süiti yeşil (`backupPlan`, `swipeMath`, `venueLink`, `fairness`), mobil ve web tip hatası yok,
web regresyonu temiz, i18n paritesi tam. Kırmızıysa görev **kapanmaz**.

- [ ] **Step 2: Yer tutucu taraması** — Run:
`rtk grep -rn "TODO\|FIXME\|TBD" frontend/mobile/src frontend/mobile/app frontend/shared/src`
Expected: **hiç eşleşme yok** (bu planda yer tutucu bileşen yazılmaz); eşleşmede görev kapanmaz.

- [ ] **Step 3: Sözleşme bulgusu kaydı** — T2 Step 1'in denetim çıktısı doğrulanır: `SessionView`'da
çapa koordinatı ya da etiketi **yok**, yalnız `anchored: boolean`. Run:
`rtk grep -c "anchorLabel\|anchorLat" frontend/shared/src/api-types.ts`
Expected: `0` — bulgu geçerli; M-7'de çapalı oturumun yer adı `midpointLabel`, yarıçapı `radiusKm`
alanından okunur. `1` ya da fazlası dönerse alan eklenmiş demektir; INDEX'teki **K-M5** satırı
`done` yerine `revize` yazılır ve kullanıcıya sorulur.

- [ ] **Step 4: INDEX kaydı** — `docs/superpowers/plans/INDEX.md` **M — Mobil** tablosunda:

- M-1 / M-2 / M-3 **Durum** → `superseded`; **Not**: `M-4 (plan38) supersede etti (2026-09-06); gövde yalnız kod parçası kaynağı.`
- Yeni satır: `| M-4 | **Mobil temel** — Expo SDK 57 CNG iskeleti, derin link + edge-to-edge config, EAS profilleri, v3 tema/ikon/atomları, shared'a taşınan saf mantık + dil dosyaları (web shim'leri), Google girişi + SecureStore, Oturumlar listesi ve Profil | `2026-09-06-plan38-mobile-shell-v3.md` | — | done | B-6 ✓ | — | 9 görev; R-M16(config). Kurma/katılım M-7, karar akışı M-8; dock M-6; mağaza/yasal M-5 |`
- Yeni satır: `| M-7 | **Kurma ve katılım** — yeni buluşma (3 etkinlik + çapa + harita seçici), konum izni ön-ekranı ve red kurtarma, bireysel kurulum, katıl + derin link, durum yönlendirici, lobi/bekle, mekanlar + yol çubuğu | `2026-09-06-plan41-mobile-create-join.md` | — | ready | M-4 | — | 6 görev; R-M14, R-M2, R-M8, R-M9(statik) |`
- Yeni satır: `| M-8 | **Karar akışı** — deste (kaydırma/damga/haptik), deste bitti/liste/gönderildi, runoff/berabere/karar, çevrimdışı şeridi + hata ekranı, Maestro e2e | `2026-09-06-plan42-mobile-decision-flow.md` | — | ready | M-7 | — | 5 görev; R-M13 |`
- K-görevleri: `| K-M5 | `SessionView`'da çapa etiketi/koordinatı yok (M-4:T2 denetimi); çapalı oturumda yer adı `midpointLabel`'dan okunur | done | M-4 | Ayrı alan gerekirse B-15'e K-B görevi |`
- K-M3 → `done` ("M-4'te uygulandı; UI kaynağı v3 dosyaları"). Üst blokta `Sıradakiler:` satırında M-4 → **M-7**.

- [ ] **Step 5: Dosya listesi** — `docs/superpowers/plans/INDEX.md`.
Mesaj: `docs(plans): M-4 tamamlandi, M-1/M-2/M-3 superseded, M-7/M-8 kaydi`.
