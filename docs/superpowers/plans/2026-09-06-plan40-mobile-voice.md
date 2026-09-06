# Sesli Sohbet — Mobil (M-6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Native (Expo) istemcisinde web ile aynı full-mesh WebRTC sesli sohbet: host başlatır, üyeler "Katıl" ile girer, P25'in yedi dock durumu, mikrofon izni ön-ekranı ve red kurtarması, arka planda susma, engellenen çiftin eşleşmemesi.

**Architecture:** `voiceMesh`in saf denetleyicisi (K5 küçük-id teklif kuralı, roster farkı, yeniden kurma + 15 sn bekçi, sinyal şeması) `frontend/shared/src/voice/` altına taşınır ve **yapısal** bir WebRTC yüzeyine (`MeshPeerConnection`, `MeshStream`, `AudioSink`, `LevelSampler`) bağlanır — ne DOM ne `react-native-webrtc` tipine. Web adaptörü `RTCPeerConnection` + gizli `<audio>` + `AnalyserNode`; RN adaptörü `react-native-webrtc` + no-op sink (uzak track'i kütüphane çalar) + `pc.getStats().audioLevel` örnekleyici. Konuşma eşiği/tutma (K12) tek yerde: `shared/voice/levels.ts`. STOMP `liveChannel` RN'e portlanır (`webSocketFactory` + `X-Participant-Token` başlığı, yeniden bağlanınca yeniden abonelik). `voiceStore` katılım sırasını yürütür: ön-ekran → mikrofon izni → özel konuya abonelik → kimlik → mesh. `VoiceDock` CTA'nın üstünde yüzen hap; oturum durum yönlendiricisinde bir kez mount edilir.

**Tech Stack:** Expo SDK 54+ (CNG prebuild, dev build — Expo Go yok), expo-router, `react-native-webrtc` + config plugin, `react-native-incall-manager`, `@stomp/stompjs` 7 + RN `WebSocket`, zustand 5, `phosphor-react-native`, i18next (tr/en/nl, `frontend/shared/src/i18n`), jest-expo + @testing-library/react-native, Maestro; shared tarafı vitest (web koşucusu üstünden).

**Spec:** `docs/superpowers/specs/2026-09-06-voice-chat-design.md` (§4 akış, §5 ömür, §7 web referansı, §9 hatalar, K1–K12; K10 "yalnız web" bu planla kapanır) · gereksinim dokümanı `2026-09-06-v3-requirements.md` §2 (sözleşme adları), §3 (R-M10), §4 (M-6 paketi) · ham analiz `…/req/mobile.md` R-M10, R-M9 dock kısmı, risk 2 ("mesh saf mantığını shared'a çıkar, ses I/O'yu platform adaptörüne al").

**UI Kaynağı:** Claude Design proje `719fcd5f-bb62-4356-9c53-7d4f0a8fbe36`, dosyalar `Mobil Ekranlar v3.dc.html` ve `Mobil Onboarding, İzinler ve Yasal.dc.html`. Artboard'lar: **P25** (ses dock'u, yedi durum — tek bağlayıcı bileşen sayfası), **P6** (Lobi, dock kapalı/host `warm`), **P10** (Bekle, dock açık/dışarıda), **P11** (Mekanlar, dock açık/dışarıda), **P17** (Gönderildi, dock içeride), **O7** (mikrofon ön-bilgilendirme alt sayfası; `NSMicrophoneUsageDescription` kopyası buradan), **O6** (izin reddi kurtarma deseni). Yerel kopyalar: `…/scratchpad/design/m3/A/{25-ses-dock-durumlari,06-lobi,17-gonderildi}.html`, `m3/B/07-mikrofon-on.html`.

**Ön koşul:**

| Ne | Neden | Doğrulama (repo kökünden) |
|---|---|---|
| **B-12 ✓** (plan28) | `voice` uçları, `SessionView.voice`, `ParticipantDto.inVoice` | `grep -c "VoiceCredentialsResponse" frontend/shared/src/api-types.ts` ≥ 1 |
| **B-14** (`blocked`) | `ParticipantDto.blocked?: boolean` — T5/T6 engellenen çifti mesh'e almaz | `grep -c "blocked" frontend/shared/src/api-types.ts` ≥ 1 |
| **W-11 ✓** (plan29) | Taşınacak kaynak: `voiceMesh`, `audioLevels`, `voiceStore`, `liveChannel`, `useSessionLive` | `test -f frontend/web/src/lib/voiceMesh.ts` |
| **M-4 done** | RN iskeleti; bu plan aşağıdaki sembolleri **tüketir**, üretmez | aşağıdaki blok |

M-4'ten tüketilen sözleşme (eksikse M-4 bitmemiştir — dur, M-6'ya başlama):

```bash
test -f frontend/mobile/app.config.ts
test -f frontend/mobile/src/theme.ts                    # colors.{flame,flameDeep,flameWash,grass,grassWash,ink,ink2,card,line}, fonts, radius
test -f frontend/mobile/src/lib/api.ts                  # export const api: BumpintoApi
test -f frontend/mobile/src/store/sessionStore.ts       # useSessionStore {slug, view, bind, refresh}; isHost(view); viewerId(view)
test -f frontend/mobile/src/components/atoms/index.ts   # AppText, Avatar{name,index?,size?}, Button{title,onPress,kind?,disabled?}
test -f frontend/mobile/src/components/molecules/ParticipantRow.tsx
test -f frontend/mobile/app/sessions/\[slug\].tsx        # durum yönlendirici (LOBBY/WAITING/BROWSING/DECK/RUNOFF/DECIDED)
test -f frontend/shared/src/i18n/tr.json                # M-4 dil dosyalarını shared'a taşıdı (M-2:T1)
```

**Bağlayıcı kurallar:**

- **Git yazma işlemi YOK** (commit/branch/push yok); her görev sonunda dosya listesi bırakılır, commit'i kullanıcı atar.
- Test komutları (repo kökünden): `SHARED_TEST <yol>` = `source ./init-nvm.sh && pnpm --filter @bumpinto/web test --run <yol>` (shared testleri web vitest koşucusunda — `vite.config.ts` `include` zaten `../shared/src/**/*.test.ts`; kökten çıplak `vitest` KOŞMA). `MOBILE_TEST <yol>` = `source ./init-nvm.sh && pnpm --filter @bumpinto/mobile test -- <yol>`. Tam koşu: `pnpm test:web` + `pnpm --filter @bumpinto/mobile test`.
- **Framework yapıştırıcısı testsiz bırakılmaz** (repo kuralı): STOMP el sıkışması + sinyal rölesi T3'te gerçek istemcili betikle, izin akışı ve dock durumları T8'de Maestro ile koşar.
- İz kuralı: yalnız `frontend/shared/src/{voice,i18n}`, `frontend/web`'deki adaptör/çağrı noktaları ve `frontend/mobile` dokunulur. **Backend değişmez** (B-12 sözleşmesi aynen); `api-types.ts` elle düzenlenmez.
- i18n: `tr` taban, `en`/`nl` parite; `pnpm i18n:check` 0 fark. Ham `<Text>` yasak — `AppText`. Renkler `theme.ts` token'larından; hex yazılmaz.
- **Port deseni:** web'den taşınan dosyalarda kopyalama komutu + numaralı sapma listesi verilir; listede olmayan her satır **aynen kalır**.

**Dosya haritası:**

| Dosya | Görev | Sorumluluk |
|---|---|---|
| `frontend/shared/src/voice/{types,levels,mesh}.ts` (+testler) | T1 | Platformsuz yüzey, K12 eşik/tutma, `VoiceMesh` |
| `frontend/web/src/lib/{voiceMesh,audioLevels}.ts`, `store/voiceStore.ts` | T1 | Web adaptörü (DOM `Audio`, `AnalyserNode`) |
| `frontend/mobile/{app.config.ts,package.json}`, `src/voice/audioSession.ts` | T2 | WebRTC plugin, ses oturumu, 16 KB doğrulaması |
| `frontend/mobile/src/store/{liveChannel,useSessionLive}.ts`, `scripts/ws-smoke.mjs` | T3 | STOMP RN portu |
| `frontend/mobile/src/voice/micPermission.ts`, `components/organisms/MicPrimingSheet.tsx` | T4 | O7 ön-ekran → izin → red kurtarma |
| `frontend/mobile/src/voice/{rnAdapters,statsLevels,dockState}.ts`, `store/voiceStore.ts` | T5 | RN adaptörleri + yedi durum |
| `frontend/mobile/src/components/organisms/VoiceDock.tsx`, `app/sessions/[slug].tsx`, `molecules/ParticipantRow.tsx` | T6 | P25 dock, mount, mikrofon ikonu/halka, `blocked` |
| `frontend/mobile/src/voice/backgroundGuard.ts`, `app/_layout.tsx` | T7 | Arka plan susturma / dönüş |
| `frontend/mobile/.maestro/voice-dock.yaml`, `docs/superpowers/plans/INDEX.md` | T8 | e2e + kayıt |

---

### Task 1: `voiceMesh` saf mantığını `frontend/shared/src/voice/`'a çıkar (web bozulmadan)

**Files:**
- Create: `frontend/shared/src/voice/{types.ts,levels.ts,levels.test.ts,mesh.ts,mesh.test.ts}`
- Modify: `frontend/shared/src/index.ts`, `frontend/web/src/lib/{voiceMesh.ts,voiceMesh.test.ts,audioLevels.ts,audioLevels.test.ts}`, `frontend/web/src/store/voiceStore.ts`

- [ ] **Step 1: Platformsuz yüzey** — `frontend/shared/src/voice/types.ts`

```ts
/** Platformdan bağımsız WebRTC yüzeyi. DOM `RTCPeerConnection` ve `react-native-webrtc`'nin
    sınıfı bu şeklin üst kümesidir; her platform adaptörü TEK cast ile bağlanır ve o cast adaptör
    testiyle korunur. Mesh bu dosyanın dışında hiçbir tarayıcı/RN tipini bilmez. */
export type SignalType = "offer" | "answer" | "ice";
export type MeshIceCandidate = { candidate?: string; sdpMid?: string | null; sdpMLineIndex?: number | null; usernameFragment?: string | null };
export type OutgoingSignal = { to: string; type: SignalType; sdp?: string; candidate?: MeshIceCandidate };
export type IncomingSignal = { from: string; type: SignalType; sdp?: string; candidate?: MeshIceCandidate };
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
  connectionState: string; signalingState: string; remoteDescription: unknown;
  addTrack(track: MeshTrack, stream: MeshStream): unknown;
  createOffer(): Promise<MeshSdp>; createAnswer(): Promise<MeshSdp>;
  setLocalDescription(desc: MeshSdp): Promise<void>;
  setRemoteDescription(desc: MeshSdp): Promise<void>;
  addIceCandidate(candidate: MeshIceCandidate): Promise<void>;
  getStats(): Promise<MeshStatsReport>;
  close(): void;
  onicecandidate: ((e: { candidate: { toJSON(): MeshIceCandidate } | null }) => void) | null;
  ontrack: ((e: { streams: MeshStream[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
};

/** Uzak sesin çalındığı yer. Web: gizli `<audio>`. RN: kütüphane track'i kendisi çalar → no-op. */
export type AudioSink = { play(stream: MeshStream): void; stop(): void };

export type LevelSampler = {
  attach(id: string, stream: MeshStream): void;
  /** RN seviyeyi `pc.getStats()`ten okur; web örnekleyicisi bunu uygulamaz. */
  attachPeer?(id: string, pc: MeshPeerConnection): void;
  detach(id: string): void;
  close(): void;
};
```

- [ ] **Step 2: Eşik + tutma testi (K12, saf)** — `frontend/shared/src/voice/levels.test.ts`

```ts
import { describe, expect, it, vi } from "vitest";
import { createSpeechGate } from "./levels";

describe("createSpeechGate", () => {
  it("eşik üstü seviye bir kez konuşma bildirir, tutma bitince kapatır", () => {
    let t = 0;
    const onSpeaking = vi.fn();
    const gate = createSpeechGate(onSpeaking, { threshold: 0.02, holdMs: 300, now: () => t });
    gate.push("b", 0.1);
    gate.push("b", 0.1);
    expect(onSpeaking).toHaveBeenCalledTimes(1);
    expect(onSpeaking).toHaveBeenCalledWith("b", true);
    t = 200; gate.push("b", 0);
    expect(onSpeaking).toHaveBeenCalledTimes(1); // tutma penceresi
    t = 400; gate.push("b", 0);
    expect(onSpeaking).toHaveBeenLastCalledWith("b", false);
  });
});
```

İkinci test (aynı dosya): konuşan biri için `remove(id)` `onSpeaking(id, false)` yayar; `clear()` ise **hiç** bildirim yaymadan hepsini siler.

Run: `SHARED_TEST frontend/shared/src/voice/levels.test.ts` · Expected: FAIL (`levels.ts` yok).

- [ ] **Step 3: `frontend/shared/src/voice/levels.ts`**

```ts
/** K12: konuşan kişi tespiti tamamen istemcide. Ölçüm platformda (web AnalyserNode RMS,
    RN `getStats().audioLevel`), KARAR burada: eşik + titreme önleyen tutma. */
export type SpeechGateOptions = { threshold?: number; holdMs?: number; now?: () => number };
export type SpeechGate = {
  /** Bir örnek besler; durum değiştiyse geri çağırır. */
  push(id: string, level: number): void;
  remove(id: string): void;
  clear(): void;
};

export function createSpeechGate(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: SpeechGateOptions = {},
): SpeechGate {
  const threshold = options.threshold ?? 0.02;
  const holdMs = options.holdMs ?? 300;
  const now = options.now ?? (() => Date.now());
  const state = new Map<string, { lastLoudAt: number; speaking: boolean }>();
  return {
    push(id, level) {
      const entry = state.get(id) ?? { lastLoudAt: Number.NEGATIVE_INFINITY, speaking: false };
      const t = now();
      if (level > threshold) entry.lastLoudAt = t;
      const speaking = t - entry.lastLoudAt < holdMs;
      state.set(id, { lastLoudAt: entry.lastLoudAt, speaking });
      if (speaking !== entry.speaking) onSpeaking(id, speaking);
    },
    remove(id) {
      const entry = state.get(id);
      if (!entry) return;
      state.delete(id);
      if (entry.speaking) onSpeaking(id, false);
    },
    clear() { state.clear(); }, // close() yolunda bildirim yok: dinleyici zaten kapanıyor
  };
}
```

Run: `SHARED_TEST frontend/shared/src/voice/levels.test.ts` · Expected: 2 test yeşil.

- [ ] **Step 4: Mesh'i taşı** (repo kökünden)

```bash
mkdir -p frontend/shared/src/voice
git mv frontend/web/src/lib/voiceMesh.ts frontend/shared/src/voice/mesh.ts
git mv frontend/web/src/lib/voiceMesh.test.ts frontend/shared/src/voice/mesh.test.ts
```

`mesh.ts` üzerinde **tam olarak şu yedi sapma**; sınıf gövdesinin geri kalanı (`initiates` K5 kuralı, `setRoster` farkı, `handleSignal` offer/answer/ice, yetim ICE kuyruğu, `treatAsFailed` bir-kez-yeniden-kurma, `onWatchdog`, `flushIce`, `drop`, `fail`, `emit`) **olduğu gibi kalır**:

1. `import { createLevelSampler, type LevelSampler } from "./audioLevels";` satırı ve altındaki beş tip tanımı (`SignalType`, `OutgoingSignal`, `IncomingSignal`, `PeerState`, `PeerSnapshot`) silinir; yerine:

```ts
import type {
  AudioSink, IncomingSignal, LevelSampler, MeshIceCandidate, MeshIceServer,
  MeshPeerConnection, MeshStream, OutgoingSignal, PeerSnapshot, PeerState,
} from "./types";
export type * from "./types";
```

2. `defaultCreateAudio()` tamamen silinir (DOM buraya girmez).
3. `MeshDeps` — fabrikalar **zorunlu**, `import.meta.env` yerine `onWarn`:

```ts
export type MeshDeps = {
  myId: string;
  iceServers: MeshIceServer[];
  /** Yerel mikrofon; close() track'leri durdurur. */
  stream: MeshStream;
  send: (signal: OutgoingSignal) => void;
  onChange: (peers: Record<string, PeerSnapshot>, selfSpeaking: boolean) => void;
  createPeer: (config: { iceServers: MeshIceServer[] }) => MeshPeerConnection;
  createAudio: (id: string) => AudioSink;
  createLevels: (onSpeaking: (id: string, speaking: boolean) => void) => LevelSampler;
  /** Bağlantı bu sürede "connected"e ulaşmazsa arıza bölümü gibi ele alınır. */
  watchdogMs?: number;
  /** Yutulmayan ama kullanıcıya gösterilmeyen hatalar (DEV günlüğü platformda seçilir). */
  onWarn?: (message: string, ...rest: unknown[]) => void;
};
```

4. `Peer` tipinde `audio: HTMLAudioElement | null` → `audio: AudioSink | null`; `pendingIce: RTCIceCandidateInit[]` → `pendingIce: MeshIceCandidate[]`.
5. Kurucudaki `const createLevels = deps.createLevels ?? ((cb) => createLevelSampler(cb));` → `const createLevels = deps.createLevels;`.
6. `createPeer(id)` içinde `const create = this.deps.createPeer ?? (...)` satırı silinip `const pc = this.deps.createPeer({ iceServers: this.deps.iceServers });` olur; ardına `this.levels.attachPeer?.(id, pc);` eklenir (RN seviyeyi PC'den okur). `ontrack` sadeleşir:

```ts
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      peer.audio?.stop(); // yeniden müzakerede eski sink bırakılır
      const sink = this.deps.createAudio(id);
      sink.play(stream);
      peer.audio = sink;
      this.levels.attach(id, stream);
    };
```

7. `fail()` içindeki DEV günlüğü `this.deps.onWarn?.("voice peer failed", id, e);` olur; `drop()` içindeki `pause()/srcObject/remove()` bloğu `peer.audio?.stop();` tek satırına iner (autoplay reddi artık sink'in işi).

- [ ] **Step 5: Taşınan testi uyarla** — `frontend/shared/src/voice/mesh.test.ts`, beş sapma:

(a) İlk üç satır: `vitest`ten `describe/expect/it/vi`; `./mesh`ten `VoiceMesh, type MeshDeps`; `./types`ten `AudioSink, LevelSampler, MeshIceServer, MeshSdp, MeshIceCandidate, MeshPeerConnection, MeshStream, MeshTrack, OutgoingSignal`.
(b) `FakePeer` alan tipleri yapısala döner (davranış aynı): `connectionState: string`, `signalingState: string`, `remoteDescription: MeshSdp | null`, `localDescription: MeshSdp | null`, `candidates: MeshIceCandidate[]`, `tracks: MeshTrack[]`, `setState(state: string)`, `constructor(public config: { iceServers: MeshIceServer[] })`; yüzey gereği `getStats = async () => ({ forEach: () => undefined });` eklenir.
(c) `harness` içindeki gerçek `<audio>` bloğu (jsdom yorumuyla) sink sahtesine döner ve `stream`/`track` cast'siz yazılır:

```ts
  const sink: AudioSink & { played: MeshStream[] } = { played: [], play(s) { this.played.push(s); }, stop: vi.fn() };
  const track: MeshTrack = { kind: "audio", enabled: true, stop: vi.fn() };
  const stream: MeshStream = { getTracks: () => [track], getAudioTracks: () => [track] };
  // deps: createPeer: (config) => new FakePeer(config) as unknown as MeshPeerConnection, createAudio: () => sink
  // return { mesh, sent, onChange, levels, sink, track };
```

(d) "peer düşünce uzak `<audio>` elemanı DOM'dan da kaldırılır" testi buradan **silinir** (Step 7'de web adaptör testine taşınır); yerine:

```ts
  it("peer düşünce ses sink'i bırakılır", () => {
    const h = harness("a");
    h.mesh.setRoster(["a", "b"]);
    FakePeer.all[0].ontrack?.({ streams: [{ getTracks: () => [], getAudioTracks: () => [] }] });
    expect(h.sink.played).toHaveLength(1);
    h.mesh.setRoster(["a"]);
    expect(h.sink.stop).toHaveBeenCalled();
  });
```

(e) Kalan testlerde `h.audio` → `h.sink` (yalnız "ontrack sesi bağlar" testinde) ve `as unknown as RTCPeerConnection` → `as unknown as MeshPeerConnection`.

Run: `SHARED_TEST frontend/shared/src/voice` · Expected: mesh (21) + levels (2) yeşil.

- [ ] **Step 6: shared dışa açımı** — `frontend/shared/src/index.ts` sonuna:

```ts
export { VoiceMesh, type MeshDeps } from "./voice/mesh";
export { createSpeechGate, type SpeechGate, type SpeechGateOptions } from "./voice/levels";
export type {
  AudioSink, IncomingSignal, LevelSampler, MeshIceCandidate, MeshIceServer, MeshPeerConnection,
  MeshSdp, MeshStatsEntry, MeshStatsReport, MeshStream, MeshTrack, OutgoingSignal,
  PeerSnapshot, PeerState, SignalType,
} from "./voice/types";
```

- [ ] **Step 7: Web adaptörü** — `frontend/web/src/lib/voiceMesh.ts` (yeni içerik; eski dosya Step 4'te taşındı)

```ts
import type { AudioSink, MeshIceServer, MeshPeerConnection } from "@bumpinto/shared";

/** Tarayıcı tipini yapısal yüzeye bağlayan TEK cast (RN eşleniği `createRnPeer`). */
export function createWebPeer(config: { iceServers: MeshIceServer[] }): MeshPeerConnection {
  return new RTCPeerConnection(config as RTCConfiguration) as unknown as MeshPeerConnection;
}

/** Uzak akış bir `<audio>` elemanına BAĞLI olmalı: hem çalma hem analizör (Chrome/Safari) buna
    bakar. DOM'a EKLENMEMİŞ `<audio>` bazı tarayıcılarda (Safari) sessiz kalır — gizli, body'ye
    eklenir; `playsinline` niteliği de yine Safari için gerekir. */
export function createWebAudioSink(id: string, onWarn?: (m: string, ...rest: unknown[]) => void): AudioSink {
  const el = new Audio();
  el.setAttribute("playsinline", "");
  el.autoplay = true;
  el.hidden = true;
  document.body.appendChild(el);
  return {
    play(stream) {
      el.srcObject = stream as unknown as MediaStream;
      void el.play().catch((e) => onWarn?.("voice audio play rejected", id, e));
    },
    stop() { el.pause(); el.srcObject = null; if (typeof el.remove === "function") el.remove(); },
  };
}

export { VoiceMesh } from "@bumpinto/shared";
export type { IncomingSignal, OutgoingSignal, PeerSnapshot, PeerState, SignalType } from "@bumpinto/shared";
```

Yeni `frontend/web/src/lib/voiceMesh.test.ts` — taşınan DOM davranışının yeni evi:

```ts
import { describe, expect, it, vi } from "vitest";
import { createWebAudioSink } from "./voiceMesh";

it("gizli <audio> body'ye eklenir, akış çalınır, stop DOM'dan kaldırır", () => {
  const sink = createWebAudioSink("b");
  const el = document.body.querySelector("audio") as HTMLAudioElement;
  expect(el.getAttribute("playsinline")).toBe("");
  el.play = vi.fn(() => Promise.resolve());
  el.pause = vi.fn();
  sink.play({ getTracks: () => [], getAudioTracks: () => [] });
  expect(el.play).toHaveBeenCalled();
  sink.stop();
  expect(document.body.querySelector("audio")).toBeNull();
});
```

İkinci test (aynı dosya): `el.play` reddederse hata **yutulmaz**, verilen `onWarn` çağrılır (jsdom'da `play` sahtelenir, `await` ile bir mikro-tur beklenir).

- [ ] **Step 8: Web seviye örnekleyicisini ortak kapıya bağla** — `frontend/web/src/lib/audioLevels.ts`, dört sapma:

```ts
import { createSpeechGate, type LevelSampler, type MeshStream } from "@bumpinto/shared";
export type { LevelSampler };
// createLevelSampler gövdesinin başında (eşik/tutma/`Probe.lastLoudAt`/`Probe.speaking` alanları silinir):
  const gate = createSpeechGate(onSpeaking, { threshold: options.threshold, holdMs: options.holdMs, now: options.now });
// sample(): RMS hesabı aynen kalır, karar yerine → gate.push(id, Math.sqrt(sum / probe.buffer.length));
// detach(): probe.source.disconnect(); probes.delete(id); gate.remove(id);
// close(): clearInterval(timer); probes.forEach((p) => p.source.disconnect()); probes.clear(); gate.clear();
// attach(id, stream: MeshStream): context.createMediaStreamSource(stream as unknown as MediaStream)
```

`audioLevels.test.ts` iddiaları aynen geçerlidir (davranış değişmedi); yalnız `attach` çağrılarındaki `as unknown as MediaStream` cast'leri `as unknown as MeshStream` olur.

- [ ] **Step 9: Web store'unu adaptörlere bağla** — `frontend/web/src/store/voiceStore.ts`

```ts
import { VoiceMesh, createWebAudioSink, createWebPeer } from "../lib/voiceMesh";
import type { IncomingSignal, PeerSnapshot } from "@bumpinto/shared";
// dosya başına:
const warn = import.meta.env.DEV ? (m: string, ...rest: unknown[]) => console.warn(m, ...rest) : undefined;
// new VoiceMesh({...}) çağrısına, createLevels satırından sonra:
        createPeer: createWebPeer,
        createAudio: (id) => createWebAudioSink(id, warn),
        onWarn: warn,
// `send` içindeki DEV günlüğü → if (!ok) warn?.("voice signal publish failed (not connected)", signal);
```

- [ ] **Step 10: Web tam koşusu**

Run: `source ./init-nvm.sh && pnpm --filter @bumpinto/web exec tsc -b && pnpm test:web`
Expected: tsc temiz; test sayısı W-11 sonrası sayı **+3** (levels 2, web adaptörü 2, mesh'ten silinen DOM testi −1). Web davranışı değişmedi — başka bir regresyon taşımada atlanmış bir sapmadır.

- [ ] **Step 11: Dosya listesi**

`frontend/shared/src/voice/{types.ts,levels.ts,levels.test.ts,mesh.ts,mesh.test.ts}`, `frontend/shared/src/index.ts`, `frontend/web/src/lib/{voiceMesh.ts,voiceMesh.test.ts,audioLevels.ts,audioLevels.test.ts}`, `frontend/web/src/store/voiceStore.ts`. Mesaj: `refactor(voice): move mesh core to shared, web becomes adapter`.

---

### Task 2: `react-native-webrtc` + config plugin + ses oturumu (16 KB doğrulaması dahil)

**Files:**
- Modify: `frontend/mobile/package.json`, `frontend/mobile/app.config.ts`
- Create: `frontend/mobile/src/voice/{audioSession.ts,audioSession.test.ts}`, `frontend/mobile/scripts/check-so-alignment.mjs`

- [ ] **Step 1: Bağımlılıklar** (`frontend/mobile` içinden)

```bash
rtk pnpm exec npx expo install react-native-webrtc @config-plugins/react-native-webrtc
rtk pnpm add react-native-incall-manager
```

- [ ] **Step 2: `app.config.ts`** — `plugins` dizisine; purpose string **O7 kopyasından aynen** (mağaza incelemesi bu metni bekler):

```ts
    ["@config-plugins/react-native-webrtc", {
      // O7 · Info.plist NSMicrophoneUsageDescription
      microphonePermission: "Buluşmadaki arkadaşlarınla konuşabilmen için mikrofon gerekir. Ses kaydedilmez.",
      // Kamera KAPALI: sesli sohbet video açmaz; gereksiz izin incelemede soru işareti olur.
      cameraPermission: false,
    }],
```

Android tarafında aynı plugin `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `BLUETOOTH_CONNECT` ekler; `android.permissions` listesine elle **eklenmez** (çift kayıt).

- [ ] **Step 3: Ses oturumu testi** — `frontend/mobile/src/voice/audioSession.test.ts`

```ts
import { createAudioSession } from "./audioSession";

const manager = () => ({ start: jest.fn(), stop: jest.fn(), setForceSpeakerphoneOn: jest.fn() });

it("başlatma sesli görüşme kipini açar, hoparlörü KAPALI bırakır", () => {
  const m = manager();
  createAudioSession(m).start();
  expect(m.start).toHaveBeenCalledWith({ media: "audio", auto: true, ringback: "" });
  expect(m.setForceSpeakerphoneOn).toHaveBeenCalledWith(false);
});
```

İki test daha (aynı dosya): `start(); stop(); stop();` sonrası `manager.stop` **bir kez** çağrılır (ayrıl + kapanış olayı aynı anda gelebilir); `setSpeaker(true/false)` `setForceSpeakerphoneOn`'a birebir geçer ve `isSpeakerOn()` son değeri döner.

Run: `MOBILE_TEST src/voice/audioSession.test.ts` · Expected: FAIL (modül yok).

- [ ] **Step 4: `frontend/mobile/src/voice/audioSession.ts`**

```ts
import InCallManager from "react-native-incall-manager";

/** Test için enjekte edilebilen yüzey; üretimde `InCallManager`. */
export type AudioSessionManager = {
  start(options: { media: "audio"; auto: boolean; ringback: string }): void;
  stop(): void;
  setForceSpeakerphoneOn(on: boolean): void;
};
export type AudioSession = { start(): void; stop(): void; setSpeaker(on: boolean): void; isSpeakerOn(): boolean };

/** iOS'ta AVAudioSession kategorisini `playAndRecord`a, Android'de akışı `VOICE_CALL`a çeker:
    yankı iptali, sesin kulaklık/hoparlöre doğru yönlenmesi ve zil sesiyle karışmama bunun işi.
    Varsayılan hoparlör KAPALI — telefon kulağa götürüldüğünde beklenen davranış. */
export function createAudioSession(manager: AudioSessionManager = InCallManager): AudioSession {
  let active = false;
  let speaker = false;
  return {
    start() {
      if (active) return;
      active = true;
      manager.start({ media: "audio", auto: true, ringback: "" });
      manager.setForceSpeakerphoneOn(false);
    },
    stop() { if (!active) return; active = false; speaker = false; manager.stop(); },
    setSpeaker(on) { speaker = on; manager.setForceSpeakerphoneOn(on); },
    isSpeakerOn: () => speaker,
  };
}
```

Run: `MOBILE_TEST src/voice/audioSession.test.ts` · Expected: 3 test yeşil.

- [ ] **Step 5: Android 16 KB page size doğrulaması** — `frontend/mobile/scripts/check-so-alignment.mjs`

Android 15+ cihazlar 16 KB sayfa kullanır; 4 KB hizalı `.so` yüklenmez ve uygulama **açılışta çöker**. WebRTC bu planın tek yeni yerel kütüphanesidir.

```js
#!/usr/bin/env node
/* react-native-webrtc'nin .aar'ındaki .so'ların ELF LOAD hizasını okur (NDK gerekmez):
   Android 15+ için her PT_LOAD segmenti 0x4000 hizalı olmalı. */
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const aar = execSync("find node_modules/react-native-webrtc/android -name '*.aar' | head -1").toString().trim();
if (!aar) { console.error("aar bulunamadı — pnpm install koştu mu?"); process.exit(2); }
const dir = mkdtempSync(join(tmpdir(), "rnwebrtc-"));
execSync(`unzip -o -q ${aar} 'jni/arm64-v8a/*' -d ${dir}`);
let bad = 0;
for (const name of readdirSync(join(dir, "jni/arm64-v8a"))) {
  const buf = readFileSync(join(dir, "jni/arm64-v8a", name));
  const phoff = Number(buf.readBigUInt64LE(0x20));
  const phentsize = buf.readUInt16LE(0x36);
  let min = Infinity;
  for (let i = 0; i < buf.readUInt16LE(0x38); i++) {
    const off = phoff + i * phentsize;
    if (buf.readUInt32LE(off) === 1) min = Math.min(min, Number(buf.readBigUInt64LE(off + 48))); // PT_LOAD p_align
  }
  if (min < 0x4000) bad++;
  console.log(`${min >= 0x4000 ? "OK " : "BAD"} ${name} align=0x${min.toString(16)}`);
}
process.exit(bad ? 1 : 0);
```

Run (`frontend/mobile` içinden): `node scripts/check-so-alignment.mjs` · Expected: her satır `OK … align=0x4000`.
`BAD … align=0x1000` çıkarsa `rtk pnpm exec npx expo install react-native-webrtc@latest` ile yükselt ve tekrarla; hâlâ `BAD` ise **dur** — T8'deki `K-M4` kalemini aç ve kullanıcıya bildir.

- [ ] **Step 6: Prebuild duman kontrolü**

```bash
cd frontend/mobile && rtk pnpm exec npx expo prebuild --clean
grep -c "NSMicrophoneUsageDescription" ios/*/Info.plist
grep -c "android.permission.RECORD_AUDIO" android/app/src/main/AndroidManifest.xml
```
Expected: ikisi de ≥ 1.

- [ ] **Step 7: Dosya listesi**

`frontend/mobile/{package.json,app.config.ts}`, `frontend/mobile/src/voice/{audioSession.ts,audioSession.test.ts}`, `frontend/mobile/scripts/check-so-alignment.mjs`. Mesaj: `feat(mobile): react-native-webrtc plugin + audio session`.

---

### Task 3: STOMP `liveChannel` RN portu

**Files:**
- Create: `frontend/mobile/src/store/{liveChannel.ts,liveChannel.test.ts,stompPolyfill.ts,useSessionLive.ts,useSessionLive.test.tsx}`, `frontend/mobile/scripts/ws-smoke.mjs`
- Modify: `frontend/mobile/src/lib/api.ts`, `frontend/mobile/package.json`

- [ ] **Step 1: Test** — `frontend/mobile/src/store/liveChannel.test.ts`

```ts
import { liveChannel, sessionTopic, voiceInbox, voiceSignal } from "./liveChannel";

type FakeClient = {
  activate: jest.Mock; deactivate: jest.Mock; publish: jest.Mock; subscribe: jest.Mock; connected: boolean;
  config: { webSocketFactory?: () => unknown; onConnect: () => void; onWebSocketClose: () => void };
};
const clients: FakeClient[] = [];
jest.mock("@stomp/stompjs", () => ({
  Client: jest.fn().mockImplementation((config) => {
    const c: FakeClient = { config, connected: false, publish: jest.fn(),
      activate: jest.fn(() => { c.connected = true; config.onConnect(); }),
      deactivate: jest.fn(async () => { c.connected = false; }),
      subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) };
    clients.push(c);
    return c;
  }),
}));

const sockets: { url: string; headers?: Record<string, string> }[] = [];
beforeEach(() => {
  clients.length = 0;
  sockets.length = 0;
  (global as unknown as { WebSocket: unknown }).WebSocket = class {
    constructor(url: string, _p?: unknown, o?: { headers?: Record<string, string> }) { sockets.push({ url, headers: o?.headers }); }
  };
});

describe("liveChannel (RN)", () => {
  it("el sıkışma katılımcı token'ını BAŞLIKLA taşır (mobilde çerez yok)", () => {
    liveChannel.open("x7k2m", "http://h:8060", () => "tok-1", () => undefined);
    clients[0].config.webSocketFactory?.();
    expect(sockets[0].url).toBe("ws://h:8060/api/sessions/x7k2m/ws");
    expect(sockets[0].headers).toEqual({ "X-Participant-Token": "tok-1" });
  });

});
```

Dört iddia daha: `subscribe` sonrası `onWebSocketClose()` + `onConnect()` çağrılınca abonelik **yeniden** kurulur (`clients[0].subscribe` iki kez çağrılır); hedefler sunucunun beklediği kalıplarda (`sessionTopic("x7k2m") === "/topic/session/x7k2m"`, `voiceInbox("x7k2m","p1") === "/topic/session/x7k2m/voice/p1"`, `voiceSignal("x7k2m") === "/app/sessions/x7k2m/voice/signal"`); `open("aaa")` sonrası `open("bbb")` eski slug'ın aboneliğini yeni sokete **taşımaz**; bağlı değilken `publish` `false` döner ve kuyruğa almaz.

Run: `MOBILE_TEST src/store/liveChannel.test.ts` · Expected: FAIL.

- [ ] **Step 2: Portla** — `cp frontend/web/src/store/liveChannel.ts frontend/mobile/src/store/liveChannel.ts`, sonra dört sapma (kayıt defteri, `attach`, `slugOf`, `subscribe`, `publish`, istemci-kimlik kapıları `client !== c` **aynen kalır**):

1. `brokerUrl()` (Vite `import.meta.env` okuyan) silinir; `open` imzası `open(slug, apiBaseUrl, getToken, onConnect)` olur ve `brokerURL` yerine fabrika kullanılır — RN `WebSocket`i üçüncü argümanda başlık kabul eder, mobilde çerez yoktur, katılımcı token'ı el sıkışmaya böyle girer (`ParticipantTokenFilter.HEADER`):

```ts
    const url = `${apiBaseUrl.replace(/^http/, "ws")}/api/sessions/${slug}/ws`;
    const c = new Client({
      // brokerURL DEĞİL: el sıkışmaya başlık koymanın tek yolu fabrikadır.
      webSocketFactory: () => {
        const token = getToken();
        const options = token ? { headers: { "X-Participant-Token": token } } : undefined;
        return new WebSocket(url, undefined, options) as unknown as WebSocket;
      },
      reconnectDelay: 5000,
      onConnect: () => { /* mevcut gövde aynen */ },
      onWebSocketClose: () => { /* mevcut gövde aynen */ },
    });
```

2. Dosyanın İLK satırı `import "./stompPolyfill";` olur (aşağıda).
3. `getToken` parametresinin tipi `() => string | null | undefined`.
4. Yorumlardaki "tarayıcı/çerez" göndermeleri "mobil/SecureStore"a çevrilir.

`frontend/mobile/src/store/stompPolyfill.ts`:

```ts
/* @stomp/stompjs çerçeveyi TextEncoder/TextDecoder ile kodlar; Hermes'te ikisi de olmayabilir.
   Yan etkili modül: liveChannel'ın İLK import'u olarak durur. */
import { TextDecoder, TextEncoder } from "text-encoding";

const g = globalThis as unknown as { TextEncoder?: unknown; TextDecoder?: unknown };
g.TextEncoder ??= TextEncoder;
g.TextDecoder ??= TextDecoder;
```

(`frontend/mobile` içinden: `rtk pnpm add text-encoding && rtk pnpm add -D @types/text-encoding ws`.)

Run: `MOBILE_TEST src/store/liveChannel.test.ts` · Expected: 5 test yeşil.

- [ ] **Step 3: `useSessionLive` portu** — `cp frontend/web/src/store/useSessionLive.ts frontend/mobile/src/store/useSessionLive.ts`, üç sapma (30 sn yedek poll, olay → `refresh`, `voice_ended` → `ended(reason)`, kapanışta `leave` → `unsubscribe` → `close` sırası ve gerekçe yorumları **aynen kalır**):

1. `endedReasonOf` fonksiyonu `export` edilir (mobil testi doğrudan çağırır).
2. Kanal açılışı taban URL ve token sağlayıcısı alır:

```ts
import { API_BASE_URL, participantToken } from "../lib/api";
// ...
    const close = liveChannel.open(slug, API_BASE_URL, () => participantToken(slug), () => {
      void refresh();
      useVoiceStore.getState().resetRoster(); // kopukluk sırasında failed'e düşen peer'leri canlandır
    });
```

3. `frontend/mobile/src/lib/api.ts`'ten iki sembol dışa açılır (yeni davranış yok): `export const API_BASE_URL` (zaten `createHttp`e verilen değer) ve `export function participantToken(slug: string): string | null` (zaten `getParticipantToken` sağlayıcısının okuduğu SecureStore önbelleği).

Test `useSessionLive.test.tsx` (`./liveChannel` mock'lu, 4 iddia): mount'ta `open` + `subscribe` çağrılır; `voice_ended` gövdesi `useVoiceStore.getState().ended("HOST")` tetikler; unmount sırası `leave` → `unsubscribe` → `close`; `endedReasonOf` bozuk gövdede ve başka olay tipinde `null` döner.

Run: `MOBILE_TEST src/store/useSessionLive.test.tsx` · Expected: 4 test yeşil.

- [ ] **Step 4: Gerçek sunucuya karşı sinyal köprüsü** — `frontend/mobile/scripts/ws-smoke.mjs`

Unit testler sahte soketle koşar; el sıkışma kimliği + `/app/.../voice/signal` rölesi **framework yapıştırıcısıdır** ve gerçek istemciyle doğrulanır (repo kuralı).

```js
#!/usr/bin/env node
/* BASE=http://localhost:8060 node scripts/ws-smoke.mjs
   Oturum kurar, ses odasını açar, kendi ses kutusuna abone olur ve KENDİNE bir ICE sinyali
   yollar: sunucu `from` damgasını basıp geri iletirse köprü çalışıyordur. */
import { Client } from "@stomp/stompjs";
import WebSocket from "ws";

const base = process.env.BASE ?? "http://localhost:8060";
const post = async (path, body, token) => {
  const res = await fetch(`${base}${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json", "X-Client": "mobile", ...(token ? { "X-Participant-Token": token } : {}) } });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

const { slug, participantToken: token, participantId: me } =
  await post("/api/sessions", { sessionType: "GROUP", activities: ["COFFEE"], hostName: "Smoke" });
await post(`/api/sessions/${slug}/voice`, null, token);

const client = new Client({
  webSocketFactory: () => new WebSocket(`${base.replace(/^http/, "ws")}/api/sessions/${slug}/ws`,
    { headers: { "X-Participant-Token": token } }),
  reconnectDelay: 0,
});
const done = new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error("sinyal 5 sn içinde dönmedi")), 5000);
  client.onStompError = (f) => reject(new Error(f.headers.message));
  client.onConnect = () => {
    client.subscribe(`/topic/session/${slug}/voice/${me}`, (m) => {
      const signal = JSON.parse(m.body);
      if (signal.from !== me) reject(new Error(`from damgası yanlış: ${signal.from}`)); else resolve(signal);
    });
    // abonelik = üyelik (K4): koltuk kurulmadan rölenin hedefi yoktur
    setTimeout(() => client.publish({
      destination: `/app/sessions/${slug}/voice/signal`,
      body: JSON.stringify({ to: me, type: "ice", candidate: { candidate: "smoke", sdpMid: "0", sdpMLineIndex: 0 } }),
      headers: { "content-type": "application/json" },
    }), 300);
  };
});
client.activate();
console.log("OK", await done);
await client.deactivate();
```

Run (backend ayakta): `cd frontend/mobile && BASE=http://localhost:8060 node scripts/ws-smoke.mjs` · Expected: `OK { from: "<uuid>", type: "ice", … }`.
`401` → token başlığı el sıkışmada okunmuyor; `sinyal dönmedi` → abonelik üyelik yaratmamış. İkisi de istemci hatasıdır; B-12 sözleşmesi değişmez.

- [ ] **Step 5: Dosya listesi**

`frontend/mobile/src/store/{liveChannel.ts,liveChannel.test.ts,stompPolyfill.ts,useSessionLive.ts,useSessionLive.test.tsx}`, `frontend/mobile/src/lib/api.ts`, `frontend/mobile/scripts/ws-smoke.mjs`, `frontend/mobile/package.json`. Mesaj: `feat(mobile): STOMP live channel with participant-token handshake`.

---

### Task 4: Mikrofon izni akışı — O7 ön-ekran → sistem izni → red kurtarma

**Files:**
- Create: `frontend/mobile/src/voice/{micPermission.ts,micPermission.test.ts}`, `frontend/mobile/src/components/organisms/{MicPrimingSheet.tsx,MicPrimingSheet.test.tsx}`
- Modify: `frontend/shared/src/i18n/{tr,en,nl}.json`

- [ ] **Step 1: İzin testi** — `frontend/mobile/src/voice/micPermission.test.ts`

```ts
import { acquireMic } from "./micPermission";

const stream = { getTracks: () => [], getAudioTracks: () => [] };
const deps = (over = {}) => ({
  platform: "android" as const,
  requestAndroid: jest.fn(async () => "granted" as const),
  getUserMedia: jest.fn(async () => stream),
  askedBefore: jest.fn(async () => false),
  rememberAsked: jest.fn(async () => undefined),
  ...over,
});

describe("acquireMic", () => {
  it("Android 'bir daha sorma' → blocked; getUserMedia HİÇ çağrılmaz", async () => {
    const d = deps({ requestAndroid: jest.fn(async () => "never_ask_again" as const) });
    await expect(acquireMic(d)).resolves.toEqual({ status: "blocked" });
    expect(d.getUserMedia).not.toHaveBeenCalled();
  });

  it("iOS'ta ilk red denied, daha önce sorulmuşsa blocked (sistem bir daha sormaz)", async () => {
    const fail = jest.fn(async () => { throw new Error("NotAllowedError"); });
    await expect(acquireMic(deps({ platform: "ios", getUserMedia: fail }))).resolves.toEqual({ status: "denied" });
    const asked = deps({ platform: "ios", getUserMedia: fail, askedBefore: jest.fn(async () => true) });
    await expect(acquireMic(asked)).resolves.toEqual({ status: "blocked" });
  });
});
```

Üç iddia daha: Android izni verilince `{ status: "granted", stream }` döner ve `getUserMedia({ audio: true })` çağrılır; Android basit red `{ status: "denied" }`; `rememberAsked` `getUserMedia`'dan **önce** çağrılır.

Run: `MOBILE_TEST src/voice/micPermission.test.ts` · Expected: FAIL.

- [ ] **Step 2: `frontend/mobile/src/voice/micPermission.ts`**

```ts
import { PermissionsAndroid, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { mediaDevices } from "react-native-webrtc";
import type { MeshStream } from "@bumpinto/shared";

/** `denied`: sistem tekrar sorabilir → "Tekrar dene" anlamlı. `blocked`: bir daha sormaz → tek yol Ayarlar (O6). */
export type MicResult = { status: "granted"; stream: MeshStream } | { status: "denied" } | { status: "blocked" };

const ASKED_KEY = "voice.micAsked";

export type MicDeps = {
  platform: "ios" | "android";
  requestAndroid: () => Promise<"granted" | "denied" | "never_ask_again">;
  getUserMedia: (constraints: { audio: boolean }) => Promise<MeshStream>;
  askedBefore: () => Promise<boolean>;
  rememberAsked: () => Promise<void>;
};

export const defaultMicDeps: MicDeps = {
  platform: Platform.OS === "ios" ? "ios" : "android",
  requestAndroid: async () => {
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return "granted";
    return result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? "never_ask_again" : "denied";
  },
  getUserMedia: (c) => mediaDevices.getUserMedia(c) as unknown as Promise<MeshStream>,
  askedBefore: async () => (await SecureStore.getItemAsync(ASKED_KEY)) === "1",
  rememberAsked: async () => SecureStore.setItemAsync(ASKED_KEY, "1"),
};

/** Tek çağrıda hem izin hem akış: iki ayrı adım olsaydı iOS'ta sistem uyarısı iki kez çıkardı.
    Android üç durumu API'den okur; iOS'ta `getUserMedia` reddi "denied" mi "blocked" mı ayırt
    edilemez — daha önce sorulduysa sistem bir daha sormayacağı için blocked sayılır (O6 yolu). */
export async function acquireMic(deps: MicDeps = defaultMicDeps): Promise<MicResult> {
  if (deps.platform === "android") {
    const result = await deps.requestAndroid();
    if (result === "never_ask_again") return { status: "blocked" };
    if (result === "denied") return { status: "denied" };
  }
  const asked = await deps.askedBefore();
  await deps.rememberAsked(); // istekten ÖNCE: kullanıcı sistem sayfasında kalsa da hatırlanır
  try {
    return { status: "granted", stream: await deps.getUserMedia({ audio: true }) };
  } catch {
    return { status: asked ? "blocked" : "denied" };
  }
}
```

Run: `MOBILE_TEST src/voice/micPermission.test.ts` · Expected: 5 test yeşil.

- [ ] **Step 3: i18n** — `frontend/shared/src/i18n/tr.json` `voice` bloğuna (en/nl aynı yapıda çevrilir):

```json
    "priming": {
      "title": "Sesli sohbet için mikrofon",
      "sub": "Yalnız sen \"Katıl\" deyince açılır",
      "body": "Buluşmadaki arkadaşlarınla konuşabilmen için mikrofon gerekir. Ses kaydedilmez, sunucuya gitmez; doğrudan aranızda akar.",
      "why1": "İstediğin an kapat",
      "why2": "Süre dolunca kendiliğinden biter",
      "why3": "Uygulama arka plandayken susar",
      "note": "Sonraki adımda telefonun izin soracak.",
      "later": "Şimdi değil",
      "continue": "Devam et"
    },
    "micBlocked": "Mikrofon izni kapalı. Ayarlardan açabilirsin.",
    "openSettings": "Ayarlar",
    "startTitle": "Sesli sohbet",
    "startSub": "Herkes gelmeden konuşmaya başla",
    "inVoiceTitle": "Sesli sohbette",
    "speakingName": "{{name}} konuşuyor",
    "mutedSelf": "Mikrofonun kapalı",
    "expiredTitle": "Süre doldu",
    "expiredSub": "Sesli sohbet bitti"
```

- [ ] **Step 4: O7 alt sayfası testi** — `MicPrimingSheet.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import MicPrimingSheet from "./MicPrimingSheet";

it("gerekçeleri ve sistem izni uyarısını gösterir, iki düğme de doğru geri çağırır", () => {
  const onContinue = jest.fn();
  const onDismiss = jest.fn();
  render(<MicPrimingSheet visible onContinue={onContinue} onDismiss={onDismiss} />);
  expect(screen.getByText("Sesli sohbet için mikrofon")).toBeTruthy();
  expect(screen.getByText("Uygulama arka plandayken susar")).toBeTruthy();
  expect(screen.getByText("Sonraki adımda telefonun izin soracak.")).toBeTruthy();
  fireEvent.press(screen.getByText("Devam et"));
  expect(onContinue).toHaveBeenCalled();
  fireEvent.press(screen.getByText("Şimdi değil"));
  expect(onDismiss).toHaveBeenCalled();
});
```

İkinci test: `visible={false}` iken hiçbir metin basılmaz.

- [ ] **Step 5: `MicPrimingSheet.tsx`**

```tsx
import { Microphone, MicrophoneSlash, Moon, Timer } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Button } from "../atoms";
import { colors, radius } from "../../theme";

/** O7 · Play "prominent disclosure": sistem izni penceresinden ÖNCE, ne için istendiğini
    uygulamanın kendi diliyle söyler. Reddedilirse sunucuya hiç gidilmez (spec §4.4). */
export default function MicPrimingSheet(props: { visible: boolean; onContinue: () => void; onDismiss: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const why = [
    { Icon: MicrophoneSlash, key: "voice.priming.why1" },
    { Icon: Timer, key: "voice.priming.why2" },
    { Icon: Moon, key: "voice.priming.why3" },
  ];
  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onDismiss}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(39,32,59,0.35)" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.card,
          borderTopRightRadius: radius.card, padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center",
              justifyContent: "center", backgroundColor: colors.flameWash }}>
              <Microphone size={22} color={colors.flameDeep} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="h2">{t("voice.priming.title")}</AppText>
              <AppText variant="muted">{t("voice.priming.sub")}</AppText>
            </View>
          </View>
          <AppText variant="body">{t("voice.priming.body")}</AppText>
          {why.map(({ Icon, key }) => (
            <View key={key} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Icon size={18} color={colors.ink2} /><AppText variant="label">{t(key)}</AppText></View>
          ))}
          <AppText variant="muted">{t("voice.priming.note")}</AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button kind="ghost" title={t("voice.priming.later")} onPress={props.onDismiss} />
            <Button kind="flame" title={t("voice.priming.continue")} onPress={props.onContinue} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

Run: `MOBILE_TEST src/components/organisms/MicPrimingSheet.test.tsx` · Expected: 2 test yeşil.
Run: `source ./init-nvm.sh && pnpm i18n:check` · Expected: 0 fark.

- [ ] **Step 6: Dosya listesi**

`frontend/mobile/src/voice/{micPermission.ts,micPermission.test.ts}`, `frontend/mobile/src/components/organisms/{MicPrimingSheet.tsx,MicPrimingSheet.test.tsx}`, `frontend/shared/src/i18n/{tr,en,nl}.json`. Mesaj: `feat(mobile): mic priming sheet + permission flow`.

---

### Task 5: RN adaptörleri + `voiceStore` (yedi durum makinesi)

**Files:**
- Create: `frontend/mobile/src/voice/{rnAdapters.ts,statsLevels.ts,statsLevels.test.ts,dockState.ts,dockState.test.ts}`, `frontend/mobile/src/store/{voiceStore.ts,voiceStore.test.ts}`

- [ ] **Step 1: Yedi durum testi** — `frontend/mobile/src/voice/dockState.test.ts`

```ts
import { dockStateOf } from "./dockState";

const base = { hasRoom: false, host: false, phase: "idle" as const, endedReason: null };
const cases: [string, object, string][] = [
  ["P25:1 kapalı + host", { host: true }, "closedHost"],
  ["kapalı + üye → dock YOK", {}, "hidden"],
  ["P25:2 açık + dışarıda", { hasRoom: true }, "open"],
  ["P25:3 bağlanıyor", { hasRoom: true, phase: "joining" }, "joining"],
  ["P25:4/5 içeride (sessiz aynı gövdenin varyantı)", { hasRoom: true, phase: "in" }, "in"],
  ["P25:6 hata", { hasRoom: true, phase: "error" }, "error"],
  ["P25:7 süre doldu · host", { host: true, endedReason: "TIME_LIMIT" }, "expired"],
  ["P25:7 süre doldu · üye", { endedReason: "TIME_LIMIT" }, "expired"],
  ["HOST kapanışı üyede dock'u kapatır", { endedReason: "HOST" }, "hidden"],
  ["EMPTY kapanışı host'ta başlat'a döner", { host: true, endedReason: "EMPTY" }, "closedHost"],
  ["bayat endsAt taze sebebi EZEMEZ", { hasRoom: true, endedReason: "TIME_LIMIT" }, "expired"],
];

describe("dockStateOf — P25", () => {
  it.each(cases)("%s", (_n, over, expected) => {
    expect(dockStateOf({ ...base, ...over } as never)).toBe(expected);
  });
});
```

- [ ] **Step 2: `frontend/mobile/src/voice/dockState.ts`**

```ts
import type { EndReason, VoicePhase } from "../store/voiceStore";

/** P25'in yedi hâli. "sessiz" ayrı durum değildir: `in` gövdesinin `muted` varyantıdır (P25:5). */
export type DockState = "closedHost" | "hidden" | "open" | "joining" | "in" | "error" | "expired";

export function dockStateOf(input: {
  hasRoom: boolean; host: boolean; phase: VoicePhase; endedReason: EndReason | null;
}): DockState {
  // Sebep, tazelenmemiş görünümdeki `endsAt`i EZER: host yeniden başlattığında üyenin görünümü
  // henüz dönmemiş olabilir ve "Katıl" ekranı YANLIŞ olurdu (W-11 dersi).
  if (input.endedReason === "TIME_LIMIT") return "expired";
  if (input.endedReason) return input.host ? "closedHost" : "hidden";
  if (!input.hasRoom) return input.host ? "closedHost" : "hidden";
  if (input.phase === "error") return "error";
  if (input.phase === "joining") return "joining";
  if (input.phase === "in") return "in";
  return "open";
}
```

Run: `MOBILE_TEST src/voice/dockState.test.ts` · Expected: 11 durum yeşil.

- [ ] **Step 3: `getStats` seviye örnekleyici testi** — `statsLevels.test.ts`

```ts
import { createStatsLevelSampler } from "./statsLevels";
import type { MeshPeerConnection } from "@bumpinto/shared";

const pc = (entries: object[]) => ({
  getStats: jest.fn(async () => ({ forEach: (cb: (e: never) => void) => entries.forEach(cb as never) })),
}) as unknown as MeshPeerConnection;

it("inbound-rtp audioLevel peer'e, media-source audioLevel kendine yazılır", async () => {
  const onSpeaking = jest.fn();
  const s = createStatsLevelSampler(onSpeaking, { selfId: "me", now: () => 0 });
  s.attachPeer?.("b", pc([
    { type: "inbound-rtp", kind: "audio", audioLevel: 0.4 },
    { type: "media-source", kind: "audio", audioLevel: 0.5 },
  ]));
  await s.tick();
  expect(onSpeaking).toHaveBeenCalledWith("b", true);
  expect(onSpeaking).toHaveBeenCalledWith("me", true);
  s.close();
});
```

İki iddia daha: `detach("b")` konuşan peer'i susturur (`onSpeaking("b", false)`); `getStats` fırlatırsa `tick()` reddetmez ve örnekleyici ayakta kalır.

- [ ] **Step 4: `statsLevels.ts` + `rnAdapters.ts`**

```ts
import { createSpeechGate, type LevelSampler, type MeshPeerConnection, type SpeechGateOptions } from "@bumpinto/shared";

export type StatsLevelSampler = LevelSampler & { tick(): Promise<void> };

/** K12'nin RN eşleniği. `react-native-webrtc`de Web Audio yoktur; seviye WebRTC'nin kendi
    istatistiklerinden okunur: uzak ses `inbound-rtp.audioLevel`, kendi sesimiz herhangi bir
    bağlantının `media-source.audioLevel` alanı. Sunucuya hiçbir şey gitmez (K12 korunur). */
export function createStatsLevelSampler(
  onSpeaking: (id: string, speaking: boolean) => void,
  options: SpeechGateOptions & { selfId: string; intervalMs?: number },
): StatsLevelSampler {
  const gate = createSpeechGate(onSpeaking, options);
  const peers = new Map<string, MeshPeerConnection>();

  async function tick() {
    let selfSeen = false;
    for (const [id, pc] of peers) {
      try {
        const report = await pc.getStats();
        let remote = 0;
        report.forEach((entry) => {
          if (entry.kind !== "audio") return;
          if (entry.type === "inbound-rtp") remote = Math.max(remote, entry.audioLevel ?? 0);
          if (entry.type === "media-source" && !selfSeen) {
            selfSeen = true;
            gate.push(options.selfId, entry.audioLevel ?? 0);
          }
        });
        gate.push(id, remote);
      } catch {
        // Kapanmakta olan PC: bu turu atla, örnekleyici ayakta kalsın.
      }
    }
    if (!selfSeen) gate.push(options.selfId, 0); // hiç bağlantı yoksa kendi halkamız sönük kalır
  }

  const timer = options.intervalMs ? setInterval(() => void tick(), options.intervalMs) : undefined;
  return {
    tick,
    attach() {}, // Akış nesnesi RN'de seviye taşımaz; kaynak `attachPeer`daki bağlantıdır
    attachPeer(id, pc) { peers.set(id, pc); },
    detach(id) { peers.delete(id); gate.remove(id); },
    close() { if (timer) clearInterval(timer); peers.clear(); gate.clear(); },
  };
}
```

```ts
// frontend/mobile/src/voice/rnAdapters.ts
import { RTCPeerConnection } from "react-native-webrtc";
import type { AudioSink, MeshIceServer, MeshPeerConnection } from "@bumpinto/shared";

/** `react-native-webrtc` sınıfını yapısal yüzeye bağlayan TEK cast (web: `createWebPeer`). */
export function createRnPeer(config: { iceServers: MeshIceServer[] }): MeshPeerConnection {
  return new RTCPeerConnection(config as never) as unknown as MeshPeerConnection;
}

/** RN'de uzak ses track'ini kütüphane kendisi çalar; ayrı çalıcı YOKTUR. Yönlendirme
    (kulaklık/hoparlör) `audioSession`in işidir — sink yalnız arayüzü doldurur. */
export function createSilentSink(): AudioSink {
  return { play: () => undefined, stop: () => undefined };
}
```

Run: `MOBILE_TEST src/voice/statsLevels.test.ts` · Expected: 3 test yeşil.

- [ ] **Step 5: Store testi** — `frontend/mobile/src/store/voiceStore.test.ts`

W-11 `voiceStore.test.ts`'in RN çekirdeği; `./liveChannel`, `../lib/api`, `../voice/micPermission`, `../voice/audioSession` mock'lanır. On iddia: (1) katılım sırası `acquireMic` → `subscribe(voiceInbox)` → `api.voiceCredentials` → mesh (sıra bozulursa FAIL); (2) mikrofon reddi → `phase "error"`, `micDenied`, `voiceCredentials` **hiç** çağrılmaz (spec §4.4); (3) `blocked` → `phase "error"`, `micBlocked`; (4) kimlik 409 → `phase "idle"`, 500 → `phase "error"` + `connectFailed`; (5) mesh kurulmadan gelen sinyal kuyruklanır, mesh kurulunca sırayla işlenir; (6) engellenen katılımcı roster'a girmez ve ondan gelen sinyal mesh'e verilmez; (7) `view.voice` null → `leave()`, mikrofon bırakılır, `audioSession.stop` çağrılır; (8) `ended("TIME_LIMIT")` → `leave` + `endedReason` 10 sn sonra temizlenir (`jest.useFakeTimers`); (9) `toggleMute` `mesh.setMuted`e geçer ve `muted` korunur; (10) `leave()` sonrası 1 sn içinde `join()` sunucuya gitmez (SUBSCRIBE bütçesi).

Run: `MOBILE_TEST src/store/voiceStore.test.ts` · Expected: FAIL.

- [ ] **Step 6: `voiceStore` portu** — `cp frontend/web/src/store/voiceStore.ts frontend/mobile/src/store/voiceStore.ts`. **Aynen kalan** davranış sözleşmesi: `joinToken` (yarıda kesilen katılım mikrofonu bırakır), `REJOIN_COOLDOWN_MS = 1000`, `lastRoster`/`resetRoster`, `missingCount >= 2` üyelik sağlaması, `ENDED_VISIBLE_MS = 10_000`, `teardown()`, `sessionStore` aboneliği (oda kapanınca `leave`, roster değişince `setRoster`), `start`/`end`/`ended` gövdeleri. Sapmalar:

1. Importlar ve modül düzeyi (`sharedAudioContext`/`createLevelSampler` **silinir**):

```ts
import { VoiceMesh } from "@bumpinto/shared";
import type { IncomingSignal, PeerSnapshot, SessionView } from "@bumpinto/shared";
import { createAudioSession } from "../voice/audioSession";
import { acquireMic } from "../voice/micPermission";
import { createRnPeer, createSilentSink } from "../voice/rnAdapters";
import { createStatsLevelSampler } from "../voice/statsLevels";

const audioSession = createAudioSession();
const warn = __DEV__ ? (m: string, ...rest: unknown[]) => console.warn(m, ...rest) : undefined;
```

2. `rosterOf` engellenen kişiyi **eler** ve yanına `blockedIdsOf` gelir — sözleşme gereği engelli çift aynı odaya alınmaz, istemci de ona bağlantı açmaz (R-M7):

```ts
export function rosterOf(view: SessionView | null): string[] {
  return (view?.participants ?? []).filter((p) => p.inVoice && p.id && !p.blocked).map((p) => p.id as string);
}
export function blockedIdsOf(view: SessionView | null): Set<string> {
  return new Set((view?.participants ?? []).filter((p) => p.blocked && p.id).map((p) => p.id as string));
}
```

3. `join()` içinde `sharedAudioContext()` satırı silinir; `navigator.mediaDevices.getUserMedia` bloğu izin + akışı tek adımda alan çağrıya döner:

```ts
    const mic = await acquireMic();
    if (mic.status !== "granted") {
      if (token === joinToken) {
        set({ phase: "error", micDenied: mic.status === "denied", micBlocked: mic.status === "blocked" });
      }
      return; // Sunucuya GİDİLMEZ (spec §4.4); oylama akışı bundan etkilenmez.
    }
    const stream = mic.stream;
```

4. Ses kutusu aboneliğine ikinci kapı: `if (blockedIdsOf(useSessionStore.getState().view).has(signal.from)) return;` (JSON çözümünden hemen sonra).
5. Mesh kurulumundan **önce** `audioSession.start();`; fabrikalar RN adaptörlerinden:

```ts
      createPeer: createRnPeer,
      createAudio: createSilentSink,
      createLevels: (cb) => createStatsLevelSampler(cb, { selfId: me, intervalMs: 200 }),
      onWarn: warn,
```

6. `teardown()` sonuna `audioSession.stop();`. Duruma `micBlocked: boolean`, `speakerOn: boolean`; eylemlere `toggleSpeaker()` (→ `audioSession.setSpeaker`) ve T7'nin kullandığı `setBackgroundMuted(on)` eklenir.

Run: `MOBILE_TEST src/store/voiceStore.test.ts` · Expected: 10 test yeşil.

- [ ] **Step 7: Dosya listesi**

`frontend/mobile/src/voice/{rnAdapters.ts,statsLevels.ts,statsLevels.test.ts,dockState.ts,dockState.test.ts}`, `frontend/mobile/src/store/{voiceStore.ts,voiceStore.test.ts}`. Mesaj: `feat(mobile): voice store + RN webrtc adapters`.

---

### Task 6: `VoiceDock` (P25 yedi durum), mount ve `ParticipantRow` göstergeleri

**Files:**
- Create: `frontend/mobile/src/components/organisms/{VoiceDock.tsx,VoiceDock.test.tsx}`
- Modify: `frontend/mobile/app/sessions/[slug].tsx` (+ yönlendirici testi), `.../molecules/ParticipantRow.tsx` (+ testi)

- [ ] **Step 1: Dock testi** — `VoiceDock.test.tsx`

```tsx
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { SessionView } from "@bumpinto/shared";
import VoiceDock from "./VoiceDock";
import { useVoiceStore } from "../../store/voiceStore";

const people = (inVoice: boolean) => [
  { id: "p1", displayName: "Mehmet", host: true, inVoice },
  { id: "p2", displayName: "Ayşe", host: false, inVoice },
];
const view = (over: object = {}): SessionView =>
  ({ slug: "x7k2m", sessionType: "GROUP", status: "LOBBY", viewerIsHost: true,
     participants: people(false), voice: null, ...over }) as unknown as SessionView;
const open = { voice: { endsAt: new Date(Date.now() + 24 * 60_000).toISOString() }, participants: people(true) };

beforeEach(() => useVoiceStore.setState({
  phase: "idle", muted: false, peers: {}, selfSpeaking: false,
  endedReason: null, micDenied: false, micBlocked: false, connectFailed: false,
}));

describe("VoiceDock — P25", () => {
  it("4 · içeride: konuşan kişinin adı yazar, sustur ve ayrıl var", () => {
    useVoiceStore.setState({ phase: "in", peers: { p2: { state: "connected", speaking: true } } });
    render(<VoiceDock view={view(open)} />);
    expect(screen.getByText("Ayşe konuşuyor")).toBeTruthy();
    expect(screen.getByLabelText("Ayrıl")).toBeTruthy();
    expect(screen.getByLabelText("Mikrofonu kapat")).toBeTruthy();
  });

  it("Katıl basınca önce O7 ön-ekranı çıkar, izin akışı ondan sonra başlar", () => {
    const join = jest.fn();
    useVoiceStore.setState({ join });
    render(<VoiceDock view={view(open)} />);
    fireEvent.press(screen.getByText("Katıl"));
    expect(join).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Devam et"));
    expect(join).toHaveBeenCalled();
  });
});
```

Yedi iddia daha: `phase "error", micBlocked: true` → "Mikrofon izni kapalı…" metni ve "Ayarlar" düğmesi `Linking.openSettings`i çağırır (`jest.spyOn(require("react-native").Linking, "openSettings")`, P25:6 + O6); kapalı + host → "Başlat" (P25:1); kapalı + üye → hiçbir şey basılmaz; açık + dışarıda → "2 kişi" ve kalan süre (P25:2); `phase "joining"` → "Bağlanıyor…" ve Katıl pasif (P25:3); `phase "in", muted: true` → "Mikrofonun kapalı" + `Mikrofonu aç` etiketi (P25:5); `endedReason "TIME_LIMIT"` + host → "Süre doldu" ve "Yeniden başlat" (P25:7); `peers.p2.state === "failed"` → o avatar soluk (opacity 0.55) ve etiketi "sesi gelmiyor" der.

Run: `MOBILE_TEST src/components/organisms/VoiceDock.test.tsx` · Expected: FAIL.

- [ ] **Step 2: `VoiceDock.tsx`** — hap, CTA'nın **üstünde** yüzer (artboard'da `.dock` doğrudan `.cta`nın üstündedir); içeriği itmemesi için mutlak konumlu ve `pointerEvents="box-none"`.

```tsx
import { Microphone, MicrophoneSlash, PhoneX, WarningCircle } from "phosphor-react-native";
import type { SessionView } from "@bumpinto/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { isHost, viewerId } from "../../store/sessionStore";
import { useVoiceStore } from "../../store/voiceStore";
import { dockStateOf } from "../../voice/dockState";
import { colors, radius } from "../../theme";
import { AppText, Avatar, Button } from "../atoms";
import MicPrimingSheet from "./MicPrimingSheet";

/** CTA yüksekliği + boşluk: dock CTA'yı ÖRTMEZ, üstünde yüzer (P6/P10/P17). */
const CTA_CLEARANCE = 72;
const ROUND = { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" } as const;

// `remainingLabel(endsAt, now)` ve `useNow(active)` W-11'in `VoiceDock.tsx`'inden AYNEN kopyalanır
// (saf JS + useState/useEffect; RN'de değişiklik gerekmez).

export default function VoiceDock(props: { view: SessionView }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [priming, setPriming] = useState(false);
  const view = props.view;
  const host = isHost(view);
  const me = viewerId(view);
  const v = useVoiceStore(useShallow((s) => ({
    phase: s.phase, muted: s.muted, peers: s.peers, selfSpeaking: s.selfSpeaking,
    endedReason: s.endedReason, micDenied: s.micDenied, micBlocked: s.micBlocked,
    start: s.start, end: s.end, join: s.join, leave: s.leave, toggleMute: s.toggleMute,
  })));
  const endsAt = view.voice?.endsAt ?? null;
  const now = useNow(!!endsAt);
  const members = (view.participants ?? []).filter((p) => p.inVoice && !p.blocked);
  const state = dockStateOf({ hasRoom: !!endsAt, host, phase: v.phase, endedReason: v.endedReason });
  if (state === "hidden") return null;

  const speakingOf = (id?: string) => (id === me ? v.selfSpeaking : !!v.peers[id ?? ""]?.speaking);
  const speaker = members.find((p) => speakingOf(p.id));
  const count = `${t("voice.members", { count: members.length })} · ${remainingLabel(endsAt ?? "", now)}`;
  const title = { in: t("voice.inVoiceTitle"), expired: t("voice.expiredTitle"), error: t("voice.connectFailed"),
    open: t("voice.open"), joining: t("voice.open"), closedHost: t("voice.startTitle") }[state];
  const subtitle =
    state === "in" ? (v.muted ? t("voice.mutedSelf")
      : speaker ? t("voice.speakingName", { name: speaker.displayName ?? "?" }) : count)
    : state === "open" ? count
    : state === "joining" ? t("voice.joining")
    : state === "error" ? (v.micBlocked ? t("voice.micBlocked") : v.micDenied ? t("voice.micDenied") : t("voice.connectFailed"))
    : state === "expired" ? t("voice.expiredSub")
    : t("voice.startSub");

  return (
    <View pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: insets.bottom + CTA_CLEARANCE, paddingHorizontal: 12 }}>
      <View accessibilityLabel={t("voice.region")} style={{
        flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.pill, borderWidth: 1,
        borderColor: state === "error" ? colors.flame : colors.line,
        backgroundColor: state === "closedHost" || state === "expired" ? colors.flameWash : colors.card,
        shadowColor: colors.ink, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
      }}>
        {state === "error" ? <WarningCircle size={20} color={colors.flameDeep} />
        : state === "closedHost" || state === "expired" ? (
          <View style={{ ...ROUND, backgroundColor: colors.card }}><Microphone size={18} color={colors.flameDeep} /></View>
        ) : (
          <View style={{ flexDirection: "row" }}>
            {members.slice(0, 4).map((p, i) => {
              const speaking = speakingOf(p.id);
              const failed = p.id !== me && v.peers[p.id ?? ""]?.state === "failed";
              return (
                <View key={p.id ?? i}
                  accessibilityLabel={`${p.displayName ?? "?"} · ${t(speaking ? "voice.speaking" : failed ? "voice.peerFailed" : "voice.inVoice")}`}
                  style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: 999, opacity: failed ? 0.55 : 1,
                    borderWidth: speaking ? 3 : 0, borderColor: colors.grass }}>
                  <Avatar name={p.displayName ?? "?"} index={i} size={28} />
                </View>
              );
            })}
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="label">{title}</AppText><AppText variant="muted">{subtitle}</AppText></View>
        {state === "closedHost" && <Button kind="flame" title={t("voice.start")} onPress={() => void v.start()} />}
        {state === "expired" && host && <Button kind="flame" title={t("voice.restart")} onPress={() => void v.start()} />}
        {state === "open" && <Button kind="flame" title={t("voice.join")} onPress={() => setPriming(true)} />}
        {state === "joining" && <Button kind="flame" title={t("voice.joining")} disabled onPress={() => undefined} />}
        {state === "error" && (v.micBlocked
          ? <Button kind="white" title={t("voice.openSettings")} onPress={() => void Linking.openSettings()} />
          : <Button kind="white" title={t("voice.retry")} onPress={() => setPriming(true)} />)}
        {state === "in" && (
          <>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: v.muted }}
              accessibilityLabel={t(v.muted ? "voice.unmute" : "voice.mute")} onPress={v.toggleMute}
              style={{ ...ROUND, backgroundColor: v.muted ? colors.card : colors.grassWash }}>
              {v.muted ? <MicrophoneSlash size={18} color={colors.ink2} /> : <Microphone size={18} color={colors.grass} />}</Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("voice.leave")} onPress={v.leave}
              style={{ ...ROUND, backgroundColor: colors.card }}><PhoneX size={18} color={colors.flameDeep} /></Pressable>
          </>
        )}
        {host && (state === "in" || state === "open" || state === "joining") && (
          <Button kind="danger" title={t("voice.end")} onPress={() => void v.end()} />
        )}
      </View>
      <MicPrimingSheet visible={priming} onDismiss={() => setPriming(false)}
        onContinue={() => { setPriming(false); void v.join(); }} />
    </View>
  );
}
```

- [ ] **Step 3: Mount** — `frontend/mobile/app/sessions/[slug].tsx`

Dock, durum anahtarının **dışında** ve bir kez basılır: Lobi (P6) → Bekle (P10) → Mekanlar (P11) → Deste (P14) → Runoff (P18) → Karar (P20) geçişlerinde unmount olmaz, bağlantı kopmaz.

```tsx
  return (
    <View style={{ flex: 1 }}>
      {screenFor(view)}
      {view.sessionType === "GROUP" && view.status !== "EXPIRED" && <VoiceDock view={view} />}
    </View>
  );
```

Yönlendirici testine iki iddia: `sessionType: "SOLO"` görünümünde dock basılmaz; `status` LOBBY→DECK değişince dock aynı örnek kalır (unmount sayacı 0).

Run: `MOBILE_TEST src/components/organisms/VoiceDock.test.tsx` ve `MOBILE_TEST app/sessions` · Expected: 9 + 2 test yeşil.
Run: `source ./init-nvm.sh && pnpm i18n:check` · Expected: 0 fark.

- [ ] **Step 4: `ParticipantRow` testi** (Modify: `frontend/mobile/src/components/molecules/ParticipantRow.tsx` + testi)

```tsx
import { render, screen } from "@testing-library/react-native";
import type { ParticipantDto } from "@bumpinto/shared";
import ParticipantRow from "./ParticipantRow";
import { rosterOf, useVoiceStore } from "../../store/voiceStore";

const p = (over: Partial<ParticipantDto> = {}): ParticipantDto =>
  ({ id: "p2", displayName: "Ayşe", host: false, hasLocation: true, inVoice: false, ...over }) as ParticipantDto;

beforeEach(() => useVoiceStore.setState({ peers: {}, selfSpeaking: false }));

describe("ParticipantRow · ses", () => {
  it("sesteki katılımcıya mikrofon ikonu basar, sesteki olmayanda yoktur", () => {
    const { unmount } = render(<ParticipantRow participant={p({ inVoice: true })} index={0} />);
    expect(screen.getByLabelText("Seste")).toBeTruthy();
    unmount();
    render(<ParticipantRow participant={p()} index={0} />);
    expect(screen.queryByLabelText("Seste")).toBeNull();
  });

  it("engellenen katılımcı roster'a alınmaz (mesh ona bağlanmaz)", () => {
    const view = { participants: [{ id: "p1", inVoice: true }, { id: "p2", inVoice: true, blocked: true }] } as never;
    expect(rosterOf(view)).toEqual(["p1"]);
  });
});
```

İki iddia daha: `peers.p2.speaking === true` iken satır "Konuşuyor" etiketli halkayı basar, `isSelf` satırında halka `selfSpeaking`ten okunur; `blocked: true` olan katılımcıda mikrofon ikonu **basılmaz**.

- [ ] **Step 5: `ParticipantRow` bileşeni** — M-4'ün satırına üç ekleme (ad, konum, ulaşım ikonu, rozet, çevrimdışı soluklaştırma dokunulmaz):

```tsx
import { Microphone } from "phosphor-react-native";
import { useVoiceStore } from "../../store/voiceStore";
// gövdede — K12: konuşma bilgisi ses deposundan (istemcide ölçülür), üyelik görünümden:
  const speaking = useVoiceStore((s) => (props.isSelf ? s.selfSpeaking : !!(p.id && s.peers[p.id]?.speaking)));
  const inVoice = !!p.inVoice && !p.blocked;
// avatar sarmalayıcısı:
  <View accessibilityLabel={speaking ? t("voice.speaking") : undefined}
    style={{ borderRadius: 999, borderWidth: speaking ? 3 : 0, borderColor: colors.grass }}>
    <Avatar name={p.displayName ?? "?"} index={props.index} />
  </View>
// ad satırının sonuna:
  {inVoice && (
    <View accessibilityLabel={t("voice.inVoice")} style={{ marginLeft: 6 }}>
      <Microphone size={14} color={colors.grass} />
    </View>
  )}
```

Run: `MOBILE_TEST src/components/molecules/ParticipantRow.test.tsx` · Expected: 4 test yeşil.

- [ ] **Step 6: Dosya listesi**

`frontend/mobile/src/components/organisms/{VoiceDock.tsx,VoiceDock.test.tsx}`, `frontend/mobile/app/sessions/[slug].tsx` (+testi), `frontend/mobile/src/components/molecules/{ParticipantRow.tsx,ParticipantRow.test.tsx}`. Mesaj: `feat(mobile): voice dock + participant row indicators`.

---

### Task 7: Arka plan davranışı (susar, geri dönünce yeniden bağlanır)

**Files:**
- Create: `frontend/mobile/src/voice/{backgroundGuard.ts,backgroundGuard.test.ts}`
- Modify: `frontend/mobile/src/store/voiceStore.ts`, `frontend/mobile/app/_layout.tsx`

- [ ] **Step 1: Test**

```ts
import { createBackgroundGuard } from "./backgroundGuard";

const store = () => ({ phase: "in" as const, setBackgroundMuted: jest.fn(), leave: jest.fn(), resetRoster: jest.fn() });

describe("backgroundGuard", () => {
  it("arka plana geçince susar; kısa dönüşte açılır ve roster yeniden itilir", () => {
    let t = 0;
    const s = store();
    const guard = createBackgroundGuard(() => s, { now: () => t, awayLimitMs: 30_000, refresh: jest.fn() });
    guard.onChange("background");
    expect(s.setBackgroundMuted).toHaveBeenCalledWith(true);
    t = 10_000;
    guard.onChange("active");
    expect(s.setBackgroundMuted).toHaveBeenLastCalledWith(false);
    expect(s.resetRoster).toHaveBeenCalled();
    expect(s.leave).not.toHaveBeenCalled();
  });
});
```

Üç iddia daha: 30 sn'den uzun süre arka planda kalındıysa dönüşte `leave()` + `refresh()` çağrılır (WS kopmuş sayılır) ve `setBackgroundMuted(false)` **çağrılmaz**; seste değilken (`phase: "idle"`) hiçbir çağrı yapılmaz; `inactive` → `background` çift tetiklemesi tek susturma üretir.

- [ ] **Step 2: `frontend/mobile/src/voice/backgroundGuard.ts`**

```ts
import type { AppStateStatus } from "react-native";

type Guarded = {
  phase: "idle" | "joining" | "in" | "error";
  /** Kullanıcının kendi `muted` tercihini EZMEDEN yerel track'i kapatır/açar. */
  setBackgroundMuted: (on: boolean) => void;
  leave: () => void;
  resetRoster: () => void;
};

/** O7'de söz verilen davranış: "Uygulama arka plandayken susar". iOS arka planda WebRTC'yi
    askıya alır ve `UIBackgroundModes: audio` istemiyoruz (mağaza incelemesi + pil). Kısa
    dönüşte bağlantı ayaktadır: sessizliği kaldırır, roster'ı yeniden iteriz. Uzun dönüşte
    sunucu bizi WS kopmasıyla odadan düşürmüştür — temiz çıkış, dock "Katıl"a döner. */
export function createBackgroundGuard(
  get: () => Guarded,
  options: { now: () => number; awayLimitMs: number; refresh: () => void },
) {
  let awaySince: number | null = null;
  return {
    onChange(status: AppStateStatus) {
      const voice = get();
      if (voice.phase !== "in") return;
      if (status === "background" || status === "inactive") {
        if (awaySince !== null) return; // inactive → background çift tetikler
        awaySince = options.now();
        voice.setBackgroundMuted(true);
        return;
      }
      if (status !== "active" || awaySince === null) return;
      const away = options.now() - awaySince;
      awaySince = null;
      if (away > options.awayLimitMs) { voice.leave(); options.refresh(); return; }
      voice.setBackgroundMuted(false);
      voice.resetRoster();
      options.refresh();
    },
  };
}
```

`voiceStore`daki eylem (kullanıcı tercihini korur):

```ts
  /** Arka plan susturması `muted` alanını DEĞİŞTİRMEZ: geri dönüşte kullanıcı kendi bıraktığı
      hâli bulur; zaten sessizse dönüşte açılmaz. */
  setBackgroundMuted: (on: boolean) => { mesh?.setMuted(on || get().muted); },
```

`frontend/mobile/app/_layout.tsx` kökünde tek dinleyici:

```tsx
  useEffect(() => {
    const guard = createBackgroundGuard(() => useVoiceStore.getState(), {
      now: Date.now, awayLimitMs: 30_000, refresh: () => void useSessionStore.getState().refresh(),
    });
    const sub = AppState.addEventListener("change", guard.onChange);
    return () => sub.remove();
  }, []);
```

Run: `MOBILE_TEST src/voice/backgroundGuard.test.ts` · Expected: 4 test yeşil.

- [ ] **Step 3: Dosya listesi**

`frontend/mobile/src/voice/{backgroundGuard.ts,backgroundGuard.test.ts}`, `frontend/mobile/src/store/voiceStore.ts`, `frontend/mobile/app/_layout.tsx`. Mesaj: `feat(mobile): background mute and rejoin guard`.

---

### Task 8: Gerçek cihaz/entegrasyon testi + INDEX kaydı

**Files:** Create: `frontend/mobile/.maestro/voice-dock.yaml` · Modify: `docs/superpowers/plans/INDEX.md`

- [ ] **Step 1: Tam otomatik koşu** (repo kökünden)

```bash
source ./init-nvm.sh
pnpm --filter @bumpinto/web exec tsc -b && pnpm test:web
pnpm --filter @bumpinto/mobile exec tsc --noEmit && pnpm --filter @bumpinto/mobile test
pnpm i18n:check
cd frontend/mobile && node scripts/check-so-alignment.mjs
```

Expected: tsc temiz (iki paket); web testleri W-11 sonrası sayı **+3**; mobil testler M-4 sonrası sayı **+61** (audioSession 3, liveChannel 5, useSessionLive 4, micPermission 5, MicPrimingSheet 2, dockState 11, statsLevels 3, voiceStore 10, VoiceDock 9, yönlendirici 2, ParticipantRow 4 — M-4'ün mevcut satır testleri hariç —, backgroundGuard 4); i18n 0 fark; `.so` hizası `0x4000`.

- [ ] **Step 2: Maestro akışı** — `frontend/mobile/.maestro/voice-dock.yaml`

Maestro'nun deterministik kapsayabildiği kısım **izin reddi kurtarmasıdır**; "içeride" hâli ikinci bir mikrofon gerektirdiği için Step 4'e kalır.

```yaml
appId: app.bumpinto
name: Sesli sohbet dock durumları
---
- launchApp:
    clearState: true
    permissions:
      microphone: deny
- runFlow: ../.maestro/_login.yaml        # M-4'ün oturum açma akışı
- tapOn: "Cuma kahvesi"
- assertVisible: "Sesli sohbet"           # P25:1 — host, kapalı
- tapOn: "Başlat"
- assertVisible: "Katıl"                  # P25:2 — açık, dışarıda
- tapOn: "Katıl"
- assertVisible: "Sesli sohbet için mikrofon"    # O7 ön-ekranı, sistem izninden ÖNCE
- assertVisible: "Uygulama arka plandayken susar"
- tapOn: "Şimdi değil"
- assertNotVisible: "Sesli sohbet için mikrofon"
- tapOn: "Katıl"
- tapOn: "Devam et"
- assertVisible: "Mikrofon izni kapalı. Ayarlardan açabilirsin."   # P25:6 + O6 kurtarması
- assertVisible: "Ayarlar"
- tapOn: "Mekanları bul"                  # oylama akışı mikrofon reddinden ETKİLENMEZ (R-M10)
- assertVisible: "Mekanlar"
```

Run: `cd frontend/mobile && maestro test .maestro/voice-dock.yaml` (dev build kurulu cihaz/emülatörde) · Expected: tüm iddialar yeşil.

- [ ] **Step 3: Sinyal köprüsü betiği** (backend ayakta)

Run: `cd frontend/mobile && BASE=http://localhost:8060 node scripts/ws-smoke.mjs` · Expected: `OK { from: … }`.

- [ ] **Step 4: İki uçlu elle kontrol listesi** (kullanıcıya bırakılır — iki gerçek mikrofon gerekir)

Backend `VOICE_MAX_DURATION=PT3M` ile başlatılır, `CLOUDFLARE_TURN_*` boş (aynı ağda STUN yeter). Cihaz A = dev build (host), cihaz B = ikinci telefon **ya da** aynı ağdaki tarayıcı (W-11 istemcisi) — çapraz istemci mesh'i sözleşmenin gerçekten paylaşıldığını kanıtlar.

1. A oturum kurar, B davet linkiyle katılır; A'da "Başlat", B'de dock yok.
2. A "Başlat" → iki uçta "Sesli sohbet açık · 0 kişi" + geri sayım (P25:2).
3. A "Katıl" → O7 alt sayfası → izin → "Bağlanıyor…" (P25:3) → avatar + geri sayım (P25:4).
4. B katılır; **iki yönlü ses** duyulur. Konuşana yeşil halka, `ParticipantRow`da mikrofon ikonu.
5. A sustur → B sessizlik duyar, A'da "Mikrofonun kapalı" (P25:5); aç → ses döner.
6. A telefonu kilitler → B sessizlik duyar; 10 sn içinde dönerse ses döner (T7 kısa yol). 40 sn kalırsa dock "Katıl"a dönmüştür (uzun yol); tekrar katılır, ses döner.
7. B ayrılır → A'da avatar 1–2 sn içinde düşer; B tekrar katılır → ses döner.
8. A "Bitir" → iki uçta dock kapalı hâle döner, B'de "Sesli sohbet bitirildi" 10 sn.
9. A yeniden başlatır, 3 dk bekler → "Süre doldu" + host'ta "Yeniden başlat" (P25:7).
10. Mikrofon Ayarlar'dan kapatılır → "Katıl" → dock "Mikrofon izni kapalı" + "Ayarlar" düğmesi Ayarlar'ı açar; **Mekanlar/Deste akışı çalışmaya devam eder**.
11. B engellenir (R-M7, M-5) → B ses odasında listelenmez, A–B bağlantısı kurulmaz.
12. Android 15 (16 KB sayfa) cihazda uygulama açılır ve sese girilir (Step 1'deki `.so` kontrolünün saha doğrulaması).

- [ ] **Step 5: INDEX kaydı** — `docs/superpowers/plans/INDEX.md` "M — Mobil" tablosuna M-5'ten sonra:

```markdown
| M-6 | **Sesli sohbet RN** — `voiceMesh` saf mantığı `frontend/shared/src/voice/`'a (yapısal WebRTC yüzeyi; web = DOM adaptörü, RN = `react-native-webrtc`), `react-native-webrtc` config plugin + `InCallManager`, STOMP `liveChannel` RN portu (başlıkla el sıkışma, yeniden abonelik), O7 mikrofon ön-ekranı + red kurtarma, `voiceStore` (7 durum), `VoiceDock` (P25) + altı ekrana mount, `ParticipantRow` mikrofon/halka, `blocked` eşleşmez, arka planda susma | `2026-09-06-plan40-mobile-voice.md` | Plan 40 | ready | B-12 ✓, **M-4**, **B-14** (`blocked`) | — | Spec `2026-09-06-voice-chat-design.md`; K10 ("yalnız web") bu planla kapanır. K12 RN'de `getStats().audioLevel` ile ölçülür (Web Audio yok). Android 16 KB `.so` hizası `scripts/check-so-alignment.mjs` ile kapıda. Maestro yalnız red yolunu kapsar; iki uçlu ses elle doğrulanır |
```

T2 Step 5 `BAD` verdiyse "Spec dışı görevler" M tablosuna:

```markdown
| K-M4 | `react-native-webrtc` 16 KB sayfa hizası | aday | M-6 | Android 15+ cihazda 4 KB hizalı `.so` açılışta çökertir; sürüm yükseltmesi çözmezse yerel derleme ya da kütüphane değişimi gerekir |
```

- [ ] **Step 6: Dosya listesi**

`frontend/mobile/.maestro/voice-dock.yaml`, `docs/superpowers/plans/INDEX.md`. Mesaj: `docs(voice): register M-6 mobile plan`.

---

## Plan öz-incelemesi

**Spec kapsamı.** §4: başlatma T5/T6 · katılım sırası (mikrofon → abonelik → kimlik → mesh) T5 · sinyal şeması ve `from` damgası T1/T3 · sustur T5/T6 · ayrıl = abonelik düşürme T3/T5 · host bitirir T5/T6. §5: geri sayım ve `TIME_LIMIT` dock'u T6 (katman 3 hâlâ v2). §7'nin RN eşlenikleri: `liveChannel` T3, `voiceMesh` T1, `voiceStore` T5, dock yedi durumu T6, `ParticipantRow` T6. §9: mikrofon reddi T4/T6, kimlik 409/5xx T5, peer `failed` T1 (taşınan davranış) + T6 solgun avatar, `voice_ended` tek kapanış yolu T3/T5, restart T5. K1 T1 · K4 T3/T5 · K5 T1 · K9 T4/T6 · **K10 kapanır** · K12 T1 (karar kapısı) + T5 (RN ölçüm) + T6 (gösterge). R-M10 tamamı; R-M9'un dock kısmı T6 (dürt M-7'de). §2 sözleşmesi: `ParticipantDto.blocked` T5/T6, `inVoice`/`voice.endsAt` T5/T6 — alan adı türetilmedi. Kapsam dışı (bilinçli): Live Activity (P26), dürt, oturum kodu, sessizlik tespiti.

**Yer tutucu taraması:** "TBD", "uygun hata yönetimi", "Task N'e benzer" yok; her adımda çalıştırılabilir kod ya da tam sayılmış sapma/iddia listesi var. Port adımları (T1:S4–S5, T3:S2–S3, T5:S6) kopyalama komutunu ve numaralı sapmaları verir; listede olmayan satır aynen kalır.

**Tip tutarlılığı:** `MeshPeerConnection`/`MeshStream`/`MeshTrack`/`AudioSink`/`LevelSampler`/`MeshIceServer`/`MeshIceCandidate` T1'de tanımlanır; T1 web adaptörü, T5 RN adaptörü ve T5 `statsLevels` aynı adları kullanır · `SpeechGate.push(id, level)` T1 kod = T1 test = T5 · `MeshDeps` alanları (`createPeer`, `createAudio`, `createLevels`, `onWarn`, `watchdogMs`) T1 = T5 çağrısı · `IncomingSignal`/`OutgoingSignal` T1 = T3 sinyal gövdesi = T5 · `liveChannel.open(slug, apiBaseUrl, getToken, onConnect) => () => void`, `subscribe(dest, handler) => () => void`, `publish(dest, body) => boolean` T3 kod = T3 test = T5 mock'ları · `VoicePhase`/`EndReason` T5 = T3 `useSessionLive` = T6 `dockState` · `DockState` yedi değeri T5 kod = T5 test = T6 dalları · `MicResult` T4 = T5 `join()` · `rosterOf`/`blockedIdsOf` T5 = T6 testi · `VoiceDock` prop `view: SessionView` T6 = yönlendirici. M-4'ten tüketilen semboller (`api`, `API_BASE_URL`, `participantToken`, `useSessionStore`, `isHost`, `viewerId`, `AppText`, `Avatar`, `Button`, `colors`, `radius`) "Ön koşul"da adıyla ve doğrulama komutuyla sabitlendi.

**Web'i bozmama kanıtı:** T1:S10 web'in tam koşusudur ve beklenen test farkı (+3) tek tek sayılmıştır; davranış değişmediği için başka bir sapma taşımada atlanmış bir adım demektir.
