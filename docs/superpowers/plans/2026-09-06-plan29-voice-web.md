# Sesli Sohbet — Web (W-11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web istemcisinde host'un başlatıp bitirdiği, üyelerin opt-in katıldığı full-mesh WebRTC sesli sohbet: STOMP sinyal, küçük-id teklif kuralı, sessize alma, konuşan kişi halkası, geri sayım, alt dock.

**Architecture:** STOMP istemcisi `liveChannel` modülüne taşınır (subscribe/publish, yeniden bağlanınca yeniden abonelik). `voiceMesh` React'siz saf denetleyici: RTCPeerConnection fabrikası ve seviye örnekleyici enjekte edilir. `voiceStore` (zustand) katılım sırasını (mikrofon → abonelik → kimlik → mesh) yürütür, `sessionStore`'a abone olarak roster'ı ve kapanışı izler. `VoiceDock` alt sabit çubuk; `ParticipantRow` mikrofon ikonu ve konuşma halkası.

**Tech Stack:** React 18, zustand 5, @stomp/stompjs 7, WebRTC (tarayıcı), Web Audio, Tailwind v4, react-i18next (tr/en/nl), vitest + RTL + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-06-voice-chat-design.md` (§4 akış, §7 web, K4, K5, K9, K12).

**Ön koşul:** B-12 (plan28) tamam ve `frontend/shared/src/api-types.ts` yeniden üretilmiş (`VoiceDto`, `inVoice`, `VoiceStartResponse`, `VoiceCredentialsResponse`, `IceServerDto`). Doğrula: `grep -c "VoiceCredentialsResponse" frontend/shared/src/api-types.ts` ≥ 1.

**Bağlayıcı kurallar:**
- **Git yazma işlemi YOK**; her görev sonunda dosya listesi bırakılır.
- Test komutu (repo kökünden): `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>` — aşağıda `PNPM_TEST <yol>`. Kökten çıplak `vitest` KOŞMA (41 dosya "window is not defined"; hafıza notu). Tam koşu: `pnpm test:web`.
- Tailwind utility'leri yalnız `components/` altında; sayfalar kompozisyon.
- i18n: `tr` taban, `en`/`nl` parite (`pnpm i18n:check`); en/nl'de çoğul `_one/_other`.
- Yorumlar kısa. Yeni dosya yalnız spec §7'deki parçalar için.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/api.ts` | T1 | `voiceStart`, `voiceEnd`, `voiceCredentials` |
| `web/src/store/liveChannel.ts` (+test), `useSessionLive.ts` | T2 | STOMP istemcisi tek yerde |
| `web/src/lib/audioLevels.ts` (+test) | T3 | K12 seviye örnekleyici |
| `web/src/lib/voiceMesh.ts` (+test) | T3 | Mesh denetleyicisi |
| `web/src/store/voiceStore.ts` (+test), `useSessionLive.ts` | T4 | Katılım akışı, roster, kapanış |
| `i18n/locales/{tr,en,nl}.json`, `components/organisms/VoiceDock.tsx` (+test), `pages/SessionPage.tsx` (+test) | T5 | Dock ve mount |
| `components/molecules/ParticipantRow.tsx` (+test) | T6 | Mikrofon ikonu, halka |
| `docs/superpowers/plans/INDEX.md` | T7 | Doğrulama ve kayıt |

---

### Task 1: Paylaşılan API istemcisi

**Files:**
- Modify: `frontend/shared/src/api.ts`

- [ ] **Step 1: Üç fonksiyon ekle** (`preview` satırından sonra, `createBumpintoApi` nesnesinin içine)

```ts
    voiceStart: (slug: string) =>
      http.post<Schemas["VoiceStartResponse"]>(`/api/sessions/${slug}/voice`).then((r) => r.data),
    voiceEnd: (slug: string) =>
      http.delete(`/api/sessions/${slug}/voice`).then(() => undefined),
    voiceCredentials: (slug: string) =>
      http.post<Schemas["VoiceCredentialsResponse"]>(`/api/sessions/${slug}/voice/credentials`)
        .then((r) => r.data),
```

- [ ] **Step 2: Derle**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b`
Expected: hata yok. `Schemas["VoiceStartResponse"]` bulunamıyorsa ön koşul (B-12 T8) yapılmamış — önce onu koş.

- [ ] **Step 3: Dosya listesi**

`frontend/shared/src/api.ts`. Mesaj: `feat(voice): shared api client for voice endpoints`.

---

### Task 2: `liveChannel` — STOMP istemcisi tek yerde

**Files:**
- Create: `frontend/web/src/store/liveChannel.ts`
- Modify: `frontend/web/src/store/useSessionLive.ts`
- Test: `frontend/web/src/store/liveChannel.test.ts`

- [ ] **Step 1: Başarısız testi yaz**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

type Sub = { destination: string; cb: (m: { body: string }) => void };

vi.mock("@stomp/stompjs", () => {
  class FakeClient {
    static last: FakeClient | null = null;
    connected = false;
    subs: Sub[] = [];
    onConnect: () => void;
    onWebSocketClose: () => void;
    subscribe = vi.fn((destination: string, cb: (m: { body: string }) => void) => {
      this.subs.push({ destination, cb });
      return { id: String(this.subs.length), unsubscribe: vi.fn() };
    });
    publish = vi.fn();
    activate = vi.fn();
    deactivate = vi.fn(async () => {
      this.connected = false;
    });
    constructor(opts: { onConnect: () => void; onWebSocketClose: () => void }) {
      this.onConnect = opts.onConnect;
      this.onWebSocketClose = opts.onWebSocketClose;
      FakeClient.last = this;
    }
    connect() {
      this.connected = true;
      this.onConnect();
    }
    drop() {
      this.connected = false;
      this.onWebSocketClose();
    }
  }
  return { Client: FakeClient };
});

import { Client } from "@stomp/stompjs";
import { liveChannel } from "./liveChannel";

type Fake = { last: { connected: boolean; subs: Sub[]; subscribe: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>; connect(): void; drop(): void } | null };
const fake = () => (Client as unknown as Fake).last!;

describe("liveChannel", () => {
  beforeEach(() => {
    (Client as unknown as Fake).last = null;
  });

  it("bağlanmadan kaydedilen abonelik bağlanınca kurulur, kopup gelince yeniden kurulur", () => {
    const handler = vi.fn();
    const unsubscribe = liveChannel.subscribe("/topic/session/x", handler);
    const onConnect = vi.fn();
    const close = liveChannel.open("x", onConnect);

    expect(fake().subscribe).not.toHaveBeenCalled();
    fake().connect();
    expect(fake().subscribe).toHaveBeenCalledTimes(1);
    expect(onConnect).toHaveBeenCalledTimes(1);
    fake().subs[0].cb({ body: "{\"type\":\"presence_changed\"}" });
    expect(handler).toHaveBeenCalledWith("{\"type\":\"presence_changed\"}");

    fake().drop();
    fake().connect();
    expect(fake().subscribe).toHaveBeenCalledTimes(2);

    unsubscribe();
    close();
  });

  it("bağlıyken eklenen abonelik hemen kurulur; unsubscribe yalnız bağlıyken çağrılır", () => {
    const close = liveChannel.open("x", () => undefined);
    fake().connect();
    const unsubscribe = liveChannel.subscribe("/topic/session/x/voice/a", () => undefined);
    expect(fake().subscribe).toHaveBeenCalledTimes(1);

    fake().drop();
    expect(() => unsubscribe()).not.toThrow();
    close();
  });

  it("publish bağlı değilken false döner, bağlıyken JSON gövde ve content-type ile gider", () => {
    const close = liveChannel.open("x", () => undefined);
    expect(liveChannel.publish("/app/sessions/x/voice/signal", { to: "h" })).toBe(false);

    fake().connect();
    expect(liveChannel.publish("/app/sessions/x/voice/signal", { to: "h", type: "offer" })).toBe(true);
    expect(fake().publish).toHaveBeenCalledWith({
      destination: "/app/sessions/x/voice/signal",
      body: "{\"to\":\"h\",\"type\":\"offer\"}",
      headers: { "content-type": "application/json" },
    });
    close();
  });
});
```

- [ ] **Step 2: Testi çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/store/liveChannel.test.ts`
Expected: FAIL — `./liveChannel` yok.

- [ ] **Step 3: `liveChannel.ts`'i yaz**

```ts
import { Client, type StompSubscription } from "@stomp/stompjs";

type Handler = (body: string) => void;
type Registration = { destination: string; handler: Handler; sub: StompSubscription | null };

let client: Client | null = null;
const registrations = new Set<Registration>();

/** VITE_WS_URL yalnız ORIGIN taşır; kanal oturum yolunun altında (çerez path'i, presence spec §3). */
function brokerUrl(slug: string) {
  const origin =
    (import.meta.env.VITE_WS_URL as string | undefined) ||
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;
  return `${origin}/api/sessions/${slug}/ws`;
}

function attach(reg: Registration) {
  if (client?.connected && !reg.sub) {
    reg.sub = client.subscribe(reg.destination, (message) => reg.handler(message.body));
  }
}

/** Oturum başına tek STOMP istemcisi. Abonelikler kayıt defterinde durur: bağlantı (yeniden)
    kurulunca hepsi yeniden açılır — ses katmanı bağlı olmadan da abone olabilir. */
export const liveChannel = {
  open(slug: string, onConnect: () => void): () => void {
    const c = new Client({
      brokerURL: brokerUrl(slug),
      reconnectDelay: 5000,
      onConnect: () => {
        registrations.forEach((reg) => {
          reg.sub = null;
          attach(reg);
        });
        onConnect();
      },
      onWebSocketClose: () => registrations.forEach((reg) => {
        reg.sub = null;
      }),
    });
    client = c;
    c.activate();
    return () => {
      registrations.forEach((reg) => {
        reg.sub = null;
      });
      if (client === c) client = null;
      void c.deactivate();
    };
  },

  subscribe(destination: string, handler: Handler): () => void {
    const reg: Registration = { destination, handler, sub: null };
    registrations.add(reg);
    attach(reg);
    return () => {
      registrations.delete(reg);
      if (client?.connected) reg.sub?.unsubscribe();
      reg.sub = null;
    };
  },

  /** Sunucu yalnız kendi slug'ının sinyal adresini kabul eder (WebSocketConfig). */
  publish(destination: string, body: unknown): boolean {
    if (!client?.connected) return false;
    client.publish({
      destination,
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
    return true;
  },
};
```

- [ ] **Step 4: `useSessionLive.ts`'i `liveChannel` üzerine al**

Dosyanın tamamı:

```ts
import { useEffect } from "react";
import { liveChannel } from "./liveChannel";
import { useSessionStore } from "./sessionStore";

/** Emniyet ağı — canlı kanalın YEDEĞİ, birincil yol değil. Olaylar STOMP'tan geliyor; 3 sn'lik
    tur açık sekme başına 20 GET/dk demekti ve tek taşıdığı şey WS kopukluğu + yayınlanmayan
    EXPIRED geçişi. 30 sn ikisini de karşılar, yükü 10 kat düşürür. */
const POLL_MS = 30000;

export function useSessionLive(slug: string) {
  const bind = useSessionStore((s) => s.bind);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    bind(slug);
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    // Abonelik açılıştan ÖNCE kaydedilir: liveChannel bağlanınca kurar, kaçan olay olmaz.
    const unsubscribe = liveChannel.subscribe(`/topic/session/${slug}`, () => void refresh());
    // Bağlantı kurulunca BİR KEZ tazele: abone olana kadar kaçan olaylar burada kapanır.
    const close = liveChannel.open(slug, () => void refresh());

    return () => {
      clearInterval(timer);
      unsubscribe();
      close();
    };
  }, [slug, bind, refresh]);
}
```

- [ ] **Step 5: Testleri çalıştır**

Run: `PNPM_TEST src/store/liveChannel.test.ts` → 3 passed.
Run: `PNPM_TEST src/pages/SessionPage.test.tsx` → hâlâ yeşil (hook orada mock'lu).
Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b` → temiz.

- [ ] **Step 6: Dosya listesi**

`liveChannel.ts`, `liveChannel.test.ts`, `useSessionLive.ts`. Mesaj: `refactor(web): hoist STOMP client into liveChannel with resubscribe`.

---

### Task 3: `audioLevels` (K12) ve `voiceMesh` (K5)

**Files:**
- Create: `frontend/web/src/lib/audioLevels.ts`
- Create: `frontend/web/src/lib/voiceMesh.ts`
- Test: `frontend/web/src/lib/audioLevels.test.ts`
- Test: `frontend/web/src/lib/voiceMesh.test.ts`

- [ ] **Step 1: `audioLevels.test.ts`'i yaz**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLevelSampler } from "./audioLevels";

/** 128 = sessizlik; 160 → RMS 0.25 (eşik 0.02'nin çok üstü). */
function fakeContext() {
  let level = 128;
  const analyser = {
    fftSize: 0,
    getByteTimeDomainData: (buffer: Uint8Array) => buffer.fill(level),
  };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const context = {
    createMediaStreamSource: vi.fn(() => source),
    createAnalyser: vi.fn(() => analyser),
    close: vi.fn(),
  } as unknown as AudioContext;
  return { context, source, setLevel: (v: number) => { level = v; } };
}

describe("createLevelSampler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("eşik üstü ses konuşmayı bir kez bildirir, sessizlik tutma süresinden sonra kapatır", () => {
    const { context, setLevel } = fakeContext();
    const onSpeaking = vi.fn();
    const sampler = createLevelSampler(onSpeaking, { context, intervalMs: 200, holdMs: 300 });
    sampler.attach("a", {} as MediaStream);

    setLevel(160);
    vi.advanceTimersByTime(200);
    vi.advanceTimersByTime(200);
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    expect(onSpeaking).toHaveBeenCalledWith("a", true);

    setLevel(128);
    vi.advanceTimersByTime(200); // 200 ms sessiz: tutma içinde, hâlâ konuşuyor
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200); // 400 ms sessiz: tutma bitti
    expect(onSpeaking).toHaveBeenLastCalledWith("a", false);
    sampler.close();
  });

  it("detach konuşan kişiyi kapatır, close bağlamı kapatır", () => {
    const { context, source, setLevel } = fakeContext();
    const onSpeaking = vi.fn();
    const sampler = createLevelSampler(onSpeaking, { context, intervalMs: 200 });
    sampler.attach("a", {} as MediaStream);
    setLevel(160);
    vi.advanceTimersByTime(200);

    sampler.detach("a");
    expect(onSpeaking).toHaveBeenLastCalledWith("a", false);
    expect(source.disconnect).toHaveBeenCalled();

    sampler.close();
    expect((context as unknown as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: `audioLevels.ts`'i yaz**

```ts
/** K12: konuşan kişi tespiti tamamen istemcide — her peer akışının RMS'i, sunucuya hiç gitmez. */
export type LevelSampler = {
  attach(id: string, stream: MediaStream): void;
  detach(id: string): void;
  close(): void;
};

export type LevelSamplerOptions = {
  intervalMs?: number;
  /** Normalize RMS (0..1) eşiği. */
  threshold?: number;
  /** Eşiğin altına düşünce "konuşuyor" bu kadar süre daha tutulur — titreme önleme. */
  holdMs?: number;
  context?: AudioContext;
  now?: () => number;
};

type Probe = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  buffer: Uint8Array;
  lastLoudAt: number;
  speaking: boolean;
};

export function createLevelSampler(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: LevelSamplerOptions = {},
): LevelSampler {
  const intervalMs = options.intervalMs ?? 200;
  const threshold = options.threshold ?? 0.02;
  const holdMs = options.holdMs ?? 300;
  const now = options.now ?? (() => Date.now());
  // "Katıl" jestiyle kurulur: autoplay politikası AudioContext'i de kullanıcı jestine bağlar.
  const context = options.context ?? new AudioContext();
  const probes = new Map<string, Probe>();

  function sample() {
    const t = now();
    probes.forEach((probe, id) => {
      probe.analyser.getByteTimeDomainData(probe.buffer);
      let sum = 0;
      for (let i = 0; i < probe.buffer.length; i++) {
        const v = (probe.buffer[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / probe.buffer.length);
      if (rms > threshold) probe.lastLoudAt = t;
      const speaking = t - probe.lastLoudAt < holdMs;
      if (speaking !== probe.speaking) {
        probe.speaking = speaking;
        onSpeaking(id, speaking);
      }
    });
  }

  const timer = setInterval(sample, intervalMs);

  function detach(id: string) {
    const probe = probes.get(id);
    if (!probe) return;
    probe.source.disconnect();
    probes.delete(id);
    if (probe.speaking) onSpeaking(id, false);
  }

  return {
    attach(id, stream) {
      detach(id);
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      probes.set(id, {
        source, analyser, buffer: new Uint8Array(256), lastLoudAt: Number.NEGATIVE_INFINITY, speaking: false,
      });
    },
    detach,
    close() {
      clearInterval(timer);
      probes.forEach((probe) => probe.source.disconnect());
      probes.clear();
      void context.close();
    },
  };
}
```

- [ ] **Step 3: Çalıştır**

Run: `PNPM_TEST src/lib/audioLevels.test.ts` → 2 passed.

- [ ] **Step 4: `voiceMesh.test.ts`'i yaz**

```ts
import { describe, expect, it, vi } from "vitest";
import type { LevelSampler } from "./audioLevels";
import { VoiceMesh, type OutgoingSignal } from "./voiceMesh";

class FakePeer {
  static all: FakePeer[] = [];
  connectionState: RTCPeerConnectionState = "new";
  remoteDescription: RTCSessionDescriptionInit | null = null;
  localDescription: RTCSessionDescriptionInit | null = null;
  candidates: RTCIceCandidateInit[] = [];
  offers: (RTCOfferOptions | undefined)[] = [];
  tracks: MediaStreamTrack[] = [];
  closed = false;
  onicecandidate: ((e: { candidate: { toJSON(): RTCIceCandidateInit } | null }) => void) | null = null;
  ontrack: ((e: { streams: MediaStream[] }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  constructor(public config: RTCConfiguration) {
    FakePeer.all.push(this);
  }
  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
  }
  async createOffer(options?: RTCOfferOptions) {
    this.offers.push(options);
    return { type: "offer" as const, sdp: `offer-${this.offers.length}` };
  }
  async createAnswer() {
    return { type: "answer" as const, sdp: "answer-1" };
  }
  async setLocalDescription(d: RTCSessionDescriptionInit) {
    this.localDescription = d;
  }
  async setRemoteDescription(d: RTCSessionDescriptionInit) {
    this.remoteDescription = d;
  }
  async addIceCandidate(c: RTCIceCandidateInit) {
    this.candidates.push(c);
  }
  close() {
    this.closed = true;
  }
  setState(state: RTCPeerConnectionState) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

function harness(myId: string) {
  FakePeer.all = [];
  const track = { kind: "audio", enabled: true, stop: vi.fn() } as unknown as MediaStreamTrack;
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream;
  const sent: OutgoingSignal[] = [];
  const onChange = vi.fn();
  const levels: LevelSampler & { speak?: (id: string, s: boolean) => void } = {
    attach: vi.fn(), detach: vi.fn(), close: vi.fn(),
  };
  const audio = { autoplay: false, srcObject: null as unknown, play: vi.fn(() => Promise.resolve()), pause: vi.fn() };
  const mesh = new VoiceMesh({
    myId,
    iceServers: [{ urls: ["stun:stun.cloudflare.com:3478"] }],
    stream,
    send: (s) => sent.push(s),
    onChange,
    createPeer: (config) => new FakePeer(config) as unknown as RTCPeerConnection,
    createAudio: () => audio as unknown as HTMLAudioElement,
    createLevels: (cb) => {
      levels.speak = cb;
      return levels;
    },
  });
  return { mesh, sent, onChange, levels, audio, track };
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

    const remote = {} as MediaStream;
    pc.ontrack?.({ streams: [remote] });
    expect(h.audio.srcObject).toBe(remote);
    expect(h.audio.play).toHaveBeenCalled();
    expect(h.levels.attach).toHaveBeenCalledWith("b", remote);
  });

  it("roster'dan düşen peer kapanır ve örnekleyiciden çıkar", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.mesh.setRoster(["a"]);
    expect(FakePeer.all[0].closed).toBe(true);
    expect(h.levels.detach).toHaveBeenCalledWith("b");
    expect(h.mesh.snapshot()).toEqual({});
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

  it("failed: başlatıcı bir kez ICE restart teklifi yollar, ikincide failed kalır", async () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    await flush();
    const pc = FakePeer.all[0];
    pc.setState("connected");
    expect(h.mesh.snapshot().b.state).toBe("connected");

    pc.setState("failed");
    await flush();
    expect(pc.offers.at(-1)).toEqual({ iceRestart: true });
    expect(h.mesh.snapshot().b.state).toBe("connecting");

    pc.setState("failed");
    await flush();
    expect(pc.offers).toHaveLength(2);
    expect(h.mesh.snapshot().b.state).toBe("failed");
  });

  it("konuşma bildirimi peer'e ve kendine düşer", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.levels.speak?.("b", true);
    h.levels.speak?.("a", true);
    expect(h.onChange).toHaveBeenLastCalledWith({ b: { state: "connecting", speaking: true } }, true);
  });

  it("close her şeyi bırakır: bağlantılar, mikrofon, örnekleyici", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    h.mesh.close();
    expect(FakePeer.all[0].closed).toBe(true);
    expect(h.track.stop).toHaveBeenCalled();
    expect(h.levels.close).toHaveBeenCalled();
    h.mesh.setRoster(["a", "b", "c"]); // kapalı mesh yeni bağlantı açmaz
    expect(FakePeer.all).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/lib/voiceMesh.test.ts` → FAIL — `./voiceMesh` yok.

- [ ] **Step 6: `voiceMesh.ts`'i yaz**

```ts
import { createLevelSampler, type LevelSampler } from "./audioLevels";

export type SignalType = "offer" | "answer" | "ice";
export type OutgoingSignal = { to: string; type: SignalType; sdp?: string; candidate?: RTCIceCandidateInit };
export type IncomingSignal = { from: string; type: SignalType; sdp?: string; candidate?: RTCIceCandidateInit };
export type PeerState = "connecting" | "connected" | "failed";
export type PeerSnapshot = { state: PeerState; speaking: boolean };

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
};

type Peer = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement | null;
  state: PeerState;
  speaking: boolean;
  restarted: boolean;
  pendingIce: RTCIceCandidateInit[];
};

/** Full-mesh ses (spec K1). React yok; tarayıcı API'leri enjekte edilir, test sahteyle koşar.
    Teklif kuralı K5: `myId < peerId` olan taraf offer üretir; diğeri bağlantıyı kurar ve bekler.
    Eşzamanlı katılım, yeniden bağlanma ve roster sırası bu kuralı bozmaz. */
export class VoiceMesh {
  private readonly peers = new Map<string, Peer>();
  private readonly levels: LevelSampler;
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
      if (this.peers.has(id)) continue;
      this.createPeer(id);
      if (this.initiates(id)) void this.offer(id, false);
    }
    this.emit();
  }

  async handleSignal(signal: IncomingSignal) {
    if (this.closed) return;
    const peer = this.peers.get(signal.from) ?? this.createPeer(signal.from);
    if (signal.type === "offer" && signal.sdp) {
      await peer.pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
      await this.flushIce(peer);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      this.deps.send({ to: signal.from, type: "answer", sdp: answer.sdp });
    } else if (signal.type === "answer" && signal.sdp) {
      await peer.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
      await this.flushIce(peer);
    } else if (signal.type === "ice" && signal.candidate) {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.candidate);
      else peer.pendingIce.push(signal.candidate);
    }
    this.emit();
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
    this.levels.close();
    this.deps.stream.getTracks().forEach((track) => track.stop());
    this.emit();
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

  private createPeer(id: string): Peer {
    const create = this.deps.createPeer ?? ((config: RTCConfiguration) => new RTCPeerConnection(config));
    const pc = create({ iceServers: this.deps.iceServers });
    const peer: Peer = { pc, audio: null, state: "connecting", speaking: false, restarted: false, pendingIce: [] };
    this.deps.stream.getTracks().forEach((track) => pc.addTrack(track, this.deps.stream));
    pc.onicecandidate = (event) => {
      if (event.candidate) this.deps.send({ to: id, type: "ice", candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      // Uzak akış bir Audio elemanına BAĞLI olmalı: hem çalma hem analizör (Chrome/Safari) buna bakar.
      const audio = (this.deps.createAudio ?? (() => new Audio()))();
      audio.autoplay = true;
      audio.srcObject = stream;
      const playing = audio.play();
      if (playing) playing.catch(() => undefined);
      peer.audio = audio;
      this.levels.attach(id, stream);
    };
    pc.onconnectionstatechange = () => this.onStateChange(id, peer);
    this.peers.set(id, peer);
    return peer;
  }

  private onStateChange(id: string, peer: Peer) {
    const state = peer.pc.connectionState;
    if (state === "connected") {
      peer.state = "connected";
    } else if (state === "failed") {
      // Bir kez ICE restart, yalnız başlatıcı tarafta (spec §9); ikincisi failed kalır.
      if (this.initiates(id) && !peer.restarted) {
        peer.restarted = true;
        peer.state = "connecting";
        void this.offer(id, true);
      } else {
        peer.state = "failed";
      }
    } else if (state === "disconnected") {
      peer.state = "connecting";
    }
    this.emit();
  }

  private async offer(id: string, restart: boolean) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const offer = await peer.pc.createOffer(restart ? { iceRestart: true } : undefined);
    await peer.pc.setLocalDescription(offer);
    this.deps.send({ to: id, type: "offer", sdp: offer.sdp });
  }

  private async flushIce(peer: Peer) {
    const pending = peer.pendingIce.splice(0);
    for (const candidate of pending) await peer.pc.addIceCandidate(candidate);
  }

  private drop(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    if (peer.audio) {
      peer.audio.pause();
      peer.audio.srcObject = null;
    }
    this.levels.detach(id);
    this.peers.delete(id);
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

  private emit() {
    this.deps.onChange(this.snapshot(), this.selfSpeaking);
  }
}
```

- [ ] **Step 7: Çalıştır**

Run: `PNPM_TEST src/lib/voiceMesh.test.ts` → 8 passed. `tsc -b` temiz. `RTCPeerConnectionState`/`RTCIceCandidateInit` tipleri `lib.dom`'dan gelir; `tsconfig` `lib` listesinde `DOM` var (mevcut kod `navigator`/`location` kullanıyor).

- [ ] **Step 8: Dosya listesi**

`audioLevels.ts`, `audioLevels.test.ts`, `voiceMesh.ts`, `voiceMesh.test.ts`. Mesaj: `feat(voice): pure mesh controller with small-id offer rule and level sampler`.

---

### Task 4: `voiceStore` — katılım akışı, roster, kapanış

**Files:**
- Create: `frontend/web/src/store/voiceStore.ts`
- Modify: `frontend/web/src/store/useSessionLive.ts` (`voice_ended` + ayrılırken mikrofonu bırak)
- Test: `frontend/web/src/store/voiceStore.test.ts`
- Test: `frontend/web/src/store/useSessionLive.test.ts`

- [ ] **Step 1: `voiceStore.test.ts`'i yaz**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({ unsubscribeInbox: vi.fn() }));

vi.mock("../lib/api", () => ({
  api: { voiceStart: vi.fn(), voiceEnd: vi.fn(), voiceCredentials: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("./liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => hoisted.unsubscribeInbox), publish: vi.fn(() => true), open: vi.fn() },
}));
vi.mock("../lib/voiceMesh", () => {
  class FakeMesh {
    static last: FakeMesh | null = null;
    roster: string[] = [];
    muted = false;
    signals: unknown[] = [];
    closed = false;
    constructor(public deps: { myId: string; iceServers: unknown; send: (s: unknown) => void }) {
      FakeMesh.last = this;
    }
    setRoster(ids: string[]) { this.roster = ids; }
    setMuted(muted: boolean) { this.muted = muted; }
    async handleSignal(signal: unknown) { this.signals.push(signal); }
    close() { this.closed = true; }
  }
  return { VoiceMesh: FakeMesh };
});

import { api } from "../lib/api";
import { VoiceMesh } from "../lib/voiceMesh";
import { liveChannel } from "./liveChannel";
import { useSessionStore } from "./sessionStore";
import { rosterOf, useVoiceStore } from "./voiceStore";

type FakeMeshType = { last: { deps: { myId: string; iceServers: unknown; send: (s: unknown) => void };
  roster: string[]; muted: boolean; signals: unknown[]; closed: boolean } | null };
const mesh = () => (VoiceMesh as unknown as FakeMeshType).last!;

const person = (id: string, inVoice: boolean, host = false) =>
  ({ id, displayName: id, host, hasLocation: true, deckDone: false, manual: false, inVoice });

const view = {
  slug: "x", name: "Cuma", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING",
  expiresAt: "", venues: [], runoffVenueIds: [], voteTally: {},
  viewer: { participantId: "a", host: false },
  voice: { endsAt: "2026-09-06T12:00:00Z" },
  participants: [person("h", true, true), person("a", false)],
};

const track = { kind: "audio", enabled: true, stop: vi.fn() };
const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
const getUserMedia = vi.fn();
const credentials = {
  iceServers: [{ urls: ["stun:x"], username: null, credential: null }], relay: false,
  endsAt: "2026-09-06T12:00:00Z",
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("voiceStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(api.voiceCredentials).mockResolvedValue(credentials as never);
    (VoiceMesh as unknown as FakeMeshType).last = null;
    useSessionStore.setState({ slug: "x", view: view as never, error: null });
    useVoiceStore.setState({ phase: "idle", muted: false, peers: {}, selfSpeaking: false, endedReason: null, micDenied: false });
  });
  afterEach(() => vi.useRealTimers());

  it("mikrofon reddi: sunucuya gidilmez, faz error", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("NotAllowedError"));
    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("error");
    expect(useVoiceStore.getState().micDenied).toBe(true);
    expect(liveChannel.subscribe).not.toHaveBeenCalled();
    expect(api.voiceCredentials).not.toHaveBeenCalled();
  });

  it("katılım sırası: mikrofon → abonelik → kimlik → mesh; roster görünümden", async () => {
    await useVoiceStore.getState().join();

    const subscribeOrder = vi.mocked(liveChannel.subscribe).mock.invocationCallOrder[0];
    const credentialsOrder = vi.mocked(api.voiceCredentials).mock.invocationCallOrder[0];
    expect(subscribeOrder).toBeLessThan(credentialsOrder);
    expect(vi.mocked(liveChannel.subscribe).mock.calls[0][0]).toBe("/topic/session/x/voice/a");
    expect(mesh().deps.myId).toBe("a");
    expect(mesh().deps.iceServers).toEqual([{ urls: ["stun:x"], username: undefined, credential: undefined }]);
    expect(mesh().roster).toEqual(["h"]);
    expect(useVoiceStore.getState().phase).toBe("in");

    mesh().deps.send({ to: "h", type: "offer", sdp: "o" });
    expect(liveChannel.publish).toHaveBeenCalledWith("/app/sessions/x/voice/signal", { to: "h", type: "offer", sdp: "o" });
  });

  it("kimlik alınamazsa (oda kapandı) mikrofon bırakılır, abonelik düşer, faz idle", async () => {
    vi.mocked(api.voiceCredentials).mockRejectedValueOnce(new Error("409"));
    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(track.stop).toHaveBeenCalled();
    expect(hoisted.unsubscribeInbox).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();
  });

  it("mesh kurulmadan gelen sinyal kuyruklanır ve sonra işlenir", async () => {
    let resolveCredentials: (v: unknown) => void = () => undefined;
    vi.mocked(api.voiceCredentials).mockReturnValueOnce(new Promise((r) => { resolveCredentials = r; }) as never);
    const joining = useVoiceStore.getState().join();
    await tick();
    const handler = vi.mocked(liveChannel.subscribe).mock.calls[0][1];
    handler(JSON.stringify({ from: "h", type: "offer", sdp: "early" }));

    resolveCredentials(credentials);
    await joining;
    expect(mesh().signals).toEqual([{ from: "h", type: "offer", sdp: "early" }]);
  });

  it("oda kapanınca (voice null) çıkar; roster değişince mesh'e iletir", async () => {
    await useVoiceStore.getState().join();
    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true), person("a", true), person("b", true)] } as never });
    expect(mesh().roster).toEqual(["h", "a", "b"]);

    useSessionStore.setState({ view: { ...view, voice: null } as never });
    expect(mesh().closed).toBe(true);
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(useVoiceStore.getState().peers).toEqual({});
  });

  it("sustur mesh'e ve duruma yazılır", async () => {
    await useVoiceStore.getState().join();
    useVoiceStore.getState().toggleMute();
    expect(useVoiceStore.getState().muted).toBe(true);
    expect(mesh().muted).toBe(true);
  });

  it("bitiş sebebi 10 sn görünür, sonra silinir", () => {
    vi.useFakeTimers();
    useVoiceStore.getState().ended("TIME_LIMIT");
    expect(useVoiceStore.getState().endedReason).toBe("TIME_LIMIT");
    vi.advanceTimersByTime(10_000);
    expect(useVoiceStore.getState().endedReason).toBeNull();
  });

  it("rosterOf: inVoice olan katılımcı id'leri", () => {
    expect(rosterOf(view as never)).toEqual(["h"]);
    expect(rosterOf(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/store/voiceStore.test.ts` → FAIL — `./voiceStore` yok.

- [ ] **Step 3: `voiceStore.ts`'i yaz**

```ts
import type { SessionView } from "@bumpinto/shared";
import { create } from "zustand";
import { api } from "../lib/api";
import { VoiceMesh, type IncomingSignal, type PeerSnapshot } from "../lib/voiceMesh";
import { liveChannel } from "./liveChannel";
import { useSessionStore, viewerId } from "./sessionStore";

export type VoicePhase = "idle" | "joining" | "in" | "error";
export type EndReason = "HOST" | "TIME_LIMIT" | "EMPTY";

type VoiceState = {
  phase: VoicePhase;
  muted: boolean;
  peers: Record<string, PeerSnapshot>;
  selfSpeaking: boolean;
  /** Son kapanışın sebebi; dock 10 sn gösterir. */
  endedReason: EndReason | null;
  micDenied: boolean;
  start: () => Promise<void>;
  end: () => Promise<void>;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  ended: (reason: EndReason) => void;
};

const ENDED_VISIBLE_MS = 10_000;

// Mesh React dışında, modül düzeyinde yaşar: sayfa geçişleri (Lobi → Mekanlar → Deste) onu
// unmount ETMEZ (spec §7).
let mesh: VoiceMesh | null = null;
let unsubscribeInbox: (() => void) | null = null;
let pendingSignals: IncomingSignal[] = [];
let endedTimer: ReturnType<typeof setTimeout> | null = null;

/** Görünümdeki ses üyeleri (kendimiz dahil; mesh kendini eler). */
export function rosterOf(view: SessionView | null): string[] {
  return (view?.participants ?? []).filter((p) => p.inVoice && p.id).map((p) => p.id as string);
}

function teardown() {
  mesh?.close();
  mesh = null;
  unsubscribeInbox?.();
  unsubscribeInbox = null;
  pendingSignals = [];
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  phase: "idle",
  muted: false,
  peers: {},
  selfSpeaking: false,
  endedReason: null,
  micDenied: false,

  start: async () => {
    const { slug, refresh } = useSessionStore.getState();
    await api.voiceStart(slug);
    await refresh();
  },

  end: async () => {
    const { slug, refresh } = useSessionStore.getState();
    await api.voiceEnd(slug);
    await refresh();
  },

  join: async () => {
    const { slug, view } = useSessionStore.getState();
    const me = viewerId(view);
    const phase = get().phase;
    if (!slug || !me || phase === "joining" || phase === "in") return;
    set({ phase: "joining", micDenied: false, endedReason: null });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      set({ phase: "error", micDenied: true });
      return;
    }
    // Sıra bilinçli (spec §7): abonelik = üyelik; kimlik almadan bağlantı açılmaz. Mesh kurulana
    // kadar gelen sinyal kuyruklanır — karşı tarafın ilk offer'ı kimlik isteği sırasında gelebilir.
    unsubscribeInbox = liveChannel.subscribe(`/topic/session/${slug}/voice/${me}`, (body) => {
      const signal = JSON.parse(body) as IncomingSignal;
      if (mesh) void mesh.handleSignal(signal);
      else pendingSignals.push(signal);
    });
    let credentials;
    try {
      credentials = await api.voiceCredentials(slug);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      teardown();
      set({ phase: "idle" });
      return;
    }
    mesh = new VoiceMesh({
      myId: me,
      iceServers: (credentials.iceServers ?? []).map((s) => ({
        urls: s.urls ?? [],
        username: s.username ?? undefined,
        credential: s.credential ?? undefined,
      })),
      stream,
      send: (signal) => {
        liveChannel.publish(`/app/sessions/${slug}/voice/signal`, signal);
      },
      onChange: (peers, selfSpeaking) => set({ peers, selfSpeaking }),
    });
    mesh.setMuted(get().muted);
    mesh.setRoster(rosterOf(useSessionStore.getState().view));
    for (const signal of pendingSignals.splice(0)) void mesh.handleSignal(signal);
    set({ phase: "in" });
  },

  leave: () => {
    teardown();
    set({ phase: "idle", peers: {}, selfSpeaking: false });
  },

  toggleMute: () => {
    const muted = !get().muted;
    mesh?.setMuted(muted);
    set({ muted });
  },

  ended: (reason) => {
    set({ endedReason: reason });
    if (endedTimer) clearTimeout(endedTimer);
    endedTimer = setTimeout(() => set({ endedReason: null }), ENDED_VISIBLE_MS);
  },
}));

// Görünüm değişince: oda kapandıysa (voice null; bind() sıfırlaması ve 401 dahil) çık,
// roster değiştiyse mesh'e ilet. Tek kapanış yolu (spec §9).
useSessionStore.subscribe((state) => {
  const voice = useVoiceStore.getState();
  if (voice.phase !== "in") return;
  if (!state.view?.voice) {
    voice.leave();
    return;
  }
  mesh?.setRoster(rosterOf(state.view));
});
```

- [ ] **Step 4: Çalıştır**

Run: `PNPM_TEST src/store/voiceStore.test.ts` → 8 passed.

- [ ] **Step 5: `useSessionLive.test.ts`'i yaz**

```ts
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  handlers: [] as ((body: string) => void)[],
  unsubscribe: vi.fn(),
  close: vi.fn(),
}));
vi.mock("./liveChannel", () => ({
  liveChannel: {
    subscribe: vi.fn((_d: string, h: (body: string) => void) => { hoisted.handlers.push(h); return hoisted.unsubscribe; }),
    open: vi.fn(() => hoisted.close),
    publish: vi.fn(),
  },
}));
vi.mock("../lib/api", () => ({ api: { getSession: vi.fn(), preview: vi.fn() } }));

import { useSessionLive } from "./useSessionLive";
import { useVoiceStore } from "./voiceStore";

describe("useSessionLive", () => {
  beforeEach(() => {
    hoisted.handlers.length = 0;
    vi.clearAllMocks();
    useVoiceStore.setState({ endedReason: null });
  });

  it("voice_ended olayı sebebi ses deposuna yazar; ayrılırken mikrofon bırakılır", () => {
    const leave = vi.fn();
    useVoiceStore.setState({ leave });
    const { unmount } = renderHook(() => useSessionLive("x"));

    hoisted.handlers[0]!(JSON.stringify({ type: "voice_ended", payload: { reason: "TIME_LIMIT" } }));
    expect(useVoiceStore.getState().endedReason).toBe("TIME_LIMIT");

    hoisted.handlers[0]!("not json"); // bozuk gövde tazelemeyi kırmaz
    unmount();
    expect(hoisted.unsubscribe).toHaveBeenCalled();
    expect(hoisted.close).toHaveBeenCalled();
    expect(leave).toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: `useSessionLive.ts`'e bağla**

```ts
import { useEffect } from "react";
import { liveChannel } from "./liveChannel";
import { useSessionStore } from "./sessionStore";
import { useVoiceStore, type EndReason } from "./voiceStore";

const POLL_MS = 30000;

/** Olaylar "tazele" zilidir; tek istisna `voice_ended`: sebebi dock'a taşır (spec §6). */
function endedReasonOf(body: string): EndReason | null {
  try {
    const event = JSON.parse(body) as { type?: string; payload?: { reason?: string } };
    if (event.type !== "voice_ended") return null;
    const reason = event.payload?.reason;
    return reason === "HOST" || reason === "TIME_LIMIT" || reason === "EMPTY" ? reason : null;
  } catch {
    return null;
  }
}

export function useSessionLive(slug: string) {
  const bind = useSessionStore((s) => s.bind);
  const refresh = useSessionStore((s) => s.refresh);

  useEffect(() => {
    bind(slug);
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_MS);
    const unsubscribe = liveChannel.subscribe(`/topic/session/${slug}`, (body) => {
      void refresh();
      const reason = endedReasonOf(body);
      if (reason) useVoiceStore.getState().ended(reason);
    });
    const close = liveChannel.open(slug, () => void refresh());

    return () => {
      clearInterval(timer);
      unsubscribe();
      close();
      useVoiceStore.getState().leave(); // sayfadan ayrılınca mikrofon açık kalmaz
    };
  }, [slug, bind, refresh]);
}
```

(`POLL_MS` üstündeki mevcut yorum korunur.)

- [ ] **Step 7: Çalıştır**

Run: `PNPM_TEST src/store/useSessionLive.test.ts` → 1 passed. `PNPM_TEST src/store` → hepsi yeşil. `tsc -b` temiz.

- [ ] **Step 8: Dosya listesi**

`voiceStore.ts`, `voiceStore.test.ts`, `useSessionLive.ts`, `useSessionLive.test.ts`. Mesaj: `feat(voice): voiceStore join flow, roster sync and ended reason`.

---

### Task 5: i18n, `VoiceDock`, `SessionPage` mount

**Files:**
- Modify: `frontend/web/src/i18n/locales/tr.json`, `en.json`, `nl.json`
- Create: `frontend/web/src/components/organisms/VoiceDock.tsx`
- Modify: `frontend/web/src/components/index.ts` (barrel export)
- Modify: `frontend/web/src/pages/SessionPage.tsx`
- Test: `frontend/web/src/components/organisms/VoiceDock.test.tsx`
- Test: `frontend/web/src/pages/SessionPage.test.tsx` (zenginleştir)

- [ ] **Step 1: i18n anahtarlarını ekle** (her dosyada kök nesnenin sonuna, `voice` alanı)

`tr.json`:

```json
  "voice": {
    "region": "Sesli sohbet",
    "start": "Sesli sohbeti başlat",
    "restart": "Yeniden başlat",
    "open": "Sesli sohbet açık",
    "members": "{{count}} kişi",
    "remaining": "{{time}} kaldı",
    "join": "Katıl",
    "joining": "Bağlanıyor…",
    "retry": "Tekrar dene",
    "leave": "Ayrıl",
    "end": "Herkes için bitir",
    "mute": "Sustur",
    "unmute": "Sesi aç",
    "micDenied": "Mikrofon izni gerekli. Tarayıcı ayarlarından izin verip tekrar dene.",
    "inVoice": "sesli sohbette",
    "speaking": "konuşuyor",
    "peerFailed": "bağlanamadı",
    "errStart": "Sesli sohbet başlatılamadı — tekrar dene.",
    "errEnd": "Sesli sohbet bitirilemedi — tekrar dene.",
    "ended": {
      "HOST": "Sesli sohbet bitirildi",
      "TIME_LIMIT": "Süre doldu",
      "EMPTY": "Herkes ayrıldı, sesli sohbet kapandı"
    }
  }
```

`en.json`:

```json
  "voice": {
    "region": "Voice chat",
    "start": "Start voice chat",
    "restart": "Start again",
    "open": "Voice chat is on",
    "members_one": "{{count}} person",
    "members_other": "{{count}} people",
    "remaining": "{{time}} left",
    "join": "Join",
    "joining": "Connecting…",
    "retry": "Try again",
    "leave": "Leave",
    "end": "End for everyone",
    "mute": "Mute",
    "unmute": "Unmute",
    "micDenied": "Microphone access is needed. Allow it in your browser settings and try again.",
    "inVoice": "in voice chat",
    "speaking": "speaking",
    "peerFailed": "could not connect",
    "errStart": "Couldn't start voice chat — try again.",
    "errEnd": "Couldn't end voice chat — try again.",
    "ended": {
      "HOST": "Voice chat was ended",
      "TIME_LIMIT": "Time is up",
      "EMPTY": "Everyone left, voice chat closed"
    }
  }
```

`nl.json`:

```json
  "voice": {
    "region": "Spraakchat",
    "start": "Spraakchat starten",
    "restart": "Opnieuw starten",
    "open": "Spraakchat staat aan",
    "members_one": "{{count}} persoon",
    "members_other": "{{count}} personen",
    "remaining": "nog {{time}}",
    "join": "Meedoen",
    "joining": "Verbinden…",
    "retry": "Opnieuw proberen",
    "leave": "Verlaten",
    "end": "Voor iedereen beëindigen",
    "mute": "Dempen",
    "unmute": "Dempen opheffen",
    "micDenied": "Microfoontoegang is nodig. Sta het toe in je browserinstellingen en probeer opnieuw.",
    "inVoice": "in spraakchat",
    "speaking": "aan het woord",
    "peerFailed": "kon niet verbinden",
    "errStart": "Spraakchat kon niet starten — probeer opnieuw.",
    "errEnd": "Spraakchat kon niet worden beëindigd — probeer opnieuw.",
    "ended": {
      "HOST": "Spraakchat is beëindigd",
      "TIME_LIMIT": "De tijd is om",
      "EMPTY": "Iedereen is weg, spraakchat gesloten"
    }
  }
```

Run: `source ./init-nvm.sh && pnpm i18n:check` → parite tamam (tr `members` ↔ en/nl `members_one/_other` CLDR kuralıyla eşleşir).

- [ ] **Step 2: `VoiceDock.test.tsx`'i yaz**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({
  api: { voiceStart: vi.fn(), voiceEnd: vi.fn(), voiceCredentials: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
}));

import { api } from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";
import { useVoiceStore } from "../../store/voiceStore";
import VoiceDock from "./VoiceDock";

const person = (id: string, name: string, inVoice: boolean, host = false) =>
  ({ id, displayName: name, host, hasLocation: true, deckDone: false, manual: false, inVoice });

const base = {
  slug: "x", name: "Cuma", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING",
  expiresAt: "", venues: [], runoffVenueIds: [], voteTally: {},
  participants: [person("h", "Mehmet", true, true), person("a", "Ayşe", true), person("b", "Kerem", false)],
};
const inTenMinutes = () => new Date(Date.now() + 10 * 60_000).toISOString();

function dock(view: object, voice: Partial<ReturnType<typeof useVoiceStore.getState>> = {}) {
  useSessionStore.setState({ slug: "x", view: view as never, error: null });
  useVoiceStore.setState({ phase: "idle", muted: false, peers: {}, selfSpeaking: false, endedReason: null, micDenied: false, ...voice });
  return render(<VoiceDock view={view as never} />);
}

describe("VoiceDock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("kapalı + üye + sebep yok → hiçbir şey", () => {
    const { container } = dock({ ...base, voice: null, viewer: { participantId: "a", host: false } });
    expect(container).toBeEmptyDOMElement();
  });

  it("kapalı + host → başlat; tıklayınca sunucuya gider", async () => {
    vi.mocked(api.voiceStart).mockResolvedValue({ endsAt: inTenMinutes() } as never);
    vi.mocked(api.getSession).mockResolvedValue({ ...base, voice: { endsAt: inTenMinutes() } } as never);
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } });
    fireEvent.click(screen.getByRole("button", { name: /Sesli sohbeti başlat/ }));
    await screen.findByRole("button", { name: /Sesli sohbeti başlat/ });
    expect(api.voiceStart).toHaveBeenCalledWith("x");
  });

  it("açık + dışarıda → kişi sayısı, geri sayım ve Katıl", () => {
    const join = vi.fn();
    dock({ ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } }, { join });
    expect(screen.getByText("Sesli sohbet açık")).toBeInTheDocument();
    expect(screen.getByText(/2 kişi/)).toBeInTheDocument();
    expect(screen.getByText(/9:5\d kaldı|10:00 kaldı/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Katıl" }));
    expect(join).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Herkes için bitir" })).not.toBeInTheDocument();
  });

  it("içeride → avatarlar durumlarıyla, sustur, ayrıl; host'a bitir", () => {
    const toggleMute = vi.fn();
    const leave = vi.fn();
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } },
      { phase: "in", toggleMute, leave, peers: { a: { state: "connected", speaking: true } }, selfSpeaking: false },
    );
    expect(screen.getByText("Ayşe · konuşuyor")).toBeInTheDocument();
    expect(screen.getByText("Mehmet · sesli sohbette")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sustur" }));
    expect(toggleMute).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Ayrıl/ }));
    expect(leave).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Herkes için bitir" })).toBeInTheDocument();
  });

  it("bağlanamayan peer yazıyla söylenir; sessizken düğme 'Sesi aç'", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "h", host: true } },
      { phase: "in", muted: true, peers: { a: { state: "failed", speaking: false } } },
    );
    expect(screen.getByText("Ayşe · bağlanamadı")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sesi aç" })).toHaveAttribute("aria-pressed", "true");
  });

  it("süre doldu → sebep ve host'a Yeniden başlat; üye sebebi görür, düğme yok", () => {
    dock({ ...base, voice: null, viewer: { participantId: "h", host: true } }, { endedReason: "TIME_LIMIT" });
    expect(screen.getByText("Süre doldu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yeniden başlat/ })).toBeInTheDocument();
  });

  it("mikrofon reddi → açıklama ve Tekrar dene", () => {
    dock(
      { ...base, voice: { endsAt: inTenMinutes() }, viewer: { participantId: "b", host: false } },
      { phase: "error", micDenied: true },
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Mikrofon izni gerekli");
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/components/organisms/VoiceDock.test.tsx` → FAIL — `./VoiceDock` yok.

- [ ] **Step 4: `VoiceDock.tsx`'i yaz**

```tsx
/* Alt sabit ses çubuğu (spec §7 dock durumları). Sabit konumlandığı için kendi boşluğunu
   (spacer) da basar — AppShell'e dokunmadan sayfa dibi örtülmez. */
import { Microphone, MicrophoneSlash, PhoneDisconnect } from "@phosphor-icons/react";
import type { SessionView } from "@bumpinto/shared";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isHost, viewerId } from "../../store/sessionStore";
import { useSessionAction } from "../../store/useSessionAction";
import { useVoiceStore } from "../../store/voiceStore";
import { Avatar, Button, ErrorText } from "../atoms";

function remainingLabel(endsAt: string, now: number) {
  const total = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

function Bar(props: { label: string; children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-[4.5rem]" />
      <div
        role="region"
        aria-label={props.label}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card shadow-sh1"
      >
        <div className="mx-auto flex max-w-[64rem] flex-wrap items-center gap-3 px-4 py-3">
          {props.children}
        </div>
      </div>
    </>
  );
}

export default function VoiceDock(props: { view: SessionView }) {
  const { t } = useTranslation();
  const view = props.view;
  const host = isHost(view);
  const me = viewerId(view);
  const voice = useVoiceStore();
  const { run, busy, error } = useSessionAction();
  const endsAt = view.voice?.endsAt ?? null;
  const now = useNow(!!endsAt);
  const members = (view.participants ?? []).filter((p) => p.inVoice);

  if (!endsAt && !host && !voice.endedReason) return null;

  const endButton = host && (
    <Button kind="danger" size="sm" disabled={busy} onClick={() => void run(() => voice.end(), "voice.errEnd")}>
      {t("voice.end")}
    </Button>
  );

  if (!endsAt) {
    return (
      <Bar label={t("voice.region")}>
        {voice.endedReason && (
          <span className="text-[0.875rem] text-ink2">{t(`voice.ended.${voice.endedReason}`)}</span>
        )}
        {host && (
          <Button kind="white" size="sm" disabled={busy} onClick={() => void run(() => voice.start(), "voice.errStart")}>
            <Microphone size={18} aria-hidden />
            {t(voice.endedReason === "TIME_LIMIT" ? "voice.restart" : "voice.start")}
          </Button>
        )}
        {error && <ErrorText>{error}</ErrorText>}
      </Bar>
    );
  }

  const remaining = t("voice.remaining", { time: remainingLabel(endsAt, now) });

  if (voice.phase !== "in") {
    const joinLabel =
      voice.phase === "joining" ? t("voice.joining") : voice.phase === "error" ? t("voice.retry") : t("voice.join");
    return (
      <Bar label={t("voice.region")}>
        <span className="text-[0.875rem] font-bold">{t("voice.open")}</span>
        <span className="text-[0.8125rem] text-ink2 tabular-nums">
          {t("voice.members", { count: members.length })} · {remaining}
        </span>
        {voice.phase === "error" && voice.micDenied && <ErrorText>{t("voice.micDenied")}</ErrorText>}
        <div className="ml-auto flex items-center gap-2">
          <Button kind="flame" size="sm" disabled={voice.phase === "joining"} onClick={() => void voice.join()}>
            {joinLabel}
          </Button>
          {endButton}
        </div>
        {error && <ErrorText>{error}</ErrorText>}
      </Bar>
    );
  }

  return (
    <Bar label={t("voice.region")}>
      <div className="flex gap-1.5">
        {members.map((p, i) => {
          const self = p.id === me;
          const peer = p.id ? voice.peers[p.id] : undefined;
          const speaking = self ? voice.selfSpeaking : !!peer?.speaking;
          const failed = !self && peer?.state === "failed";
          const status = t(failed ? "voice.peerFailed" : speaking ? "voice.speaking" : "voice.inVoice");
          const label = `${p.displayName ?? "?"} · ${status}`;
          return (
            <span
              key={p.id ?? i}
              title={label}
              className={[
                "inline-flex rounded-full",
                speaking ? "ring-2 ring-grass ring-offset-2 ring-offset-card" : "",
                failed ? "opacity-55" : "",
              ].join(" ").trim()}
            >
              <Avatar size="sm" name={p.displayName ?? "?"} index={i} ring />
              <span className="sr-only">{label}</span>
            </span>
          );
        })}
      </div>
      <span className="text-[0.8125rem] text-ink2 tabular-nums">{remaining}</span>
      <div className="ml-auto flex items-center gap-2">
        <Button
          kind="white"
          shape="round-sm"
          onClick={voice.toggleMute}
          aria-label={t(voice.muted ? "voice.unmute" : "voice.mute")}
          aria-pressed={voice.muted}
        >
          {voice.muted ? <MicrophoneSlash size={18} aria-hidden /> : <Microphone size={18} aria-hidden />}
        </Button>
        <Button kind="ghost" size="sm" onClick={voice.leave}>
          <PhoneDisconnect size={18} aria-hidden />
          {t("voice.leave")}
        </Button>
        {endButton}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </Bar>
  );
}
```

`components/index.ts` organisms bloğuna: `export { default as VoiceDock } from "./organisms/VoiceDock";`

- [ ] **Step 5: Çalıştır**

Run: `PNPM_TEST src/components/organisms/VoiceDock.test.tsx` → 7 passed. Düşerse: `Button` `size="sm"` yalnız `shape="pill"` (varsayılan) ile — `round-sm`'de `size` verilmez; `ring-grass`/`ring-offset-card` Tailwind v4 `@theme` renk token'larıdır (`text-grass`, `bg-card` mevcut), derleme hatası vermez.

- [ ] **Step 6: `SessionPage.tsx`'i dock'la sar**

```tsx
import type { SessionView } from "@bumpinto/shared";
import { useParams } from "react-router-dom";
import VoiceDock from "../components/organisms/VoiceDock";
import { useSessionLive } from "../store/useSessionLive";
import { isHost, useSessionStore } from "../store/sessionStore";
import DeckScreen from "./DeckScreen";
import ErrorPage from "./ErrorPage";
import JoinForm from "./JoinForm";
import LobbyPage from "./LobbyPage";
import ResultScreen from "./ResultScreen";
import RunoffScreen from "./RunoffScreen";
import SoloSetupPage from "./SoloSetupPage";
import VenuesPage from "./VenuesPage";
import WaitingRoom from "./WaitingRoom";

export default function SessionPage() {
  const { slug = "" } = useParams();
  useSessionLive(slug);
  const { view, preview, error } = useSessionStore();

  // `error` bir çeviri anahtarı (sessionStore) — süresi dolmuş/bulunamadı ikisi de olabilir.
  if (error) return <ErrorPage kind={error === "session.expired" ? "expired" : "notFound"} />;
  // Görünüm yoksa katılım formu: sunucu üye olmayana 401/403 döner, store `view`'ı null'lar.
  // Ama kapanmış bir buluşmaya katılım YOK: form gönderilince 409 dönerdi (çıkmaz sokak).
  // Durumu kamu önizlemesi taşır — üye olmayan da okuyabilir (K-W12).
  if (!view) {
    if (preview?.status === "DECIDED") return <ErrorPage kind="decided" />;
    if (preview?.status === "EXPIRED") return <ErrorPage kind="expired" />;
    return <JoinForm />;
  }
  const solo = view.sessionType === "SOLO";
  const page = pageFor(view, slug, isHost(view), solo);
  // Dock durum anahtarının DIŞINDA: aşama geçişi sayfayı değiştirir, dock'u değil (spec §7). SOLO'da ses yok.
  return solo ? page : <>{page}<VoiceDock view={view} /></>;
}

function pageFor(view: SessionView, slug: string, host: boolean, solo: boolean) {
  switch (view.status) {
    case "COLLECTING":
    case "SUGGESTING":
      if (solo) return <SoloSetupPage view={view} />;
      return host ? <LobbyPage view={view} /> : <WaitingRoom view={view} />;
    case "BROWSING":
      return <VenuesPage view={view} />;
    case "SWIPING":
      return <DeckScreen slug={slug} view={view} />;
    case "RUNOFF":
      return <RunoffScreen slug={slug} view={view} />;
    case "DECIDED":
      return (view.venues ?? []).some((v) => v.id === view.decidedVenueId) ? <ResultScreen view={view} /> : <ErrorPage kind="expired" />;
    default:
      return <ErrorPage kind="expired" />;
  }
}
```

- [ ] **Step 7: `SessionPage.test.tsx`'e iki test ekle** (dosya sonuna)

```tsx
describe("SessionPage — ses dock'u", () => {
  it("GROUP + host → 'Sesli sohbeti başlat' sayfanın altında", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "h", host: true } });
    expect(screen.getByRole("button", { name: /Sesli sohbeti başlat/ })).toBeInTheDocument();
  });
  it("SOLO → dock yok", () => {
    at({ ...base, status: "COLLECTING", sessionType: "SOLO", viewer: { participantId: "h", host: true } });
    expect(screen.queryByRole("button", { name: /Sesli sohbeti başlat/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Çalıştır**

Run: `PNPM_TEST src/pages/SessionPage.test.tsx` → hepsi yeşil (+2). `PNPM_TEST src/components/organisms/VoiceDock.test.tsx` → 7. `tsc -b` temiz. `pnpm i18n:check` → 0.

- [ ] **Step 9: Dosya listesi**

`tr.json`, `en.json`, `nl.json`, `VoiceDock.tsx`, `VoiceDock.test.tsx`, `components/index.ts`, `SessionPage.tsx`, `SessionPage.test.tsx`. Mesaj: `feat(voice): VoiceDock with join/mute/leave/end, countdown and speaking rings`.

---

### Task 6: `ParticipantRow` — mikrofon ikonu ve konuşma halkası (K12)

**Files:**
- Modify: `frontend/web/src/components/molecules/ParticipantRow.tsx`
- Test: `frontend/web/src/components/molecules/ParticipantRow.test.tsx`

- [ ] **Step 1: Testi yaz**

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { getSession: vi.fn(), preview: vi.fn() } }));
vi.mock("../../store/liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => vi.fn()), publish: vi.fn(), open: vi.fn() },
}));

import { useVoiceStore } from "../../store/voiceStore";
import ParticipantRow from "./ParticipantRow";

const ayse = (extra: Record<string, unknown> = {}) =>
  ({ id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false,
    locationLabel: "Someren", ...extra });

describe("ParticipantRow — ses", () => {
  beforeEach(() => useVoiceStore.setState({ peers: {}, selfSpeaking: false }));

  it("sesli sohbetteki katılımcı mikrofon ikonuyla işaretlenir", () => {
    render(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} />);
    expect(screen.getByText("sesli sohbette")).toBeInTheDocument();
  });

  it("sesde olmayan katılımcıda ikon ve halka yok", () => {
    render(<ParticipantRow participant={ayse() as never} index={0} />);
    expect(screen.queryByText("sesli sohbette")).not.toBeInTheDocument();
    expect(screen.queryByText("konuşuyor")).not.toBeInTheDocument();
  });

  it("konuşan peer halka ve yazıyla belli olur; kendi satırı selfSpeaking'e bakar", () => {
    useVoiceStore.setState({ peers: { a: { state: "connected", speaking: true } }, selfSpeaking: true });
    const { rerender } = render(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} />);
    expect(screen.getByText("konuşuyor")).toBeInTheDocument();

    useVoiceStore.setState({ peers: {}, selfSpeaking: true });
    rerender(<ParticipantRow participant={ayse({ inVoice: true }) as never} index={0} isSelf />);
    expect(screen.getByText("konuşuyor")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Çalıştır, düştüğünü gör**

Run: `PNPM_TEST src/components/molecules/ParticipantRow.test.tsx` → ilk ve üçüncü test düşer.

- [ ] **Step 3: `ParticipantRow.tsx`'i güncelle**

Import'lara ekle:

```tsx
import { Microphone } from "@phosphor-icons/react";
import { useVoiceStore } from "../../store/voiceStore";
```

`away` satırından sonra:

```tsx
  // K12: konuşma bilgisi ses deposundan (istemcide ölçülür); üyelik görünümden (`inVoice`).
  const speaking = useVoiceStore((s) =>
    props.isSelf ? s.selfSpeaking : !!(p.id && s.peers[p.id]?.speaking),
  );
  const inVoice = !!p.inVoice;
```

Avatar'ı sarmala (mevcut `<Avatar ... />` yerine):

```tsx
      <span
        className={`inline-flex rounded-full${speaking ? " ring-2 ring-grass ring-offset-2 ring-offset-card" : ""}`}
      >
        <Avatar
          name={p.displayName ?? "?"}
          index={props.index}
          ring={p.hasLocation}
          waiting={!p.hasLocation}
        />
      </span>
```

Ad satırında `{props.isSelf && ...}` parçasından sonra:

```tsx
          {inVoice && (
            <span className="ml-1.5 inline-flex items-center align-middle text-grass" title={t("voice.inVoice")}>
              <Microphone size={14} aria-hidden />
              <span className="sr-only">{t("voice.inVoice")}</span>
            </span>
          )}
          {speaking && <span className="sr-only">{t("voice.speaking")}</span>}
```

Üst yorumun sonuna bir cümle: "Ses: `inVoice` görünümden, mikrofon ikonu; konuşma halkası `voiceStore`'dan (K12)."

- [ ] **Step 4: Çalıştır**

Run: `PNPM_TEST src/components/molecules/ParticipantRow.test.tsx` → 3 passed.
Run: `PNPM_TEST src/pages/LobbyPage.test.tsx src/pages/WaitingRoom.test.tsx src/components/organisms` → hâlâ yeşil (ParticipantRow tüketicileri).

- [ ] **Step 5: Dosya listesi**

`ParticipantRow.tsx`, `ParticipantRow.test.tsx`. Mesaj: `feat(voice): mic badge and speaking ring on participant rows`.

---

### Task 7: Doğrulama, kayıt, elle uçtan uca

**Files:**
- Modify: `docs/superpowers/plans/INDEX.md` (W-11 satırı)

- [ ] **Step 1: Tam doğrulama** (repo kökünden)

```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/web exec tsc -b
pnpm test:web
pnpm i18n:check
pnpm --filter @bumpinto/web build
```

Expected: tsc temiz; testler önceki sayı + 30 (liveChannel 3, audioLevels 2, voiceMesh 8, voiceStore 8, useSessionLive 1, VoiceDock 7, SessionPage +2, ParticipantRow 3 = 34); parite 0 fark; build yeşil.

- [ ] **Step 2: INDEX.md W tablosundaki W-11 satırını güncelle** — `Durum` `ready` → `done`, `Son adım` → "Task 7/7", `Not`'a test sayısını ekle. Satır yoksa şu satırı W-10'dan sonra ekle:

```markdown
| W-11 | **Sesli sohbet web** — `liveChannel` (STOMP tek yerde, yeniden abonelik), `voiceMesh` (full-mesh, küçük-id teklif, ICE restart), `audioLevels` (K12), `voiceStore` (mikrofon → abonelik → kimlik → mesh), `VoiceDock` (başlat/katıl/sustur/ayrıl/bitir, geri sayım, sebep), `ParticipantRow` mikrofon + halka | `2026-09-06-plan29-voice-web.md` | Plan 29 | ready | B-12 (openapi) | — | Spec `2026-09-06-voice-chat-design.md` §7. Dock spacer basar (AppShell değişmez). Katman 3 (sessizlik tespiti) v2 |
```

- [ ] **Step 3: Elle uçtan uca kontrol listesi** (kullanıcıya bırakılır; ajan yapamaz — mikrofon ve iki tarayıcı gerekir)

Backend `VOICE_MAX_DURATION=PT3M` ile başlat (süre dolumunu 3 dk'da görmek için), `CLOUDFLARE_TURN_*` boş bırak (STUN yeter, aynı ağ).

1. Chrome'da host oturum kurar, Safari'de (ya da gizli pencerede) davetli katılır.
2. Host "Sesli sohbeti başlat" → iki tarafta da dock "Sesli sohbet açık · 0 kişi" ve geri sayım.
3. İkisi de "Katıl" → mikrofon izni → dock'ta iki avatar; konuşunca halka yanar; `ParticipantRow`'da mikrofon ikonu.
4. Sustur → karşı taraf sessizlik duyar, halka sönmez sorunu yok (yerel track kapalı, seviye 0).
5. Davetli sekmeyi kapatır → host'ta avatar 1-2 sn içinde düşer.
6. Davetli geri gelip katılır → tekrar ses.
7. Host "Herkes için bitir" → iki tarafta dock kapalı hâle döner, davetlide "Sesli sohbet bitirildi" 10 sn.
8. Host yeniden başlatır, 3 dk bekle → "Süre doldu", host'ta "Yeniden başlat".
9. Herkes sekmeyi kapatır, 3 sn sonra `GET /api/sessions/{slug}` → `voice: null`.
10. Mobil Safari: arka plana al → WS kopar → odadan düşer; öne gel → tekrar "Katıl" (bilinen sınır, spec §11).

- [ ] **Step 4: Dosya listesi**

`INDEX.md`. Mesaj: `docs(voice): register W-11 web plan`.

---

## Plan öz-incelemesi

**Spec kapsamı (§7 web):** `liveChannel` T2 · `voiceMesh` (K5, roster farkı, offer/answer/ice, sessize alma, ICE restart bir kez, Audio nesnesi, seviye örnekleyici) T3 · `voiceStore` (faz, muted, peers+speaking, selfSpeaking, endedReason; start/end/join/leave/toggleMute; sessionStore aboneliği; katılım sırası; `voice_ended` sebebi) T4 · Dock yedi durumu (kapalı-host, kapalı-üye yok, açık-dışarıda, joining, in, error, süre doldu) T5 · `SessionPage` durum anahtarı dışında mount, SOLO'da yok T5 · `ParticipantRow` mikrofon + halka T6 · i18n tr/en/nl T5 · `api-types.ts` ön koşul. §9 hatalar: mikrofon reddi T4/T5, kimlik 409 T4, peer failed T3/T5, `voice_ended` tek kapanış yolu T4, restart (voice null) T4. K12 T3/T5/T6. Boşluk yok.

**Yer tutucu taraması:** yok; her adımda kod.

**Tip tutarlılığı:** `OutgoingSignal`/`IncomingSignal`/`PeerSnapshot` T3 = T4 = T5 · `MeshDeps.createLevels(cb) → LevelSampler` T3 test = T3 kod · `liveChannel.subscribe(dest, handler) → () => void`, `publish → boolean`, `open(slug, onConnect) → () => void` T2 = T4 = T5 mock'ları · `useVoiceStore` alanları (`phase, muted, peers, selfSpeaking, endedReason, micDenied`) T4 = T5 = T6 · `rosterOf` T4 · `EndReason` T4 = `useSessionLive` · `VoiceDock` prop `view: SessionView` T5 = `SessionPage`.
