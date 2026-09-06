# Mobil Yayın Hattı (I-3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** M-4/M-5'in ürettiği Expo uygulamasını **tekrarlanabilir biçimde** mağazaya sokmak: EAS profilleri ve
sürümleme, imzalama gizlerinin tek yerde tanımı, `frontend/mobile` yoluna filtreli GitHub Actions CI'ı,
etiketle tetiklenen EAS build'i, emülatörde koşan Maestro akışları, TestFlight + Play internal `eas submit`,
mağaza ekran görüntüsü üretimi, Android 16 KB / target API 36 kapısı ve tek sayfalık yayın runbook'u.

**Architecture:** Üç katman, birbirine yalnız **artefakt kimliğiyle** bağlı. (1) **Yapılandırma** —
`frontend/mobile/eas.json` + `app.config.ts`; sürüm tek kaynaktan (`package.json` `version`) okunur,
build numarasını EAS uzaktan artırır (`appVersionSource: "remote"`). (2) **Doğrulama** — `mobile-ci.yml`
hiçbir bulut kaynağı harcamaz: pnpm + jest-expo + `tsc` + `expo lint` + `expo config` üzerinden statik
mağaza beyanı denetimi + prebuild sonrası SDK/`.so` kapısı. (3) **Yayın** — `mobile-build.yml` (PR
etiketinde `preview`, `mobile-v*` etiketinde `production`), `mobile-e2e.yml` (yalnız başarılı preview
build'in APK'sını tüketir, yeni build başlatmaz), `mobile-submit.yml` (korumalı `mobile-release`
ortamı; onay kullanıcıda). Kimlik bilgileri **EAS'ta** durur (`eas credentials`); GitHub'ın bildiği tek
sır `EXPO_TOKEN`'dır. `EXPO_PUBLIC_*` değerleri sır değildir (istemciye gömülür) → GitHub **variables**.

**Tech Stack:** EAS CLI ≥ 12, Expo SDK 54 (CNG), pnpm 11 + Node 22, GitHub Actions
(`actions/setup-node@v4`, `pnpm/action-setup@v4`, `actions/setup-java@v4`,
`reactivecircus/android-emulator-runner@v2`), Maestro CLI, `expo-build-properties`.
Test: jest-expo (saf Node yardımcıları + `app.config` iddiaları), `js-yaml` CLI ile workflow şema kapısı.

**Spec:** `docs/superpowers/specs/2026-09-06-v3-requirements.md` §4 (paket sırası: M-4 → M-5 → I-3;
"Play kapalı test M-5 bitmeden başlatılmalı") · §5/3 (Play hesabı bireysel/kurumsal, tacir bilgisi) ·
`docs/superpowers/specs/2026-09-06-mobile-store-compliance.md` **§2** (App Store Connect + Play Console
form işleri, mağaza görselleri, target API 36, 16 KB page size, kapalı test 12 tester × 14 gün).
Bu plan **kod davranışı** üretmez; M-5 T11'in kontrol listesini **yürütülebilir** hâle getirir.

**INDEX kimliği:** `I-3` · Dosya: `2026-09-06-plan44-infra-mobile-release.md` · Bağımlılık: **M-4**, **M-5**, `I-1:T1–T3`.

---

## UI Kaynağı: Claude Design (BAĞLAYICI — yalnız T7 için)

Proje `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`. Mağaza ekran görüntülerinin **içeriği** artboard'lardan
gelir; bu plan yalnız otomasyonu yazar, yeni ekran tasarlamaz.

| Sıra | Artboard | Dosya | Vaat (mağaza altyazısı) |
|---|---|---|---|
| 1 | **O2** Giriş | `Mobil Onboarding, İzinler ve Yasal.dc.html` | "Hesap açmadan, davetle katıl" |
| 2 | **P6** Lobi | `Mobil Ekranlar v3.dc.html` | "Kim geldi, kim yolda" |
| 3 | **P11** Mekanlar | `Mobil Ekranlar v3.dc.html` | "Herkese eşit mesafe" |
| 4 | **P14** Deste | `Mobil Ekranlar v3.dc.html` | "Beğen, tartışma çıkmasın" |
| 5 | **P20** Karar | `Mobil Ekranlar v3.dc.html` | "Ortak nokta bulundu" |
| 6 | **P25** Sesli sohbet | `Mobil Ekranlar v3.dc.html` | "Yol boyu konuşun" (M-6 `done` değilse **atlanır**) |

Ürün tezi gereği ekran görüntülerinde puan/rozet/aciliyet dili **yoktur** (M-5 T11 Step 1 ile aynı sıra).

---

## Ön koşul (BAĞLAYICI)

1. **M-4 `done`** — Expo iskeleti ve EAS profil taslağı yerinde:

```sh
for f in app.config.ts eas.json package.json .maestro/02-deeplink.yaml \
  .maestro/03-location-permission.yaml; do \
  test -f "frontend/mobile/$f" && echo "OK  $f" || echo "EKSİK $f"; done
```

Bir satır `EKSİK` ise başlama; INDEX'te I-3 `blocked`.

2. **M-5 `done`** — mağaza beyanları ve kontrol listesi yerinde:

```sh
test -f docs/store/RELEASE-CHECKLIST.md && echo OK || echo "EKSİK checklist"
test -f frontend/mobile/plugins/withPrivacyInfo.js && echo OK || echo "EKSİK plugin"
rtk grep -c "targetSdkVersion" frontend/mobile/app.config.ts
```

Üçüncü komut `0` dönerse M-5 T2 uygulanmamıştır → dur.

3. **I-1:T1–T3 kalıbı** — `.github/workflows/{backend,frontend}.yml` mevcutsa **ad ve kalıp** oradan
devralınır (`pnpm/action-setup@v4` + `actions/setup-node@v4 (node-version: 22, cache: pnpm)` +
`pnpm install --frozen-lockfile`, `paths:` filtresi, GHCR için `secrets.GITHUB_TOKEN`).
`.github/workflows/` **henüz yoksa** bu plan onu yaratır ve I-1'in kalıbına **birebir uyar** —
`backend.yml`/`frontend.yml`'e dokunmaz, yeni ad uydurmaz.

```sh
ls .github/workflows/ 2>/dev/null || echo "workflows dizini yok — bu plan yaratir"
```

4. **`app.config.ts` biçimi.** M-5 T2 dosyayı **fonksiyon** biçimine çevirir
(`({ config }) => ({ expo: { … } })`). Bu planın testleri bu biçime yazılmıştır. `export default config`
(düz nesne) hâlâ duruyorsa M-5 bitmemiştir → dur.

---

## Bağlayıcı kurallar

- **Git yazma işlemi YOK.** Her görev **dosya listesi** ile biter; commit'i kullanıcı yapar.
- **Ücretli / yıkıcı / hesap açan hiçbir komut ajan tarafından çalıştırılmaz.** `eas build`, `eas submit`,
  `eas credentials`, `eas init`, App Store Connect ve Play Console işleri **KULLANICI ÇALIŞTIRIR**
  etiketiyle sunulur; ajan yalnız dosyayı yazar ve `--help`/`--dry-run` sınıfı doğrulama yapar.
- **Sır DEĞERİ hiçbir dosyaya yazılmaz.** Workflow'lar yalnız sır **adını** referanslar; `.env`/`env.sh` okunmaz.
- Kısayollar (repo kökünden, Node 22 PATH): `MTEST` = `rtk pnpm --filter @bumpinto/mobile test` ·
  `MTSC` = `rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit` ·
  `YAMLCHK <dosya>` = `rtk pnpm dlx js-yaml@4 <dosya> > /dev/null && echo YAML-OK`.
- Her görev: önce test/kapı (kırmızı), sonra minimal dosya, sonra `MTEST` + `MTSC` yeşil.
- Workflow ekleme dışında **uygulama kodu değişmez**; `app.config.ts` ve `package.json`'a yalnız bu planın
  adı geçen alanları eklenir (M-4/M-5'in alanları korunur, yeniden yazılmaz).
- Yorumlar kısa, Türkçe; kod/kimlik İngilizce. Yeni dosya yalnız aşağıdaki haritada olanlar.

---

## Dosya haritası

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/mobile/eas.json` | T1 | development / preview / production + submit profilleri |
| `frontend/mobile/app.config.ts`, `package.json`, `.env.example` | T1 | sürüm tek kaynak, `runtimeVersion`, `EAS_PROJECT_ID` |
| `frontend/mobile/src/lib/__tests__/easConfig.test.ts` | T1 | profil ve sürüm iddiaları |
| `docs/CI-SECRETS-MOBILE.md` | T2 | sır/variable adları + kullanıcı adımları |
| `.github/workflows/mobile-ci.yml` | T3, T8 | test + tip + lint + config denetimi + native kapı |
| `frontend/mobile/scripts/check-android-sdk.mjs` (+ `sdkAssert.mjs`, testi) | T8 | `compileSdk`/`targetSdk` = 36 iddiası |
| `.github/workflows/mobile-build.yml` | T4 | PR etiketinde preview, `mobile-v*` etiketinde production |
| `.github/workflows/mobile-e2e.yml` | T5 | emülatör + Maestro (`katıl → deste → karar`) |
| `frontend/mobile/.maestro/ci/{01-join-deck-decide,04-store-shots}.yaml`, `.maestro/ci/README.md` | T5, T7 | CI akışları ve ekran görüntüsü akışı |
| `.github/workflows/mobile-submit.yml` | T6 | TestFlight + Play internal (korumalı ortam) |
| `frontend/mobile/scripts/{pngSize.mjs,store-shots.mjs}` (+ testi) | T7 | PNG ölçü doğrulaması + varlık toplama |
| `docs/store/assets/README.md` | T7 | ikon / feature graphic kaynak dosyaları |
| `docs/RELEASE-MOBILE.md` | T9 | adım adım yayın runbook'u |
| `docs/store/RELEASE-CHECKLIST.md`, `docs/superpowers/plans/INDEX.md` | T9 | otomasyon kancaları + iz kaydı |

---

## Kapsam DIŞI (bu planda yapılmaz, tartışılmaz)

- **EAS Update / OTA yayını** — `channel` alanları şimdiden yazılır, `eas update` kurulmaz (ayrı karar:
  mağaza incelemesi olmadan JS değiştirmek uyumluluk riski taşır).
- **Fastlane / `match` / el yapımı imzalama** — imzalama EAS-managed'dır (T2 gerekçesi).
- **iOS Maestro CI** — macOS runner dakikası pahalı; simülatör akışı runbook'ta **elle** koşar (T5 gerekçesi).
- **Sentry / crash raporlama, mağaza analitiği** — sonraki iz.
- **Backend/K8s deploy** — I-1 ve I-2'nin işi; bu plan `deploy/` altına dokunmaz.
- **Mağaza metinlerinin yazımı** (açıklama, anahtar kelime) — M-5 T11 kontrol listesinde, içerik kullanıcıda.

---

### Task 1: EAS profilleri ve sürümleme

**Files:**
- Modify: `frontend/mobile/eas.json`, `frontend/mobile/app.config.ts`, `frontend/mobile/package.json`, `frontend/mobile/.env.example`
- Test: `frontend/mobile/src/lib/__tests__/easConfig.test.ts`

**Karar (bağlayıcı):** M-4 T1b `preprod` adlı bir profil yazdı. Bu plan onu **`preview`** adıyla değiştirir
(değerleri korunur: `EXPO_PUBLIC_API_URL = https://preprod.bumpinto.app`). Gerekçe: `eas submit`'in Play
`internal` track'i ve PR etiketi akışı tek bir "iç dağıtım" profiline bakar; iki ad = iki artefakt hattı.
`preprod` adı başka dosyada geçmez (`rtk grep -rn "preprod" frontend/mobile` ile doğrulanır).

- [ ] **Step 1: Başarısız testi yaz**

```ts
// frontend/mobile/src/lib/__tests__/easConfig.test.ts
import eas from "../../../eas.json";
import pkg from "../../../package.json";
import config from "../../../app.config";

const expo = config({ config: { name: "BumpInto", slug: "bumpinto" } } as never).expo!;

describe("eas.json — profiller", () => {
  it("üç profil, uzak sürüm kaynağı, `preprod` tasfiye", () => {
    expect(Object.keys(eas.build)).toEqual(
      expect.arrayContaining(["development", "preview", "production"]),
    );
    expect(eas.cli.appVersionSource).toBe("remote");
    expect(eas.build).not.toHaveProperty("preprod");
  });

  it("development dev-client + internal, preview APK, production AAB üretir", () => {
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.development.distribution).toBe("internal");
    expect(eas.build.preview.android.buildType).toBe("apk");
    expect(eas.build.production.android.buildType).toBe("app-bundle");
    expect(eas.build.production.autoIncrement).toBe(true);
  });

  it("her profil kendi API adresini ve profil adlı kanalı taşır", () => {
    for (const name of ["development", "preview", "production"] as const) {
      expect(eas.build[name].env.EXPO_PUBLIC_API_URL).toMatch(/^https?:\/\//);
      expect(eas.build[name].channel).toBe(name);
    }
    expect(eas.build.production.env.EXPO_PUBLIC_API_URL).toBe("https://bumpinto.app");
  });

  it("submit profilleri TestFlight ve Play internal'a bakar", () => {
    expect(eas.submit.production.android.track).toBe("internal");
    expect(eas.submit.production.ios.ascAppId).toBe("$ASC_APP_ID");
    expect(eas.submit.preview.android.track).toBe("internal");
  });
});

describe("app.config — sürümleme", () => {
  it("sürüm package.json'dan, runtimeVersion appVersion, proje kimliği env'den", () => {
    expect(expo.version).toBe(pkg.version);
    expect(expo.runtimeVersion).toEqual({ policy: "appVersion" });
    expect(expo.extra!.eas).toEqual({ projectId: process.env.EAS_PROJECT_ID });
  });
});
```

Run: `MTEST easConfig` → kırmızı (`preprod` duruyor, `runtimeVersion` yok).

- [ ] **Step 2: `frontend/mobile/eas.json`'u tamamla**

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote", "requireCommit": true },
  "build": {
    "base": {
      "node": "22.11.0",
      "env": {
        "EXPO_PUBLIC_WEB_BASE": "https://bumpinto.app",
        "EXPO_NO_TELEMETRY": "1"
      }
    },
    "development": {
      "extends": "base",
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true },
      "env": { "EXPO_PUBLIC_API_URL": "http://localhost:8060" }
    },
    "preview": {
      "extends": "base",
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_API_URL": "https://preprod.bumpinto.app" }
    },
    "production": {
      "extends": "base",
      "channel": "production",
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "env": { "EXPO_PUBLIC_API_URL": "https://bumpinto.app" }
    }
  },
  "submit": {
    "preview": {
      "android": { "track": "internal", "releaseStatus": "draft" }
    },
    "production": {
      "ios": { "ascAppId": "$ASC_APP_ID", "appleTeamId": "$APPLE_TEAM_ID" },
      "android": { "track": "internal", "releaseStatus": "draft", "changesNotSentForReview": false }
    }
  }
}
```

Notlar (JSON'a girmez): `requireCommit: true` → kirli ağaçla build alınamaz (artefakt ↔ commit izi).
`ios.simulator: true` yalnız `development`'ta (Maestro iOS akışı elle simülatörde koşar — T5 gerekçesi).
`$ASC_APP_ID` / `$APPLE_TEAM_ID` EAS'ın ortam değişkeni ikamesidir; değerler `eas env`'den gelir.
**Gizli anahtarlar** (`GOOGLE_MAPS_*`) `env` bloğuna **yazılmaz** — EAS project secret'tır (T2 §2).

- [ ] **Step 3: `app.config.ts` — sürüm, runtimeVersion, proje kimliği**

M-5'in bıraktığı fonksiyon gövdesine **yalnız** şu satırlar eklenir; mevcut `ios`/`android`/`plugins`
blokları aynen kalır.

```ts
import pkg from "./package.json";

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;
// EAS sunucusunda proje kimliği zorunlu; yerel `expo start` için gerekmez.
if (process.env.EAS_BUILD === "true" && !EAS_PROJECT_ID) {
  throw new Error("EAS_PROJECT_ID tanımsız — docs/CI-SECRETS-MOBILE.md §1'e bak.");
}

// ... export edilen expo nesnesinin içine:
  version: pkg.version,
  runtimeVersion: { policy: "appVersion" },
  owner: process.env.EAS_OWNER ?? "bumpinto",
  updates: { url: `https://u.expo.dev/${EAS_PROJECT_ID ?? ""}` },
  extra: {
    ...extra,                       // M-4/M-5'in extra alanları korunur
    eas: { projectId: EAS_PROJECT_ID },
  },
```

`version` artık `app.config.ts`'te sabit **değildir**; M-4'ün `version: "0.1.0"` satırı silinir ve aynı
değer `frontend/mobile/package.json`'a taşınır (`"version": "0.1.0"`). Sürüm yükseltme tek yerde:
`package.json`. `buildNumber`/`versionCode` **yazılmaz** — `appVersionSource: "remote"` + `autoIncrement`
onları EAS'ta tutar.

`tsconfig.json`'da `resolveJsonModule` M-4'te açıktı; `import pkg from "./package.json"` bu sayede derlenir.

- [ ] **Step 4: `.env.example`'a iki satır ekle** (M-4'ün altı satırı korunur)

```
EAS_PROJECT_ID=
EAS_OWNER=bumpinto
```

- [ ] **Step 5: Doğrula** — Run:

```sh
rtk pnpm --filter @bumpinto/mobile test easConfig
rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit
rtk grep -rn "preprod" frontend/mobile --include=*.ts --include=*.json --include=*.md
```

Expected: ilk iki komut yeşil; üçüncüsü **hiçbir satır** dönmemeli (profil adı tekilleşti).

- [ ] **Step 6: KULLANICI ÇALIŞTIRIR — EAS projesini bağla** (ücretsiz, ama hesap açar ve dosya yazar)

```sh
cd frontend/mobile
rtk pnpm dlx eas-cli@latest login
rtk pnpm dlx eas-cli@latest init --id            # mevcut projeyi bağlar ya da yeni yaratır
rtk pnpm dlx eas-cli@latest project:info         # basılan ID = EAS_PROJECT_ID
```

Çıkan UUID `.env` (yerel, commit edilmez) ve GitHub **variable** `EAS_PROJECT_ID` olarak girilir (T2).

- [ ] **Step 7: Dosya listesi** — `frontend/mobile/{eas.json,app.config.ts,package.json,.env.example}`,
`frontend/mobile/src/lib/__tests__/easConfig.test.ts`.
Mesaj: `chore(mobile): eas profilleri (development/preview/production) + surum tek kaynak`.

---

### Task 2: İmzalama ve gizler

**Files:**
- Create: `docs/CI-SECRETS-MOBILE.md`

Bu görev **kod üretmez**; adları sabitler ve kullanıcının yapacağı işi sıraya koyar. Ad uyuşmazlığı
T3–T6'daki workflow'ları sessizce kırar, bu yüzden adlar buradan okunur.

**Karar (bağlayıcı): imzalama EAS-managed'dır.** Gerekçe: (a) Apple Distribution sertifikası ve
provisioning profile'ı EAS üretir/yeniler — sertifika süresi dolduğunda CI kendiliğinden düzelir;
(b) Android upload key EAS'ta durur, **app signing key Google'dadır** (Play App Signing), yani anahtar
kaybı yayını öldürmez; (c) GitHub'ın taşıdığı sır sayısı **bire** iner (`EXPO_TOKEN`), sızıntı yüzeyi küçülür.
Fastlane `match` / el yapımı `.p12` yolu **kapsam dışıdır**.

- [ ] **Step 1: Belgeyi yaz** — `docs/CI-SECRETS-MOBILE.md`

````md
# Mobil CI — sır ve değişken adları (I-3)

Değer **yazılmaz**; bu dosya yalnız adları ve kimin girdiğini sabitler.
Workflow'lar bu adlara birebir bakar: ad değişirse `mobile-build`/`mobile-submit` sessizce atlanır.

## 1. GitHub → Settings → Secrets and variables → Actions

### Secrets (gizli)

| Ad | Nedir | Nereden |
|---|---|---|
| `EXPO_TOKEN` | EAS robot access token (build + submit yetkisi) | expo.dev → Account settings → Access tokens |
| `E2E_HOST_TOKEN` | Preprod'da e2e oturumu açan Bearer token | `POST /api/auth/google` yanıtındaki `token` (preprod test hesabı) |

### Variables (gizli değil — istemciye zaten gömülür)

| Ad | Örnek | Kullanım |
|---|---|---|
| `EAS_PROJECT_ID` | `eas project:info` çıktısı (UUID) | `app.config.ts` → `extra.eas.projectId` |
| `EAS_OWNER` | `bumpinto` | EAS hesap/organizasyon adı |
| `E2E_API_BASE` | `https://preprod.bumpinto.app` | Maestro oturumunu kuran adım |

`EXPO_PUBLIC_API_URL` ve `EXPO_PUBLIC_WEB_BASE` **GitHub'a girilmez** — `eas.json` profillerinde sabittir.

## 2. EAS project secrets (expo.dev → Project → Secrets) — KULLANICI ÇALIŞTIRIR

Bunlar build makinesinde gerekir, GitHub'ın görmesine gerek yoktur:

| Ad | Nedir |
|---|---|
| `GOOGLE_MAPS_IOS_KEY` | iOS Maps SDK anahtarı (bundle id kısıtlı: `app.bumpinto.mobile`) |
| `GOOGLE_MAPS_ANDROID_KEY` | Android Maps SDK anahtarı (paket + SHA-1 kısıtlı) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sign-In web client id |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google Sign-In iOS client id |
| `ASC_APP_ID` | App Store Connect uygulama numarası (`eas.json` `$ASC_APP_ID`) |
| `APPLE_TEAM_ID` | Apple Developer takım kimliği (`eas.json` `$APPLE_TEAM_ID`) |

```sh
cd frontend/mobile
rtk pnpm dlx eas-cli@latest env:create --scope project --name GOOGLE_MAPS_ANDROID_KEY --type secret
```

## 3. Apple — KULLANICI ÇALIŞTIRIR (ücretli hesap gerektirir)

1. Apple Developer Program üyeliği aktif (99 USD/yıl); App Store Connect'te `app.bumpinto.mobile`
   kaydı açık (DSA tacir bilgisi ve Age rating anketi bu kayıtta doldurulur — uyumluluk §2).
2. **App Store Connect API key** (Users and Access → Integrations, rol **App Manager**): `.p8`
   **bir kez** iner, tekrar indirilemez. EAS'a ver (dosya EAS'ta şifreli durur, GitHub'a girmez):

```sh
cd frontend/mobile
rtk pnpm dlx eas-cli@latest credentials --platform ios
# > production > App Store Connect API Key > Set up a new key > .p8 yolunu ver
```

3. **Distribution sertifikası ve provisioning profile EAS-managed'dır**: ilk
   `eas build --platform ios --profile production` koşusunda "Generate new" seçilir; elle `.p12` yüklenmez.
4. Sign in with Apple capability + Services ID **açık olmalı** (M-5 T5 uygular, mağaza tarafını
   kullanıcı açar); kapalıysa build geçer ama inceleme reddeder.

## 4. Android — KULLANICI ÇALIŞTIRIR (ücretli hesap gerektirir)

1. Play Console geliştirici hesabı (25 USD tek sefer). **Bireysel hesapsa** kapalı test
   **12 tester × 14 gün** zorunludur ve M-5 bitmeden başlatılır (uyumluluk §2, spec §6/3).
2. **Upload key EAS-managed**: ilk production build'inde EAS keystore üretir. Yedeğini al ve
   **Google Play service account**'ı (Play Console → Setup → API access, rol *Release manager*) ver:

```sh
cd frontend/mobile
rtk pnpm dlx eas-cli@latest credentials --platform android
# > production > Download keystore
# > production > Google Service Account > ... for Play Store submissions
```

3. **Play App Signing**: ilk AAB yüklenirken "Use Google-generated key" seçilir. Bundan sonra upload
   key kaybı kurtarılabilirdir (Play'e yeni upload key kaydedilir); app signing key Google'da kalır.
   Service account JSON'u repoya **konmaz**, GitHub sırrı olarak da girilmez.

## 5. Acil durum yolu (EAS dışı) — normalde kullanılmaz

EAS erişilemezse `eas submit --local` / elle yükleme için şu adlar o gün geçici girilir ve iş bitince
**silinir**: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64`, `ANDROID_SERVICE_ACCOUNT_JSON_BASE64`.
Runbook §8 bunu yalnız arıza senaryosu olarak anar.
````

- [ ] **Step 2: Doğrula** — Run:

```sh
rtk grep -c "EXPO_TOKEN" docs/CI-SECRETS-MOBILE.md
rtk grep -rnE "(BEGIN PRIVATE KEY|ghp_|-----BEGIN)" docs/CI-SECRETS-MOBILE.md
```

Expected: birincisi ≥1; ikincisi **boş** (belgeye sır değeri sızmadı).

- [ ] **Step 3: KULLANICI ÇALIŞTIRIR — sırları gir**

```sh
rtk gh secret set EXPO_TOKEN
rtk gh variable set EAS_PROJECT_ID
rtk gh variable set EAS_OWNER --body bumpinto
rtk gh variable set E2E_API_BASE --body https://preprod.bumpinto.app
```

- [ ] **Step 4: Dosya listesi** — `docs/CI-SECRETS-MOBILE.md`.
Mesaj: `docs(ci): mobil imzalama ve gizler — ad sozlesmesi`.

---

### Task 3: `mobile-ci.yml` — test / tip / lint kapısı

**Files:**
- Create: `.github/workflows/mobile-ci.yml`, `.github/actions/setup-mobile/action.yml`, `frontend/mobile/eslint.config.js`
- Modify: `frontend/mobile/package.json` (`lint` script + eslint devDeps)

- [ ] **Step 1: `lint` script'i ve bağımlılıkları ekle**

```sh
cd frontend/mobile
rtk pnpm add -D eslint@^9 eslint-config-expo@^9
```

`package.json` scripts (M-4'ün `start`/`prebuild`/`test`/`typecheck` satırları korunur):
`"lint": "expo lint"`. `frontend/mobile/eslint.config.js`:

```js
// Expo'nun flat config'i; kural eklemiyoruz, yalnız taban.
const expo = require("eslint-config-expo/flat");
module.exports = [...expo, { ignores: ["android/", "ios/", "dist/", ".expo/"] }];
```

- [ ] **Step 2: Ortak kurulum adımı** — `.github/actions/setup-mobile/action.yml`

Dört workflow aynı beş adımı tekrarlar; tek yerde tutulur (I-1'in `pnpm/action-setup@v4` +
`setup-node@v4 (22, cache: pnpm)` kalıbı korunur).

```yaml
name: setup-mobile
description: pnpm 11 + Node 22 + workspace kurulumu
runs:
  using: composite
  steps:
    - uses: pnpm/action-setup@v4
      with:
        version: 11
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
    - run: pnpm install --frozen-lockfile
      shell: bash
```

- [ ] **Step 3: Workflow'u yaz** — `.github/workflows/mobile-ci.yml`

```yaml
name: mobile-ci

on:
  push:
    branches: [main]
    paths:
      - "frontend/mobile/**"
      - "frontend/shared/**"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - ".github/workflows/mobile-ci.yml"
  pull_request:
    paths:
      - "frontend/mobile/**"
      - "frontend/shared/**"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"

concurrency:
  group: mobile-ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mobile
      - name: Tip denetimi
        run: pnpm --filter @bumpinto/mobile exec tsc --noEmit
      - name: Lint
        run: pnpm --filter @bumpinto/mobile lint
      - name: Jest (jest-expo)
        run: pnpm --filter @bumpinto/mobile test -- --ci --coverage=false
      - name: i18n paritesi
        run: pnpm i18n:check

  config:
    runs-on: ubuntu-latest
    needs: test
    env:
      EAS_PROJECT_ID: ${{ vars.EAS_PROJECT_ID }}
      EAS_OWNER: ${{ vars.EAS_OWNER }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mobile
      - name: expo config çözülüyor
        working-directory: frontend/mobile
        run: pnpm exec expo config --type public --json > /tmp/expo-config.json
      - name: Mağaza beyanları yerinde mi (uyumluluk §2)
        run: node frontend/mobile/scripts/check-android-sdk.mjs /tmp/expo-config.json
```

`--coverage=false` bilinçli: kapsam eşiği bu izde tanımlı değil, rapor üretmek koşuyu uzatır.
`pnpm i18n:check` mobil dil dosyaları `frontend/shared`'a taşındığı için (M-4 T3a) burada da kapıdır.

- [ ] **Step 4: Kapı** — Run:

```sh
rtk pnpm dlx js-yaml@4 .github/workflows/mobile-ci.yml > /dev/null && echo YAML-OK
rtk pnpm --filter @bumpinto/mobile lint
rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit
```

Expected: `YAML-OK`; lint ve tsc temiz. (`config` job'ının çağırdığı script T8'de doğar; T8 bitene kadar
workflow **push edilmez** — dosya listesi bunu not eder.)

- [ ] **Step 5: Dosya listesi** — `.github/workflows/mobile-ci.yml`,
`.github/actions/setup-mobile/action.yml`,
`frontend/mobile/{package.json,eslint.config.js}`, `pnpm-lock.yaml`.
Mesaj: `ci(mobile): jest-expo + tsc + lint pipeline'i`.

---

### Task 4: `mobile-build.yml` — EAS build

**Files:**
- Create: `.github/workflows/mobile-build.yml`

**Tetikleyiciler (bağlayıcı):**
`preview` = PR'a **`mobile-build`** etiketi eklenince (yalnız Android APK — hızlı ve e2e'ye yem olur).
`production` = `mobile-v*` biçimli **etiket** push'unda (iOS + Android, `autoIncrement` ile).
Gerekçe: her push'ta bulut build almak EAS kotasını yakar; etiket = insan kararı.

- [ ] **Step 1: Workflow'u yaz** — `.github/workflows/mobile-build.yml`

```yaml
name: mobile-build

on:
  pull_request:
    types: [labeled]
  push:
    tags: ["mobile-v*"]
  workflow_dispatch:
    inputs:
      profile:
        description: "EAS build profili"
        type: choice
        options: [preview, production]
        default: preview

concurrency:
  group: mobile-build-${{ github.ref }}
  cancel-in-progress: false

jobs:
  preview:
    # PR etiketi 'mobile-build' ya da elle 'preview' seçimi
    if: >-
      (github.event_name == 'pull_request' && github.event.label.name == 'mobile-build') ||
      (github.event_name == 'workflow_dispatch' && inputs.profile == 'preview')
    runs-on: ubuntu-latest
    outputs:
      apk_url: ${{ steps.build.outputs.apk_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mobile
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: EAS build (preview / android)
        id: build
        working-directory: frontend/mobile
        env:
          EAS_PROJECT_ID: ${{ vars.EAS_PROJECT_ID }}
          EAS_OWNER: ${{ vars.EAS_OWNER }}
        run: |
          eas build --platform android --profile preview \
            --non-interactive --wait --json > build.json
          url=$(node -p "JSON.parse(require('fs').readFileSync('build.json','utf8'))[0].artifacts.buildUrl")
          echo "apk_url=$url" >> "$GITHUB_OUTPUT"
      - name: PR'a artefakt linkini yaz
        if: github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          URL: ${{ steps.build.outputs.apk_url }}
        run: |
          gh pr comment "${{ github.event.pull_request.number }}" \
            --body "Preview APK hazır: $URL (Maestro e2e otomatik koşacak)"

  production:
    if: >-
      startsWith(github.ref, 'refs/tags/mobile-v') ||
      (github.event_name == 'workflow_dispatch' && inputs.profile == 'production')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mobile
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Etiket ile package.json sürümü uyuşuyor mu
        run: |
          tag="${GITHUB_REF_NAME#mobile-v}"
          ver=$(node -p "require('./frontend/mobile/package.json').version")
          test "$tag" = "$ver" || { echo "Etiket $tag != sürüm $ver"; exit 1; }
        if: startsWith(github.ref, 'refs/tags/mobile-v')
      - name: EAS build (production / iki platform)
        working-directory: frontend/mobile
        env:
          EAS_PROJECT_ID: ${{ vars.EAS_PROJECT_ID }}
          EAS_OWNER: ${{ vars.EAS_OWNER }}
        run: |
          eas build --platform all --profile production \
            --non-interactive --wait --json > build.json
          node -p "JSON.parse(require('fs').readFileSync('build.json','utf8')).map(b => b.platform + ' ' + b.artifacts.buildUrl).join('\n')"
      - uses: actions/upload-artifact@v4
        with:
          name: eas-production-build-metadata
          path: frontend/mobile/build.json
```

Sürüm/etiket kapısı bilinçlidir: `mobile-v0.2.0` etiketi `package.json` `0.2.0` demiyorsa build
**başlamaz** — mağazaya yanlış sürüm numarasıyla artefakt gitmez.

- [ ] **Step 2: Kapı** — Run:

```sh
rtk pnpm dlx js-yaml@4 .github/workflows/mobile-build.yml > /dev/null && echo YAML-OK
node -e "1" # (JSON.parse ifadeleri tek satır kaçışsız — YAML blok skaları içinde güvenli)
```

Expected: `YAML-OK`.

- [ ] **Step 3: KULLANICI ÇALIŞTIRIR — ilk bulut build'i (ücretli kota harcar)**

```sh
rtk gh label create mobile-build --description "PR'da EAS preview build tetikler" --color 0e8a16
cd frontend/mobile && rtk pnpm dlx eas-cli@latest build --platform android --profile preview
```

İlk koşuda EAS keystore üretmeyi önerir → **Yes** (T2 §4/2). Sonuç URL'si e2e'nin girdisidir.

- [ ] **Step 4: Dosya listesi** — `.github/workflows/mobile-build.yml`.
Mesaj: `ci(mobile): eas build — pr etiketinde preview, mobile-v* etiketinde production`.

---

### Task 5: Maestro CI

**Files:**
- Create: `.github/workflows/mobile-e2e.yml`, `frontend/mobile/.maestro/ci/01-join-deck-decide.yaml`, `frontend/mobile/.maestro/ci/README.md`

**Karar (bağlayıcı) — üç seçenek, biri seçildi:**

| Seçenek | Neden değil / neden |
|---|---|
| `maestro cloud` (Robin) | Ücretli abonelik + ikinci sağlayıcı sırrı. Kota bitince yayın kapısı sessizce düşer. **Hayır.** |
| EAS Workflows | Testi EAS'a taşır; PR kapıları GitHub'da, e2e EAS'ta → iki yerde durum. Ayrıca build dakikası ücretli. **Hayır.** |
| **GitHub Actions + Android emülatör** | Ücretsiz `ubuntu-latest` (KVM açık), APK zaten `mobile-build`'de üretildi, tek sağlayıcı. **Evet.** |

**İkinci karar — akış kapsamı.** Brief'in istediği `giriş → katıl → deste → karar` zincirinin **"giriş"**
ayağı gözetimsiz emülatörde **koşamaz**: Google Sign-In gerçek bir Google hesabı ve Play Services oturumu
ister; bunu otomatikleştirmenin tek yolu ya sahte bir kimlik doğrulama ucu (sözleşme §2 dışı, uydurma) ya
da hesap şifresini CI'a koymaktır (yasak). Bu yüzden:

- CI'da koşan: **`katıl → deste → karar`** (`/j/<slug>` derin linkinden girilir; katılımcı jetonu
  `X-Participant-Token`'dır, Google girişi gerekmez) + M-4'ün `02-deeplink.yaml` ve
  `03-location-permission.yaml` akışları.
- Elle koşan (yayın kapısı, runbook §4): M-4'ün `01-signin-join-deck-decide.yaml` akışı, gerçek dev
  build + gerçek Google hesabı ile. `docs/RELEASE-MOBILE.md` bunu işaretlenmeden yayın açılmaz kalemi yapar.
- iOS: macOS runner dakikası pahalı; simülatör akışı runbook'ta elle.

- [ ] **Step 1: CI akışını yaz** — `frontend/mobile/.maestro/ci/01-join-deck-decide.yaml`

```yaml
# CI akışı: Google girişi YOK. Oturum workflow tarafından kurulur, slug env ile gelir.
appId: app.bumpinto.mobile
env:
  MAESTRO_SLUG: ${MAESTRO_SLUG}
---
- launchApp: { clearState: true, permissions: { location: allow } }
- openLink: "https://bumpinto.app/j/${MAESTRO_SLUG}"
- assertVisible: { text: "seni buluşmaya çağırdı", timeout: 30000 }
- tapOn: { id: "join-name" }
- inputText: "CI Tester"
- tapOn: "Mevcut konumun"
- tapOn: "Katıl"
- assertVisible: { text: "Katıldın!", timeout: 30000 }
- assertVisible: { text: "kart", timeout: 90000 }
- repeat: { times: 12, commands: [{ swipe: { direction: RIGHT, duration: 300 } }] }
- tapOn: "Beğenilerimi gönder"
- assertVisible: { text: "Ortak nokta", timeout: 120000 }
- takeScreenshot: ci-decision
```

`permissions: { location: allow }` CI'da bilinçli: izin **akışını** M-4'ün `03` dosyası test eder;
bu akış ürün zincirini test eder, iki şeyi tek akışta karıştırmayız.

- [ ] **Step 2: `.maestro/ci/README.md`**

````md
# CI Maestro akışları

`.maestro/*.yaml` (M-4) **cihaz/dev build** içindir ve Google girişini içerir.
`.maestro/ci/*.yaml` gözetimsiz emülatör içindir: giriş adımı yoktur, oturumu CI kurar.

```sh
export MAESTRO_SLUG=$(curl -s -X POST "$E2E_API_BASE/api/sessions" \
  -H "Authorization: Bearer $E2E_HOST_TOKEN" -H 'Content-Type: application/json' \
  -d '{"activityTypes":["COFFEE"],"displayName":"CI Host","sessionType":"GROUP","lat":52.37,"lng":4.89,"locationLabel":"Amsterdam","travelMode":"WALK"}' \
  | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).slug")
maestro test .maestro/ci
```

Kapsam dışı (elle, `docs/RELEASE-MOBILE.md` §4): `01-signin-join-deck-decide.yaml` (gerçek Google
hesabı) ve tüm iOS akışları.
````

- [ ] **Step 3: Workflow'u yaz** — `.github/workflows/mobile-e2e.yml`

```yaml
name: mobile-e2e

on:
  workflow_run:
    workflows: [mobile-build]
    types: [completed]
  workflow_dispatch:
    inputs:
      apk_url:
        description: "Test edilecek APK'nın indirilebilir adresi"
        required: true

jobs:
  maestro:
    # Yalnız başarılı build'den sonra ve yalnız değişkenler tanımlıysa (fork PR'da atlanır —
    # `vars` job seviyesinde okunabilir, `secrets` okunamaz; bu yüzden kapı E2E_API_BASE'dir).
    if: >-
      vars.E2E_API_BASE != '' &&
      (github.event_name == 'workflow_dispatch' ||
       github.event.workflow_run.conclusion == 'success')
    runs-on: ubuntu-latest
    env:
      E2E_API_BASE: ${{ vars.E2E_API_BASE }}
      E2E_HOST_TOKEN: ${{ secrets.E2E_HOST_TOKEN }}
      EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: APK'yı çöz ve indir
        run: |
          url="${{ inputs.apk_url }}"
          if [ -z "$url" ]; then
            npm i -g eas-cli@latest
            eas build:list --platform android --buildProfile preview \
              --status finished --limit 1 --json --non-interactive > list.json
            url=$(node -p "JSON.parse(require('fs').readFileSync('list.json','utf8'))[0].artifacts.buildUrl")
          fi
          curl -fsSL "$url" -o app.apk && test -s app.apk && echo "APK: $url"

      - name: E2E oturumu kur (slug üret)
        run: |
          slug=$(curl -fsS -X POST "$E2E_API_BASE/api/sessions" \
            -H "Authorization: Bearer $E2E_HOST_TOKEN" \
            -H 'Content-Type: application/json' \
            -d '{"activityTypes":["COFFEE"],"displayName":"CI Host","sessionType":"GROUP","lat":52.37,"lng":4.89,"locationLabel":"Amsterdam","travelMode":"WALK"}' \
            | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).slug")
          test -n "$slug"
          echo "MAESTRO_SLUG=$slug" >> "$GITHUB_ENV"

      - name: Maestro CLI + KVM
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' \
            | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules && sudo udevadm trigger --name-match=kvm

      - name: Emülatörde Maestro
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          target: google_apis
          arch: x86_64
          profile: pixel_6
          disable-animations: true
          script: |
            adb install -r app.apk
            maestro test frontend/mobile/.maestro/ci \
              --env MAESTRO_SLUG=$MAESTRO_SLUG --format junit --output maestro-report.xml
            maestro test frontend/mobile/.maestro/02-deeplink.yaml \
              --env MAESTRO_SLUG=$MAESTRO_SLUG
            maestro test frontend/mobile/.maestro/03-location-permission.yaml

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: maestro-artifacts
          path: |
            maestro-report.xml
            ~/.maestro/tests/**
```

`api-level: 34` seçimi bilinçli: 16 KB sayfa davranışı Android 15 (API 35) ile gelir ve emülatör
görüntüsü ağırdır; sayfa hizası **statik olarak** T8'de doğrulanır, emülatör ürün akışını sürer.
Android 15 cihazda açılış doğrulaması runbook §4'te elle kalemdir.

- [ ] **Step 4: Kapı** — Run:

```sh
for f in .github/workflows/mobile-e2e.yml frontend/mobile/.maestro/ci/01-join-deck-decide.yaml; do \
  rtk pnpm dlx js-yaml@4 "$f" > /dev/null && echo "YAML-OK $f"; done
```

Expected: iki `YAML-OK`. (Maestro dosyası `---` ile iki belge içerir; `js-yaml` CLI çoklu belge okur —
hata verirse söz dizimi bozuktur.)

- [ ] **Step 5: Dosya listesi** — `.github/workflows/mobile-e2e.yml`,
`frontend/mobile/.maestro/ci/{01-join-deck-decide.yaml,README.md}`.
Mesaj: `ci(mobile): emulatorde maestro — katil/deste/karar akisi`.

---

### Task 6: EAS Submit — TestFlight + Play internal

**Files:**
- Create: `.github/workflows/mobile-submit.yml`
- Modify: `docs/store/RELEASE-CHECKLIST.md` (otomasyon kancaları)

Submit **ücretli hesaplara yazar ve geri alınamaz** (Play'de aynı `versionCode` bir daha yüklenemez).
Bu yüzden workflow `environment: mobile-release` kullanır: GitHub bu ortamda **zorunlu onaylayıcı**
bekler → koşu, kullanıcı "Approve" demeden başlamaz.

- [ ] **Step 1: Workflow'u yaz** — `.github/workflows/mobile-submit.yml`

```yaml
name: mobile-submit

on:
  workflow_dispatch:
    inputs:
      platform:
        description: "Hangi mağaza"
        type: choice
        options: [ios, android, all]
        default: all
      build_id:
        description: "EAS build id (boşsa profilin en son 'finished' build'i)"
        required: false

jobs:
  submit:
    runs-on: ubuntu-latest
    # Zorunlu onaylayıcı bu ortamda tanımlıdır (Settings > Environments > mobile-release).
    environment: mobile-release
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-mobile
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Yayın kapıları işaretli mi
        run: node frontend/mobile/scripts/check-release-checklist.mjs docs/store/RELEASE-CHECKLIST.md

      - name: eas submit
        working-directory: frontend/mobile
        env:
          EAS_PROJECT_ID: ${{ vars.EAS_PROJECT_ID }}
          EAS_OWNER: ${{ vars.EAS_OWNER }}
        run: |
          args="--platform ${{ inputs.platform }} --profile production --non-interactive --wait"
          if [ -n "${{ inputs.build_id }}" ]; then
            args="$args --id ${{ inputs.build_id }}"
          else
            args="$args --latest"
          fi
          eas submit $args
```

- [ ] **Step 2: Kapı script'i** — `frontend/mobile/scripts/check-release-checklist.mjs`

Kontrol listesi **belge değil kapıdır**: "Yayın kapısı" işaretli değilse submit koşmaz.

```js
#!/usr/bin/env node
/* RELEASE-CHECKLIST.md'de "**Yayın kapısı**" geçen satırların kutusu işaretli olmalı. */
import { readFileSync } from "node:fs";

const file = process.argv[2];
const lines = readFileSync(file, "utf8").split("\n");
const gates = lines.filter((l) => l.includes("Yayın kapısı"));
if (gates.length === 0) {
  console.error(`${file}: "Yayın kapısı" satırı yok — kontrol listesi bozulmuş.`);
  process.exit(2);
}
const open = gates.filter((l) => /^\s*-\s*\[\s\]/.test(l));
for (const l of open) console.error(`AÇIK KAPI: ${l.trim()}`);
console.log(`${gates.length} kapı, ${open.length} açık.`);
process.exit(open.length ? 1 : 0);
```

- [ ] **Step 3: `docs/store/RELEASE-CHECKLIST.md`'ye otomasyon kancalarını ekle**

M-5 T11'in yazdığı üç bölüm korunur; **D** başlığı eklenir:

```md
**D. Otomasyon kancaları (I-3)**
- [ ] `mobile-ci` yeşil (jest-expo + tsc + lint + `expo config` beyan denetimi).
- [ ] `mobile-e2e` yeşil (`katıl → deste → karar` emülatörde).
- [ ] `giriş → katıl → deste → karar` gerçek Google hesabıyla dev build'de elle koşuldu (`.maestro/01-*`).
- [ ] `mobile-build` `production` artefaktı `mobile-v<sürüm>` etiketinden üretildi (etiket = `package.json` sürümü).
- [ ] Mağaza görselleri `frontend/mobile/store/` altında ve ölçüleri `scripts/store-shots.mjs --verify` ile doğrulandı.
- [ ] **Yayın kapısı**: `[tacir adresi — mağazada görünür]` yer tutucusu `support.ts`/`kvkk.ts` içinde kalmadı.
- [ ] **Yayın kapısı**: Play kapalı testi (12 tester × 14 gün) tamamlandı ya da hesap kurumsaldır.
```

`check-release-checklist.mjs` yalnız son iki satırı (ve M-5'in "Yayın kapısı" satırını) zorunlu tutar.

- [ ] **Step 4: Kapı** — Run:

```sh
rtk pnpm dlx js-yaml@4 .github/workflows/mobile-submit.yml > /dev/null && echo YAML-OK
node frontend/mobile/scripts/check-release-checklist.mjs docs/store/RELEASE-CHECKLIST.md; echo "exit=$?"
```

Expected: `YAML-OK`; script `exit=1` ve açık kapıları listeler (kutular henüz boş — **doğru davranış**).

- [ ] **Step 5: KULLANICI ÇALIŞTIRIR — korumalı ortamı aç**

GitHub → Settings → Environments → **New environment** `mobile-release` → *Required reviewers* = kullanıcı.
Sonra ilk gönderim:

```sh
rtk gh workflow run mobile-submit.yml -f platform=android
```

TestFlight işlemesi ~10–30 dk sürer; Play internal track dakikalar içinde görünür.

- [ ] **Step 6: Dosya listesi** — `.github/workflows/mobile-submit.yml`,
`frontend/mobile/scripts/check-release-checklist.mjs`, `docs/store/RELEASE-CHECKLIST.md`.
Mesaj: `ci(mobile): eas submit — testflight + play internal, korumali ortam`.

---

### Task 7: Mağaza varlık üretimi

**Files:**
- Create: `frontend/mobile/.maestro/ci/04-store-shots.yaml`, `frontend/mobile/scripts/{pngSize.mjs,store-shots.mjs}`, `frontend/mobile/scripts/__tests__/pngSize.test.ts`, `docs/store/assets/README.md`

**Karar (bağlayıcı): ekran görüntüleri Maestro `takeScreenshot` ile üretilir.** Gerekçe: (a)
`expo-screenshot` diye bir paket **yoktur** — uydurulamaz; (b) Fastlane `snapshot` iOS'a özgüdür ve
XCUITest hedefi ister, CNG `prebuild --clean` `ios/` dizinini her koşuda yeniden üretir → hedef kaybolur;
(c) Maestro akışları **zaten** var (T5), aynı akış hem test hem görsel üretir. Ölçüyü cihaz/emülatör
çözünürlüğü verir: iPhone 6.9" = 1320×2868 simülatör, Android telefon = 1080×2340 emülatör profili.

- [ ] **Step 1: Başarısız testi yaz** — `frontend/mobile/scripts/__tests__/pngSize.test.ts`

```ts
import { pngSize } from "../pngSize.mjs";

// 8 baytlık PNG imzası + IHDR uzunluğu/tipi + genişlik/yükseklik
function fakePng(w: number, h: number): Buffer {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

describe("pngSize", () => {
  it("IHDR'dan genişlik ve yüksekliği okur", () => {
    expect(pngSize(fakePng(1320, 2868))).toEqual({ width: 1320, height: 2868 });
  });
  it("PNG olmayan ya da kısa veride null döner", () => {
    expect(pngSize(Buffer.from("not a png at all...."))).toBeNull();
    expect(pngSize(Buffer.alloc(10))).toBeNull();
  });
});
```

Run: `MTEST pngSize` → kırmızı (`pngSize.mjs` yok). `package.json`'ın `jest` bloğuna
`"moduleFileExtensions": ["ts", "tsx", "js", "jsx", "mjs", "json", "node"]` eklenir — jest-expo
preset'i varsayılanda `.mjs`'i çözmez ve import `Cannot find module` verir.

- [ ] **Step 2: `frontend/mobile/scripts/pngSize.mjs`**

```js
/* PNG başlığından ölçü okur — bağımlılık yok (sharp/probe kurmuyoruz). */
const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngSize(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
  if (!buf.subarray(0, 8).equals(SIG)) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
```

- [ ] **Step 3: Ekran görüntüsü akışı** — `frontend/mobile/.maestro/ci/04-store-shots.yaml`

```yaml
# Mağaza görselleri: UI Kaynağı tablosundaki sıra (O2, P6, P11, P14, P20, P25).
appId: app.bumpinto.mobile
env:
  MAESTRO_SLUG: ${MAESTRO_SLUG}
---
- launchApp: { clearState: true, permissions: { location: allow } }
- assertVisible: "Ortada"
- takeScreenshot: 01-signin
- openLink: "https://bumpinto.app/j/${MAESTRO_SLUG}"
- tapOn: { id: "join-name" }
- inputText: "Deniz"
- tapOn: "Mevcut konumun"
- tapOn: "Katıl"
- assertVisible: { text: "Katıldın!", timeout: 30000 }
- takeScreenshot: 02-lobby
- assertVisible: { text: "kart", timeout: 90000 }
- takeScreenshot: 04-deck
- tapOn: { text: "Mekanlar", optional: true }
- takeScreenshot: 03-venues
- tapOn: { text: "Deste", optional: true }
- repeat: { times: 12, commands: [{ swipe: { direction: RIGHT, duration: 250 } }] }
- tapOn: "Beğenilerimi gönder"
- assertVisible: { text: "Ortak nokta", timeout: 120000 }
- takeScreenshot: 05-decision
- tapOn: { text: "Sesli sohbete katıl", optional: true }
- takeScreenshot: 06-voice
```

`06-voice` M-6 yoksa boş/aynı ekranı çeker; `store-shots.mjs --verify` onu **uyarı** sayar, hata saymaz.

- [ ] **Step 4: Toplayıcı** — `frontend/mobile/scripts/store-shots.mjs`

```js
#!/usr/bin/env node
/* Maestro çıktısındaki PNG'leri store/ altına taşır ve mağaza ölçülerini doğrular.
   Kullanım:
     node scripts/store-shots.mjs --collect <maestro-cikti-dizini> --platform ios|android
     node scripts/store-shots.mjs --verify
*/
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { pngSize } from "./pngSize.mjs";

const SPEC = {
  "store/ios/icon-1024.png": { width: 1024, height: 1024, required: true },
  "store/android/icon-512.png": { width: 512, height: 512, required: true },
  "store/android/feature-1024x500.png": { width: 1024, height: 500, required: true },
};
const SHOT = { ios: { dir: "store/ios/6.9", width: 1320, height: 2868, min: 3 },
               android: { dir: "store/android/phone", width: 1080, height: 2340, min: 2 } };

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1] ?? true; };
const dims = (f) => pngSize(readFileSync(f));

if (flag("--collect")) {
  const target = SHOT[flag("--platform")];
  if (!target) { console.error("--platform ios|android olmalı"); process.exit(2); }
  mkdirSync(target.dir, { recursive: true });
  const src = String(flag("--collect"));
  readdirSync(src).filter((f) => f.endsWith(".png")).sort().forEach((f, i) => {
    const out = join(target.dir, `${String(i + 1).padStart(2, "0")}-${basename(f)}`);
    copyFileSync(join(src, f), out);
    console.log(`kopyalandı ${out}`);
  });
  process.exit(0);
}

let bad = 0, warn = 0;
const check = (label, file, w, h) => {
  const got = existsSync(file) ? dims(file) : null;
  const ok = got && got.width === w && got.height === h;
  console.log(`${ok ? "OK " : "BAD"} ${label} ${got ? `${got.width}×${got.height}` : `yok/PNG değil (${w}×${h} bekleniyordu)`}`);
  if (!ok) bad++;
};
for (const [path, want] of Object.entries(SPEC)) check(path, path, want.width, want.height);
for (const [platform, spec] of Object.entries(SHOT)) {
  const files = existsSync(spec.dir) ? readdirSync(spec.dir).filter((f) => f.endsWith(".png")) : [];
  if (files.length < spec.min) { console.error(`EKSİK ${spec.dir}: ${files.length}/${spec.min}`); bad++; }
  for (const f of files) check(`${platform}/${f}`, join(spec.dir, f), spec.width, spec.height);
  if (!files.some((f) => f.includes("voice"))) {
    console.warn(`UYARI ${platform}: sesli sohbet görseli yok (M-6 açılmamış olabilir)`); warn++;
  }
}
console.log(`${bad} hata, ${warn} uyarı.`);
process.exit(bad ? 1 : 0);
```

- [ ] **Step 5: İkon ve feature graphic kaynağı** — `docs/store/assets/README.md`

````md
# Mağaza varlık kaynakları

Türetilmiş PNG'ler `frontend/mobile/store/` altındadır (M-5 T11 envanteri). **Kaynak** dosyalar burada:

| Kaynak | Biçim | Türetilen |
|---|---|---|
| `icon-master.svg` | 1024×1024, saydamlık yok, güvenli alan %10 | `store/ios/icon-1024.png`, `store/android/icon-512.png` |
| `feature-master.svg` | 1024×500, metin ortadaki 800×320 alanda | `store/android/feature-1024x500.png` |

SVG'ler Claude Design projesinden (`719fcd5f-…`) dışa aktarılır; renkler
`frontend/mobile/src/theme.ts` token'larıyla **aynı** olmalıdır (flame / paper / ink).
Türetme ve çekim (KULLANICI ÇALIŞTIRIR):

```sh
rsvg-convert -w 1024 -h 1024 docs/store/assets/icon-master.svg -o frontend/mobile/store/ios/icon-1024.png
rsvg-convert -w 512 -h 512 docs/store/assets/icon-master.svg -o frontend/mobile/store/android/icon-512.png
rsvg-convert -w 1024 -h 500 docs/store/assets/feature-master.svg -o frontend/mobile/store/android/feature-1024x500.png
cd frontend/mobile
maestro test .maestro/ci/04-store-shots.yaml --env MAESTRO_SLUG=$SLUG
node scripts/store-shots.mjs --collect ~/.maestro/tests/<son-koşu>/ --platform android
node scripts/store-shots.mjs --verify   # çıkış 0 olmadan mağazaya görsel yüklenmez
```
````

- [ ] **Step 6: Doğrula** — Run:

```sh
rtk pnpm --filter @bumpinto/mobile test pngSize
cd frontend/mobile && node scripts/store-shots.mjs --verify; echo "exit=$?"
rtk pnpm dlx js-yaml@4 frontend/mobile/.maestro/ci/04-store-shots.yaml > /dev/null && echo YAML-OK
```

Expected: jest yeşil (3 test); `store-shots.mjs --verify` `EKSİK` satırlarıyla `exit=1` (varlıklar
henüz üretilmedi — **doğru davranış**); `YAML-OK`.

- [ ] **Step 7: Dosya listesi** — `frontend/mobile/scripts/{pngSize.mjs,store-shots.mjs}`,
`frontend/mobile/scripts/__tests__/pngSize.test.ts`,
`frontend/mobile/.maestro/ci/04-store-shots.yaml`, `docs/store/assets/README.md`.
Mesaj: `chore(store): maestro ile ekran goruntusu uretimi + olcu dogrulamasi`.

---

### Task 8: 16 KB page size ve target API 36 kapısı

**Files:**
- Create: `frontend/mobile/scripts/{sdkAssert.mjs,check-android-sdk.mjs}`, `frontend/mobile/scripts/__tests__/sdkAssert.test.ts`
- Modify: `.github/workflows/mobile-ci.yml` (`native` job)

M-6 T2 `frontend/mobile/scripts/check-so-alignment.mjs`'i yazar (WebRTC `.so`'larının `PT_LOAD`
hizası). Bu görev onu **CI'a bağlar** ve yanına SDK sürümü iddiasını koyar. Script M-6 `done`
değilse **yoktur**; workflow adımı `if: hashFiles(...) != ''` ile koşullanır — sessiz geçmez, atlandığı
loglanır.

- [ ] **Step 1: Başarısız testi yaz** — `frontend/mobile/scripts/__tests__/sdkAssert.test.ts`

```ts
import { assertSdk } from "../sdkAssert.mjs";

const ok = {
  plugins: [["expo-build-properties", { android: { compileSdkVersion: 36, targetSdkVersion: 36 } }]],
  android: { edgeToEdgeEnabled: true },
};

describe("assertSdk", () => {
  it("compileSdk ve targetSdk 36 ise hata döndürmez", () => {
    expect(assertSdk(ok)).toEqual([]);
  });
  it("targetSdk 35 ise Play kuralını bildirir", () => {
    const bad = JSON.parse(JSON.stringify(ok));
    bad.plugins[0][1].android.targetSdkVersion = 35;
    expect(assertSdk(bad)).toEqual([
      "targetSdkVersion 35 — Play 31 Ağu 2026 sonrası 36 ister (uyumluluk §2).",
    ]);
  });
  it("eklenti yoksa ya da edge-to-edge kapalıysa bildirir", () => {
    expect(assertSdk({ plugins: [], android: { edgeToEdgeEnabled: true } })).toEqual([
      "expo-build-properties eklentisi yok — SDK sürümü sabitlenmemiş.",
    ]);
    const bad = JSON.parse(JSON.stringify(ok));
    bad.android.edgeToEdgeEnabled = false;
    expect(assertSdk(bad)).toEqual(["edgeToEdgeEnabled false — Android 16'da zorunlu."]);
  });
});
```

Run: `MTEST sdkAssert` → kırmızı.

- [ ] **Step 2: `frontend/mobile/scripts/sdkAssert.mjs`** (saf fonksiyon — testlenebilir çekirdek)

```js
/* `expo config --type public --json` çıktısındaki expo nesnesini denetler.
   Dönen dizi boşsa kapı açıktır; doluysa her satır bir ihlaldir. */
export function assertSdk(expo) {
  const errors = [];
  const bp = (expo.plugins ?? []).find(
    (p) => Array.isArray(p) && p[0] === "expo-build-properties",
  );
  if (!bp) {
    errors.push("expo-build-properties eklentisi yok — SDK sürümü sabitlenmemiş.");
  } else {
    const a = bp[1]?.android ?? {};
    if (a.targetSdkVersion !== 36) {
      errors.push(
        `targetSdkVersion ${a.targetSdkVersion} — Play 31 Ağu 2026 sonrası 36 ister (uyumluluk §2).`,
      );
    }
    if (a.compileSdkVersion !== 36) {
      errors.push(`compileSdkVersion ${a.compileSdkVersion} — targetSdk ile aynı olmalı.`);
    }
  }
  if (expo.android?.edgeToEdgeEnabled !== true) {
    errors.push("edgeToEdgeEnabled false — Android 16'da zorunlu.");
  }
  return errors;
}
```

- [ ] **Step 3: CLI sarmalayıcı** — `frontend/mobile/scripts/check-android-sdk.mjs`

```js
#!/usr/bin/env node
/* Kullanım: node scripts/check-android-sdk.mjs <expo-config.json> */
import { readFileSync } from "node:fs";
import { assertSdk } from "./sdkAssert.mjs";

const path = process.argv[2];
if (!path) { console.error("kullanım: check-android-sdk.mjs <expo-config.json>"); process.exit(2); }
const raw = JSON.parse(readFileSync(path, "utf8"));
const expo = raw.expo ?? raw;
const errors = assertSdk(expo);
for (const e of errors) console.error(`BAD ${e}`);
if (!errors.length) console.log("OK compileSdk/targetSdk 36, edge-to-edge açık.");
process.exit(errors.length ? 1 : 0);
```

- [ ] **Step 4: `mobile-ci.yml`'e `native` job'ı ekle** (T3'teki `config` job'ının altına)

```yaml
  native:
    runs-on: ubuntu-latest
    needs: config
    env:
      EAS_PROJECT_ID: ${{ vars.EAS_PROJECT_ID }}
      EAS_OWNER: ${{ vars.EAS_OWNER }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - run: pnpm install --frozen-lockfile
      - name: 16 KB page size (.so hizası, M-6 scripti)
        working-directory: frontend/mobile
        run: |
          if [ -f scripts/check-so-alignment.mjs ]; then
            node scripts/check-so-alignment.mjs
          else
            echo "check-so-alignment.mjs yok — M-6 henüz uygulanmadı, kapı atlandı."
          fi
      - name: Prebuild (android) ve üretilen gradle sürümleri
        working-directory: frontend/mobile
        run: |
          pnpm exec expo prebuild --platform android --no-install
          grep -E "compileSdkVersion|targetSdkVersion" android/build.gradle
          grep -E "compileSdkVersion *= *36" android/build.gradle
          grep -E "targetSdkVersion *= *36" android/build.gradle
```

Son iki `grep` bilinçli olarak **çıkış kodu** kapısıdır: `expo-build-properties` beyanı ile üretilen
gradle dosyası ayrışırsa (eklenti sürümü, SDK yükseltmesi) job kırmızı olur. `setup-java 17` prebuild
için yeterlidir; tam gradle derlemesi bu izde koşmaz (EAS'ta koşar).

- [ ] **Step 5: Doğrula** — Run:

```sh
rtk pnpm --filter @bumpinto/mobile test sdkAssert
cd frontend/mobile && pnpm exec expo config --type public --json > /tmp/expo-config.json \
  && node scripts/check-android-sdk.mjs /tmp/expo-config.json
rtk pnpm dlx js-yaml@4 .github/workflows/mobile-ci.yml > /dev/null && echo YAML-OK
```

Expected: jest 4 test yeşil; `OK compileSdk/targetSdk 36, edge-to-edge açık.`; `YAML-OK`.
`BAD` çıkarsa **dur**: M-5 T2'nin `expo-build-properties` bloğu bozulmuş demektir, burada düzeltilmez.

- [ ] **Step 6: Dosya listesi** — `frontend/mobile/scripts/{sdkAssert.mjs,check-android-sdk.mjs}`,
`frontend/mobile/scripts/__tests__/sdkAssert.test.ts`, `.github/workflows/mobile-ci.yml`.
Mesaj: `ci(mobile): target api 36 ve 16 kb sayfa kapilari`.

---

### Task 9: Runbook + INDEX kaydı

**Files:**
- Create: `docs/RELEASE-MOBILE.md`
- Modify: `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Runbook'u yaz** — `docs/RELEASE-MOBILE.md`

````md
# Mobil yayın runbook'u (I-3)

Adlar: sırlar `docs/CI-SECRETS-MOBILE.md`, kapılar `docs/store/RELEASE-CHECKLIST.md`,
mağaza varlıkları `docs/store/assets/README.md`.
**Ajan hiçbirini çalıştırmaz** — bu belgedeki her komut kullanıcınındır.

## 1. Sürümü yükselt

`frontend/mobile/package.json` `version` alanı **tek kaynaktır** (ör. `0.1.0` → `0.2.0`);
`versionCode`/`buildNumber` elle dokunulmaz — EAS `autoIncrement` ile uzaktan artırır.
`runtimeVersion` politikası `appVersion`. Doğrula: `rtk pnpm --filter @bumpinto/mobile test easConfig`.

## 2. Yeşil CI

`main`'e PR aç; `mobile-ci` üç job'ı da (test / config / native) yeşil olmalı. Kırmızıysa yayın başlamaz.

## 3. Preview build ve e2e

`rtk gh pr edit <numara> --add-label mobile-build` → preview APK. `mobile-build` bitince `mobile-e2e`
kendiliğinden koşar (`workflow_run`); yeşil olmadan devam edilmez. APK linki PR yorumundadır — cihaza
kur ve gözle kontrol et.

## 4. Elle koşulan kapılar (otomatikleştirilemez — gerekçe: I-3 T5)

- [ ] `giriş → katıl → deste → karar`: dev build + **gerçek Google hesabı**
      (`maestro test .maestro/01-signin-join-deck-decide.yaml`).
- [ ] iOS simülatörde `.maestro/02-deeplink.yaml` ve `03-location-permission.yaml`.
- [ ] Android 15+ (16 KB sayfa) **fiziksel cihazda** uygulama açılıyor ve sese giriliyor (M-6).
- [ ] Purpose string'ler cihazda görünüyor (O4/O7 metinleriyle birebir) — ekran görüntüsü al.

## 5. Mağaza görselleri

Adımlar `docs/store/assets/README.md`'de; `node scripts/store-shots.mjs --verify` çıkışı `0` olmalı.

## 6. Production build → submit → kapalı test

```sh
git tag mobile-v0.2.0 && git push origin mobile-v0.2.0   # KULLANICI ÇALIŞTIRIR
rtk gh workflow run mobile-submit.yml -f platform=all    # KULLANICI ÇALIŞTIRIR
```

Etiket `package.json` sürümüyle **birebir** aynı olmalı; değilse `mobile-build` durur.
`mobile-release` ortamı **onay** ister; onaydan önce `check-release-checklist.mjs` açık kapı
bırakmamalıdır. Gönderim sonrası:

- **TestFlight**: işlenme ~10–30 dk. İç test grubuna ekle; "Missing Compliance" sorusu
  `ITSAppUsesNonExemptEncryption=false` sayesinde çıkmamalı.
- **Play internal track**: dakikalar içinde. **Bireysel hesapsa kapalı test 12 tester × 14 gün**
  burada başlar ve süresi dolmadan production'a çıkılamaz (uyumluluk §2). Bu süre **kritik yoldadır** —
  M-5 biter bitmez başlatılmış olmalıdır.

## 7. İnceleme notları ve demo hesap

App Store Connect → App Review Information (aynı içerik Play Console → App content → "App access"):

**Demo hesap zorunludur** (uygulama giriş duvarı arkasında): preprod değil **production** ortamında
açılmış bir Google hesabı; e-posta + şifre, 2FA kapalı. **İnceleme notu şablonu:**

> BumpInto, bir grup arkadaşın buluşma yerini adilce seçmesini sağlar.
> 1. Demo hesapla giriş yapın.
> 2. "Yeni buluşma kur" → konum izni istendiğinde **İzin Ver** (izin yalnız orta noktayı hesaplar;
>    arkadaşlara ~1 km yuvarlanmış gösterilir).
> 3. Davet linkini kopyalayın: `https://bumpinto.app/j/<slug>` — ikinci bir cihazda/tarayıcıda açın.
> 4. Deste ekranında kartları sağa/sola kaydırın, "Beğenilerimi gönder".
> 5. Karar ekranında ortak mekân görünür.
>
> Kullanıcı üretimi içerik: yalnız görünen ad ve buluşma adı; her katılımcı satırında bildir/engelle
> vardır (uzun basma). Ses kaydedilmez, saklanmaz.

## 8. Geri alma ve arıza

Yayınlanan sürüm **geri alınamaz**, ileri gidilir: yama sürümü (`0.2.1`) → yeni `mobile-v0.2.1` etiketi
→ yeni submit. Acil durumda Play'de "halt rollout" / staged rollout yüzdesi düşürülür, TestFlight'ta
bozuk build "expire" edilir. EAS erişilemezse `docs/CI-SECRETS-MOBILE.md` §5'teki geçici sır adlarıyla
`eas submit --local` yapılır; iş biter bitmez o sırlar **silinir**.
````

- [ ] **Step 2: Yer tutucu ve tutarlılık taraması** — Run:

```sh
rtk grep -rn "TODO\|FIXME\|TBD" docs/RELEASE-MOBILE.md docs/CI-SECRETS-MOBILE.md \
  docs/store/assets/README.md .github/workflows/mobile-*.yml frontend/mobile/scripts
rtk grep -rn "preprod" frontend/mobile/eas.json
for f in .github/workflows/mobile-ci.yml .github/workflows/mobile-build.yml \
  .github/workflows/mobile-e2e.yml .github/workflows/mobile-submit.yml; do \
  rtk pnpm dlx js-yaml@4 "$f" > /dev/null && echo "YAML-OK $f"; done
```

Expected: birinci komut **boş**; ikincisi yalnız `preview` profilinin `EXPO_PUBLIC_API_URL` satırını
döndürür (preprod **ortamı** kalır, preprod **profili** kalmaz); dört `YAML-OK`.

- [ ] **Step 3: Tam süit** — Run (repo kökünden):

```sh
rtk pnpm --filter @bumpinto/mobile test
rtk pnpm --filter @bumpinto/mobile exec tsc --noEmit
rtk pnpm --filter @bumpinto/mobile lint
rtk pnpm test:web && rtk pnpm i18n:check
```

Expected: mobil süit yeşil (M-4/M-5 testleri + bu planın `easConfig`, `pngSize`, `sdkAssert`
testleri), tip ve lint temiz, web regresyonu yok.

- [ ] **Step 4: INDEX kaydı** — `docs/superpowers/plans/INDEX.md`

**I — Altyapı** tablosuna yeni satır:

```
| I-3 | **Mobil yayın hattı** — EAS profilleri (development/preview/production, `appVersionSource: remote`, `runtimeVersion: appVersion`), sürüm tek kaynak (`package.json`), imzalama EAS-managed (ASC API key + Play App Signing) ve `docs/CI-SECRETS-MOBILE.md` ad sözleşmesi, `mobile-ci` (jest-expo + tsc + lint + `expo config` denetimi + target API 36 / 16 KB kapısı), `mobile-build` (PR etiketi → preview, `mobile-v*` → production), `mobile-e2e` (emülatör + Maestro `katıl → deste → karar`), `mobile-submit` (TestFlight + Play internal, korumalı `mobile-release` ortamı), Maestro ile mağaza görseli üretimi, `docs/RELEASE-MOBILE.md` | `2026-09-06-plan44-infra-mobile-release.md` | Plan 44 | ready | **M-4**, **M-5** · `I-1:T1–T3` (workflow kalıbı) · M-6 (yalnız `.so` kapısı) | — | 9 görev. Ücretli/yıkıcı adımlar "KULLANICI ÇALIŞTIRIR". M-4'ün `preprod` profili `preview` oldu. Google girişli e2e otomatikleştirilemez → runbook §4 elle kapı. Play kapalı testi (12 tester × 14 gün) kritik yolda |
```

Üst bloktaki `Sıradakiler:` satırında **I-3** çıkarılır; yerine `I-4` yazılır.
M-5 satırının **Not** sütununa eklenir: `RELEASE-CHECKLIST §D otomasyon kancaları I-3'te doldu.`
M-6 satırının **Not** sütununa eklenir: `check-so-alignment.mjs I-3 mobile-ci 'native' job'ında kapıdır.`

**Çapraz iz kilitleri** bölümüne iki satır:

- `I-3 ↔ M-6`: `scripts/check-so-alignment.mjs` M-6'nın ürünüdür; M-6 `done` değilken `mobile-ci`
  o adımı **loglayarak atlar** (sessiz geçmez).
- `I-3 ↔ M-5`: `check-release-checklist.mjs` yalnız "Yayın kapısı" satırlarını zorunlu tutar; M-5 o
  ifadeyi kontrol listesinden kaldırırsa submit **her koşuda** `exit 2` verir.

Yeni K-görevi:

```
| K-I1 | Google girişli `01-signin-join-deck-decide.yaml` CI'da koşamıyor (gerçek Google hesabı gerekir) | aday | I-3 | Çözüm ancak sözleşmeye test-kimlik ucu eklenirse (B izine karar); şimdilik runbook §4 elle kapı |
```

- [ ] **Step 5: Dosya listesi** — `docs/RELEASE-MOBILE.md`, `docs/superpowers/plans/INDEX.md`.
Mesaj: `docs(release): mobil yayin runbook'u + INDEX kaydi (I-3)`.

---
