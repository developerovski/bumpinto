# Mobil Mağaza ve Yasal Paketi (M-5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App Store ve Google Play'in **reddetme sebebi** olan her maddeyi mobil uygulamada kapatmak: Apple ile giriş, izin ön-bilgilendirmeleri + red kurtarma, Hesap ve veriler ekranı, yasal okuyucular (gizlilik / şartlar / KVKK / atıflar / destek), KVKK açık rıza anahtarları, rıza kapılı analitik, hesabı sil üç adımı, bildir/engelle ve mağaza `app.config.ts` beyanları (purpose string'ler, `PrivacyInfo.xcprivacy`, `associatedDomains`, edge-to-edge, hesap silme URL'si).

**Architecture:** Bu plan ürün akışına dokunmaz; M-4'ün bıraktığı iskeletin üzerine iki yüzey ekler: (1) `app/account/*` — tek stack içinde ayarlar/yasal/silme ekranları, (2) `app/(sheets)/*` — izin ön-bilgilendirmeleri ve bildir/engelle alt sayfaları. Sözleşme çağrıları tek yerde: `frontend/shared/src/api.ts` (web ve mobil aynı istemciyi kullanır). İzin isteme mantığı `src/lib/permissions.ts` içinde tek modül; ekranlar yalnız kopya + düğme. Mikrofon ön-ekranı **kancayla** yayımlanır (`presentMicConsent()`): M-6 dock'u bu kancayı bekler, bu plan kancayı ve alt sayfayı yazar. Uzun yasal metinler i18n JSON'una girmez; `src/content/legal/*.ts` içinde yapısal blok dizileridir ve tek `LegalReader` ile çizilir. Analitik `src/lib/analytics.ts` arkasında: rıza `false` iken sağlayıcı modülü **hiç `require` edilmez**.

**Tech Stack:** M-4 ile aynı — Expo SDK 54+ (CNG prebuild, Expo Go yok), expo-router (tek stack), zustand 5, `@bumpinto/shared`, `phosphor-react-native`, `react-native-safe-area-context`. Ek olarak: `expo-apple-authentication`, `expo-crypto`, `expo-location`, `expo-audio`, `expo-web-browser`, `expo-build-properties`, `@expo/config-plugins`. Test: jest-expo + `@testing-library/react-native` + `expo-router/testing-library`; cihaz doğrulaması Maestro.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §2 (sözleşme kararları — alan/uç adları **değiştirilmez**), §3 (Mobil), §4 (paket M-5) · `docs/superpowers/specs/2026-09-06-mobile-store-compliance.md` §1 (L1–L16), §2 (meta veri), §3 (izinlerin akıştaki yeri). Gereksinimler: **R-M1, R-M2, R-M3, R-M4, R-M5, R-M6, R-M7, R-M15, R-M16**.

**INDEX kimliği:** `M-5` · Dosya: `2026-09-06-plan39-mobile-store-compliance.md` · Bağımlılık: **B-14**, **W-14**, **M-4**.

---

## UI Kaynağı: Claude Design (BAĞLAYICI)

Proje `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosya **`Mobil Onboarding, İzinler ve Yasal.dc.html`** (19 artboard, 390×844).

| Artboard | Ekran | Görev |
|---|---|---|
| O1 Açılış | splash | M-4 (bu planda değil) |
| **O2** Giriş | Google + Apple eşit ağırlıkta, altta yasal linkler | T5 |
| **O3** Konum ön-bilgilendirme | "Sen neredesin?"e dokununca | T3 |
| **O4 / O5** Sistem izni iOS / Android 16 | purpose string aynen Info.plist'e; ön-bilgilendirmeden hemen sonra | T2, T3 |
| **O6** Konum reddedildi | "Ayarlar'a git" + "Tekrar dene" + adres yaz | T3 |
| **O7** Mikrofon ön-bilgilendirme | alt sayfa; purpose string Info.plist'e | T2, T4 |
| **O8** Hesap ve veriler | 4 grup, 9 satır | T6 |
| **O9 / O10 / O11** | Gizlilik · Şartlar (UGC sıfır tolerans) · KVKK aydınlatma | T7 |
| **O12** Açık rıza tercihlerin | 3 anahtar + Kaydet | T8 |
| **O13 / O14** | Atıflar ve lisanslar · Destek (DSA tacir bilgisi) | T7 |
| **O15 / O16 / O17** | Hesabı sil adım 1 · "SİL" onayı · Hesap silindi | T9 |
| **O18 / O19** | Bildir/Engelle alt sayfası · Bildirim gönderildi | T10 |

**Kopya kuralı:** artboard'daki Türkçe metinler **aynen** kullanılır (kısaltma, yeniden yazma yok). Purpose string'lerin kaynağı uyumluluk dokümanı §2'dir (O4/O7 diyaloglarındaki metinle birebir aynıdır).

---

## Backend sözleşmesi (B-14 üretir — bu plan tüketir, değiştirmez)

Adlar gereksinim dokümanı §2'den gelir, **pazarlığa kapalıdır**. Tipler `rtk pnpm codegen` ile `frontend/shared/src/api-types.ts`'e iner.

| Uç / alan | Şema | Kullanan |
|---|---|---|
| `POST /api/auth/apple` | `AppleLoginRequest {identityToken, nonce, fullName?}` → `LoginResponse` | T1, T5 |
| `MeResponse.authProviders` | `("GOOGLE"\|"APPLE")[]` | T5, T6 |
| `MeResponse.consents` | `ConsentsDto {location, microphone, analytics, updatedAt, version}` | T6, T8 |
| `PUT /api/me/consents` | `UpdateConsentsRequest {location, microphone, analytics}` → `MeResponse` | T8 |
| `DELETE /api/me` | gövde yok → `204` | T9 |
| `GET /api/me/export` | JSON attachment — **B-15'te açılır**, bu planda bayrak arkasında | T6 |
| `POST /api/reports` | `ReportRequest {sessionSlug, targetParticipantId, reason, note?}` → `204` | T10 |
| `GET/POST /api/me/blocks`, `DELETE /api/me/blocks/{id}` | `BlockListResponse`, `BlockRequest {userId?, participantId?}` → `BlockDto`, `204` | T10 |
| `ParticipantDto.blocked` | `boolean` (opsiyonel) | T10 |

**Ad uyuşmazlığı = duruş noktası.** Codegen'den bu adlar çıkmıyorsa B-14 sözleşmeden sapmıştır: kendi tipini **yazma**, INDEX'in M tablosuna `K-M` görevi aç ve dur.

---

## Ön koşul

1. **B-14 `done`** — hepsi ≥1 dönmeli:

```sh
rtk grep -c "AppleLoginRequest" frontend/shared/src/api-types.ts
rtk grep -c "ConsentsDto" frontend/shared/src/api-types.ts
rtk grep -c "ReportRequest" frontend/shared/src/api-types.ts
rtk grep -c "/api/me/blocks" frontend/shared/src/api-types.ts
```

2. **W-14 `done`** — yasal URL'ler yayında (her biri `200`):

```sh
for p in privacy terms kvkk attributions support account/delete; do \
  printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "https://bumpinto.app/$p"; done
```

Yayın açılmadıysa yerelde doğrula (`rtk pnpm dev:web`, `http://localhost:5173/$p`) ve INDEX'e "URL'ler yayına alınmadan mağaza formu doldurulamaz" notunu düş.

3. **M-4 `done`** — iskelet yerinde:

```sh
for f in app.config.ts package.json app/_layout.tsx app/index.tsx "app/(sheets)/_layout.tsx" \
  src/theme.ts src/lib/api.ts src/store/authStore.ts src/components/atoms/Button.tsx \
  src/components/atoms/Card.tsx src/components/atoms/Badge.tsx src/components/atoms/Toggle.tsx \
  src/components/molecules/ParticipantRow.tsx; do \
  test -f "frontend/mobile/$f" && echo "OK  $f" || echo "EKSİK $f"; done
for l in tr en nl; do test -f "frontend/shared/src/i18n/locales/$l.json" \
  && echo "OK  i18n/$l" || echo "EKSİK i18n/$l"; done
```

`app/account/` dizininin **olmaması** normaldir — bu plan açar (T6). Yukarıdaki listeden bir satır `EKSİK` ise M-4 bitmemiştir: başlama, INDEX'te M-5 `blocked`.

4. **Arayüz sözleşmesi (M-4'ten devralınır).** Bu plan yalnız şu yolları kullanır; ad farklıysa **M-4'ün adı esastır** ve tüm dosyalarda tek seferde değiştirilir (yeni ad uydurulmaz):

- `theme.color.{paper, card, ink, ink2, ink3, line, flame, flameDeep, flameWash, amber, amberWash, green, greenWash, danger, dangerWash}` · `theme.space(n)` (4px adım) · `theme.radius.{card, pill}` · `theme.font.{display, body, hand}`
- `<Button variant="flame"|"white"|"ghost"|"danger" onPress disabled>` · `<Card>` · `<Badge tone>` · `<Toggle value onValueChange accessibilityLabel>`
- `src/lib/api.ts` → `export const api` (`createBumpintoApi(http)`) · `src/store/authStore.ts` → `useAuthStore` (`token`, `signInWithGoogle()`, `signOut()`)

Doğrula: `rtk grep -nE "flameWash|dangerWash|radius|space" frontend/mobile/src/theme.ts`

---

## Bağlayıcı kurallar

- **Git yazma işlemi YOK.** Commit'i kullanıcı yapar; her görev **dosya listesi** ile biter.
- Kısayollar (repo kökünden, Node 22 PATH): `MTEST` = `rtk pnpm --filter @bumpinto/mobile test` · `MTSC` = `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit` · `WTEST <yol>` = `rtk pnpm --filter @bumpinto/web test --run <yol>` (shared testleri buradan koşar).
- Her görev: önce test (kırmızı), sonra minimal uygulama, sonra `MTEST` + `MTSC` yeşil.
- i18n: `frontend/shared/src/i18n/locales/tr.json` taban; `en.json`/`nl.json` aynı anahtarlarla; `rtk pnpm i18n:check` yeşil olmadan görev kapanmaz. Uzun yasal metin i18n'e girmez (T7).
- Yeni izin **eklenmez**: bildirim, kamera, rehber, arka plan konum yok (uyumluluk §6).
- Analitik: rıza yokken sağlayıcı `require` edilmez; `track()` PII taşımaz (T8 allowlist).
- Ekranlar M-4 atomlarını kullanır; yeni renk/ölçü token'ı açılmaz.

---

## Dosya haritası

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/{api.ts,api.test.ts,index.ts}` | T1 | Apple, rıza, silme, rapor, engel çağrıları |
| `frontend/mobile/app.config.ts`, `plugins/withPrivacyInfo.js` (+testler) | T2 | R-M16 mağaza beyanları |
| `src/lib/permissions.ts`, `app/(sheets)/location-consent.tsx`, `src/components/{molecules/Reason,organisms/LocationDeniedCard}.tsx` | T3 | R-M2 konum |
| `src/lib/micConsent.ts`, `app/(sheets)/mic-consent.tsx` | T4 | R-M2 mikrofon + M-6 kancası |
| `src/lib/appleAuth.ts`, `src/store/authStore.ts`, `app/index.tsx` | T5 | R-M1 Apple girişi |
| `app/account/{_layout,index}.tsx`, `src/components/molecules/SettingsRow.tsx`, `src/store/meStore.ts` | T6 | R-M3 Hesap ve veriler |
| `src/content/legal/*.ts`, `src/components/organisms/LegalReader.tsx`, `app/account/legal/[doc].tsx` | T7 | R-M4 yasal okuyucular |
| `app/account/consent.tsx`, `src/lib/analytics.ts` | T8 | R-M5 + R-M15 |
| `app/account/{delete,deleted}.tsx` | T9 | R-M6 hesabı sil |
| `app/(sheets)/participant.tsx`, `src/lib/blocks.ts`, `src/components/molecules/ParticipantRow.tsx` | T10 | R-M7 bildir/engelle |
| `docs/store/RELEASE-CHECKLIST.md`, `frontend/mobile/store/README.md` | T11 | Mağaza varlıkları (kod değil) |
| `src/lib/__tests__/native-contract.test.ts`, `app/__tests__/deeplink.test.tsx`, `.maestro/store-compliance.yaml`, `INDEX.md` | T12 | Gerçek istemci testleri + kayıt |

---

### Task 1: Paylaşılan API sözleşmesi

**Files:** Modify `frontend/shared/src/api.ts`, `frontend/shared/src/index.ts` · Test `frontend/shared/src/api.test.ts`

- [ ] **Step 1: Codegen'i tazele** — Run: `rtk pnpm codegen` (backend ayakta), sonra Ön koşul 1'deki dört `grep`. Expected: hepsi ≥1; sıfır çıkarsa **dur** (B-14 sapması).

- [ ] **Step 2: Başarısız testi yaz**

```ts
// frontend/shared/src/api.test.ts
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { beforeEach, describe, expect, it } from "vitest";
import { createBumpintoApi } from "./api";

const http = axios.create({ baseURL: "http://x" });
const mock = new MockAdapter(http);
const api = createBumpintoApi(http);
beforeEach(() => mock.reset());

describe("mağaza uyumluluk uçları", () => {
  it("Apple girişini ham nonce ile gönderir", async () => {
    mock.onPost("/api/auth/apple").reply(200, { token: "t" });
    await api.loginApple({ identityToken: "id", nonce: "raw", fullName: "Ayşe" });
    expect(JSON.parse(mock.history.post[0].data))
      .toEqual({ identityToken: "id", nonce: "raw", fullName: "Ayşe" });
  });
  it("rızayı /api/me/consents'e PUT eder (PUT /api/me DEĞİL)", async () => {
    mock.onPut("/api/me/consents").reply(200, { id: "u1" });
    await api.updateConsents({ location: true, microphone: false, analytics: false });
    expect(mock.history.put[0].url).toBe("/api/me/consents");
  });
  it("rapor, silme ve engel uçlarını doğru yollara bağlar", async () => {
    mock.onPost("/api/reports").reply(204);
    mock.onDelete("/api/me").reply(204);
    mock.onGet("/api/me/blocks").reply(200, { blocks: [] });
    mock.onPost("/api/me/blocks").reply(200, { id: "b1" });
    mock.onDelete("/api/me/blocks/b1").reply(204);
    await api.createReport({ sessionSlug: "x7k2m", targetParticipantId: "p2", reason: "SPAM" });
    await api.deleteMe();
    await api.listBlocks();
    await api.addBlock({ participantId: "p2" });
    await api.removeBlock("b1");
    expect(JSON.parse(mock.history.post[0].data).sessionSlug).toBe("x7k2m");
    expect(mock.history.delete.map((r) => r.url)).toEqual(["/api/me", "/api/me/blocks/b1"]);
  });
});
```

Run: `WTEST ../shared/src/api.test.ts` → kırmızı (`api.loginApple is not a function`). `axios-mock-adapter` yoksa: `rtk pnpm --filter @bumpinto/web add -D axios-mock-adapter`.

- [ ] **Step 3: İstemciyi yaz** — `createBumpintoApi` nesnesine, `voiceCredentials` satırından sonra:

```ts
    loginApple: (body: Schemas["AppleLoginRequest"]) =>
      http.post<Schemas["LoginResponse"]>("/api/auth/apple", body).then((r) => r.data),
    updateConsents: (body: Schemas["UpdateConsentsRequest"]) =>
      http.put<MeResponse>("/api/me/consents", body).then((r) => r.data),
    deleteMe: () => http.delete("/api/me").then(() => undefined),
    exportMe: () => http.get<unknown>("/api/me/export").then((r) => r.data),
    createReport: (body: Schemas["ReportRequest"]) =>
      http.post("/api/reports", body).then(() => undefined),
    listBlocks: () =>
      http.get<Schemas["BlockListResponse"]>("/api/me/blocks").then((r) => r.data),
    addBlock: (body: Schemas["BlockRequest"]) =>
      http.post<Schemas["BlockDto"]>("/api/me/blocks", body).then((r) => r.data),
    removeBlock: (blockId: string) =>
      http.delete(`/api/me/blocks/${blockId}`).then(() => undefined),
```

Dosya başındaki tip dışa aktarımlarına ekle; aynı adlar `index.ts`'in `./api` bloğuna da girer:

```ts
export type Consents = Schemas["ConsentsDto"];
export type BlockDto = Schemas["BlockDto"];
export type ReportReason = Schemas["ReportRequest"]["reason"];
```

- [ ] **Step 4: Yeşile al** — Run: `WTEST ../shared/src/api.test.ts` (4 test) + `MTSC`.

- [ ] **Step 5: Dosya listesi** — `frontend/shared/src/{api.ts,api.test.ts,index.ts}`. Mesaj: `feat(store): shared api client for apple, consents, delete, reports, blocks`.

---

### Task 2: R-M16 — `app.config.ts` mağaza beyanları + `PrivacyInfo.xcprivacy`

**Files:** Modify `frontend/mobile/app.config.ts` · Create `frontend/mobile/plugins/withPrivacyInfo.js` · Test `frontend/mobile/src/lib/__tests__/appConfig.test.ts`, `frontend/mobile/plugins/__tests__/withPrivacyInfo.test.js`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// frontend/mobile/src/lib/__tests__/appConfig.test.ts
import config from "../../../app.config";

const LOCATION = "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. " +
  "Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir.";
const MIC = "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez.";
const expo = config({ config: { name: "BumpInto", slug: "bumpinto" } } as never).expo!;

describe("app.config — mağaza beyanları", () => {
  it("purpose string'ler O4/O7 metinleriyle birebir aynı, ihracat beyanı false", () => {
    expect(expo.ios!.infoPlist!.NSLocationWhenInUseUsageDescription).toBe(LOCATION);
    expect(expo.ios!.infoPlist!.NSMicrophoneUsageDescription).toBe(MIC);
    expect(expo.ios!.infoPlist!.ITSAppUsesNonExemptEncryption).toBe(false);
  });
  it("yalnız iki tehlikeli Android izni ister, arka plan konumu engeller", () => {
    expect(expo.android!.permissions).toEqual([
      "android.permission.ACCESS_FINE_LOCATION", "android.permission.RECORD_AUDIO",
    ]);
    expect(expo.android!.blockedPermissions)
      .toContain("android.permission.ACCESS_BACKGROUND_LOCATION");
  });
  it("derin link yalnız /j/ yakalar; /account/delete web'de kalır", () => {
    expect(expo.ios!.associatedDomains).toContain("applinks:bumpinto.app");
    expect(expo.android!.intentFilters!
      .find((f) => f.data?.some((d) => d.pathPrefix === "/j/"))?.autoVerify).toBe(true);
    expect(expo.android!.intentFilters!.flatMap((f) => f.data ?? [])
      .some((d) => String(d.pathPrefix).startsWith("/account"))).toBe(false);
  });
  it("edge-to-edge, target API 36, PrivacyInfo eklentisi ve silme URL'si", () => {
    expect(expo.android!.edgeToEdgeEnabled).toBe(true);
    const build = expo.plugins!.find((p) => Array.isArray(p) && p[0] === "expo-build-properties");
    expect((build as [string, { android: { targetSdkVersion: number } }])[1]
      .android.targetSdkVersion).toBe(36);
    expect(expo.plugins!.some((p) => String(p).includes("withPrivacyInfo"))).toBe(true);
    expect(expo.extra!.accountDeleteUrl).toBe("https://bumpinto.app/account/delete");
  });
});
```

Run: `MTEST appConfig` → kırmızı.

- [ ] **Step 2: `app.config.ts`'i tamamla** — M-4'ün dosyasındaki `name`/`slug`/`scheme` korunur; şu bloklar eklenir/değiştirilir:

```ts
const WEB_BASE = "https://bumpinto.app";
const LOCATION_PURPOSE = "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. " +
  "Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir.";
const MIC_PURPOSE =
  "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez.";

  ios: {
    bundleIdentifier: "app.bumpinto.mobile",
    associatedDomains: ["applinks:bumpinto.app", "applinks:www.bumpinto.app"],
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PURPOSE,
      NSMicrophoneUsageDescription: MIC_PURPOSE,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: "app.bumpinto.mobile",
    edgeToEdgeEnabled: true,
    permissions: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.RECORD_AUDIO"],
    blockedPermissions: [
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.CAMERA",
    ],
    intentFilters: [{
      action: "VIEW", autoVerify: true, category: ["BROWSABLE", "DEFAULT"],
      data: [{ scheme: "https", host: "bumpinto.app", pathPrefix: "/j/" }],
    }],
  },
  plugins: [
    "expo-router", "expo-secure-store", "expo-apple-authentication",
    ["expo-location", { locationWhenInUsePermission: LOCATION_PURPOSE }],
    ["expo-audio", { microphonePermission: MIC_PURPOSE }],
    ["expo-build-properties", {
      android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 24 },
      ios: { deploymentTarget: "15.1" },
    }],
    "./plugins/withPrivacyInfo",
  ],
  extra: {
    ...(existing.extra ?? {}),
    webBaseUrl: WEB_BASE,
    accountDeleteUrl: `${WEB_BASE}/account/delete`,
    supportEmail: "hello@bumpinto.app",
    exportEnabled: false, // B-15 GET /api/me/export açılınca true (K-M5, T12)
  },
```

`android.permissions` kapalı listedir; modüllerin devrettiği fazlalıkları `blockedPermissions` temizler — Play Data safety formu bu iki izinle beyan edilir.

- [ ] **Step 3: Eklenti testini yaz**

```js
// frontend/mobile/plugins/__tests__/withPrivacyInfo.test.js
const { buildPrivacyInfoPlist } = require("../withPrivacyInfo");
const xml = buildPrivacyInfoPlist();

describe("PrivacyInfo.xcprivacy", () => {
  it("takip yapmadığını beyan eder", () => {
    expect(xml).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  });
  it("toplanan veri türlerini ve Required Reason sebeplerini sayar", () => {
    for (const t of ["PreciseLocation", "EmailAddress", "Name", "UserID", "AudioData",
      "ProductInteraction"]) expect(xml).toContain(`NSPrivacyCollectedDataType${t}`);
    for (const r of ["CA92.1", "C617.1", "35F9.1", "E174.1"]) expect(xml).toContain(r);
  });
  it("ses verisi kaydedilmediği için 'linked' değildir", () => {
    const audio = xml.split("NSPrivacyCollectedDataTypeAudioData")[1].slice(0, 400);
    expect(audio).toMatch(/NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>/);
  });
});
```

Run: `MTEST withPrivacyInfo` → kırmızı.

- [ ] **Step 4: Eklentiyi yaz**

```js
// frontend/mobile/plugins/withPrivacyInfo.js
const { withDangerousMod, withXcodeProject, IOSConfig } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FN = "NSPrivacyCollectedDataTypePurposeAppFunctionality";
const AN = "NSPrivacyCollectedDataTypePurposeAnalytics";
// [tür, linked, amaç] — uyumluluk §2 App Privacy tablosu
const COLLECTED = [["PreciseLocation", true, FN], ["EmailAddress", true, FN], ["Name", true, FN],
  ["UserID", true, FN], ["AudioData", false, FN], ["ProductInteraction", false, AN]];
const APIS = [["UserDefaults", "CA92.1"], ["FileTimestamp", "C617.1"],
  ["SystemBootTime", "35F9.1"], ["DiskSpace", "E174.1"]];

const collectedEntry = ([type, linked, purpose]) => `    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataType${type}</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><${linked}/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key><array><string>${purpose}</string></array>
    </dict>`;

const apiEntry = ([category, reason]) => `    <dict>
      <key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategory${category}</string>
      <key>NSPrivacyAccessedAPITypeReasons</key><array><string>${reason}</string></array>
    </dict>`;

function buildPrivacyInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key>
  <false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
${COLLECTED.map(collectedEntry).join("\n")}
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
${APIS.map(apiEntry).join("\n")}
  </array>
</dict>
</plist>
`;
}

// Dosyayı yaz + Xcode Resources fazına ekle (yalnız yazmak yeterli değil, pakete girmez).
const withPrivacyInfo = (config) => withXcodeProject(
  withDangerousMod(config, ["ios", (cfg) => {
    const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "PrivacyInfo.xcprivacy"), buildPrivacyInfoPlist());
    return cfg;
  }]),
  (cfg) => {
    IOSConfig.XcodeUtils.addResourceFileToGroup({
      filepath: `${cfg.modRequest.projectName}/PrivacyInfo.xcprivacy`,
      groupName: cfg.modRequest.projectName, project: cfg.modResults, isBuildFile: true,
    });
    return cfg;
  },
);

module.exports = withPrivacyInfo;
module.exports.buildPrivacyInfoPlist = buildPrivacyInfoPlist;
```

- [ ] **Step 5: Yeşile al ve prebuild'i doğrula** — Run: `MTEST appConfig` + `MTEST withPrivacyInfo` → yeşil. Sonra `rtk pnpm --filter @bumpinto/mobile exec npx expo prebuild --clean --platform ios`. Expected: `ios/<proje>/PrivacyInfo.xcprivacy` var; `Info.plist` iki purpose string ile `ITSAppUsesNonExemptEncryption` içeriyor. Doğrula: `rtk grep -c "NSPrivacyTracking" frontend/mobile/ios/*/PrivacyInfo.xcprivacy`

- [ ] **Step 6: Dosya listesi** — `app.config.ts`, `plugins/withPrivacyInfo.js` (+test), `src/lib/__tests__/appConfig.test.ts`. Mesaj: `feat(store): app config purpose strings, privacy manifest, deep links (R-M16)`.

---

### Task 3: R-M2 — Konum ön-bilgilendirmesi (O3) ve red kurtarma (O6)

**Files:** Create `src/lib/permissions.ts`, `app/(sheets)/location-consent.tsx`, `src/components/molecules/Reason.tsx`, `src/components/organisms/LocationDeniedCard.tsx` · Modify `app/sessions/new.tsx`, `app/j/[slug].tsx`, `frontend/shared/src/i18n/locales/*.json` · Test `src/lib/__tests__/permissions.test.ts`, `app/(sheets)/__tests__/location-consent.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

```ts
// frontend/mobile/src/lib/__tests__/permissions.test.ts
import * as Location from "expo-location";
import { Linking } from "react-native";
import { openAppSettings, requestLocationWhenInUse } from "../permissions";

jest.mock("expo-location", () => ({
  getForegroundPermissionsAsync: jest.fn(), requestForegroundPermissionsAsync: jest.fn(),
}));
const get = Location.getForegroundPermissionsAsync as jest.Mock;
const req = Location.requestForegroundPermissionsAsync as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it("izin varsa sistem diyaloğunu açmaz", async () => {
  get.mockResolvedValue({ granted: true, canAskAgain: true });
  expect(await requestLocationWhenInUse()).toBe("granted");
  expect(req).not.toHaveBeenCalled();
});

it("sorulabiliyorsa diyaloğu açar; sorulamıyorsa 'blocked'; Ayarlar sistemden açılır", async () => {
  get.mockResolvedValue({ granted: false, canAskAgain: true });
  req.mockResolvedValue({ granted: false, canAskAgain: true });
  expect(await requestLocationWhenInUse()).toBe("denied");
  expect(req).toHaveBeenCalledTimes(1);

  get.mockResolvedValue({ granted: false, canAskAgain: false });
  const spy = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  expect(await requestLocationWhenInUse()).toBe("blocked");
  expect(req).toHaveBeenCalledTimes(1); // ikinci kez sistem diyaloğu açılmadı
  await openAppSettings();
  expect(spy).toHaveBeenCalled();
});
```

```tsx
// frontend/mobile/app/(sheets)/__tests__/location-consent.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import * as permissions from "../../../src/lib/permissions";

jest.mock("../../../src/lib/permissions");
const request = permissions.requestLocationWhenInUse as jest.Mock;
const open = () =>
  renderRouter(["(sheets)/location-consent"], { initialUrl: "/(sheets)/location-consent" });

it("açılışta sistem izni İSTEMEZ, üç gerekçeyi gösterir", () => {
  open();
  expect(request).not.toHaveBeenCalled();
  for (const r of ["Arkadaşlarına yaklaşık gösterilir", "Buluşmayla birlikte silinir",
    "İstemezsen adres yaz"]) expect(screen.getByText(r)).toBeTruthy();
});

it("'Devam et' sistem iznini ister; 'Adres yazacağım' istemez", async () => {
  request.mockResolvedValue("granted");
  open();
  fireEvent.press(screen.getByText("Adres yazacağım"));
  expect(request).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Devam et"));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
});
```

Run: `MTEST permissions` + `MTEST location-consent` → kırmızı.

- [ ] **Step 2: `permissions.ts`'i yaz**

```ts
// frontend/mobile/src/lib/permissions.ts
import * as Location from "expo-location";
import { Linking } from "react-native";

/** 'blocked' = sistem bir daha sormaz; tek çıkış Ayarlar. */
export type PermissionOutcome = "granted" | "denied" | "blocked";

const outcome = (p: { granted: boolean; canAskAgain: boolean }): PermissionOutcome =>
  p.granted ? "granted" : p.canAskAgain ? "denied" : "blocked";

export async function requestLocationWhenInUse(): Promise<PermissionOutcome> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "blocked";
  return outcome(await Location.requestForegroundPermissionsAsync());
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
```

- [ ] **Step 3: O3 alt sayfasını yaz**

`app/(sheets)/location-consent.tsx` — `ScrollView` içinde başlık (`font.display` 30) `perm.location.title`, gövde (15, `ink2`) `perm.location.body`, üç `Reason` (`UsersThree` / `ClockCountdown` / `Keyboard` ikonlarıyla `r1..r3`), 12px not `perm.location.systemNext`; altta iki düğme. Çekirdek:

```tsx
const { next } = useLocalSearchParams<{ next?: string }>();
const back = (locationPermission: string) =>
  router.replace({ pathname: (next as never) ?? "/", params: { locationPermission } });
// …
<Button variant="flame" onPress={async () => back(await requestLocationWhenInUse())}>
  {t("perm.continue")}
</Button>
<Button variant="ghost" onPress={() => back("manual")}>{t("perm.location.typeAddress")}</Button>
```

`src/components/molecules/Reason.tsx` (O3/O7'deki `.why` satırı): props `{ icon: string; title: string; note?: string }`; Phosphor ikonunu adıyla çözer (`(Phosphor as unknown as Record<string, Icon>)[icon]`, `size={20}`, `color={theme.color.flameDeep}`), sağda başlık (`font.body`, 14, `700`, `ink`) ve varsa not (13, `ink2`). Satır `flexDirection: "row"`, `gap: theme.space(3)`, `alignItems: "flex-start"`.

- [ ] **Step 4: O6 red kurtarma kartını yaz ve iki ekrana tak**

`LocationDeniedCard({ onRetry })` — amber kart (`backgroundColor: theme.color.amberWash`, `borderColor: theme.color.amber`, `borderRadius: theme.radius.card`, `accessibilityRole="alert"`): başlık `perm.location.deniedTitle`, not (13, `ink2`) `perm.location.deniedNote`, yan yana iki düğme:

```tsx
<View style={{ flexDirection: "row", gap: theme.space(2) }}>
  <Button variant="white" onPress={openAppSettings}>{t("perm.openSettings")}</Button>
  <Button variant="ghost" onPress={onRetry}>{t("perm.retry")}</Button>
</View>
```

`app/sessions/new.tsx` ve `app/j/[slug].tsx`: "Neredesin?" alanına dokunuş `/(sheets)/location-consent?next=<rota>`'ya gider; dönen `locationPermission` `denied`/`blocked` ise alanın üstüne `<LocationDeniedCard onRetry={...} />` çizilir, `manual` ise adres girişi odaklanır.

- [ ] **Step 5: Kopya anahtarları (O3/O6 metinleri aynen)** — `tr.json` `perm` bloğu:

```json
"perm": {
  "continue": "Devam et", "openSettings": "Ayarlar'a git", "retry": "Tekrar dene",
  "notNow": "Şimdi değil",
  "location": {
    "title": "Konumun, orta noktayı bulmak için",
    "body": "BumpInto konumunu yalnız uygulama açıkken, herkese adil orta noktayı hesaplamak ve çevresindeki mekanları bulmak için kullanır.",
    "r1Title": "Arkadaşlarına yaklaşık gösterilir", "r1Note": "~1 km yuvarlanır; tam adres kimseye gitmez.",
    "r2Title": "Buluşmayla birlikte silinir", "r2Note": "Oturum 24 saatte kapanır, 30 günde silinir.",
    "r3Title": "İstemezsen adres yaz", "r3Note": "Konum izni vermeden de katılabilirsin.",
    "systemNext": "Sonraki adımda telefonun izin soracak.", "typeAddress": "Adres yazacağım",
    "deniedTitle": "Konum izni kapalı",
    "deniedNote": "Adres yazarak devam edebilirsin ya da Ayarlar'dan izni açabilirsin."
  }
}
```

`en.json`/`nl.json`'a aynı anahtarlarla çeviri. Run: `rtk pnpm i18n:check`.

- [ ] **Step 6: Yeşile al** — Run: `MTEST permissions`, `MTEST location-consent`, `MTSC` → yeşil.

- [ ] **Step 7: Dosya listesi** — `src/lib/permissions.ts` (+test), `app/(sheets)/location-consent.tsx` (+test), `src/components/molecules/Reason.tsx`, `src/components/organisms/LocationDeniedCard.tsx`, `app/sessions/new.tsx`, `app/j/[slug].tsx`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(perm): location prominent disclosure and denial recovery (R-M2)`.

---

### Task 4: R-M2 — Mikrofon ön-bilgilendirmesi (O7) ve M-6 kancası

**Files:** Create `src/lib/micConsent.ts`, `app/(sheets)/mic-consent.tsx` · Modify `src/lib/permissions.ts` · Test `src/lib/__tests__/micConsent.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
// frontend/mobile/src/lib/__tests__/micConsent.test.ts
import { router } from "expo-router";
import * as Audio from "expo-audio";
import { presentMicConsent, resolveMicConsent } from "../micConsent";
import { requestMicrophone } from "../permissions";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("expo-audio", () => ({
  getRecordingPermissionsAsync: jest.fn(), requestRecordingPermissionsAsync: jest.fn(),
}));
beforeEach(() => jest.clearAllMocks());

it("alt sayfayı açar ve sonucu bekleyen söz döndürür", async () => {
  const pending = presentMicConsent();
  expect(router.push).toHaveBeenCalledWith("/(sheets)/mic-consent");
  resolveMicConsent("granted");
  await expect(pending).resolves.toBe("granted");
});

it("eşzamanlı ikinci çağrı yeni sayfa açmaz", async () => {
  const a = presentMicConsent();
  const b = presentMicConsent();
  expect(router.push).toHaveBeenCalledTimes(1);
  resolveMicConsent("denied");
  await expect(Promise.all([a, b])).resolves.toEqual(["denied", "denied"]);
});

it("'Şimdi değil' sistem iznini hiç istemez; izin varsa 'granted' döner", async () => {
  const pending = presentMicConsent();
  resolveMicConsent("dismissed");
  await expect(pending).resolves.toBe("dismissed");
  expect(Audio.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
  (Audio.getRecordingPermissionsAsync as jest.Mock)
    .mockResolvedValue({ granted: true, canAskAgain: true });
  expect(await requestMicrophone()).toBe("granted");
});
```

Run: `MTEST micConsent` → kırmızı.

- [ ] **Step 2: `permissions.ts`'e mikrofonu ekle**

```ts
import * as Audio from "expo-audio";

export async function requestMicrophone(): Promise<PermissionOutcome> {
  const current = await Audio.getRecordingPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "blocked";
  return outcome(await Audio.requestRecordingPermissionsAsync());
}
```

- [ ] **Step 3: Kancayı yaz**

```ts
// frontend/mobile/src/lib/micConsent.ts
import { router } from "expo-router";
import type { PermissionOutcome } from "./permissions";

export type MicConsentResult = PermissionOutcome | "dismissed";
let pending: ((result: MicConsentResult) => void)[] = [];

/**
 * M-6 dock'unun tek giriş noktası: sistem diyaloğundan ÖNCE O7 alt sayfasını gösterir.
 * Sesli sohbet dışında çağrılmaz (Play prominent disclosure: özellik anında).
 */
export function presentMicConsent(): Promise<MicConsentResult> {
  const promise = new Promise<MicConsentResult>((resolve) => pending.push(resolve));
  if (pending.length === 1) router.push("/(sheets)/mic-consent");
  return promise;
}

export function resolveMicConsent(result: MicConsentResult): void {
  const waiting = pending;
  pending = [];
  waiting.forEach((resolve) => resolve(result));
}
```

- [ ] **Step 4: O7 alt sayfasını yaz** — `app/(sheets)/mic-consent.tsx`, O7 metinleri aynen: başlık "Sesli sohbet için mikrofon", alt başlık "Yalnız sen \"Katıl\" deyince açılır", gövde "Buluşmadaki arkadaşlarınla konuşabilmen için mikrofon gerekir. Ses **kaydedilmez**, sunucuya gitmez; doğrudan aranızda akar (WebRTC).", üç `Reason` ("İstediğin an kapat" · "30 dakika sonra kendiliğinden biter" · "Uygulama arka plandayken susar"), not "Sonraki adımda telefonun izin soracak." ve iki düğme:

```tsx
const deny = () => { resolveMicConsent("dismissed"); router.back(); };
const accept = async () => { resolveMicConsent(await requestMicrophone()); router.back(); };
// …
<View style={{ flexDirection: "row", gap: theme.space(2) }}>
  <Button variant="ghost" onPress={deny}>{t("perm.notNow")}</Button>
  <Button variant="flame" onPress={accept}>{t("perm.continue")}</Button>
</View>
```

Sayfa `useEffect` temizliğinde `resolveMicConsent("dismissed")` çağırır (kaydırarak kapatma). `perm.mic.*` anahtarları tr/en/nl'ye eklenir.

- [ ] **Step 5: Yeşile al ve M-6 sözleşmesini yaz** — Run: `MTEST micConsent` + `MTSC` → yeşil. `micConsent.ts` başındaki yorum M-6'nın sözleşmesidir: dock `getUserMedia` çağırmadan **önce** `presentMicConsent()` bekler; `"granted"` dışında bir sonuçta oylama akışı bozulmadan dock hata durumuna geçer (uyumluluk §1 L5).

- [ ] **Step 6: Dosya listesi** — `src/lib/micConsent.ts` (+test), `src/lib/permissions.ts`, `app/(sheets)/mic-consent.tsx`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(perm): microphone pre-prompt sheet and M-6 hook (R-M2)`.

---

### Task 5: R-M1 — Apple ile giriş (O2)

**Files:** Create `src/lib/appleAuth.ts` · Modify `src/store/authStore.ts`, `app/index.tsx` · Test `src/lib/__tests__/appleAuth.test.ts`, `app/__tests__/index.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

```ts
// frontend/mobile/src/lib/__tests__/appleAuth.test.ts
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "../api";
import { signInWithApple } from "../appleAuth";

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(), signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
jest.mock("expo-crypto", () => ({
  randomUUID: () => "raw-nonce", digestStringAsync: async () => "hashed-nonce",
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));
jest.mock("../api", () => ({ api: { loginApple: jest.fn() } }));
const signIn = AppleAuthentication.signInAsync as jest.Mock;
beforeEach(() => jest.clearAllMocks());

it("Apple'a hash'li, backend'e ham nonce gönderir", async () => {
  signIn.mockResolvedValue({
    identityToken: "id-token", fullName: { givenName: "Ayşe", familyName: "Y" },
  });
  (api.loginApple as jest.Mock).mockResolvedValue({ token: "jwt" });
  await signInWithApple();
  expect(signIn.mock.calls[0][0].nonce).toBe("hashed-nonce");
  expect(api.loginApple).toHaveBeenCalledWith({
    identityToken: "id-token", nonce: "raw-nonce", fullName: "Ayşe Y",
  });
});

it("vazgeçmede null döner; identityToken yoksa hata fırlatır", async () => {
  signIn.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });
  await expect(signInWithApple()).resolves.toBeNull();
  signIn.mockResolvedValue({ identityToken: null });
  await expect(signInWithApple()).rejects.toThrow("apple:no-identity-token");
  expect(api.loginApple).not.toHaveBeenCalled();
});
```

```tsx
// frontend/mobile/app/__tests__/index.test.tsx
import { screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import * as AppleAuthentication from "expo-apple-authentication";

jest.mock("expo-apple-authentication", () => ({ isAvailableAsync: jest.fn() }));
const available = AppleAuthentication.isAvailableAsync as jest.Mock;

it("Apple varken iki düğme eşit ağırlıkta, yasal linkler görünür; yokken Apple çizilmez", async () => {
  available.mockResolvedValue(true);
  const first = renderRouter(["index"], { initialUrl: "/" });
  expect(await screen.findByText("Apple ile devam et")).toBeTruthy();
  expect(screen.getByText("Google ile devam et")).toBeTruthy();
  expect(screen.getByText("Kullanım şartlarını")).toBeTruthy();
  expect(screen.getByText("Gizlilik politikası")).toBeTruthy();
  first.unmount();

  available.mockResolvedValue(false);
  renderRouter(["index"], { initialUrl: "/" });
  expect(await screen.findByText("Google ile devam et")).toBeTruthy();
  expect(screen.queryByText("Apple ile devam et")).toBeNull();
});
```

Run: `MTEST appleAuth` + `MTEST app/__tests__/index` → kırmızı.

- [ ] **Step 2: `appleAuth.ts`'i yaz**

```ts
// frontend/mobile/src/lib/appleAuth.ts
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { api } from "./api";

/** Apple adı yalnız İLK girişte döner; ham nonce backend'de token claim'iyle karşılaştırılır. */
export async function signInWithApple(): Promise<string | null> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }
  if (!credential.identityToken) throw new Error("apple:no-identity-token");
  const fullName =
    [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ") ||
    undefined;
  const response = await api.loginApple({
    identityToken: credential.identityToken, nonce: rawNonce, fullName,
  });
  return response.token;
}
```

- [ ] **Step 3: `authStore` ve O2'yi tamamla** — `useAuthStore`'a `signInWithAppleAction`: `signInWithApple()` `null` ise sessizce çık; token dönerse M-4'ün Google akışıyla **aynı** yol (SecureStore'a yaz → profil yüklemesi → `/sessions`); yeni dal açılmaz. Hata: `t("auth.appleFailed")` uyarısı, Google akışı bozulmaz.

`app/index.tsx`: Google düğmesinin hemen altına aynı `variant="white"`, aynı yükseklikte Apple düğmesi (`AppleAuthentication.isAvailableAsync()` `true` ise; dolu `ph-apple-logo`). Altındaki mikro metin aynen: "Devam edersen **Kullanım şartlarını** kabul etmiş olursun. **Gizlilik politikası**" — bağlantılar `/account/legal/terms` ve `/account/legal/privacy` (anonim erişilebilir, T7).

- [ ] **Step 4: Yeşile al ve cihazda doğrula** — Run: `MTEST appleAuth`, `MTEST app/__tests__/index`, `MTSC` → yeşil. Cihaz: `rtk pnpm --filter @bumpinto/mobile exec npx expo run:ios`; gerçek Apple Kimliğiyle giriş sonrası `MeResponse.authProviders` içinde `"APPLE"` görünmeli (Apple Developer'da Sign in with Apple capability + Services ID gerekir — anahtarlar **kullanıcıda**).

- [ ] **Step 5: Dosya listesi** — `src/lib/appleAuth.ts` (+test), `src/store/authStore.ts`, `app/index.tsx` (+test), `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(auth): sign in with apple (R-M1)`.

---

### Task 6: R-M3 — Hesap ve veriler (O8)

**Files:** Create `app/account/_layout.tsx`, `app/account/index.tsx`, `src/components/molecules/SettingsRow.tsx`, `src/store/meStore.ts` · Modify `app/profile.tsx` · Test `app/account/__tests__/index.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

```tsx
// frontend/mobile/app/account/__tests__/index.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { api } from "../../../src/lib/api";

jest.mock("../../../src/lib/api", () => ({ api: { me: jest.fn(), updateConsents: jest.fn() } }));
const consents = { location: true, microphone: true, analytics: false,
  updatedAt: "2026-09-06T12:41:00Z", version: "1.0" };
const open = () => renderRouter(["account/index", "account/delete"], { initialUrl: "/account" });

beforeEach(() => {
  jest.clearAllMocks();
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", authProviders: ["APPLE"], consents });
  (api.updateConsents as jest.Mock).mockResolvedValue({ id: "u1", consents });
});

it("dokuz satırın hepsini çizer, export bayrağı kapalıyken indirme devre dışı", async () => {
  open();
  for (const label of ["Gizlilik politikası", "Kullanım şartları", "KVKK aydınlatma metni",
    "Açık rıza tercihlerin", "Kullanım verisi paylaş", "Verilerimi indir",
    "Atıflar ve lisanslar", "Destek ve iletişim", "Hesabı sil"]) {
    expect(await screen.findByText(label)).toBeTruthy();
  }
  expect(screen.getByLabelText("Verilerimi indir").props.accessibilityState.disabled).toBe(true);
});

it("analitik anahtarı kapalı gelir, açılınca tam gövde PUT edilir; silme rotası açılır", async () => {
  const router = open();
  const toggle = await screen.findByLabelText("Kullanım verisi paylaş");
  expect(toggle.props.accessibilityState.checked).toBe(false);
  fireEvent(toggle, "valueChange", true);
  await waitFor(() => expect(api.updateConsents)
    .toHaveBeenCalledWith({ location: true, microphone: true, analytics: true }));
  fireEvent.press(screen.getByText("Hesabı sil"));
  await waitFor(() => expect(router).toHavePathname("/account/delete"));
});
```

Run: `MTEST account/__tests__/index` → kırmızı.

- [ ] **Step 2: `meStore`'u yaz**

```ts
// frontend/mobile/src/store/meStore.ts
import { create } from "zustand";
import type { Consents, MeResponse } from "@bumpinto/shared";
import { api } from "../lib/api";

type MeState = {
  me: MeResponse | null;
  load: () => Promise<void>;
  setConsents: (patch: Partial<Consents>) => Promise<void>;
  clear: () => void;
};

export const useMeStore = create<MeState>((set, get) => ({
  me: null,
  load: async () => set({ me: await api.me() }),
  // PUT /api/me/consents tam-yerine-koymadır (§2): eksik alan false'a düşmesin diye tam gövde.
  setConsents: async (patch) => {
    const c = get().me?.consents;
    const me = await api.updateConsents({
      location: patch.location ?? c?.location ?? false,
      microphone: patch.microphone ?? c?.microphone ?? false,
      analytics: patch.analytics ?? c?.analytics ?? false,
    });
    set({ me });
  },
  clear: () => set({ me: null }),
}));
```

Analitik kapısı bu store'a **T8 Step 2'de** bağlanır (`applyAnalyticsConsent` orada doğar); T6 onu import etmez.

- [ ] **Step 3: `SettingsRow` ve ekranı yaz** — `SettingsRow` props: `{ icon, label, note?, onPress?, right?: "chevron" | ReactNode, tone?: "default" | "danger", disabled? }`; `accessibilityRole="button"`, `accessibilityLabel={label}`, `accessibilityState={{ disabled }}`, `minHeight: 48`. `Toggle` sağ slota geçer ve `accessibilityLabel` satır etiketini alır.

`app/account/index.tsx` grupları (O8 sırası, `.ov` üstlükleri):
- **Yasal** → Gizlilik politikası · Kullanım şartları · KVKK aydınlatma metni · Açık rıza tercihlerin
- **Veri** → Kullanım verisi paylaş (Toggle; not "Ürünü iyileştirmek için anonim kullanım verisi · varsayılan kapalı") · Verilerimi indir (not "JSON · e-postana gelir")
- **Hakkında** → Atıflar ve lisanslar · Destek ve iletişim
- **Tehlikeli bölge** → Hesabı sil (`tone="danger"`, not "Geri alınamaz · 30 gün içinde tamamen silinir")

"Verilerimi indir" satırı `Constants.expoConfig?.extra?.exportEnabled !== true` iken `disabled` (uç B-15'te açılır, K-M5); açıkken `api.exportMe()` → `expo-file-system` ile `bumpinto-verilerim.json` yazar → `expo-sharing` ile paylaşır.

`app/account/_layout.tsx`: `<Stack screenOptions={{ headerShown: false }} />` — üst çubuk her ekranın kendi bileşenidir (GUIDE md.12: geri `ph-arrow-left`, ortada `t1`). Profil (P22) sağ üstten `/account`'a bağlanır.

- [ ] **Step 4: Yeşile al** — Run: `MTEST account`, `MTSC`, `rtk pnpm i18n:check` → yeşil.

- [ ] **Step 5: Dosya listesi** — `app/account/{_layout,index}.tsx` (+test), `src/components/molecules/SettingsRow.tsx`, `src/store/meStore.ts`, `app/profile.tsx`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(account): account and data screen (R-M3)`.

---

### Task 7: R-M4 — Yasal okuyucular (O9, O10, O11, O13, O14)

**Files:** Create `src/content/legal/{types,privacy,terms,kvkk,attributions,support,index}.ts`, `src/components/organisms/LegalReader.tsx`, `app/account/legal/[doc].tsx` · Test `src/content/legal/__tests__/legal.test.ts`, `app/account/legal/__tests__/doc.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

```ts
// frontend/mobile/src/content/legal/__tests__/legal.test.ts
import { LEGAL_DOCS, legalDoc } from "../index";

it("beş belge web URL'si, sürüm ve tarihle gelir", () => {
  expect(Object.keys(LEGAL_DOCS).sort())
    .toEqual(["attributions", "kvkk", "privacy", "support", "terms"]);
  expect(legalDoc("privacy").url).toBe("https://bumpinto.app/privacy");
  for (const key of Object.keys(LEGAL_DOCS) as (keyof typeof LEGAL_DOCS)[]) {
    expect(legalDoc(key).version).toMatch(/^\d+\.\d+$/);
    expect(legalDoc(key).updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

it("şartlar UGC sıfır tolerans maddesini içerir (Apple 1.2)", () => {
  expect(JSON.stringify(legalDoc("terms"))).toContain("sıfır toleransımız var");
});

it("KVKK aydınlatması m.11 haklarını sekiz madde sayar", () => {
  expect(legalDoc("kvkk").blocks.some((b) => b.kind === "ul" && b.items.length === 8)).toBe(true);
});

it("atıflar üç sağlayıcıyı ve lisansları sayar", () => {
  const text = JSON.stringify(legalDoc("attributions"));
  for (const s of ["Google Maps Platform", "Powered by Foursquare", "OpenStreetMap", "ODbL 1.0"])
    expect(text).toContain(s);
});
```

```tsx
// frontend/mobile/app/account/legal/__tests__/doc.test.tsx
import { fireEvent, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import * as WebBrowser from "expo-web-browser";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

it("okuyucu belgeyi çizer ve 'Tarayıcıda aç' web URL'sine gider", async () => {
  renderRouter(["account/legal/[doc]"], { initialUrl: "/account/legal/privacy" });
  expect(await screen.findByText("Gizlilik politikası")).toBeTruthy();
  expect(screen.getByText("Neyi topluyoruz")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Tarayıcıda aç"));
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith("https://bumpinto.app/privacy");
});

it("bilinmeyen belge hesap ekranına döner", () => {
  const router = renderRouter(["account/index", "account/legal/[doc]"],
    { initialUrl: "/account/legal/nope" });
  expect(router).toHavePathname("/account");
});
```

Run: `MTEST legal` → kırmızı.

- [ ] **Step 2: İçerik tipini ve dizinini yaz**

```ts
// frontend/mobile/src/content/legal/types.ts
export type LegalBlock =
  | { kind: "h"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "note"; text: string }
  | { kind: "table"; rows: [string, string][] }
  | { kind: "link"; text: string; href: string };

export type LegalDoc = {
  title: string; updated: string; version: string; url: string; blocks: LegalBlock[];
};
```

```ts
// frontend/mobile/src/content/legal/index.ts
import { attributions } from "./attributions";
import { kvkk } from "./kvkk";
import { privacy } from "./privacy";
import { support } from "./support";
import { terms } from "./terms";
import type { LegalDoc } from "./types";

export const LEGAL_DOCS = { privacy, terms, kvkk, attributions, support } as const;
export type LegalKey = keyof typeof LEGAL_DOCS;
export const isLegalKey = (v: string): v is LegalKey => v in LEGAL_DOCS;
export const legalDoc = (key: LegalKey): LegalDoc => LEGAL_DOCS[key];
```

- [ ] **Step 3: Gizlilik (O9) — metin aynen**

Belge dosyalarının biçimi (hepsi aynı; ilk blok tablosu O9'un "Neyi topluyoruz" tablosudur):

```ts
// frontend/mobile/src/content/legal/privacy.ts
import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  title: "Gizlilik politikası", updated: "2026-09-06", version: "1.0",
  url: "https://bumpinto.app/privacy",
  blocks: [
    { kind: "h", text: "Neyi topluyoruz" },
    { kind: "table", rows: [
      ["Hesap", "Ad, e-posta, Google/Apple kimliği"],
      ["Konum", "Yalnız uygulama açıkken · ~1 km yuvarlanarak paylaşılır"],
      ["Ulaşım türü", "Yürüyüş, bisiklet, araba vb. — yol süresi için"],
      ["Görünen ad", "Oturumdaki herkese görünür"],
      ["Ses", "Kaydedilmez; cihazlar arası doğrudan (P2P) akar"],
      ["Oturum geçmişi", "24 saatte kapanır, 30 günde silinir"],
      ["Kullanım verisi", "Yalnız sen Ayarlar'dan açarsan toplanır"],
    ] },
    // …aşağıdaki h + p çiftleri
  ],
};
```

Kalan bloklar (metinler **aynen**):

- **Neden topluyoruz** — "Herkese adil bir orta nokta bulmak, çevredeki mekanları aramak ve oturumunu listende tutmak için. Bunların dışında bir amaçla kullanmayız."
- **Kimlerle paylaşıyoruz** — "Konumun ve görünen adın yalnızca aynı oturumdaki kişilerle paylaşılır. Mekan aramak için Google Places, Foursquare ve OpenStreetMap/Nominatim'e sorgu göndeririz; bu sorgularda kimliğin yer almaz. Verini reklam ağlarına satmayız, paylaşmayız."
- **Ne kadar tutuyoruz** — "Oturumlar 24 saatte kapanır, 30 gün sonra kalıcı olarak silinir. Hesap bilgilerin, hesabını silene kadar tutulur."
- **Hakların** — "Verilerine erişme, düzeltme ve silme hakkın var. Uygulama içinde Hesap → Hesabı sil ile başlayabilir, ya da bumpinto.app/account/delete adresinden devam edebilirsin." + `link` "bumpinto.app/account/delete" (`https://bumpinto.app/account/delete`)
- **Çocuklar** — "BumpInto 13 yaşın altındaki kullanıcılar için tasarlanmamıştır; bilerek onlardan veri toplamayız."
- **İletişim** — `link` "hello@bumpinto.app" (`mailto:hello@bumpinto.app`)

- [ ] **Step 4: Şartlar (O10) — metin aynen**

`terms.ts` — `title: "Kullanım şartları"`, `updated: "2026-09-06"`, `version: "1.0"`, `url: "https://bumpinto.app/terms"`; `privacy.ts` ile aynı blok biçimi, `h` + `p` çiftleri (metinler **aynen**):

- **Hizmet** — "BumpInto, arkadaşlarınla adil bir buluşma noktası ve mekan bulmanı sağlar. Mekan bilgileri (saat, fiyat, puan) üçüncü taraf sağlayıcılardan gelir; bunlar önceden haber vermeden değişebilir. Doğruluğunu garanti etmeyiz — gitmeden önce kontrol et."
- **Hesap ve davet linkleri** — "Davet linkini paylaştığın kişilerden sorumlusun. Bir oturum 24 saat içinde otomatik kapanır; kapanan bir linke yeniden katılamazsın."
- **Kabul edilebilir kullanım** — "Taciz, nefret söylemi, spam ve sahte kimlik yasaktır. Sesli sohbette ve görünen adlarda rahatsız edici içeriğe sıfır toleransımız var. Bir kişiyi bildirebilir ya da engelleyebilirsin; ihlal tespit edilirse hesabın uyarısız kapatılabilir."
- **İçerik** — "Oturum adı ve görünen adın sana aittir. Bize yalnızca bunları uygulama içinde göstermemiz için sınırlı bir lisans verirsin."
- **Sorumluluk sınırı** — "BumpInto bir buluşma aracıdır; taraflar arasında ne olduğundan sorumlu değiliz. Hizmeti olduğu gibi sunarız, kesintisiz çalışacağını garanti etmeyiz."
- **Fesih** — "Şartları ihlal edersen hesabını askıya alabilir ya da kapatabiliriz. Sen de hesabını istediğin an kapatabilirsin."
- **Değişiklikler** — "Bu şartları güncelleyebiliriz; önemli değişikliklerde uygulama içinden bilgilendiririz."
- **Uygulanacak hukuk** — "Türkiye ve Hollanda'daki tüketici haklarını saklı tutarız; bu şartlar seni yasal haklarından mahrum bırakmaz."
- **İletişim** — `link` "hello@bumpinto.app" (`mailto:hello@bumpinto.app`)

- [ ] **Step 5: KVKK aydınlatma (O11) — metin aynen**

`kvkk.ts` — `title: "KVKK aydınlatma metni"`, `updated: "2026-09-06"`, `version: "1.0"`, `url: "https://bumpinto.app/kvkk"`; blok sırası (metinler **aynen**):

- `note` — "Bu metin aydınlatma amaçlıdır; açık rıza tercihlerin ayrı ekranda (Açık rıza tercihlerin)."
- **Veri sorumlusu** — "BumpInto (Mehmet Şerefoğlu) · hello@bumpinto.app · [tacir adresi — mağazada görünür]"
- **İşlenen kişisel veriler** — `ul`: "Kimlik ve iletişim: ad, e-posta, Google/Apple kimliği" · "Konum: yalnız uygulama açıkken, ~1 km yuvarlanmış" · "Ulaşım türü ve görünen ad" · "Ses: yalnız aktarım anında, kaydedilmez" · "Oturum geçmişi ve kullanım verisi (açarsan)"
- **İşleme amaçları** — "Hesap oluşturma, adil orta nokta hesaplama, mekan arama, oturum ve buluşma kaydının yönetilmesi."
- **Aktarılan taraflar ve amaç** — "Mekan arama ve adres çözümleme için Google, Foursquare ve OpenStreetMap Vakfı'na (yurt dışı) sorgu gönderilir. Sunucularımız AB'de barındırılır. Verin oturum dışındaki kişilerle ya da reklam amacıyla paylaşılmaz."
- **Toplama yöntemi ve hukuki sebep** — "Hesap ve oturum verileri, sözleşmenin ifası için gereklidir (m.5/2-c). Konum ve mikrofon verisi ile kullanım verisi, açık rızana dayanır (m.5/1); rızanı istediğin an geri alabilirsin."
- **Saklama süresi** — "Oturum verileri 24 saatte kapanır, 30 gün içinde silinir. Hesap verilerin, hesabını silene kadar tutulur."
- **İlgili kişinin hakları (m.11)** — `ul`, **sekiz** madde (test bunu sayar): "İşlenip işlenmediğini öğrenme" · "İşlenmişse buna ilişkin bilgi talep etme" · "İşleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme" · "Yurt içi/yurt dışı aktarıldığı üçüncü kişileri bilme" · "Eksik/yanlış işlenmişse düzeltilmesini isteme" · "Silinmesini veya yok edilmesini isteme" · "Düzeltme/silme işleminin aktarılan taraflara bildirilmesini isteme" · "Otomatik analiz sonucu aleyhe çıkan sonuca itiraz etme"
- **Başvuru** — "Talebini hello@bumpinto.app adresine yaz; başvurunu en geç 30 gün içinde sonuçlandırırız."

- [ ] **Step 6: Atıflar (O13) ve Destek (O14)**

`attributions.ts` — `title: "Atıflar ve lisanslar"`, `url: "https://bumpinto.app/attributions"`; bloklar: `h` "Mekan ve harita verisi" → `table` [["Google Maps Platform", "Mekanlar, fotoğraflar, yol süreleri · Google Haritalar Ek Hizmet Şartları"], ["Foursquare", "Mekan kategorileri ve ipuçları · Powered by Foursquare"], ["OpenStreetMap", "Adres/semt adları (Nominatim) · ODbL 1.0 · © OpenStreetMap contributors"]] → `p` "Bu atıflar, verinin göründüğü her ekranda da yer alır." → `h` "Açık kaynak" → `table` [["React Native", "MIT"], ["Expo", "MIT"], ["react-native-webrtc", "MIT"], ["Phosphor Icons", "MIT"], ["Bricolage Grotesque", "OFL 1.1"], ["Figtree", "OFL 1.1"], ["Caveat", "OFL 1.1"]].

`support.ts` — `title: "Destek"`, `url: "https://bumpinto.app/support"`; bloklar: `h` "Bir şey mi takıldı?" → `p` "Genelde 1 iş günü içinde dönüyoruz." → `link` "hello@bumpinto.app" (`mailto:`) → `h` "Sık sorulanlar" → `ul` ["Konumum neden yaklaşık gösteriliyor?", "Arkadaşım linke tıklayınca ne görür?", "Sesli sohbet kaydediliyor mu?", "Verilerimi nasıl silerim?"] → `h` "Tacir bilgileri" → `table` [["Ad", "BumpInto (Mehmet Şerefoğlu)"], ["E-posta", "hello@bumpinto.app"], ["Telefon", "+31 ··· (mağazada görünür)"], ["Adres", "[tacir adresi — mağazada görünür]"], ["Web", "bumpinto.app"]] → `note` "AB Dijital Hizmetler Yasası (DSA) m.30 gereği yayımlanır."

`[tacir adresi — mağazada görünür]` **bilinçli** yer tutucudur: gerçek değeri T11 kontrol listesi yayın kapısı olarak izler; tarama istisnası da orada kayıtlıdır.

- [ ] **Step 7: Okuyucuyu ve rotayı yaz** — `LegalReader.tsx`: `blocks` üzerinde `switch` — `h` (`font.display`, 18), `p` (15 / satır aralığı 22, `ink2`), `ul` (• + 15), `note` (amber kart), `table` (iki kolon; sol sütun `ov` üstlük), `link` (`WebBrowser.openBrowserAsync`). Başta `Son güncelleme: 6 Eylül 2026 · Sürüm 1.0` (`Intl.DateTimeFormat(i18n.language)`).

`app/account/legal/[doc].tsx`: `useLocalSearchParams<{ doc: string }>`; `isLegalKey` değilse `<Redirect href="/account" />`. Üst çubuk: geri + başlık + sağda `accessibilityLabel="Tarayıcıda aç"` (`ph-arrow-square-out`) → `WebBrowser.openBrowserAsync(doc.url)`. Rota auth muhafızının dışındadır (O2'den anonim açılır).

**Dil kararı (bağlayıcı):** uygulama içi okuyucu bu sürümde **TR** metni gösterir (hukuk onayı TR üzerinden); EN/NL kullanıcı "Tarayıcıda aç" ile `bumpinto.app/{lang}/…` sürümüne gider (W-14). Uygulama içi EN/NL çeviri T12'de `K-M4` olarak INDEX'e yazılır.

- [ ] **Step 8: Yeşile al** — Run: `MTEST legal`, `MTSC` → yeşil; dev build'de beş ekranı gözle doğrula (kesilen metin yok, ≥12px).

- [ ] **Step 9: Dosya listesi** — `src/content/legal/*.ts` (+test), `src/components/organisms/LegalReader.tsx`, `app/account/legal/[doc].tsx` (+test). Mesaj: `feat(legal): in-app legal readers (R-M4)`.

---

### Task 8: R-M5 + R-M15 — Açık rıza (O12) ve rıza kapılı analitik

**Files:** Create `app/account/consent.tsx`, `src/lib/analytics.ts` · Test `src/lib/__tests__/analytics.test.ts`, `app/account/__tests__/consent.test.tsx`

- [ ] **Step 1: Analitik kapısının testini yaz**

```ts
// frontend/mobile/src/lib/__tests__/analytics.test.ts
import { __resetAnalytics, applyAnalyticsConsent, setProviderLoader, track } from "../analytics";

const fake = () => ({ track: jest.fn(), shutdown: jest.fn() });
beforeEach(() => __resetAnalytics());

it("rıza yokken sağlayıcı modülü YÜKLENMEZ", () => {
  const loader = jest.fn();
  setProviderLoader(loader);
  applyAnalyticsConsent(false);
  track("session_created", { sessionType: "GROUP" });
  expect(loader).not.toHaveBeenCalled();
});

it("rıza gelince sağlayıcı bir kez yüklenir; allowlist dışını (PII) düşürür", () => {
  const provider = fake();
  const loader = jest.fn(() => provider);
  setProviderLoader(loader);
  applyAnalyticsConsent(true);
  track("session_created", { sessionType: "GROUP", email: "m@x.dev", slug: "x7k2m" });
  track("deck_done", {});
  expect(loader).toHaveBeenCalledTimes(1);
  expect(provider.track).toHaveBeenNthCalledWith(1, "session_created", { sessionType: "GROUP" });
});

it("rıza geri alınınca sağlayıcı kapatılır; sağlayıcı yokken no-op'tur", () => {
  const provider = fake();
  setProviderLoader(() => provider);
  applyAnalyticsConsent(true);
  applyAnalyticsConsent(false);
  track("session_created", {});
  expect(provider.shutdown).toHaveBeenCalledTimes(1);
  expect(provider.track).not.toHaveBeenCalled();
  __resetAnalytics();
  applyAnalyticsConsent(true);
  expect(() => track("session_created", {})).not.toThrow();
});
```

Run: `MTEST analytics` → kırmızı.

- [ ] **Step 2: `analytics.ts`'i yaz**

```ts
// frontend/mobile/src/lib/analytics.ts
export type AnalyticsProvider = {
  track: (event: string, props: Record<string, string | number | boolean>) => void;
  shutdown: () => void;
};

/** PII asla gitmez: yalnız bu anahtarlar taşınır. */
const ALLOWED_PROPS = ["sessionType", "step", "count", "activity", "travelMode"] as const;

let loadProvider: (() => AnalyticsProvider) | null = null;
let provider: AnalyticsProvider | null = null;
let consented = false;

export function setProviderLoader(loader: () => AnalyticsProvider): void {
  loadProvider = loader;
}

/** Tek kapı: false iken sağlayıcı modülü hiç require edilmez (uyumluluk §0). */
export function applyAnalyticsConsent(next: boolean): void {
  if (next === consented) return;
  consented = next;
  if (!next) {
    provider?.shutdown();
    provider = null;
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!consented || !loadProvider) return;
  provider ??= loadProvider();
  const safe: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED_PROPS) {
    const value = props[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
    }
  }
  provider.track(event, safe);
}

export function __resetAnalytics(): void {
  loadProvider = null;
  provider = null;
  consented = false;
}
```

Aynı adımda `src/store/meStore.ts` (T6) bu kapıya bağlanır: `load` ve `setConsents` sunucudan dönen `me`'yi yazdıktan **sonra** `applyAnalyticsConsent(me.consents?.analytics === true)` çağırır — rıza kaynağı tek yerdir (sunucu), istemci hafızası değil.

Sağlayıcı bu sürümde **tanımlanmaz** (no-op): `setProviderLoader` hiç çağrılmaz, Clarity/GA4 paketi bağımlılık olarak da eklenmez. Gerçek sağlayıcı geldiğinde tek satır — `setProviderLoader(() => require("./providers/clarity").create())` — ve bu satır rıza kapısının **içinde** kalır (`track` gövdesi), açılışta değil.

- [ ] **Step 3: O12 ekranının testini ve ekranı yaz**

```tsx
// frontend/mobile/app/account/__tests__/consent.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { api } from "../../../src/lib/api";

jest.mock("../../../src/lib/api", () => ({ api: { me: jest.fn(), updateConsents: jest.fn() } }));
const consents = { location: true, microphone: true, analytics: false,
  updatedAt: "2026-09-06T12:41:00Z", version: "1.0" };
const open = () => renderRouter(["account/consent", "account/legal/[doc]"],
  { initialUrl: "/account/consent" });

beforeEach(() => {
  jest.clearAllMocks();
  (api.me as jest.Mock).mockResolvedValue({ id: "u1", consents });
  (api.updateConsents as jest.Mock).mockResolvedValue({ id: "u1", consents });
});

it("üç anahtarı gösterir; analitik kapalı; Kaydet'e kadar sunucuya yazmaz", async () => {
  open();
  const analytics = await screen.findByLabelText("Kullanım verisi");
  expect(analytics.props.accessibilityState.checked).toBe(false);
  expect(screen.getByLabelText("Konum verimin işlenmesi")).toBeTruthy();
  expect(screen.getByLabelText("Mikrofon / sesli sohbet")).toBeTruthy();
  fireEvent(analytics, "valueChange", true);
  expect(api.updateConsents).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText("Kaydet"));
  await waitFor(() => expect(api.updateConsents)
    .toHaveBeenCalledWith({ location: true, microphone: true, analytics: true }));
});

it("'Aydınlatma metnini oku' KVKK okuyucusuna gider", async () => {
  const router = open();
  fireEvent.press(await screen.findByText("Aydınlatma metnini oku"));
  await waitFor(() => expect(router).toHavePathname("/account/legal/kvkk"));
});
```

`app/account/consent.tsx` (O12 metinleri aynen):
- Giriş: "Aşağıdaki işlemler için açık rızan gerekir. İstediğin zaman geri alabilirsin; geri alman geçmişe etki etmez."
- **Konum verimin işlenmesi** — "Orta nokta ve mekan arama · yalnız uygulama açıkken · ~1 km yuvarlanarak paylaşılır"
- **Mikrofon / sesli sohbet** — "Yalnız sen \"Katıl\" deyince · kaydedilmez"
- **Kullanım verisi** — "Anonim ürün analitiği (Clarity/GA4) · yurt dışına aktarım" (varsayılan kapalı)
- "Verildi: {tarih} · sürüm {version}" (`consents.updatedAt`, `consents.version`)
- "Konum rızanı kapatırsan buluşmalara adres yazarak katılırsın."
- Hayalet düğme "Aydınlatma metnini oku" → `/account/legal/kvkk`
- CTA "Kaydet" → `useMeStore.setConsents(local)` (tek PUT) → `router.back()`

Yerel durum ekranda tutulur, Kaydet'e kadar yazılmaz (O12'de CTA var); O8'deki tekil anahtar ise anında yazar (T6). İki yüzey aynı `setConsents`'i kullanır.

- [ ] **Step 4: Yeşile al** — Run: `MTEST analytics`, `MTEST account/__tests__/consent`, `MTSC`, `rtk pnpm i18n:check` → yeşil.

- [ ] **Step 5: Dosya listesi** — `src/lib/analytics.ts` (+test), `app/account/consent.tsx` (+test), `src/store/meStore.ts`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(consent): explicit consent screen and consent-gated analytics (R-M5, R-M15)`.

---

### Task 9: R-M6 — Hesabı sil (O15, O16, O17)

**Files:** Create `app/account/delete.tsx`, `app/account/deleted.tsx` · Modify `app/_layout.tsx` · Test `app/account/__tests__/delete.test.tsx`

- [ ] **Step 1: Başarısız testi yaz**

```tsx
// frontend/mobile/app/account/__tests__/delete.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { api } from "../../../src/lib/api";
import { useAuthStore } from "../../../src/store/authStore";

jest.mock("../../../src/lib/api", () => ({ api: { deleteMe: jest.fn(), me: jest.fn() } }));
const open = () => renderRouter(["index", "account/delete", "account/deleted"],
  { initialUrl: "/account/delete" });
const confirmWith = (text: string) => {
  fireEvent.press(screen.getByText("Hesabımı sil"));
  fireEvent.changeText(screen.getByLabelText("Onay metni"), text);
};
const confirmButton = () => screen.getByText("Hesabı kalıcı olarak sil");

beforeEach(() => { jest.clearAllMocks(); useAuthStore.setState({ token: "jwt" }); });

it("ne silinir / ne kalır listelerini gösterir; 'SİL' yazılmadan onay kapalıdır", () => {
  open();
  expect(screen.getByText("Silinecekler")).toBeTruthy();
  expect(screen.getByText("Kalacaklar")).toBeTruthy();
  expect(screen.getByText("Zorunlu yasal kayıtlar (en fazla 30 gün)")).toBeTruthy();
  confirmWith("sil");
  expect(confirmButton().props.accessibilityState.disabled).toBe(true);
  fireEvent.changeText(screen.getByLabelText("Onay metni"), "SİL");
  expect(confirmButton().props.accessibilityState.disabled).toBe(false);
});

it("onaylayınca DELETE /api/me çağrılır, oturum kapanır, O17'ye gidilir", async () => {
  (api.deleteMe as jest.Mock).mockResolvedValue(undefined);
  const router = open();
  confirmWith("SİL");
  fireEvent.press(confirmButton());
  await waitFor(() => expect(api.deleteMe).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(router).toHavePathname("/account/deleted"));
  expect(useAuthStore.getState().token).toBeNull();
});

it("silme başarısızsa oturum KAPANMAZ ve hata gösterilir", async () => {
  (api.deleteMe as jest.Mock).mockRejectedValue(new Error("500"));
  open();
  confirmWith("SİL");
  fireEvent.press(confirmButton());
  expect(await screen.findByText("Hesap silinemedi. Birazdan tekrar dene.")).toBeTruthy();
  expect(useAuthStore.getState().token).toBe("jwt");
});
```

Run: `MTEST account/__tests__/delete` → kırmızı.

- [ ] **Step 2: O15 + O16'yı yaz** — `app/account/delete.tsx`, O15 metinleri aynen: başlık "Hesabını silmek istediğine emin misin?" · "Bu işlem geri alınamaz. Silinen veriler 30 gün içinde yedeklerden de temizlenir." · **Silinecekler** kartı ["Google/Apple ile bağlı hesabın, adın ve e-postan", "Kurduğun buluşmalar ve davet linkleri", "Konum etiketlerin ve ulaşım tercihlerin", "Profil istatistiklerin"] · **Kalacaklar** kartı ["Arkadaşlarının kurduğu buluşmalardaki katılımın (adın \"eski katılımcı\" olur)", "Zorunlu yasal kayıtlar (en fazla 30 gün)"] · "Yalnız bir mola mı istiyorsun? Çıkış yapman yeterli, verilerin durur." + hayalet "Çıkış yap" · CTA `variant="danger"` "Hesabımı sil" → onay alt sayfası.

Onay alt sayfası (O16, aynı dosyada yerel durum; geri tuşu kapatır) metinleri aynen: "Son kez soruyoruz" · "Onaylamak için **SİL** yaz." · "Apple ile girdiysen Apple'daki bağlantı da kaldırılır." · "Vazgeç" / "Hesabı kalıcı olarak sil". Giriş alanı `accessibilityLabel="Onay metni"`, `autoCapitalize="characters"`.

```tsx
const CONFIRM_WORD = "SİL";
const canDelete = typed.trim().toLocaleUpperCase("tr-TR") === CONFIRM_WORD;

const remove = async () => {
  setBusy(true);
  try {
    await api.deleteMe();                    // Apple revoke sunucu tarafında (§2)
    await useAuthStore.getState().signOut();
    useMeStore.getState().clear();
    router.replace("/account/deleted");
  } catch {
    setError(t("delete.failed"));            // "Hesap silinemedi. Birazdan tekrar dene."
  } finally {
    setBusy(false);
  }
};
```

- [ ] **Step 3: O17'yi yaz** — `app/account/deleted.tsx`: "Hesabın silindi." · "Verilerin 30 gün içinde tamamen temizlenir. Bir gün ortada buluşmak istersen, kapı açık." · el yazısı "görüşürüz →" · CTA "Kapat" → `router.replace("/")`. Ekran auth muhafızının **dışındadır**: `app/_layout.tsx`'teki yönlendirme muhafızına `"/account/deleted"` istisnası eklenir (token yokken de açılabilir).

- [ ] **Step 4: Yeşile al ve uçtan uca dene** — Run: `MTEST account/__tests__/delete`, `MTSC` → yeşil. Dev build: test hesabıyla sil → kök ekrana düşmeli; aynı Apple/Google hesabıyla tekrar giriş **yeni** hesap açmalı (B-14 `deleted_at` davranışı).

- [ ] **Step 5: Dosya listesi** — `app/account/delete.tsx` (+test), `app/account/deleted.tsx`, `app/_layout.tsx`, `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(account): three-step account deletion (R-M6)`.

---

### Task 10: R-M7 — Bildir / engelle (O18, O19)

**Files:** Create `app/(sheets)/participant.tsx`, `src/lib/blocks.ts` · Modify `src/components/molecules/ParticipantRow.tsx` · Test `app/(sheets)/__tests__/participant.test.tsx`, `src/lib/__tests__/blocks.test.ts`, `src/components/molecules/__tests__/ParticipantRow.test.tsx`

- [ ] **Step 1: Başarısız testleri yaz**

```ts
// frontend/mobile/src/lib/__tests__/blocks.test.ts
import { voicePeers } from "../blocks";
const p = (id: string, blocked?: boolean) => ({ id, name: id, blocked }) as never;

it("engelli kişi ve kendisi sesli sohbet eşleşmesinden düşer", () => {
  expect(voicePeers([p("me"), p("a"), p("b", true)], "me").map((x) => x.id)).toEqual(["a"]);
});
```

```tsx
// frontend/mobile/app/(sheets)/__tests__/participant.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { api } from "../../../src/lib/api";

jest.mock("../../../src/lib/api", () => ({ api: { createReport: jest.fn(), addBlock: jest.fn() } }));
const open = () => renderRouter(["(sheets)/participant"], {
  initialUrl: "/(sheets)/participant?slug=x7k2m&participantId=p3&name=Kerem",
});

beforeEach(() => {
  jest.clearAllMocks();
  (api.addBlock as jest.Mock).mockResolvedValue({ id: "b1" });
  (api.createReport as jest.Mock).mockResolvedValue(undefined);
});

it("üç eylemi gösterir; sebep seçilmeden Gönder kapalı; sebeple POST /api/reports", async () => {
  open();
  for (const a of ["Bildir", "Engelle", "Sesli sohbette sustur"])
    expect(screen.getByText(a)).toBeTruthy();
  fireEvent.press(screen.getByText("Bildir"));
  expect(screen.getByText("Gönder").props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText("Sesli sohbette taciz"));
  fireEvent.press(screen.getByText("Gönder"));
  await waitFor(() => expect(api.createReport).toHaveBeenCalledWith({
    sessionSlug: "x7k2m", targetParticipantId: "p3", reason: "VOICE_HARASSMENT",
  }));
  expect(api.addBlock).toHaveBeenCalledWith({ participantId: "p3" });
});

it("Engelle tek başına POST /api/me/blocks çağırır", async () => {
  open();
  fireEvent.press(screen.getByText("Engelle"));
  await waitFor(() => expect(api.addBlock).toHaveBeenCalledWith({ participantId: "p3" }));
  expect(api.createReport).not.toHaveBeenCalled();
});
```

```tsx
// frontend/mobile/src/components/molecules/__tests__/ParticipantRow.test.tsx
it("engellenen satır kimlik ve konum göstermez", () => {
  render(<ParticipantRow participant={{ id: "p3", name: "Kerem", locationLabel: "Helmond", blocked: true }} />);
  expect(screen.getByText("Engellenen kişi")).toBeTruthy();
  expect(screen.queryByText("Kerem")).toBeNull();
  expect(screen.queryByText("Helmond")).toBeNull();
});
```

Run: `MTEST participant`, `MTEST blocks`, `MTEST ParticipantRow` → kırmızı.

- [ ] **Step 2: `blocks.ts`'i yaz**

```ts
// frontend/mobile/src/lib/blocks.ts
import type { ParticipantDto } from "@bumpinto/shared";

/** M-6 mesh'i yalnız bu listeye teklif gönderir: engelli çift aynı odaya alınmaz (§2). */
export function voicePeers(participants: ParticipantDto[], selfId: string): ParticipantDto[] {
  return participants.filter((p) => p.id !== selfId && p.blocked !== true);
}
```

- [ ] **Step 3: Alt sayfayı yaz** — `app/(sheets)/participant.tsx` iki adımlı: **menü** (O18) → **sebep** (O19). Menü satırları O18 metinleriyle: "Bildir / Rahatsız edici ad ya da davranış", "Engelle / Sesli sohbette duymazsın, seni göremez" (`tone="danger"`), "Sesli sohbette sustur / Yalnız senin için" (yerel sessize alma; sunucuya gitmez, M-6'da `voiceStore`'a bağlanır), altta "Vazgeç".

```ts
const REASONS: { key: ReportReason; label: string }[] = [
  { key: "OFFENSIVE_NAME", label: t("report.offensiveName") },     // "Rahatsız edici ad"
  { key: "VOICE_HARASSMENT", label: t("report.voiceHarassment") }, // "Sesli sohbette taciz"
  { key: "SPAM", label: t("report.spam") },                        // "Sahte / spam"
  { key: "OTHER", label: t("report.other") },                      // "Başka"
];
```

Not metni aynen: "Bildirim ekibimize gider; 24 saat içinde bakılır. {ad} bunu görmez." Gönder → `api.createReport({...})` **ve** `api.addBlock({ participantId })` (Apple 1.2: bildiren, bildirdiğini görmemeli); dönüşte oturumda yeşil şerit "Bildirildi · {ad} engellendi". Enum adlarını doğrula: `rtk grep -n "OFFENSIVE_NAME" frontend/shared/src/api-types.ts` — farklıysa codegen adları kullanılır, etiketler aynı kalır.

- [ ] **Step 4: Katılımcı satırını bağla** — `ParticipantRow.tsx`: `onLongPress` (kendisi hariç) → `router.push({ pathname: "/(sheets)/participant", params: { slug, participantId, name } })`, `delayLongPress={400}`, `accessibilityHint={t("report.longPressHint")}`. `blocked === true` ise satır içeriği gizler: gri monogram, ad yerine `t("report.blockedName")` = "Engellenen kişi", konum/ulaşım satırı çizilmez, `<Badge tone="neutral">Engellendi</Badge>`.

- [ ] **Step 5: Yeşile al** — Run: `MTEST participant`, `MTEST blocks`, `MTEST ParticipantRow`, `MTSC`, `rtk pnpm i18n:check` → yeşil.

- [ ] **Step 6: Dosya listesi** — `app/(sheets)/participant.tsx` (+test), `src/lib/blocks.ts` (+test), `src/components/molecules/ParticipantRow.tsx` (+test), `frontend/shared/src/i18n/locales/{tr,en,nl}.json`. Mesaj: `feat(safety): report and block participants (R-M7)`.

---

### Task 11: Mağaza varlıkları ve yayın kontrol listesi (kod değil)

**Files:** Create `docs/store/RELEASE-CHECKLIST.md`, `frontend/mobile/store/README.md`

- [ ] **Step 1: Varlık envanterini yaz** — `frontend/mobile/store/README.md`:

| Varlık | Ölçü / biçim | Yer |
|---|---|---|
| iOS uygulama ikonu | 1024×1024 PNG, saydamlık **yok** | `store/ios/icon-1024.png` |
| Play uygulama ikonu | 512×512 32-bit PNG | `store/android/icon-512.png` |
| Play feature graphic | 1024×500 PNG/JPG, metin güvenli alanda | `store/android/feature-1024x500.png` |
| iPhone 6.9" ekran görüntüleri | 1320×2868, 3–6 adet (en fazla 10) | `store/ios/6.9/01..06.png` |
| iPad 13" (iPad desteklenirse) | 2064×2752 | `store/ios/13/` |
| Android telefon ekran görüntüleri | 1080×2340, 2–8 adet | `store/android/phone/` |

Önerilen ekran görüntüsü sırası (ürün tezi: adalet, uzlaşma, ortak an — puan/rozet/aciliyet yok): O2 Giriş → P6 Lobi (presence) → P11 Mekanlar (yol çubuğu) → P14 Deste → P20 Karar → P25 Sesli sohbet.

- [ ] **Step 2: Yayın kontrol listesini yaz** — `docs/store/RELEASE-CHECKLIST.md`, uyumluluk §2'nin yürütülebilir hâli:

**A. App Store Connect**
- [ ] App Privacy: Location (precise), Contact Info (name, email), Identifiers (user id), User Content (görünen ad, oturum adı, ses — "not stored"), Usage Data (**yalnız** rıza açıksa) — hepsi "Linked to you", "Used for tracking = **No**".
- [ ] `PrivacyInfo.xcprivacy` derlemede (T2 Step 5); purpose string'ler cihazda O4/O7 metniyle (ekran görüntüsü); `ITSAppUsesNonExemptEncryption = false`.
- [ ] Age rating (2026 anketi); "sosyal medya yeteneği" → **Hayır**; hedef 13+.
- [ ] AB DSA tacir bilgisi (ad, adres, telefon, e-posta) — `support.ts` ile **aynı** değerler.
- [ ] Review notu + demo hesap (giriş duvarı) + davet linki senaryosu (`bumpinto.app/j/<slug>`).
- [ ] Sign in with Apple capability + Services ID; silmede `revoke` (B-14) doğrulandı.
- [ ] Support URL `bumpinto.app/support`, Privacy URL `bumpinto.app/privacy`.

**B. Google Play Console**
- [ ] Data safety formu uyumluluk §0 tablosuyla birebir; "Usage data" **opsiyonel** işaretli.
- [ ] Hesap silme URL'si `https://bumpinto.app/account/delete` (uygulama kurulu değilken çalışır — T2 testi app'in yakalamadığını garanti eder); gizlilik politikası URL'si; destek e-postası.
- [ ] IARC anketi; hedef kitle 13+ (Families **değil**).
- [ ] Target API 36; 16 KB page size — WebRTC native modülü (M-6 açılınca yeniden koş).
- [ ] Yeni bireysel hesapsa **kapalı test: 12 tester × 14 gün** — M-5 bitmeden başlatıldı mı? (kritik yol riski, gereksinim dok. §6/3)
- [ ] Feature graphic 1024×500, ikon 512×512, 2–8 ekran görüntüsü.

**C. Ortak metin ve kapılar**
- [ ] Alt başlık 30 (Apple) / kısa açıklama 80 (Play) / açıklama 4000 / anahtar kelime 100.
- [ ] Tacir telefonu ve adresi kesinleşti; `support.ts` ve `kvkk.ts` içindeki `[tacir adresi — mağazada görünür]` **gerçek değerle** değiştirildi. **Yayın kapısı**: işaretlenmeden `store/` varlıkları yüklenmez.
- [ ] `bumpinto.app/{privacy,terms,kvkk,attributions,support,account/delete}` anonim `200` (Ön koşul 2 komutu).

- [ ] **Step 3: Dosya listesi** — `docs/store/RELEASE-CHECKLIST.md`, `frontend/mobile/store/README.md`. Mesaj: `docs(store): release checklist and store asset inventory`.

---

### Task 12: Gerçek istemci testleri (izin akışı + derin link) ve INDEX kaydı

**Files:** Create `src/lib/__tests__/native-contract.test.ts`, `app/__tests__/deeplink.test.tsx`, `.maestro/store-compliance.yaml` · Modify `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Yerel modül sözleşme testi (mock'suz)** — untested-seam kuralı: izin çağrılarımızın **gerçek** modül yüzeyine dayandığını doğrula.

```ts
// frontend/mobile/src/lib/__tests__/native-contract.test.ts
jest.unmock("expo-location");
jest.unmock("expo-audio");
jest.unmock("expo-apple-authentication");

import * as AppleAuthentication from "expo-apple-authentication";
import * as Audio from "expo-audio";
import * as Location from "expo-location";
import * as permissions from "../permissions";

it("expo-location, expo-audio ve expo-apple-authentication yüzeyleri beklediğimiz gibi", () => {
  expect(typeof Location.getForegroundPermissionsAsync).toBe("function");
  expect(typeof Location.requestForegroundPermissionsAsync).toBe("function");
  expect(typeof Audio.getRecordingPermissionsAsync).toBe("function");
  expect(typeof Audio.requestRecordingPermissionsAsync).toBe("function");
  expect(typeof AppleAuthentication.isAvailableAsync).toBe("function");
  expect(typeof AppleAuthentication.signInAsync).toBe("function");
  expect(AppleAuthentication.AppleAuthenticationScope.FULL_NAME).toBeDefined();
});

it("arka plan konum API'sini kullanmadığımız doğrulanır", () => {
  expect(JSON.stringify(Object.keys(permissions))).not.toContain("Background");
});
```

Fonksiyon adı Expo sürümüyle değişirse test burada kırılır; düzeltme `permissions.ts`'te olur, ekranlar değişmez.

- [ ] **Step 2: Derin link yönlendirici testi (gerçek router)**

```tsx
// frontend/mobile/app/__tests__/deeplink.test.tsx
import { screen, waitFor } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";

it("https://bumpinto.app/j/x7k2m katılma rotasına düşer", async () => {
  const router = renderRouter(["index", "j/[slug]"], { initialUrl: "https://bumpinto.app/j/x7k2m" });
  await waitFor(() => expect(router).toHavePathname("/j/x7k2m"));
});

it("yasal rotalar oturum açılmadan açılabilir (anonim erişim)", async () => {
  const router = renderRouter(["index", "account/legal/[doc]"],
    { initialUrl: "/account/legal/terms" });
  await waitFor(() => expect(router).toHavePathname("/account/legal/terms"));
  expect(await screen.findByText("Kullanım şartları")).toBeTruthy();
});
```

- [ ] **Step 3: Cihaz akışı (Maestro)**

```yaml
# .maestro/store-compliance.yaml
appId: app.bumpinto.mobile
---
- launchApp: { clearState: true, permissions: { all: unset } }
- assertVisible: "Google ile devam et"
- assertVisible: "Apple ile devam et"                # yalnız iOS koşusunda
- assertNotVisible: "konumunuzu kullanmasına izin"   # açılışta izin YOK
- tapOn: "Apple ile devam et"
- tapOn: "Yeni buluşma"
- tapOn: "Mevcut konumumu kullan"
- assertVisible: "Konumun, orta noktayı bulmak için" # O3 önce
- tapOn: "Devam et"
- assertVisible: "İzin Verme"                        # sistem diyaloğu O3'ten SONRA
- tapOn: "İzin Verme"
- assertVisible: "Konum izni kapalı"                 # O6 kurtarma
- assertVisible: "Ayarlar'a git"
```

Koşum: `maestro test .maestro/store-compliance.yaml` (dev build kurulu cihazda; CI'da değil). Maestro kurulu değilse görev, dosyanın işlenmesi ve akışın elde bir kez koşulmasıyla kapanır.

- [ ] **Step 4: Tam kapı** — hepsi yeşil olmalı:

```sh
rtk pnpm --filter @bumpinto/mobile test
rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit
rtk pnpm test:web
rtk pnpm i18n:check
rtk grep -rnE "TODO|FIXME|TBD" frontend/mobile/src frontend/mobile/app frontend/mobile/plugins
```

Son komutun çıktısı **boş** olmalı. `[tacir adresi — mağazada görünür]` tek bilinçli istisnadır (`support.ts`, `kvkk.ts`); T11 kontrol listesinde yayın kapısı olarak izlenir.

- [ ] **Step 5: INDEX kaydı** — `docs/superpowers/plans/INDEX.md` → `## M — Mobil` plan tablosuna:

```
| M-5 | **Mağaza / yasal paketi** — Apple girişi, izin ön-ekranları + red kurtarma, Hesap ve veriler, yasal okuyucular, açık rıza, rıza kapılı analitik, hesabı sil, bildir/engelle, `app.config.ts` + PrivacyInfo | `2026-09-06-plan39-mobile-store-compliance.md` | Plan 39 | ready | **B-14**, **W-14**, **M-4** | — | 12 görev. R-M1, R-M2, R-M3–R-M6, R-M7, R-M15, R-M16. Purpose string'ler O4/O7'den aynen; hesap silme URL'si `bumpinto.app/account/delete` (W-14). Play kapalı testi (12 tester × 14 gün) bu plan bitmeden **başlatılmalı** |
```

"Sıradakiler" satırını `M-6` olacak şekilde güncelle. Spec dışı görev tablosuna ekle:

```
| K-M4 | Yasal okuyucuların EN/NL uygulama içi çevirisi (v1 TR; EN/NL web'e yönlendiriyor) | açık | M-7 | Hukuk onayı dil başına ayrı; `src/content/legal/{en,nl}/` aynı `LegalDoc` tipiyle |
| K-M5 | `extra.exportEnabled` bayrağını `true` yap, "Verilerimi indir" satırını aç | açık | B-15 sonrası | `GET /api/me/export` B-15'te (R-B6); istemci tarafı M-5 T6'da yazıldı, yalnız bayrak çevrilir |
| K-M6 | Play kapalı test kanalını başlat (12 tester × 14 gün) + tacir bilgisini kesinleştir | açık | M-5 | Kritik yol riski (gereksinim dok. §6/3); `[tacir adresi]` yayın kapısı |
| K-M7 | Analitik sağlayıcı seçimi (Clarity/GA4) ve `setProviderLoader` bağlanması | aday | M-7 | `analytics.ts` kapısı hazır; rıza false iken modül require edilmez (uyumluluk §0) |
```

`## Çapraz iz kilitleri` bölümüne madde ekle:

```
7. **B-14 → W-14 → M-5.** M-5'in yasal okuyucularındaki "Tarayıcıda aç" ve Play hesap silme URL'si
   W-14 rotalarına bağlıdır; W-14 yayına çıkmadan mağaza formu doldurulamaz. `POST /api/reports`,
   `PUT /api/me/consents`, `DELETE /api/me` B-14'ten gelir — ad uyuşmazlığında M-5 durur.
```

- [ ] **Step 6: Doğrulama ve dosya listesi** — Run: `rtk grep -c "M-5" docs/superpowers/plans/INDEX.md` → ≥2 (plan satırı + kilit maddesi). Dosyalar: `src/lib/__tests__/native-contract.test.ts`, `app/__tests__/deeplink.test.tsx`, `.maestro/store-compliance.yaml`, `docs/superpowers/plans/INDEX.md`. Mesaj: `test(store): native permission and deep-link contract tests; index M-5`.
