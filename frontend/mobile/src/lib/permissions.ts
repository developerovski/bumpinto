import * as Audio from "expo-audio";
import * as Location from "expo-location";
import { Linking, PermissionsAndroid, Platform } from "react-native";

/**
 * İzin isteme TEK modülde: ekranlar yalnız kopya + düğmedir, sistem diyaloğunu buradan çağırır.
 *
 * `blocked` = sistem bir daha SORMAZ (iOS'ta ikinci ret, Android'de "bir daha sorma").
 * Tek çıkış Ayarlar; ekran O6 kurtarma kartını çizer.
 *
 * DİKKAT — `canAskAgain` ile ÖN ELEME YAPILMAZ. Android'de bu bayrak
 * `shouldShowRequestPermissionRationale()`'a düşer ve izin **hiç istenmemişken de `false`**
 * olur. `get*` sonucuna bakıp erken dönmek, sistem diyaloğunun İLK seferde hiç açılmaması
 * demekti (2026-09-08 emülatörde görüldü: ön-ekrandaki "Devam et" hiçbir şey yapmıyordu,
 * birim testler ise yanlış davranışı doğruluyordu). `request*` zaten kalıcı reddi tanır ve
 * diyalog açmadan `canAskAgain: false` döner — karar ORAYA bırakılır.
 *
 * Arka plan konumu BİLEREK yoktur — `*Background*` API'si bu dosyada asla kullanılmaz
 * (uyumluluk §6; `native-contract.test.ts` bunu ayrıca doğrular).
 */
export type PermissionOutcome = "granted" | "denied" | "blocked";

const outcome = (p: { granted: boolean; canAskAgain: boolean }): PermissionOutcome =>
  p.granted ? "granted" : p.canAskAgain ? "denied" : "blocked";

export async function requestLocationWhenInUse(): Promise<PermissionOutcome> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return "granted";
  return outcome(await Location.requestForegroundPermissionsAsync());
}

export async function requestMicrophone(): Promise<PermissionOutcome> {
  const current = await Audio.getRecordingPermissionsAsync();
  if (current.granted) return "granted";
  return outcome(await Audio.requestRecordingPermissionsAsync());
}

/**
 * Bluetooth kulaklığa YÖNLENDİRME izni (Android 12+ / API 31+).
 *
 * EN İYİ ÇABA: reddedilirse sesli sohbet BOZULMAZ, yalnız ses telefonun kendi
 * hoparlöründen/kulaklığından çıkar — `react-native-incall-manager` izni bulamayınca çökmez,
 * bluetooth'u sessizce atlar. Bu yüzden ayrı bir ön-ekran YOK: kullanıcı zaten O7'de sesli
 * sohbete izin verdi, bu onun ses yolunun bir ayrıntısı.
 *
 * iOS'ta karşılığı yok (yönlendirme AVAudioSession'ın işi) — orada hiç sorulmaz.
 */
export async function requestBluetoothConnect(): Promise<PermissionOutcome> {
  if (Platform.OS !== "android" || Number(Platform.Version) < 31) return "granted";
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  );
  if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
  return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "blocked" : "denied";
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
