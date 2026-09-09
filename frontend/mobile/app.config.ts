import type { ExpoConfig } from "expo/config";

import { version } from "./package.json";


const LOCATION_PURPOSE =
  "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. " +
  "Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir.";

const MIC_PURPOSE =
  "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez.";

/* Kamera YALNIZ davet QR'ı için açılır (M-9). Metin `code.scanDisclosure` ile aynı sözü verir:
   iki farklı gerekçe yazılsaydı mağaza incelemesi çelişki görürdü. M-5 tüm purpose string'leri
   O4/O7'den tek yerde toplarken bu satır oraya alınır (K-M7). */
const CAMERA_PURPOSE =
  "BumpInto kamerayı yalnız arkadaşının davet QR kodunu okumak için kullanır. " +
  "Görüntü kaydedilmez, gönderilmez.";

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_BASE ?? "https://bumpinto.app";


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
       ...(process.env.BUMPINTO_DEV_NO_APPLINKS
      ? {}
      : { associatedDomains: ["applinks:bumpinto.app", "applinks:www.bumpinto.app"] }),
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PURPOSE,
      NSMicrophoneUsageDescription: MIC_PURPOSE,
      NSCameraUsageDescription: CAMERA_PURPOSE,
      // Yalnız HTTPS/TLS kullanılıyor — Fransız şifreleme beyanı her yüklemede sorulmasın.
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "app.bumpinto.mobile",
        predictiveBackGestureEnabled: false,
    // KAPALI LİSTE: Play "Data safety" formu tam olarak bu iki izinle doldurulur.
    permissions: [
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.RECORD_AUDIO",
      // Davet QR'ını okumak (M-9). WebRTC eklentisi kamerayı KAPALI tutuyor (video yok);
      // buradaki izin yalnız `expo-camera`nın tarayıcısı içindir.
      "android.permission.CAMERA",
      // Sesli sohbette bluetooth kulaklığa yönlendirme (M-6). WebRTC eklentisi bunu EKLEMİYOR;
      // `react-native-incall-manager` API 31+'ta izni bulamayınca çökmez ama bluetooth'u
      // SESSİZCE atlar (`AppRTCBluetoothManager` yalnız uyarı basar) — kulaklık takan kullanıcı
      // sesi telefondan alırdı. 2026-09-09 kullanıcı kararı: destekle.
      "android.permission.BLUETOOTH_CONNECT",
    ],
    // Modüllerin manifeste devrettiği fazlalıklar; arka plan konumu istenirse Play reddeder.
    blockedPermissions: [
      "android.permission.ACCESS_BACKGROUND_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      // `expo-file-system` bunları `maxSdkVersion=32` ile manifeste devrediyor (M-9). Bizim
      // yazdığımız TEK dosya uygulamanın KENDİ önbelleğinde (kart PNG'si, .ics) — orası hiçbir
      // API düzeyinde izin istemez. Play "Data safety" formu bu listeyle dolduruluyor:
      // kullanılmayan bir depolama izni orada açıklanamaz.
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
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
    // QR tarama (M-9). `recordAudioAndroidPermission: false` — tarayıcı video kaydetmez,
    // gereksiz bir mikrofon izni manifeste girmesin.
    ["expo-camera", { cameraPermission: CAMERA_PURPOSE, recordAudioAndroidPermission: false }],
    // Sesli sohbet (M-6). Purpose string O7 kopyasıdır — `MIC_PURPOSE` ile TEK kaynak;
    // ikinci bir metin yazılsaydı mağaza incelemesi iki farklı gerekçe görürdü.
    // Android tarafında aynı eklenti RECORD_AUDIO / MODIFY_AUDIO_SETTINGS / BLUETOOTH_CONNECT
    // ekler; `android.permissions` listesine ELLE eklenmez (çift kayıt).
    [
      "@config-plugins/react-native-webrtc",
      {
        microphonePermission: MIC_PURPOSE,
        // Kamera KAPALI: sesli sohbet video açmaz; gereksiz izin incelemede soru işareti olur.
        cameraPermission: false,
      },
    ],
    // Harita motoru MapLibre (K-M2) — ANAHTARSIZ çalışır, Google Maps SDK'sı pakete GİRMEZ.
    // Eklenti yalnız native kütüphaneyi bağlar; döşeme stili çalışma anında `/api/config`ten.
    "@maplibre/maplibre-react-native",
    "./plugins/withPrivacyInfo",
    // Live Activity taslağı (M-9 T7): yalnız Info.plist anahtarı; widget target'ı B-16'da.
    "./plugins/withLiveActivity",
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
