import type { MeshStream } from "@bumpinto/shared";
import { mediaDevices } from "react-native-webrtc";

import { presentMicConsent } from "../lib/micConsent";

/**
 * Sesli sohbet için mikrofon akışı.
 *
 * İzin AKIŞI burada YENİDEN yazılmaz: O7 ön-ekranı, sistem diyaloğu ve
 * `granted`/`denied`/`blocked` ayrımı M-5'te (`presentMicConsent` →
 * `app/(sheets)/mic-consent.tsx` → `requestMicrophone`). O modül kendi başlığında bu çağrıyı
 * "M-6 dock'unun TEK giriş noktası" diye tanımlıyor ve `getUserMedia`nın rızadan ÖNCE
 * çağrılmamasını şart koşuyor — bu dosya o sözleşmeyi uygular.
 *
 * Durumların anlamı (dock bunlara göre dallanır):
 * - `denied`   sistem tekrar sorabilir → "Tekrar dene" anlamlı.
 * - `blocked`  sistem bir daha sormaz → tek yol Ayarlar (O6 kurtarması).
 * - `dismissed` kullanıcı ön-ekranı kapattı → sessiz dönüş, hata gösterilmez.
 * - `failed`   izin VAR ama cihaz akışı vermedi (mikrofon meşgul, donanım) → bağlantı hatası
 *              metni. Bunu `denied` saymak kullanıcıyı olmayan bir ayarı düzeltmeye gönderirdi.
 */
export type MicResult =
  | { status: "granted"; stream: MeshStream }
  | { status: "denied" }
  | { status: "blocked" }
  | { status: "dismissed" }
  | { status: "failed" };

export type MicDeps = {
  getUserMedia: (constraints: { audio: boolean }) => Promise<MeshStream>;
};

export const defaultMicDeps: MicDeps = {
  getUserMedia: (constraints) =>
    mediaDevices.getUserMedia(constraints) as unknown as Promise<MeshStream>,
};

export async function acquireMic(deps: MicDeps = defaultMicDeps): Promise<MicResult> {
  const consent = await presentMicConsent();
  if (consent !== "granted") return { status: consent === "dismissed" ? "dismissed" : consent };

  try {
    return { status: "granted", stream: await deps.getUserMedia({ audio: true }) };
  } catch {
    return { status: "failed" };
  }
}
