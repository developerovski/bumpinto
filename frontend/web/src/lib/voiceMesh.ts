import type { AudioSink, MeshIceServer, MeshPeerConnection, MeshStream } from "@bumpinto/shared";

/** Tarayıcı tipini yapısal yüzeye bağlayan TEK cast (RN eşleniği `createRnPeer`). */
export function createWebPeer(config: { iceServers: MeshIceServer[] }): MeshPeerConnection {
  return new RTCPeerConnection(config as RTCConfiguration) as unknown as MeshPeerConnection;
}

/** Uzak akış bir `<audio>` elemanına BAĞLI olmalı: hem çalma hem analizör (Chrome/Safari) buna
    bakar. DOM'a EKLENMEMİŞ `<audio>` bazı tarayıcılarda (Safari) sessiz kalır — gizli, body'ye
    eklenir; `playsinline` niteliği de yine Safari için gerekir. */
export function createWebAudioSink(
  id: string,
  onWarn?: (m: string, ...rest: unknown[]) => void,
): AudioSink {
  const el = new Audio() as HTMLAudioElement & { playsInline?: boolean };
  el.setAttribute("playsinline", "");
  el.playsInline = true;
  el.autoplay = true;
  el.hidden = true;
  document.body.appendChild(el);
  return {
    play(stream: MeshStream) {
      el.srcObject = stream as unknown as MediaStream;
      // Autoplay reddi YUTULMAZ: kullanıcıya sessiz bir oturum bırakmaktansa günlüğe düşer.
      void el.play().catch((e) => onWarn?.("voice audio play rejected", id, e));
    },
    setMuted(muted: boolean) {
      el.muted = muted;
    },
    stop() {
      el.pause();
      el.srcObject = null;
      if (typeof el.remove === "function") el.remove();
    },
  };
}

export { VoiceMesh } from "@bumpinto/shared";
export type {
  IncomingSignal,
  OutgoingSignal,
  PeerSnapshot,
  PeerState,
  SignalType,
} from "@bumpinto/shared";
