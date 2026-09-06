import { createLevelSampler, type LevelSampler } from "./audioLevels";

export type SignalType = "offer" | "answer" | "ice";
export type OutgoingSignal = { to: string; type: SignalType; sdp?: string; candidate?: RTCIceCandidateInit };
export type IncomingSignal = { from: string; type: SignalType; sdp?: string; candidate?: RTCIceCandidateInit };
export type PeerState = "connecting" | "connected" | "failed";
export type PeerSnapshot = { state: PeerState; speaking: boolean };

/** Uzak akış bir Audio elemanına BAĞLI olmalı: hem çalma hem analizör (Chrome/Safari) buna
    bakar. DOM'a EKLENMEMİŞ <audio> bazı tarayıcılarda (Safari) sessiz kalır — gizli, body'ye
    eklenir; "playsinline" niteliği de yine Safari için gerekir. */
function defaultCreateAudio(): HTMLAudioElement {
  const a = new Audio();
  a.setAttribute("playsinline", "");
  a.hidden = true;
  document.body.appendChild(a);
  return a;
}

export type MeshDeps = {
  myId: string;
  iceServers: RTCIceServer[];
  /** Yerel mikrofon; close() track'leri durdurur. */
  stream: MediaStream;
  send: (signal: OutgoingSignal) => void;
  onChange: (peers: Record<string, PeerSnapshot>, selfSpeaking: boolean) => void;
  createPeer?: (config: RTCConfiguration) => RTCPeerConnection;
  createAudio?: () => HTMLAudioElement;
  createLevels?: (onSpeaking: (id: string, speaking: boolean) => void) => LevelSampler;
  /** Bağlantı bu sürede "connected"e ulaşmazsa arıza bölümü gibi ele alınır. */
  watchdogMs?: number;
};

type Peer = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement | null;
  state: PeerState;
  speaking: boolean;
  restarted: boolean;
  pendingIce: RTCIceCandidateInit[];
  watchdog: ReturnType<typeof setTimeout> | undefined;
};

/** Full-mesh ses (spec K1). React yok; tarayıcı API'leri enjekte edilir, test sahteyle koşar.
    Teklif kuralı K5: `myId < peerId` olan taraf offer üretir; diğeri bağlantıyı kurar ve bekler.
    Eşzamanlı katılım, yeniden bağlanma ve roster sırası bu kuralı bozmaz. */
export class VoiceMesh {
  private readonly peers = new Map<string, Peer>();
  private readonly levels: LevelSampler;
  /** Henüz PC'si olmayan peer'lerden gelen ICE — offer'la PC kurulunca aktarılır. */
  private readonly orphanIce = new Map<string, RTCIceCandidateInit[]>();
  private selfSpeaking = false;
  private closed = false;

  constructor(private readonly deps: MeshDeps) {
    const createLevels = deps.createLevels ?? ((cb) => createLevelSampler(cb));
    this.levels = createLevels((id, speaking) => this.onSpeaking(id, speaking));
    this.levels.attach(deps.myId, deps.stream);
  }

  setRoster(ids: string[]) {
    if (this.closed) return;
    const others = new Set(ids.filter((id) => id !== this.deps.myId));
    for (const id of [...this.peers.keys()]) {
      if (!others.has(id)) this.drop(id);
    }
    for (const id of others) {
      const existing = this.peers.get(id);
      if (existing && existing.state !== "failed") continue;
      // I3: failed peer roster değişince canlanır — yeni bölüm, taze PC (createPeer zaten restarted:false verir).
      if (existing) this.drop(id);
      const peer = this.createPeer(id);
      if (this.initiates(id)) void this.offer(id).catch((e) => this.fail(id, e, peer));
    }
    this.emit();
  }

  async handleSignal(signal: IncomingSignal) {
    if (this.closed) return;
    // Await sırasında peer eşzamanlı olarak yeniden kurulabilir (arıza/watchdog); hata olursa
    // fail() SADECE bu işlemin başladığı peer nesnesini işaretlesin diye burada saklanır.
    let target: Peer | undefined;
    try {
      if (signal.type === "offer" && signal.sdp) {
        let peer = this.peers.get(signal.from);
        // Yeniden gelen offer, karşı tarafın PC'yi sıfırdan kurduğu anlamına gelir (K5 asimetrisi
        // korunur — yalnız initiator olmayan taraf offer alır): biz de PC'mizi tazeleriz.
        if (peer && peer.pc.remoteDescription) {
          this.drop(signal.from);
          peer = undefined;
        }
        if (!peer) peer = this.createPeer(signal.from);
        target = peer;
        await peer.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
        await this.flushIce(peer);
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.deps.send({ to: signal.from, type: "answer", sdp: answer.sdp });
        this.emit();
      } else if (signal.type === "answer" && signal.sdp) {
        const peer = this.peers.get(signal.from);
        if (!peer) return; // gecikmiş/yinelenen answer — PC yok, yoksay
        if (peer.pc.signalingState !== "have-local-offer") return; // yinelenen/gecikmiş answer
        target = peer;
        await peer.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        await this.flushIce(peer);
        this.emit();
      } else if (signal.type === "ice" && signal.candidate) {
        const peer = this.peers.get(signal.from);
        if (!peer) {
          this.queueOrphanIce(signal.from, signal.candidate);
          return; // durum değişmedi, emit yok
        }
        if (peer.pc.remoteDescription) {
          try {
            await peer.pc.addIceCandidate(signal.candidate);
          } catch {
            // Eski nesil ICE adayı beklenir (yarış durumu) — peer'i failed yapma.
          }
        } else {
          peer.pendingIce.push(signal.candidate);
        }
        // durum değişmedi, emit yok
      }
    } catch (e) {
      this.fail(signal.from, e, target);
    }
  }

  /** Track kapanır, bağlantı açık kalır: karşıya sessizlik gider (spec §4.14). */
  setMuted(muted: boolean) {
    this.deps.stream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    for (const id of [...this.peers.keys()]) this.drop(id);
    this.orphanIce.clear();
    this.levels.close();
    this.deps.stream.getTracks().forEach((track) => track.stop());
    this.selfSpeaking = false;
    this.emit(true); // closed=true'dan sonraki TEK emit — force olmasa no-op olurdu
  }

  snapshot(): Record<string, PeerSnapshot> {
    const out: Record<string, PeerSnapshot> = {};
    this.peers.forEach((peer, id) => {
      out[id] = { state: peer.state, speaking: peer.speaking };
    });
    return out;
  }

  private initiates(id: string) {
    return this.deps.myId < id;
  }

  private queueOrphanIce(id: string, candidate: RTCIceCandidateInit) {
    const list = this.orphanIce.get(id) ?? [];
    if (list.length < 32) list.push(candidate);
    this.orphanIce.set(id, list);
  }

  private createPeer(id: string): Peer {
    if (this.peers.has(id)) this.drop(id); // eşzamanlı yeniden kurmada sızan PC bırakmaz

    const create = this.deps.createPeer ?? ((config: RTCConfiguration) => new RTCPeerConnection(config));
    const pc = create({ iceServers: this.deps.iceServers });
    const peer: Peer = {
      pc, audio: null, state: "connecting", speaking: false, restarted: false,
      pendingIce: this.orphanIce.get(id) ?? [], watchdog: undefined,
    };
    this.orphanIce.delete(id);

    this.deps.stream.getTracks().forEach((track) => pc.addTrack(track, this.deps.stream));
    pc.onicecandidate = (event) => {
      if (event.candidate) this.deps.send({ to: id, type: "ice", candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      if (peer.audio) {
        peer.audio.pause();
        peer.audio.srcObject = null;
        if (typeof peer.audio.remove === "function") peer.audio.remove();
      }
      const audio = (this.deps.createAudio ?? defaultCreateAudio)();
      audio.autoplay = true;
      (audio as HTMLMediaElement & { playsInline?: boolean }).playsInline = true;
      audio.hidden = true;
      audio.srcObject = stream;
      if (typeof document !== "undefined") document.body.appendChild(audio);
      const playing = audio.play();
      if (playing) {
        playing.catch((e) => {
          if (import.meta.env.DEV) console.warn("voice audio play rejected", id, e);
        });
      }
      peer.audio = audio;
      this.levels.attach(id, stream);
    };
    pc.onconnectionstatechange = () => this.onStateChange(id, peer);
    peer.watchdog = setTimeout(() => this.onWatchdog(id, peer), this.deps.watchdogMs ?? 15000);

    this.peers.set(id, peer);
    return peer;
  }

  private onWatchdog(id: string, peer: Peer) {
    if (peer.state !== "connected") {
      this.treatAsFailed(id, peer);
      this.emit();
    }
  }

  private onStateChange(id: string, peer: Peer) {
    const state = peer.pc.connectionState;
    if (state === "connected") {
      peer.state = "connected";
      peer.restarted = false; // sonraki arıza bölümü yeniden kurma hakkı kazanır
      this.clearWatchdog(peer);
    } else if (state === "failed") {
      this.treatAsFailed(id, peer);
    } else if (state === "disconnected") {
      peer.state = "connecting";
    }
    this.emit();
  }

  /** Bir arıza bölümünde başlatıcı PC'yi bir kez sıfırdan kurar (ICE restart yerine); diğer
      taraf ya da aynı bölümdeki ikinci arıza doğrudan failed'e düşer (spec §9). */
  private treatAsFailed(id: string, peer: Peer) {
    if (this.initiates(id) && !peer.restarted) {
      this.drop(id);
      const fresh = this.createPeer(id);
      fresh.restarted = true;
      void this.offer(id).catch((e) => this.fail(id, e, fresh));
    } else {
      peer.state = "failed";
    }
  }

  private clearWatchdog(peer: Peer) {
    if (peer.watchdog !== undefined) {
      clearTimeout(peer.watchdog);
      peer.watchdog = undefined;
    }
  }

  private async offer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    this.deps.send({ to: id, type: "offer", sdp: offer.sdp });
  }

  /** await sırasında yeni aday gelebilir (aynı anda birden çok addIceCandidate yarışmasın diye
      splice edip sırayla ekliyoruz) — döngü sonunda kuyruk yine doluysa bir tur daha atar. */
  private async flushIce(peer: Peer) {
    while (peer.pendingIce.length) {
      const pending = peer.pendingIce.splice(0);
      for (const candidate of pending) {
        try {
          await peer.pc.addIceCandidate(candidate);
        } catch {
          // Eski nesil ICE adayı beklenir — yoksay.
        }
      }
    }
  }

  private drop(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.clearWatchdog(peer);
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    if (peer.audio) {
      peer.audio.pause();
      peer.audio.srcObject = null;
      // Guard: bazı test sahtelerinde remove() yok (gerçek <audio> değil).
      if (typeof peer.audio.remove === "function") peer.audio.remove();
    }
    this.levels.detach(id);
    this.peers.delete(id);
    this.orphanIce.delete(id);
  }

  /** Hatalar sessizce yutulmaz: peer failed'e düşer, DEV'de konsola yazılır.
      `expected` verilirse yalnız İŞLEMİN BAŞLADIĞI peer nesnesi hâlâ canlıysa durum değişir —
      await sırasında peer yeniden kurulduysa (eski PC'nin gecikmiş reddi) taze peer etkilenmez. */
  private fail(id: string, e: unknown, expected?: Peer) {
    const peer = this.peers.get(id);
    if (peer && (expected === undefined || peer === expected)) peer.state = "failed";
    if (import.meta.env.DEV) console.warn("voice peer failed", id, e);
    this.emit();
  }

  private onSpeaking(id: string, speaking: boolean) {
    if (id === this.deps.myId) {
      this.selfSpeaking = speaking;
    } else {
      const peer = this.peers.get(id);
      if (!peer) return;
      peer.speaking = speaking;
    }
    this.emit();
  }

  /** close() sırasında ara emit'ler (drop()'ların tetiklediği onSpeaking dahil) bastırılır — dışarı
      yalnız close()'un `force:true` ile yaptığı TEK emit gider. */
  private emit(force = false) {
    if (this.closed && !force) return;
    this.deps.onChange(this.snapshot(), this.selfSpeaking);
  }
}
