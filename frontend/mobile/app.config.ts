import type { ExpoConfig } from "expo/config";

import { version } from "./package.json";

/**
 * BumpInto mobil — Expo yapılandırması (CNG).
 *
 * Sürüm TEK kaynaktan (`package.json`) okunur; build numarasını EAS uzaktan artırır
 * (`appVersionSource: "remote"`, I-3/plan44).
 *
 * Kapsam notu: `expo-location` purpose string'leri (O3/O7 metinleri) ve
 * `PrivacyInfo.xcprivacy` **M-5**'te eklenir — burada eklenirse iki planda iki farklı
 * metin oluşur. `expo-build-properties` yapılandırması (compileSdk/targetSdk 36 kapısı)
 * **I-3/plan44 T8**'e aittir; burada eklenti yalnız kayıtlıdır.
 */
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
      : { associatedDomains: ["applinks:bumpinto.app"] }),
    config: { googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY },
  },

  android: {
    package: "app.bumpinto.mobile",
    // `edgeToEdgeEnabled` SDK 57'de KALDIRILDI: Android 16 edge-to-edge'i zorunlu kılıyor,
    // ayar verilirse prebuild uyarı basar. Kenardan kenara düzen artık varsayılan davranış;
    // ekranlar `react-native-safe-area-context` ile güvenli alanı kendisi bırakır (T3/T4).
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY } },
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
    "expo-build-properties",
    "@react-native-google-signin/google-signin",
    ["expo-location", { isIosBackgroundLocationEnabled: false }],
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
    webBase: process.env.EXPO_PUBLIC_WEB_BASE ?? "https://bumpinto.app",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
};

export default config;
