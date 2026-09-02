# Plan 13: Mobil — Parite: Oturum Tipi, Mekanlar Ekranı (react-native-maps), Gerçek Haritalar, Dil

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M-1 (Expo host uygulaması, Ek A ile) üzerine web paritesini tamamlamak: Yeni buluşma'da Grup / Bireysel seçimi ve gruplu etkinlik seçici, Bireysel'de elle konumlar, yeni **Mekanlar** ekranı (tam ekran Google haritası + kart şeridi + Liste/Harita anahtarı, host "Karıştır ve kaydır", "Bunu seç"), Lobi/Bekle/Karar'da gerçek harita, ortak dil dosyaları (tr/en/nl) ve Profil'den dil seçimi.

**Architecture:** Harita `react-native-maps` + `PROVIDER_GOOGLE` (Places ToS: Google dışı harita yok), pinler `Marker` içinde RN bileşenleri (DS §10 sözlüğü), yarıçap `Circle`, stil `customMapStyle` (web Map ID stiliyle aynı JSON; `src/lib/mapStyle.ts`). Dil dosyaları **`frontend/shared/src/i18n/locales/*.json`**'a taşınır (web de oradan okur — tek kaynak); mobil `i18next` + `react-i18next` + `expo-localization`. Store'lar web ile aynı sözleşme (`newSessionStore`, `deckStore.shuffle/pick`, `sessionStore.viewer`). Spec: `docs/superpowers/specs/2026-09-01-web-parity-design.md` (BAĞLAYICI). **Öncül: M-1 `done` (Ek A dahil), B-5 `done`, B-6 `done`, W-4 `done`** (shared i18n taşıması web'i de değiştirir; W-4 bittikten sonra tek seferde).

**Tech Stack:** Expo SDK 54+, expo-router, react-native-maps, expo-location, expo-localization, i18next/react-i18next, zustand 5, `phosphor-react-native`, jest-expo + @testing-library/react-native.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

Mobil artboard'lar (`Mobil Ekranlar v2.dc.html`, project `719fcd5f-…`) temel; **bu planın yeni ekranları
için web 390 artboard'ları kaynaktır** (mobil dosyada karşılığı yok — spec §9):

| Ekran | Kaynak artboard (`Web Ekranlar v2.dc.html`) |
|---|---|
| Yeni buluşma (tip + gruplu chip'ler) | `Yeni oturum 390` (Grup), `Yeni oturum 1280` sağ "Konumlar" kartı (Bireysel liste), EN/NL 390 |
| Mekanlar (harita + şerit) | `Mekanlar grup 390 davetli`; host CTA `Mekanlar grup 1280` başlığından; Bireysel liste `Mekanlar bireysel 390` |
| Lobi / Bekle / Karar haritaları | `Lobi 390` (küçük harita), `Bekle 1280` sağ bölge, `Karar 1280` sağ harita |
| Katıl (mobil web) | Bu plan dışı — davetli akışı web'dir |
| Pin dili | DS v2 **10 · Harita dili**; chip'ler **08** |

Tasarımda olmayan durum icat edilmez → INDEX `blocked` + kullanıcıya sor.

---

## Bu plana özel kurallar

- **INDEX güncelle**; **Git yazma YOK**; komutlar `rtk` ile, `frontend/mobile/` dizininden (aksi yazılmadıkça); Node 22 PATH.
- M-1 mimari kuralları (atomic design, Zustand, yalnız `@bumpinto/shared` client) ve güvenlik modeli aynen.
- Google Maps SDK anahtarları `app.json`'da **env üzerinden** (`app.config.ts`'e geçilir: `process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` / `..._IOS_KEY`); değer kullanıcıda (I-1 Ek A). Anahtarsız simülatörde harita boş gri döner — akış kırılmaz.
- Koordinat gizliliği: yalnız `approxLocation` çizilir.
- Her görev sonunda: `rtk pnpm exec tsc --noEmit` + `rtk pnpm test` (jest-expo) yeşil; Expo Go/dev build'de görsel doğrulama.

---

### Task 1: Ortak dil dosyaları (`frontend/shared/src/i18n`) + mobil i18n altyapısı

**Files:**
- Move: `frontend/web/src/i18n/locales/{tr,en,nl}.json` → `frontend/shared/src/i18n/locales/`
- Modify: `frontend/web/src/i18n/index.ts` (import yolu), `frontend/web/tsconfig.json` (`resolveJsonModule` zaten var; yol)
- Modify: `frontend/shared/package.json` (`exports` yok; `main` ts — JSON'lar doğrudan yol ile import edilir)
- Create: `frontend/mobile/src/i18n/index.ts`
- Modify: `frontend/mobile/package.json`, `frontend/mobile/app/_layout.tsx`
- Create: `frontend/mobile/src/i18n/index.test.ts`

- [ ] **Step 1: Taşı** — Run (repo kökü): `mkdir -p frontend/shared/src/i18n/locales && git mv frontend/web/src/i18n/locales/*.json frontend/shared/src/i18n/locales/` — **`git mv` kullanıcıya bırakılır** (git yazma yasağı): ajan dosyaları `mv` ile taşır, kullanıcı commit'te yeniden adlandırmayı görür. Web `i18n/index.ts`: `import tr from "@bumpinto/shared/src/i18n/locales/tr.json";` (web `tsconfig` `resolveJsonModule: true`, Vite JSON import destekler). Web testleri yeşil kalmalı: `rtk pnpm test:web`.

- [ ] **Step 2: Mobil bağımlılıklar** — `rtk pnpm add i18next react-i18next && rtk pnpm exec npx expo install expo-localization react-native-maps jest-expo @testing-library/react-native` (`package.json` `"jest": { "preset": "jest-expo" }`, `"test": "jest"`).

- [ ] **Step 3: Failing test** — `src/i18n/index.test.ts`

```typescript
import nl from "@bumpinto/shared/src/i18n/locales/nl.json";
import i18n from "./index";

test("varsayılan en; tr ve nl anahtarları yüklü", async () => {
  expect(i18n.options.fallbackLng).toEqual(["en"]);
  await i18n.changeLanguage("tr");
  expect(i18n.t("sessions.new")).toBe("Yeni buluşma kur");
  await i18n.changeLanguage("nl");
  expect(i18n.t("sessions.new")).toBe(nl.sessions.new);
});
```

- [ ] **Step 4: `src/i18n/index.ts`**

```typescript
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@bumpinto/shared/src/i18n/locales/en.json";
import nl from "@bumpinto/shared/src/i18n/locales/nl.json";
import tr from "@bumpinto/shared/src/i18n/locales/tr.json";

const device = getLocales()[0]?.languageCode ?? "en";

void i18n.use(initReactI18next).init({
  resources: { tr: { translation: tr }, en: { translation: en }, nl: { translation: nl } },
  lng: ["tr", "en", "nl"].includes(device) ? device : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
```

`app/_layout.tsx`: `import "../src/i18n";` (fontlardan önce). Sunucu tercihi: `lib/auth.ts` girişten sonra `api.me()` → `me.language` varsa `i18n.changeLanguage`.

- [ ] **Step 5: M-1 ekranlarındaki sabit Türkçe metinleri `t()`'ye çevir** — Run: `rtk grep -rn "\"[A-ZÇĞİÖŞÜ][^\"]*\"" app src/screens src/components --include=*.tsx | grep -v "t(\|testID\|fontFamily\|variant"` → çıkan her kullanıcı metni ilgili anahtara (`shell.*`, `sessions.*`, `lobby.*`, `deck.*`, `runoff.*`, `result.*`, `profile.*`) bağlanır; anahtar yoksa **web tr.json'daki anahtar** kullanılır (ekleme gerekiyorsa üç dile birden).

- [ ] **Step 6: PASS** — `rtk pnpm test` (mobil) ve `rtk pnpm test:web` (kök) yeşil.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(i18n): ortak dil dosyalari shared'a, mobil i18n`

---

### Task 2: Harita altyapısı — `MapView` (RN), pinler, stil, anahtarlar

**Files:**
- Create: `frontend/mobile/app.config.ts` (app.json → config; Maps anahtarları env'den)
- Create: `frontend/mobile/src/lib/mapStyle.ts`
- Create: `frontend/mobile/src/components/molecules/pins/ParticipantPin.tsx`
- Create: `frontend/mobile/src/components/molecules/pins/MidpointPin.tsx`
- Create: `frontend/mobile/src/components/molecules/pins/VenuePin.tsx`
- Create: `frontend/mobile/src/components/organisms/MapView.tsx`
- Create: `frontend/mobile/src/components/organisms/MapView.test.tsx`

- [ ] **Step 1: `app.config.ts`**

```typescript
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "BumpInto",
  slug: "bumpinto",
  scheme: "bumpinto",
  // ... app.json'daki mevcut alanlar buraya taşınır (icon, splash, plugins, expo-router)
  ios: {
    bundleIdentifier: "app.bumpinto",
    config: { googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY ?? "" },
  },
  android: {
    package: "app.bumpinto",
    config: { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY ?? "" } },
  },
};
export default config;
```

`eas.json` profillerinin `env` bloklarına iki anahtar adı eklenir (değer kullanıcıda).

- [ ] **Step 2: `lib/mapStyle.ts`** — DS §4b: paper tonları, POI etiketleri kapalı, yalnız yol/yerleşim. Web Map ID stiline **aynı JSON** yüklenir (I-1 Ek A):

```typescript
import type { MapStyleElement } from "react-native-maps";

export const mapStyle: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#f3efe7" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7a7285" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#fffbf6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e6ded2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fbe9b7" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#ebd48f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#d6e7f2" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e9efe1" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#7a7285" }] },
];
```

- [ ] **Step 3: Failing test** — `MapView.test.tsx` (jest-expo; `react-native-maps` mock'u: `jest.mock("react-native-maps", () => { const { View } = require("react-native"); const M = (p) => <View testID="map">{p.children}</View>; M.Marker = (p) => <View testID="marker">{p.children}</View>; M.Circle = () => null; M.PROVIDER_GOOGLE = "google"; return { __esModule: true, default: M, Marker: M.Marker, Circle: M.Circle, PROVIDER_GOOGLE: "google" }; })`):

```tsx
import { render, screen } from "@testing-library/react-native";
import MapView from "./MapView";

test("katılımcı ve mekan pinlerini render eder", () => {
  render(<MapView
    participants={[{ id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } }]}
    venues={[{ id: "v1", name: "Café Berlage", rating: 4.6, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: {} }]}
    midpoint={{ lat: 51.5, lng: 5.5 }} radiusKm={4} />);
  expect(screen.getAllByTestId("marker")).toHaveLength(3); // katılımcı + orta nokta + mekan
  expect(screen.getByText("M")).toBeTruthy();
  expect(screen.getByText("4.6")).toBeTruthy();
});
```

- [ ] **Step 4: Pinler** (DS §10; `theme.ts` renkleri)

`pins/ParticipantPin.tsx`:

```tsx
import { View } from "react-native";
import { colors, fonts } from "../../../theme";
import { AppText } from "../../atoms";

const PALETTE = [["#FD3E6B", "#D91E52"], ["#18B26B", "#0B7A44"], ["#7C4DFF", "#5A2FD0"], ["#FFB020", "#E08900"]];

export default function ParticipantPin(props: { initial: string; index: number; manual?: boolean; label?: string }) {
  const bg = props.manual ? "#fff" : PALETTE[props.index % PALETTE.length][0];
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ padding: props.manual ? 0 : 2, borderRadius: 999, backgroundColor: props.manual ? "transparent" : colors.flame }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: bg, alignItems: "center", justifyContent: "center",
          borderWidth: 2, borderColor: props.manual ? colors.lineIn : "#fff", borderStyle: props.manual ? "dashed" : "solid" }}>
          <AppText style={{ fontFamily: fonts.headBold, fontSize: 12, color: props.manual ? colors.ink2 : "#fff" }}>{props.initial}</AppText>
        </View>
      </View>
      <View style={{ width: 2, height: 8, backgroundColor: colors.ink2, borderRadius: 1 }} />
      {props.label && (
        <View style={{ marginTop: 2, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 999, paddingHorizontal: 6 }}>
          <AppText style={{ fontSize: 10, fontFamily: fonts.bodyMedium, color: colors.ink }}>{props.label}</AppText>
        </View>
      )}
    </View>
  );
}
```

`pins/MidpointPin.tsx`: 27×27 `View`, `borderRadius` `[13.5, 13.5, 13.5, 3]`, `transform: [{ rotate: "45deg" }]`, `backgroundColor: colors.flame`, beyaz 2.5px kenar, `marginBottom: 8`.

`pins/VenuePin.tsx`: `props: { label: string; tint: number; selected: boolean }` → rozet `View` (yükseklik 26/30, `borderRadius 999`, `borderWidth 1.5`, seçili flameDeep dolgu + beyaz metin, değilse beyaz + ink) içinde 18×18 swatch (`["#F9C08A","#8FDDBB","#C1A8F5","#FFE08A"][tint%4]`) + `AppText` etiket; altında 8×8 döndürülmüş kuyruk.

- [ ] **Step 5: `organisms/MapView.tsx`**

```tsx
import type { ParticipantDto, VenueDto } from "@bumpinto/shared";
import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import RNMapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { mapStyle } from "../../lib/mapStyle";
import MidpointPin from "../molecules/pins/MidpointPin";
import ParticipantPin from "../molecules/pins/ParticipantPin";
import VenuePin from "../molecules/pins/VenuePin";

type LatLng = { lat: number; lng: number };

export default function MapView(props: {
  participants: ParticipantDto[]; venues: VenueDto[];
  midpoint: LatLng | null; radiusKm: number | null;
  selectedVenueId?: string | null; onSelectVenue?: (id: string) => void;
  pinLabels?: Record<string, string>; tint?: number; height?: number | "100%";
}) {
  const ref = useRef<RNMapView>(null);
  const coords = [
    ...props.participants.filter((p) => p.approxLocation).map((p) => ({ latitude: p.approxLocation!.lat!, longitude: p.approxLocation!.lng! })),
    ...(props.midpoint ? [{ latitude: props.midpoint.lat, longitude: props.midpoint.lng }] : []),
    ...props.venues.map((v) => ({ latitude: v.lat!, longitude: v.lng! })),
  ];

  useEffect(() => {
    if (coords.length > 0) ref.current?.fitToCoordinates(coords, { edgePadding: { top: 48, right: 48, bottom: 120, left: 48 }, animated: false });
  }, [coords.length, props.venues.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ height: props.height ?? 280, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#F1E8DE" }}>
      <RNMapView ref={ref} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} customMapStyle={mapStyle}
        initialRegion={{ latitude: props.midpoint?.lat ?? 51.44, longitude: props.midpoint?.lng ?? 5.47, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
        showsPointsOfInterest={false} toolbarEnabled={false}>
        {props.participants.map((p, i) => p.approxLocation && (
          <Marker key={p.id} coordinate={{ latitude: p.approxLocation.lat!, longitude: p.approxLocation.lng! }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <ParticipantPin initial={(p.displayName ?? "?")[0]!.toUpperCase()} index={i} manual={p.manual} label={props.pinLabels?.[p.id!]} />
          </Marker>
        ))}
        {props.midpoint && (
          <>
            <Marker coordinate={{ latitude: props.midpoint.lat, longitude: props.midpoint.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}><MidpointPin /></Marker>
            {props.radiusKm && <Circle center={{ latitude: props.midpoint.lat, longitude: props.midpoint.lng }} radius={props.radiusKm * 1000} strokeColor="rgba(222,36,86,0.35)" strokeWidth={2} fillColor="transparent" />}
          </>
        )}
        {props.venues.map((v) => (
          <Marker key={v.id} coordinate={{ latitude: v.lat!, longitude: v.lng! }} anchor={{ x: 0.5, y: 1 }} zIndex={v.id === props.selectedVenueId ? 3 : 2}
            onPress={() => props.onSelectVenue?.(v.id!)} tracksViewChanges={v.id === props.selectedVenueId}>
            <VenuePin label={v.rating != null ? String(v.rating) : (v.name ?? "").slice(0, 12)} tint={props.tint ?? 0} selected={v.id === props.selectedVenueId} />
          </Marker>
        ))}
      </RNMapView>
    </View>
  );
}
```

- [ ] **Step 6: PASS** — `rtk pnpm test` yeşil; dev build'de (Expo Go Google Maps'i desteklemez — `npx expo run:android|ios` ya da EAS dev client) pinler ve halka görünür.

- [ ] **Step 7: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile-map): react-native-maps, pinler, stil`

---

### Task 3: Yeni buluşma — tip seçimi, `ActivityPicker` (gruplu), elle konumlar, `newSessionStore`

**Files:**
- Create: `frontend/mobile/src/lib/activity.ts` (web `lib/activity.ts`'in RN kopyası; ikonlar `phosphor-react-native`)
- Create: `frontend/mobile/src/store/newSessionStore.ts` (web ile aynı sözleşme — W-4 Task 2 Step 4 kodu birebir, `import { api } from "../lib/api"`)
- Create: `frontend/mobile/src/components/molecules/Segmented.tsx`
- Create: `frontend/mobile/src/components/molecules/ActivityPicker.tsx`
- Create: `frontend/mobile/src/components/organisms/PointsEditor.tsx`
- Modify: `frontend/mobile/app/sessions/new.tsx`
- Create: `frontend/mobile/src/store/newSessionStore.test.ts` (W-4 Task 2 Step 1 testi birebir, mock yolu `../lib/api`)

- [ ] **Step 1: Failing test** — `newSessionStore.test.ts` (W-4'teki iki senaryo).

- [ ] **Step 2: Store** — W-4 Task 2 Step 4 kodunu aynen kullan (tek fark: `Loc.label` ters geocode'dan gelir).

- [ ] **Step 3: Bileşenler**

`molecules/Segmented.tsx`: `props { value, onChange, options: {value,label}[] }` — `View` pill (`#F4EEE6`, padding 3) içinde `Pressable`'lar; seçili beyaz + gölge; `accessibilityRole="radio"`.

`molecules/ActivityPicker.tsx` (DS §08; 4 grup alt alta):

```tsx
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { ACTIVITY_GROUPS, ACTIVITY_ICONS, type ActivityGroup } from "../../lib/activity";
import { colors, fonts } from "../../theme";
import { AppText } from "../atoms";

export default function ActivityPicker(props: { value: string; onChange: (a: string) => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 14 }}>
      {(Object.keys(ACTIVITY_GROUPS) as ActivityGroup[]).map((g) => (
        <View key={g} style={{ gap: 8 }}>
          <AppText variant="label">{t(`activity.group.${g}`)}</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ACTIVITY_GROUPS[g].map((a) => {
              const I = ACTIVITY_ICONS[a];
              const on = a === props.value;
              return (
                <Pressable key={a} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => props.onChange(a)}
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 8,
                    borderColor: on ? colors.flameDeep : colors.line2, backgroundColor: on ? colors.flameWash : colors.card }}>
                  <I size={18} color={on ? colors.flameDeep : colors.ink2} />
                  <AppText style={{ fontFamily: fonts.bodyMedium, fontSize: 14.5, color: on ? colors.flameDeep : colors.ink2 }}>{t(`activity.${a}`)}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
```

`organisms/PointsEditor.tsx`: web W-4 Task 2 Step 5'teki `PointsEditor` mantığı RN'de (`Card` + satırlar + `Input` + "Ekle"); geocode: `expo-location` `geocodeAsync(query)` (Nominatim yerine platform geocoder) → `{ lat, lng, label: query }`; `mode: "local" | "remote"` (remote: `sessionStore.addPoint/removePoint`).

- [ ] **Step 4: `app/sessions/new.tsx`** — artboard `Yeni oturum 390`: geri + başlık + `Segmented` (Grup/Bireysel) + açıklama + `ActivityPicker` + isim `Input` + kendi konumu (M-1'deki yeşil kart) + Grup: "Ben de kaydıracağım" anahtarı (**görünür, kilitli** — backend yok; INDEX notu) + `Button` "Buluşmayı kur"; Bireysel: `PointsEditor local` + `MapView` (height 220; katılımcılar = kendi + noktalar, yuvarlanmış) + `Button` "Mekanları bul" (`disabled` < 2). `submit(me.displayName)` → `router.replace('/sessions/' + slug)`.

- [ ] **Step 5: PASS + görsel** — test yeşil; Yeni buluşma 390 artboard'u ile karşılaştırma (Grup ve Bireysel).

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile): yeni bulusma tip secimi, gruplu chip, elle konumlar`

---

### Task 4: Durum yönlendirici, Bireysel kurulum, Lobi haritası, Mekanlar ekranı

**Files:**
- Modify: `frontend/mobile/src/store/sessionStore.ts` (`viewer`, `findVenues`, `addPoint/removePoint`)
- Modify: `frontend/mobile/src/store/deckStore.ts` (`shuffle`, `pick`)
- Modify: `frontend/mobile/app/sessions/[slug].tsx` (yönlendirici)
- Create: `frontend/mobile/src/screens/SoloSetupScreen.tsx`
- Create: `frontend/mobile/src/components/molecules/VenueStripCard.tsx`
- Create: `frontend/mobile/src/components/molecules/VenueRow.tsx`
- Create: `frontend/mobile/src/screens/VenuesScreen.tsx`
- Modify: `frontend/mobile/src/screens/LobbyScreen.tsx` (M-1'de `[slug].tsx` içindeyse ayır) — `MapView` 110px
- Create: `frontend/mobile/src/screens/VenuesScreen.test.tsx`

- [ ] **Step 1: Failing test** — `VenuesScreen.test.tsx` (react-native-maps mock'u Task 2'deki gibi):

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import VenuesScreen from "./VenuesScreen";

jest.mock("../store/deckStore", () => ({ useDeckStore: (sel: (s: unknown) => unknown) => sel({ shuffle: jest.fn(), pick: jest.fn() }) }));

const view = (over: object) => ({ slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP", status: "BROWSING",
  participants: [{ id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } }],
  venues: [{ id: "v1", name: "Café Berlage", rating: 4.6, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 34 } }],
  runoffVenueIds: [], voteTally: {}, midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4, ...over });

test("host: Karıştır ve kaydır; davetli: rozet", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "h", host: true } }) as never} />);
  expect(screen.getByText("Karıştır ve kaydır")).toBeTruthy();
});
test("davetli: karıştırma yok, bilgi rozeti var", () => {
  render(<VenuesScreen view={view({ viewer: { participantId: "a", host: false } }) as never} />);
  expect(screen.queryByText("Karıştır ve kaydır")).toBeNull();
  expect(screen.getByText("host karıştırınca deste açılır")).toBeTruthy();
});
test("solo: Bunu seç", () => {
  render(<VenuesScreen view={view({ sessionType: "SOLO", viewer: { participantId: "h", host: true } }) as never} />);
  expect(screen.getAllByText("Bunu seç").length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Store'lar** — `sessionStore`: `findVenues`, `addPoint(p)`, `removePoint(id)` (api + refresh); türetilmiş `isHost(view)`, `viewerId(view)` (web ile aynı). `deckStore`: `shuffle`, `pick` (W-4 Task 4 Step 3 ile aynı).

- [ ] **Step 3: Yönlendirici** — `[slug].tsx`: spec §3 tablosu:

```tsx
  switch (view.status) {
    case "COLLECTING": case "SUGGESTING":
      return view.sessionType === "SOLO" ? <SoloSetupScreen view={view} /> : isHost(view) ? <LobbyScreen view={view} /> : <WaitingScreen view={view} />;
    case "BROWSING": return <VenuesScreen view={view} />;
    case "SWIPING": return <DeckScreen view={view} />;
    case "RUNOFF": return <RunoffScreen view={view} />;
    case "DECIDED": return <ResultScreen view={view} />;
    default: return <ExpiredScreen />;
  }
```

(M-1 Ek A madde 7'deki BROWSING yer tutucusu kalkar.)

- [ ] **Step 4: Ekranlar**

`screens/SoloSetupScreen.tsx`: başlık + `PointsEditor remote` + `MapView` (220) + `Button` "Mekanları bul" (`sessionStore.findVenues`).

`screens/LobbyScreen.tsx`: M-1 Lobi + `MapView height={110}` (artboard `Lobi 390`: `pinLabels` yok, `caption` yok) + "Mekanları bul" (`disabled` konumlu < 2).

`molecules/VenueStripCard.tsx` (artboard `Mekanlar grup 390 davetli` alt şerit kartı): 250px genişlik, 56px foto (gradyan tint + monogram — M-1 `VenuePolaroid`'in küçük varyantı), ad, meta, yol rozetleri, seçili → flame kenar; sağda opsiyonel `action`.

`molecules/VenueRow.tsx` (liste görünümü — artboard `Mekanlar bireysel 390`): 60px foto + ad + meta + rozetler + `action` ("Seç").

`screens/VenuesScreen.tsx`:

```tsx
import type { SessionView } from "@bumpinto/shared";
import { useState } from "react";
import { FlatList, View } from "react-native";
import { useTranslation } from "react-i18next";
import { GROUP_TINT, groupOf } from "../lib/activity";
import { useDeckStore } from "../store/deckStore";
import { isHost, viewerId } from "../store/sessionStore";
import { colors } from "../theme";
import { AppText, Badge, Button } from "../components/atoms";
import Segmented from "../components/molecules/Segmented";
import VenueRow from "../components/molecules/VenueRow";
import VenueStripCard from "../components/molecules/VenueStripCard";
import MapView from "../components/organisms/MapView";

export default function VenuesScreen({ view }: { view: SessionView }) {
  const { t } = useTranslation();
  const host = isHost(view);
  const solo = view.sessionType === "SOLO";
  const mode = solo ? "solo" : host ? "host" : "guest";
  const [tab, setTab] = useState<"list" | "map">(solo ? "list" : "map");
  const venues = view.venues ?? [];
  const [selected, setSelected] = useState<string | null>(venues[0]?.id ?? null);
  const shuffle = useDeckStore((s) => s.shuffle);
  const pick = useDeckStore((s) => s.pick);
  const tint = GROUP_TINT[groupOf(view.activityType!)];
  const me = viewerId(view);
  const labels = Object.fromEntries((view.participants ?? []).map((p) => [p.id!, p.id === me ? t("deck.travelSelf") : p.displayName!]));
  const action = (id: string, primary: boolean) => mode === "guest" ? undefined : (
    <Button title={t("venues.pick")} kind={primary ? "flame" : "white"} small onPress={() => void pick(id)} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">{view.name ?? t(`activity.${view.activityType}`)}</AppText>
          <AppText variant="muted">{t("venues.meta", { count: venues.length, km: Math.round((view.radiusKm ?? 0) * 4) })}</AppText>
        </View>
        <Segmented value={tab} onChange={setTab} options={[{ value: "list", label: t("venues.list") }, { value: "map", label: t("venues.map") }]} />
      </View>
      {mode === "guest" && <View style={{ paddingHorizontal: 14, paddingBottom: 8 }}><Badge label={t("venues.guestWait")} tone="amber" /></View>}
      {tab === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView height="100%" participants={view.participants ?? []} venues={venues} midpoint={view.midpoint ?? null}
            radiusKm={view.radiusKm ?? null} selectedVenueId={selected} onSelectVenue={setSelected} tint={tint}
            pinLabels={me ? { [me]: t("deck.travelSelf").toLowerCase() } : undefined} />
          <FlatList horizontal data={venues} keyExtractor={(v) => v.id!} showsHorizontalScrollIndicator={false}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} contentContainerStyle={{ padding: 14, gap: 10 }}
            renderItem={({ item }) => (
              <VenueStripCard venue={item} selected={item.id === selected} tint={tint} travelLabels={labels}
                onPress={() => setSelected(item.id!)} action={action(item.id!, mode === "solo")} />
            )} />
        </View>
      ) : (
        <FlatList data={venues} keyExtractor={(v) => v.id!} contentContainerStyle={{ padding: 14, gap: 10 }}
          renderItem={({ item }) => (
            <VenueRow venue={item} selected={item.id === selected} tint={tint} travelLabels={labels}
              onPress={() => setSelected(item.id!)} action={action(item.id!, mode === "solo" && item.id === selected)} />
          )} />
      )}
      {mode === "host" && (
        <View style={{ padding: 14 }}><Button title={t("venues.shuffle")} onPress={() => void shuffle()} /></View>
      )}
    </View>
  );
}
```

(`Button` atomuna `small` prop'u: 36px, 13px — yoksa ekle.)

- [ ] **Step 5: PASS + görsel** — testler yeşil; dev build'de Mekanlar (host/davetli/bireysel) 390 artboard'larıyla karşılaştırma; pin tıklama → şerit kartı seçilir; şerit kaydırma → pin büyür.

- [ ] **Step 6: INDEX güncelle + Commit (kullanıcı)** — `feat(mobile): yonlendirici, solo kurulum, lobi haritasi, Mekanlar ekrani`

---

### Task 5: Bekle/Karar haritaları, Profil (dil + tercihler), kapanış

**Files:**
- Modify: `frontend/mobile/src/screens/WaitingScreen.tsx` (M-1'de ad farklıysa o dosya) — `MapView` 200
- Modify: `frontend/mobile/src/screens/ResultScreen.tsx` — `MapView` 150, kazanan pin seçili
- Modify: `frontend/mobile/app/profile.tsx` — Dil satırı: `Segmented` tr/en/nl → `api.updateMe({language})` + `i18n.changeLanguage`; Varsayılan etkinlik → `ActivityPicker` modal; Varsayılan konum → konumum / adres → `updateMe`
- Modify: `frontend/mobile/src/lib/auth.ts` — girişte `api.me()` → dil uygula

- [ ] **Step 1: Haritalar** — Bekle: `pinLabels[viewerId]="sen"`; Karar: `venues=[winner] selectedVenueId=winner.id`.

- [ ] **Step 2: Profil** — artboard 09 satırları `me`'den; dil seçimi anında uygulanır ve sunucuya yazılır; çıkış → `api.logout()` + SecureStore temizliği.

- [ ] **Step 3: Kapanış kapıları** — `rtk pnpm exec tsc --noEmit` + `rtk pnpm test` yeşil; kök `rtk pnpm test:web` yeşil (shared i18n taşıması); dev build'de uçtan uca: Grup (mobil host ↔ web davetli) ve Bireysel; EAS preprod build (`M-1 Task 7` profilleri) Maps anahtarlarıyla çalışır.

- [ ] **Step 4: INDEX'te M-2 `done` + Commit (kullanıcı)** — `feat(mobile): haritalar, profil dil/tercih, kapanis`

---

## Plan sonu doğrulaması

- [ ] Mobil ve web aynı durum tablosunu (spec §3) uygular; Mekanlar ekranı üç modda (host/davetli/bireysel) doğru.
- [ ] Harita yalnız Google (`PROVIDER_GOOGLE`), stil JSON web Map ID stiliyle aynı; pinler DS §10.
- [ ] Dil dosyaları tek kaynak (`frontend/shared/src/i18n/locales`); mobil varsayılan en, cihaz dili tr/nl ise o, sunucu tercihi girişte uygulanır.
- [ ] Bilinen sınırlar INDEX notunda: "Ben de kaydıracağım" kilitli; RN'de deste liste modu yok (M-1 kararı); Expo Go'da Google Maps yok (dev build gerekir).
