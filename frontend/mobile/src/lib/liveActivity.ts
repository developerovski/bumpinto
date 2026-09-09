/**
 * Live Activity / Live Update köprüsü — **TASLAK** (artboard P26).
 *
 * Bugün hiçbir yerel modül bağlı DEĞİLDİR: `isLiveActivityAvailable()` daima false döner ve
 * başlatma `null` verir. Amacı, çağrı yerlerinin (lobi → deste → karar geçişleri) B-16'dan
 * önce yazılabilmesi ve o iz geldiğinde TEK dosyanın değişmesidir. Gerçek uygulama şunları
 * gerektirir: iOS'ta ayrı bir Widget Extension target'ı + ActivityKit, Android 16'da Live
 * Update bildirimi, her ikisi için de sunucu tarafı push (B-16 `device_tokens`).
 *
 * Sahte bir "canlı" arayüz ÇİZİLMEZ: kilit ekranında güncellenmeyen bir kart, güncellenen
 * bir kart sözü verip tutmamaktır.
 */
import { NativeModules, Platform } from "react-native";

/** P26'nın gösterdiği alanlar — B-16 bu şekli aynen taşır. */
export type SessionActivityState = {
  slug: string;
  title: string;
  subtitle: string;
  readyCount: number;
  totalCount: number;
};

/** B-16'da bu ada sahip yerel modül tanımlanır; yokken köprü kapalıdır. */
const NATIVE = (NativeModules as Record<string, unknown>).BumpIntoLiveActivity;

export function isLiveActivityAvailable(): boolean {
  if (!NATIVE) return false;
  // iOS 16.1+ ActivityKit, Android 16 Live Update — sürüm kapısı B-16'da yerel tarafta.
  return Platform.OS === "ios" || Platform.OS === "android";
}

/** Etkinliği başlatır; köprü kapalıyken `null` döner (çağıran sessizce devam eder). */
export async function startSessionActivity(_state: SessionActivityState): Promise<string | null> {
  if (!isLiveActivityAvailable()) return null;
  return null; // B-16: NATIVE.start(_state)
}

export async function updateSessionActivity(
  _activityId: string,
  _patch: Partial<SessionActivityState>,
): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  // B-16: NATIVE.update(_activityId, _patch)
}

export async function endSessionActivity(_activityId: string): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  // B-16: NATIVE.end(_activityId)
}
