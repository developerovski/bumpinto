import type { ExpoConfig } from "expo/config";

import { version } from "./package.json";

/**
 * BumpInto mobil — Expo yapılandırması (CNG).
 *
 * Sürüm TEK kaynaktan (`package.json`) okunur; build numarasını EAS uzaktan artırır
 * (`appVersionSource: "remote"`, I-3/plan44).
 *
 * Purpose string'ler (M-5) mağaza formunun ve cihazdaki izin diyaloğunun TEK kaynağıdır:
 * O4/O7 artboard metniyle birebir aynıdır, `Info.plist` ve eklenti seçeneklerine aynı sabitten
 * verilir. Değiştirilirse `src/lib/__tests__/appConfig.test.ts` kırılır.
 *
 * HARİTA: mobil Google Maps KULLANMAZ (açık hibrit spec kararı; backend varsayılanı
 * `MAP_ENGINE=maplibre`, web W-12 ile geçti). Bu yüzden `ios.config.googleMapsApiKey` ve
 * `android.config.googleMaps` YOK — anahtar tanımlamak Google Maps SDK'sını pakete sokar ve
 * `PrivacyInfo.xcprivacy` / Play Data safety beyanlarını yalanlar. Harita seçici M-7'de
 * `@maplibre/maplibre-react-native` ile gelir (K-M2).
 *
 * `android.edgeToEdgeEnabled` SDK 57'de KALDIRILDI: Android 16 edge-to-edge'i zorunlu kılıyor,
 * ayar verilirse prebuild uyarı basar — ekranlar güvenli alanı `safe-area-context` ile bırakır.
 */
const LOCATION_PURPOSE =
  "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. " +
  "Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir.";

const MIC_PURPOSE =
  "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez.";

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE ?? "https://bumpinto.app";

/**
 * iOS Google girişi URL şeması — iOS OAuth client ID'sinin TERSİ
 * (`1234-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.1234-abc`).
 *
 * Eklentiye seçenek VERİLMEZSE Firebase yoluna düşer (`GoogleService-Info.plist` arar) ve şemayı
 * hiç yazmaz: giriş tarayıcıdan uygulamaya dönemez, üstelik prebuild hata da vermez.
 *
 * Yayın derlemesinde eksikse AÇIKÇA patlar — yer tutucuyla imzalanmış bir sürüm mağazaya
 * çıkarsa Google girişi sahada sessizce ölür.
 */
function googleIosUrlScheme(): string {
  const scheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  if (scheme) return scheme;
  if (process.env.EAS_BUILD_PROFILE === "production") {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME tanımlı değil — iOS Google girişi çalışmaz. " +
        "Değer, iOS OAuth client ID'sinin tersidir (com.googleusercontent.apps.<id>).",
    );
  }
  return "com.googleusercontent.apps.unset";
}

const config: ExpoConfig = {
  name: "BumpInto",
  slug: "bumpinto",
  scheme: "bumpinto",
  version,
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/images/icon.png",

  ios: {
    bundleIdentifier: "app.bumpinto.mobile",
    supportsTablet: false,
    // Universal Links: bumpinto.app/j/<slug> davetleri uygulamada açılır.
    //
    // ÜCRETSİZ Apple hesabı bunu DESTEKLEMEZ: Xcode "Personal development teams … do not
    // support the Associated Domains capability" der, profil üretilmez. Expo ise bu
    // entitlement varsa SİMÜLATÖR derlemesinde bile imza ister
    // (`@expo/cli` simulatorCodeSigning.js) — yani ücretli üyelik gelene dek iOS hiç derlenmez.
    //
    // `BUMPINTO_DEV_NO_APPLINKS=1` YALNIZ yerel geliştirme için entitlement'ı düşürür;
    // `bumpinto://` şema derin linki çalışmaya devam eder, kaybolan yalnız https açılışıdır.
    // Varsayılan AÇIK: bayrak verilmedikçe entitlement HER ZAMAN üretilir, yayın derlemesi
    // kazara Universal Links'siz çıkmaz (I-3/plan44 submit kapısı bunu ayrıca doğrular).
    ...(process.env.BUMPINTO_DEV_NO_APPLINKS
      ? {}
      : { associatedDomains: ["applinks:bumpinto.app", "applinks:www.bumpinto.app"] }),
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PURPOSE,
      NSMicrophoneUsageDescription: MIC_PURPOSE,
      // Yalnız HTTPS/TLS kullanılıyor — Fransız şifreleme beyanı her yüklemede sorulmasın.
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "app.bumpinto.mobile",
    // `edgeToEdgeEnabled` SDK 57'de KALDIRILDI: Android 16 edge-to-edge'i zorunlu kılıyor,
    // ayar verilirse prebuild uyarı basar. Kenardan kenara düzen artık varsayılan davranış;
    // ekranlar `react-native-safe-area-context` ile güvenli alanı kendisi bırakır (T3/T4).
    predictiveBackGestureEnabled: true,
    // KAPALI LİSTE: Play "Data safety" formu tam olarak bu iki izinle doldurulur.
    permissions: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.RECORD_AUDIO"],
    // Modüllerin manifeste devrettiği fazlalıklar; arka plan konumu istenirse Play reddeder.
    blockedPermissions: [
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.CAMERA",
    ],
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    // App Links: assetlinks.json ile doğrulanır (autoVerify)
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        category: ["BROWSABLE", "DEFAULT"],
        data: [{ scheme: "https", host: "bumpinto.app", pathPrefix: "/j" }],
      },
    ],
  },

  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "expo-font",
    [
      "expo-build-properties",
      {
        android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 24 },
        // SDK 57 tabanı: expo-build-properties 16.4 altını REDDEDER (plan "15.1" diyordu — sahada geçersiz).
        ios: { deploymentTarget: "16.4" },
      },
    ],
    ["@react-native-google-signin/google-signin", { iosUrlScheme: googleIosUrlScheme() }],
    "expo-apple-authentication",
    ["expo-location", { locationWhenInUsePermission: LOCATION_PURPOSE, isIosBackgroundLocationEnabled: false }],
    ["expo-audio", { microphonePermission: MIC_PURPOSE }],
    // Harita motoru MapLibre (K-M2) — ANAHTARSIZ çalışır, Google Maps SDK'sı pakete GİRMEZ.
    // Eklenti yalnız native kütüphaneyi bağlar; döşeme stili çalışma anında `/api/config`ten.
    "@maplibre/maplibre-react-native",
    "./plugins/withPrivacyInfo",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
  ],

  experiments: { typedRoutes: true, reactCompiler: true },

  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8060",
    webBase: WEB_BASE,
    // Play "hesap silme" formu bu URL'yi ister: uygulama KURULU DEĞİLKEN de açılmalı,
    // bu yüzden /account yolu bilerek App Links dışında bırakıldı (yukarıdaki intentFilter).
    accountDeleteUrl: `${WEB_BASE}/account/delete`,
    supportEmail: "hello@bumpinto.app",
    // B-15 `GET /api/me/export` açılınca true (K-M5).
    exportEnabled: false,
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
};

export default config;
