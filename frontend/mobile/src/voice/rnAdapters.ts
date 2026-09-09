import type { AudioSink, MeshIceServer, MeshPeerConnection } from "@bumpinto/shared";
import { RTCPeerConnection } from "react-native-webrtc";

/** `react-native-webrtc` sınıfını yapısal yüzeye bağlayan TEK cast (web: `createWebPeer`). */
export function createRnPeer(config: { iceServers: MeshIceServer[] }): MeshPeerConnection {
  return new RTCPeerConnection(config as never) as unknown as MeshPeerConnection;
}

/**
 * RN'de uzak ses track'ini KÜTÜPHANE kendisi çalar; ayrı bir çalıcı yoktur.
 *
 * Yönlendirme (kulaklık/hoparlör/bluetooth) `audioSession`in işidir. Sink yalnız arayüzü
 * doldurur — yerel sustur (`setMuted`) de burada anlamsız: web'de uzak `<audio>` elemanını
 * susturur, RN'de karşılığı yok. Sessizce yutulur ki mesh'in tek gövdesi iki platformda da
 * aynı kalsın (K-M6'nın "yerel sustur mobilde YOK" kaydı M-9'da açılır).
 */
export function createSilentSink(): AudioSink {
  return { play: () => undefined, setMuted: () => undefined, stop: () => undefined };
}
