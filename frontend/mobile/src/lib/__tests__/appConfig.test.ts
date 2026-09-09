import config from "../../../app.config";

/**
 * Mağaza beyanları (R-M16). Purpose string'ler O4/O7 diyalog metinleriyle BİREBİR aynıdır;
 * burada değişirse mağaza formu ile cihazdaki diyalog ayrışır.
 *
 * Not: `android.edgeToEdgeEnabled` SDK 57'de KALDIRILDI (M-4 saha notu, app.config.ts) —
 * Android 16 edge-to-edge'i zaten zorunlu kılıyor, ayar verilirse prebuild uyarı basar.
 */
const LOCATION =
  "Herkese adil orta noktayı hesaplamak için konumunu kullanırız. " +
  "Yalnız uygulama açıkken; arkadaşlarına ~1 km yuvarlanmış gösterilir.";
const MIC =
  "Buluşmadaki arkadaşlarınla sesli konuşabilmen için mikrofon gerekir. Ses kaydedilmez.";

const expo = config;

test("purpose string'ler O4/O7 metinleriyle birebir aynı, ihracat beyanı false", () => {
  expect(expo.ios!.infoPlist!.NSLocationWhenInUseUsageDescription).toBe(LOCATION);
  expect(expo.ios!.infoPlist!.NSMicrophoneUsageDescription).toBe(MIC);
  expect(expo.ios!.infoPlist!.ITSAppUsesNonExemptEncryption).toBe(false);
});

test("eklenti purpose string'leri Info.plist ile aynı metni kullanır", () => {
  const location = expo.plugins!.find((p) => Array.isArray(p) && p[0] === "expo-location") as [
    string,
    { locationWhenInUsePermission: string; isIosBackgroundLocationEnabled: boolean },
  ];
  expect(location[1].locationWhenInUsePermission).toBe(LOCATION);
  expect(location[1].isIosBackgroundLocationEnabled).toBe(false);
  const audio = expo.plugins!.find((p) => Array.isArray(p) && p[0] === "expo-audio") as [
    string,
    { microphonePermission: string },
  ];
  expect(audio[1].microphonePermission).toBe(MIC);
});

/* İzin listesi BEKÇİ testi: her yeni izin bilinçli bir mağaza kararıdır, kazayla eklenemez.
   `BLUETOOTH_CONNECT` 2026-09-09'da kullanıcı kararıyla girdi (M-6): WebRTC eklentisi onu
   eklemiyor ve izinsiz kalınca `react-native-incall-manager` bluetooth kulaklığı SESSİZCE
   atlıyordu — ses telefondan çıkıyordu. Çalışma zamanı talebi `requestBluetoothConnect`te. */
test("yalnız beklenen tehlikeli Android izinleri istenir, arka plan konumu engellenir", () => {
  expect(expo.android!.permissions).toEqual([
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.RECORD_AUDIO",
    "android.permission.BLUETOOTH_CONNECT",
  ]);
  expect(expo.android!.blockedPermissions).toContain(
    "android.permission.ACCESS_BACKGROUND_LOCATION",
  );
  expect(expo.android!.blockedPermissions).toContain("android.permission.CAMERA");
});

test("derin link yalnız /j/ yakalar; /account/delete web'de kalır", () => {
  expect(expo.ios!.associatedDomains).toContain("applinks:bumpinto.app");
  // `data` tekil nesne ya da dizi olabilir (Expo tipi) — ikisini de düzleştir.
  const data = expo.android!.intentFilters!.flatMap((f) => (f.data ? [f.data].flat() : []));
  expect(data.some((d) => d.pathPrefix === "/j")).toBe(true);
  expect(expo.android!.intentFilters!.every((f) => f.autoVerify)).toBe(true);
  // Play hesap silme URL'si uygulama KURULU DEĞİLKEN de açılmalı: /account App Links'te olamaz.
  expect(data.some((d) => String(d.pathPrefix).startsWith("/account"))).toBe(false);
});

test("mobil Google Maps KULLANMAZ — anahtar tanımı yok (MAP_ENGINE=maplibre)", () => {
  // Anahtar tanımlamak Google Maps SDK'sını pakete sokar ve mağaza gizlilik beyanını yalanlar.
  expect((expo.ios as { config?: unknown }).config).toBeUndefined();
  expect((expo.android as { config?: unknown }).config).toBeUndefined();
  expect(JSON.stringify(expo)).not.toContain("googleMaps");
});

test("iOS Google girişi URL şeması eklentiye VERİLİR (yoksa şema hiç yazılmaz)", () => {
  const plugin = expo.plugins!.find(
    (p) => Array.isArray(p) && p[0] === "@react-native-google-signin/google-signin",
  ) as [string, { iosUrlScheme: string }];
  expect(plugin[1].iosUrlScheme).toMatch(/^com\.googleusercontent\.apps\./);
});

test("target API 36, PrivacyInfo eklentisi ve hesap silme URL'si", () => {
  const build = expo.plugins!.find((p) => Array.isArray(p) && p[0] === "expo-build-properties") as [
    string,
    { android: { targetSdkVersion: number; compileSdkVersion: number } },
  ];
  expect(build[1].android.targetSdkVersion).toBe(36);
  expect(build[1].android.compileSdkVersion).toBe(36);
  expect(expo.plugins!.some((p) => String(p).includes("withPrivacyInfo"))).toBe(true);
  expect(expo.extra!.accountDeleteUrl).toBe("https://bumpinto.app/account/delete");
  expect(expo.extra!.supportEmail).toBe("hello@bumpinto.app");
  expect(expo.extra!.exportEnabled).toBe(false);
});
