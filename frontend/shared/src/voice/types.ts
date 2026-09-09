/** Platformdan bağımsız WebRTC yüzeyi. DOM `RTCPeerConnection` ve `react-native-webrtc`'nin
    sınıfı bu şeklin üst kümesidir; her platform adaptörü TEK cast ile bağlanır ve o cast adaptör
    testiyle korunur. Mesh bu dosyanın dışında hiçbir tarayıcı/RN tipini bilmez. */
export type SignalType = "offer" | "answer" | "ice";
export type MeshIceCandidate = {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
};
export type OutgoingSignal = {
  to: string;
  type: SignalType;
  sdp?: string;
  candidate?: MeshIceCandidate;
};
export type IncomingSignal = {
  from: string;
  type: SignalType;
  sdp?: string;
  candidate?: MeshIceCandidate;
};
export type PeerState = "connecting" | "connected" | "failed";
export type PeerSnapshot = { state: PeerState; speaking: boolean };
export type MeshIceServer = { urls: string | string[]; username?: string; credential?: string };
export type MeshSdp = { type: "offer" | "answer"; sdp?: string };
export type MeshTrack = { kind: string; enabled: boolean; stop(): void };
export type MeshStream = { getTracks(): MeshTrack[]; getAudioTracks(): MeshTrack[] };
/** `getStats()` girdisinden yalnız okuduğumuz alanlar; RN'de seviye buradan gelir (T5). */
export type MeshStatsEntry = { type?: string; kind?: string; audioLevel?: number };
export type MeshStatsReport = { forEach(cb: (entry: MeshStatsEntry) => void): void };

export type MeshPeerConnection = {
  connectionState: string;
  signalingState: string;
  remoteDescription: unknown;
  addTrack(track: MeshTrack, stream: MeshStream): unknown;
  createOffer(): Promise<MeshSdp>;
  createAnswer(): Promise<MeshSdp>;
  setLocalDescription(desc: MeshSdp): Promise<void>;
  setRemoteDescription(desc: MeshSdp): Promise<void>;
  addIceCandidate(candidate: MeshIceCandidate): Promise<void>;
  getStats(): Promise<MeshStatsReport>;
  close(): void;
  onicecandidate: ((e: { candidate: { toJSON(): MeshIceCandidate } | null }) => void) | null;
  ontrack: ((e: { streams: MeshStream[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
};

/**
 * Uzak sesin çalındığı yer. Web: gizli `<audio>`. RN: kütüphane track'i kendisi çalar → no-op.
 *
 * `setMuted` YEREL sustur (R-W15) — yalnız bu cihazda uzak sesi kapatır, sunucuya gitmez ve
 * karşı taraf bilmez. Plan40'ın taslak yüzeyinde yoktu; `VoiceMesh.setMutedPeers` DOM'un
 * `audio.muted`'ına yazdığı için yüzeye alınmasaydı taşımada bu YETENEK sessizce kaybolurdu
 * (web `PersonSheet` kullanıyor).
 */
export type AudioSink = {
  play(stream: MeshStream): void;
  setMuted(muted: boolean): void;
  stop(): void;
};

export type LevelSampler = {
  attach(id: string, stream: MeshStream): void;
  /** RN seviyeyi `pc.getStats()`ten okur; web örnekleyicisi bunu uygulamaz. */
  attachPeer?(id: string, pc: MeshPeerConnection): void;
  detach(id: string): void;
  close(): void;
};
