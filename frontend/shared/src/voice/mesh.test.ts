import { describe, expect, it, vi } from "vitest";

import { VoiceMesh, type MeshDeps } from "./mesh";
import type {
  AudioSink, LevelSampler, MeshIceCandidate, MeshIceServer, MeshPeerConnection, MeshSdp,
  MeshStream, MeshTrack, OutgoingSignal,
} from "./types";

class InvalidStateError extends Error {
  constructor(message = "InvalidStateError") {
    super(message);
    this.name = "InvalidStateError";
  }
}

class FakePeer {
  static all: FakePeer[] = [];
  /** Bir sonraki createOffer() çağrısını askıda bırakır — kimlik korumasını test etmek için. */
  static gateNextOffer = false;
  connectionState: string = "new";
  signalingState: string = "stable";
  remoteDescription: MeshSdp | null = null;
  localDescription: MeshSdp | null = null;
  candidates: MeshIceCandidate[] = [];
  offers: (unknown | undefined)[] = [];
  tracks: MeshTrack[] = [];
  closed = false;
  offerGate: { reject: (e: unknown) => void } | null = null;
  onicecandidate: ((e: { candidate: { toJSON(): MeshIceCandidate } | null }) => void) | null = null;
  ontrack: ((e: { streams: MeshStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor(public config: { iceServers: MeshIceServer[] }) {
    FakePeer.all.push(this);
  }
  addTrack(track: MeshTrack) {
    this.tracks.push(track);
  }
  async createOffer(options?: unknown) {
    this.offers.push(options);
    if (FakePeer.gateNextOffer) {
      FakePeer.gateNextOffer = false;
      return new Promise<{ type: "offer"; sdp: string }>((_, reject) => {
        this.offerGate = { reject };
      });
    }
    return { type: "offer" as const, sdp: `offer-${this.offers.length}` };
  }
  async createAnswer() {
    return { type: "answer" as const, sdp: "answer-1" };
  }
  async setLocalDescription(d: MeshSdp) {
    this.localDescription = d;
    this.signalingState = d.type === "offer" ? "have-local-offer" : "stable";
  }
  async setRemoteDescription(d: MeshSdp) {
    if (d.sdp === "bad") throw new InvalidStateError("malformed sdp");
    this.remoteDescription = d;
    this.signalingState = d.type === "offer" ? "have-remote-offer" : "stable";
  }
  async addIceCandidate(c: MeshIceCandidate) {
    if (this.closed) throw new InvalidStateError();
    this.candidates.push(c);
  }
  close() {
    this.closed = true;
  }
  /** Yüzey gereği var; seviye örneklemesi RN adaptörünün işi (T5). */
  getStats = async () => ({ forEach: () => undefined });
  setState(state: string) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

function harness(myId: string, overrides: Partial<MeshDeps> = {}) {
  FakePeer.all = [];
  FakePeer.gateNextOffer = false;
  const track: MeshTrack = { kind: "audio", enabled: true, stop: vi.fn() };
  const stream: MeshStream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const sent: OutgoingSignal[] = [];
  const onChange = vi.fn();
  const levels: LevelSampler & { speak?: (id: string, s: boolean) => void } = {
    attach: vi.fn(), detach: vi.fn(), close: vi.fn(),
  };
  // Mesh artık DOM bilmiyor: sink YAPISAL bir yüzey. Gerçek <audio> davranışı (gizli eleman,
  // playsinline, autoplay reddi) web adaptörünün kendi testinde yaşıyor.
  const sink: AudioSink & { played: MeshStream[]; muted: boolean } = {
    played: [],
    muted: false,
    play(stream) { this.played.push(stream); },
    setMuted(muted) { this.muted = muted; },
    stop: vi.fn(),
  };
  const mesh = new VoiceMesh({
    myId,
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    stream,
    send: (s) => sent.push(s),
    onChange,
    createPeer: (config) => new FakePeer(config) as unknown as MeshPeerConnection,
    createAudio: () => sink,
    createLevels: (cb) => {
      levels.speak = cb;
      return levels;
    },
    ...overrides,
  });
  return { mesh, sent, onChange, levels, sink, track };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("VoiceMesh", () => {
  it("küçük id teklif eder, büyük id bekler; ikisi de bağlantıyı önceden kurar (K5)", async () => {
    const a = harness("a");
    a.mesh.setRoster(["a", "b"]);
    await flush();
    expect(a.sent).toEqual([{ to: "b", type: "offer", sdp: "offer-1" }]);
    expect(FakePeer.all[0].config.iceServers).toHaveLength(1);
    expect(FakePeer.all[0].tracks).toHaveLength(1);

    const c = harness("c");
    c.mesh.setRoster(["b", "c"]);
    await flush();
    expect(c.sent).toEqual([]);
    expect(FakePeer.all).toHaveLength(1); // c'nin b için bağlantısı hazır, teklif yok
    expect(c.mesh.snapshot()).toEqual({ b: { state: "connecting", speaking: false } });
  });

  it("gelen offer'a answer üretir, önce gelen ICE adaylarını remote description'dan sonra ekler", async () => {
    const h = harness("z");
    h.mesh.setRoster(["a", "z"]);
    await h.mesh.handleSignal({ from: "a", type: "ice", candidate: { candidate: "c1" } });
    const pc = FakePeer.all[0];
    expect(pc.candidates).toEqual([]); // remote yokken kuyrukta

    await h.mesh.handleSignal({ from: "a", type: "offer", sdp: "o" });
    expect(pc.remoteDescription).toEqual({ type: "offer", sdp: "o" });
    expect(pc.candidates).toEqual([{ candidate: "c1" }]);
    expect(h.sent).toEqual([{ to: "a", type: "answer", sdp: "answer-1" }]);
  });

  it("yerel ICE adayı karşıya gider; ontrack sesi bağlar ve örnekleyiciye verir", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    const pc = FakePeer.all[0];
    pc.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: "local-1" }) } });
    expect(h.sent.at(-1)).toEqual({ to: "b", type: "ice", candidate: { candidate: "local-1" } });

    const remote: MeshStream = { getTracks: () => [], getAudioTracks: () => [] };
    pc.ontrack?.({ streams: [remote] });
    expect(h.sink.played).toEqual([remote]);
    expect(h.levels.attach).toHaveBeenCalledWith("b", remote);
  });

  it("remote description zaten kurulu iken yeni offer PC'yi yeniden kurar (K5 asimetrisi bozulmaz)", async () => {
    const h = harness("z");
    h.mesh.setRoster(["a", "z"]);
    await h.mesh.handleSignal({ from: "a", type: "offer", sdp: "o1" });
    const first = FakePeer.all[0];
    expect(first.remoteDescription).toEqual({ type: "offer", sdp: "o1" });

    await h.mesh.handleSignal({ from: "a", type: "offer", sdp: "o2" });

    expect(first.closed).toBe(true);
    expect(FakePeer.all).toHaveLength(2);
    expect(FakePeer.all[1].remoteDescription).toEqual({ type: "offer", sdp: "o2" });
    expect(h.sent.at(-1)).toEqual({ to: "a", type: "answer", sdp: "answer-1" });
  });

  it("roster'dan düşen peer kapanır ve örnekleyiciden çıkar", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.mesh.setRoster(["a"]);
    expect(FakePeer.all[0].closed).toBe(true);
    expect(h.levels.detach).toHaveBeenCalledWith("b");
    expect(h.mesh.snapshot()).toEqual({});
  });

  it("peer düşünce ses sink'i bırakılır", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    const pc = FakePeer.all[0];
    pc.ontrack?.({ streams: [{ getTracks: () => [], getAudioTracks: () => [] }] });
    expect(h.sink.played).toHaveLength(1);

    h.mesh.setRoster(["a"]); // b düşer
    expect(h.sink.stop).toHaveBeenCalled();
  });

  it("sustur yerel track'i kapatır, bağlantıyı değil", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.mesh.setMuted(true);
    expect(h.track.enabled).toBe(false);
    expect(FakePeer.all[0].closed).toBe(false);
    h.mesh.setMuted(false);
    expect(h.track.enabled).toBe(true);
  });

  it("answer alınca kuyruklanan ICE adayları sırayla eklenir", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const pc = FakePeer.all[0];
    await h.mesh.handleSignal({ from: "b", type: "ice", candidate: { candidate: "c1" } });
    await h.mesh.handleSignal({ from: "b", type: "ice", candidate: { candidate: "c2" } });
    expect(pc.candidates).toEqual([]); // remote yokken kuyrukta

    await h.mesh.handleSignal({ from: "b", type: "answer", sdp: "ans" });
    expect(pc.remoteDescription).toEqual({ type: "answer", sdp: "ans" });
    expect(pc.candidates).toEqual([{ candidate: "c1" }, { candidate: "c2" }]);
  });

  it("yinelenen/gecikmiş answer no-op'tur: peer failed olmaz, ikinci sdp yazılmaz", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const pc = FakePeer.all[0];
    await h.mesh.handleSignal({ from: "b", type: "answer", sdp: "ans-1" });
    expect(h.mesh.snapshot().b.state).toBe("connecting");

    await h.mesh.handleSignal({ from: "b", type: "answer", sdp: "ans-2" });
    expect(h.mesh.snapshot().b.state).toBe("connecting"); // failed olmadı
    expect(pc.remoteDescription).toEqual({ type: "answer", sdp: "ans-1" }); // ikinci yazılmadı
  });

  it("setRemoteDescription gerçekten patlarsa fail() peer'i failed yapar", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    await h.mesh.handleSignal({ from: "b", type: "answer", sdp: "bad" });
    expect(h.mesh.snapshot().b.state).toBe("failed");
  });

  it("bilinmeyen peer'den gelen answer yoksayılır, PC oluşturmaz", async () => {
    const h = harness("z");
    await h.mesh.handleSignal({ from: "a", type: "answer", sdp: "stray" });
    expect(FakePeer.all).toHaveLength(0);
  });

  it("failed: başlatıcı PC'yi taze kurup yeni offer yollar; connected sonrası restarted sıfırlanır", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const first = FakePeer.all[0];
    first.setState("connected");
    expect(h.mesh.snapshot().b.state).toBe("connected");

    first.setState("failed");
    await flush();
    expect(first.closed).toBe(true);
    expect(FakePeer.all).toHaveLength(2);
    const second = FakePeer.all[1];
    expect(second.offers).toHaveLength(1);
    expect(h.mesh.snapshot().b.state).toBe("connecting");

    // connected sonrası restarted sıfırlanır: sonraki arıza bölümü yine yeniden kurma hakkı kazanır
    second.setState("connected");
    second.setState("failed");
    await flush();
    expect(second.closed).toBe(true);
    expect(FakePeer.all).toHaveLength(3);
    expect(FakePeer.all[2].offers).toHaveLength(1);
    expect(h.mesh.snapshot().b.state).toBe("connecting");
  });

  it("aynı arıza bölümünde ikinci failed yeniden kurmaz, failed kalır", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const first = FakePeer.all[0];
    first.setState("failed");
    await flush();
    const second = FakePeer.all[1];

    second.setState("failed"); // connected'a hiç uğramadı, restarted hâlâ true
    await flush();
    expect(FakePeer.all).toHaveLength(2); // yeniden kurulmadı
    expect(second.closed).toBe(false);
    expect(h.mesh.snapshot().b.state).toBe("failed");
  });

  it("arızalı peer roster değişince yeniden kurulur ve tekrar teklif eder (I3)", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const first = FakePeer.all[0];
    first.setState("failed");
    await flush();
    const second = FakePeer.all[1];
    second.setState("failed"); // aynı bölümde ikinci failed: yeniden kurulmaz, failed kalır
    await flush();
    expect(h.mesh.snapshot().b.state).toBe("failed");

    // Roster değişir (üçüncü katılımcı eklenir): failed peer YENİ bölüm olarak yeniden kurulur
    h.mesh.setRoster(["a", "b", "c"]);
    await flush();

    expect(second.closed).toBe(true); // arızalı PC bırakıldı
    const rebuilt = FakePeer.all[2];
    expect(rebuilt.offers).toHaveLength(1); // taze offer gönderildi
    expect(h.mesh.snapshot().b.state).toBe("connecting");
    expect(h.mesh.snapshot().c.state).toBe("connecting");
  });

  it("eski PC'nin gecikmiş createOffer reddi taze peer'i etkilemez (kimlik korunur)", async () => {
    const h = harness("a");
    FakePeer.gateNextOffer = true; // ilk offer (eski PC) askıda kalacak
    h.mesh.setRoster(["a", "b"]);
    const first = FakePeer.all[0];
    expect(first.offerGate).not.toBeNull();

    // Arıza: başlatıcı eski PC'yi düşürüp tazesini kurar; tazenin offer'ı normal şekilde gider
    first.setState("failed");
    await flush();
    expect(first.closed).toBe(true);
    expect(FakePeer.all).toHaveLength(2);
    const fresh = FakePeer.all[1];
    expect(h.mesh.snapshot().b.state).toBe("connecting");

    // Şimdi eski (artık kapalı) PC'nin askıda kalan createOffer'ı reddedilsin
    first.offerGate?.reject(new Error("stale createOffer rejected"));
    await flush();

    expect(h.mesh.snapshot().b.state).toBe("connecting"); // taze peer failed olmadı
    expect(fresh.closed).toBe(false);
  });

  it("watchdog: süresinde connected olmazsa başlatıcı PC'yi yeniden kurar", async () => {
    vi.useFakeTimers();
    try {
      const h = harness("a", { watchdogMs: 100 });
      h.mesh.setRoster(["a", "b"]);
      await vi.advanceTimersByTimeAsync(100);
      expect(FakePeer.all).toHaveLength(2);
      expect(FakePeer.all[0].closed).toBe(true);
      expect(h.mesh.snapshot().b.state).toBe("connecting");
    } finally {
      vi.useRealTimers();
    }
  });

  it("disconnected connecting durumuna düşer", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    const pc = FakePeer.all[0];
    pc.setState("connected");
    pc.setState("disconnected");
    expect(h.mesh.snapshot().b.state).toBe("connecting");
  });

  it("bilinmeyen peer'den gelen geç ICE PC oluşturmaz, sonra offerla gelen PC'ye aktarılır", async () => {
    const h = harness("z");
    await h.mesh.handleSignal({ from: "a", type: "ice", candidate: { candidate: "late-1" } });
    expect(FakePeer.all).toHaveLength(0);

    h.mesh.setRoster(["a", "z"]);
    await h.mesh.handleSignal({ from: "a", type: "offer", sdp: "o" });
    const pc = FakePeer.all[0];
    expect(pc.candidates).toEqual([{ candidate: "late-1" }]);
  });

  it("konuşma bildirimi peer'e ve kendine düşer", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.levels.speak?.("b", true);
    h.levels.speak?.("a", true);
    expect(h.onChange).toHaveBeenLastCalledWith({ b: { state: "connecting", speaking: true } }, true);
  });

  it("bilinmeyen id için konuşma bildirimi emit tetiklemez", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.onChange.mockClear();
    h.levels.speak?.("ghost", true);
    expect(h.onChange).not.toHaveBeenCalled();
  });

  it("close her şeyi bırakır: bağlantılar, mikrofon, örnekleyici, selfSpeaking false raporlanır", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.levels.speak?.("a", true);
    h.mesh.close();
    expect(FakePeer.all[0].closed).toBe(true);
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.levels.close).toHaveBeenCalled();
    expect(h.onChange).toHaveBeenLastCalledWith({}, false);
    h.mesh.setRoster(["a", "b", "c"]); // kapalı mesh yeni bağlantı açmaz
    expect(FakePeer.all).toHaveLength(1);
  });

  it("setMutedPeers uzak sesi susturur ve geri açar", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    const pc = FakePeer.all[0];
    pc.ontrack?.({ streams: [{ getTracks: () => [], getAudioTracks: () => [] }] });

    h.mesh.setMutedPeers(["b"]);
    expect(h.sink.muted).toBe(true);
    h.mesh.setMutedPeers([]);
    expect(h.sink.muted).toBe(false);
  });
});
