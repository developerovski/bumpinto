import * as Audio from "expo-audio";
import * as Location from "expo-location";
import { Linking } from "react-native";

/**
 * İzin isteme TEK modülde: ekranlar yalnız kopya + düğmedir, sistem diyaloğunu buradan çağırır.
 *
 * `blocked` = sistem bir daha SORMAZ (iOS'ta ikinci ret, Android'de "bir daha sorma").
 * Bu durumda diyaloğu tekrar açmayı denemek sessiz başarısızlıktır; tek çıkış Ayarlar.
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
  if (!current.canAskAgain) return "blocked";
  return outcome(await Location.requestForegroundPermissionsAsync());
}

export async function requestMicrophone(): Promise<PermissionOutcome> {
  const current = await Audio.getRecordingPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "blocked";
  return outcome(await Audio.requestRecordingPermissionsAsync());
}

export async function openAppSettings(): Promise<void> {
  await Linking.openSettings();
}
