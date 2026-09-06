import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  unsubscribeInbox: vi.fn(),
  // jsdom AudioContext'i tanımlamaz — gerçek sharedAudioContext() burada fırlatırdı. join()'in
  // ONU ilk await'ten önce senkron çağırdığını invocationCallOrder ile doğrulamak için sahtelenir.
  sharedAudioContext: vi.fn(() => ({ state: "running", resume: vi.fn(() => Promise.resolve()) })),
}));

vi.mock("../lib/api", () => ({
  api: { voiceStart: vi.fn(), voiceEnd: vi.fn(), voiceCredentials: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));
vi.mock("../lib/audioLevels", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/audioLevels")>();
  return { ...actual, sharedAudioContext: hoisted.sharedAudioContext };
});
vi.mock("./liveChannel", () => ({
  liveChannel: { subscribe: vi.fn(() => hoisted.unsubscribeInbox), publish: vi.fn(() => true), open: vi.fn() },
  voiceInbox: (slug: string, participantId: string) => `/topic/session/${slug}/voice/${participantId}`,
  voiceSignal: (slug: string) => `/app/sessions/${slug}/voice/signal`,
  sessionTopic: (slug: string) => `/topic/session/${slug}`,
}));
vi.mock("../lib/voiceMesh", () => {
  class FakeMesh {
    static last: FakeMesh | null = null;
    /** Bir sonraki constructor çağrısını fırlatır — kurulum hatası testi için. */
    static throwOnce = false;
    roster: string[] = [];
    muted = false;
    signals: unknown[] = [];
    closed = false;
    constructor(public deps: { myId: string; iceServers: unknown; send: (s: unknown) => void }) {
      if (FakeMesh.throwOnce) {
        FakeMesh.throwOnce = false;
        throw new Error("AudioContext kurulamadı");
      }
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

type FakeMeshType = { last: { deps: { myId: string; iceServers: unknown; send: (s: unknown) => void;
  createLevels?: unknown };
  roster: string[]; muted: boolean; signals: unknown[]; closed: boolean;
  setRoster(ids: string[]): void } | null };
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

function httpError(status: number) {
  return new AxiosError("x", String(status), undefined, undefined, {
    status, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() },
  } as never);
}

describe("voiceStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(api.voiceCredentials).mockResolvedValue(credentials as never);
    (VoiceMesh as unknown as FakeMeshType).last = null;
    (VoiceMesh as unknown as { throwOnce: boolean }).throwOnce = false;
    // Gerçek teardown: modül düzeyi mesh/jeton/lastRoster önceki testten sızmasın (bu alanlar
    // zustand state'inin DIŞINDA yaşar — setState onları sıfırlamaz). leave() lastLeaveAt'i de
    // yazar (rejoin cooldown) — epoch'ta çalıştırıp gerçek zamana dönerek testleri cooldown'dan muaf tutar.
    vi.useFakeTimers({ now: 0 });
    useVoiceStore.getState().leave();
    vi.useRealTimers();
    useSessionStore.setState({ slug: "x", view: view as never, error: null });
    useVoiceStore.setState({
      phase: "idle", muted: false, peers: {}, selfSpeaking: false, endedReason: null,
      micDenied: false, connectFailed: false,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

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

  it("sharedAudioContext() getUserMedia'dan ÖNCE senkron çağrılır (Safari jesti); mesh'e createLevels geçilir", async () => {
    await useVoiceStore.getState().join();

    const contextOrder = hoisted.sharedAudioContext.mock.invocationCallOrder[0];
    const getUserMediaOrder = getUserMedia.mock.invocationCallOrder[0];
    expect(contextOrder).toBeLessThan(getUserMediaOrder);
    expect(mesh().deps.createLevels).toBeTypeOf("function");
  });

  it("join() faz 'in' iken hiçbir şey yapmaz", async () => {
    await useVoiceStore.getState().join();
    vi.mocked(api.voiceCredentials).mockClear();
    getUserMedia.mockClear();
    await useVoiceStore.getState().join();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(api.voiceCredentials).not.toHaveBeenCalled();
  });

  it("leave() sonrası 1 sn içinde join() sunucuya gitmez (rejoin cooldown, SUBSCRIBE/UNSUBSCRIBE bütçesi)", async () => {
    const now = Date.now();
    vi.useFakeTimers({ now });
    try {
      useVoiceStore.getState().leave();
      getUserMedia.mockClear();

      await useVoiceStore.getState().join();
      expect(getUserMedia).not.toHaveBeenCalled();
      expect(useVoiceStore.getState().phase).toBe("idle");

      vi.advanceTimersByTime(1000);
      await useVoiceStore.getState().join();
      expect(getUserMedia).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("kimlik alınamazsa (oda kapandı, 409) mikrofon bırakılır, abonelik düşer, faz idle", async () => {
    vi.mocked(api.voiceCredentials).mockRejectedValueOnce(httpError(409));
    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(useVoiceStore.getState().connectFailed).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(hoisted.unsubscribeInbox).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();
  });

  it("kimlik isteği 409 DIŞINDA bir hatayla düşerse: faz error, connectFailed true", async () => {
    vi.mocked(api.voiceCredentials).mockRejectedValueOnce(httpError(500));
    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("error");
    expect(useVoiceStore.getState().connectFailed).toBe(true);
    expect(track.stop).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();
  });

  it("mesh kurulumu fırlatırsa (AudioContext/ICE hatası): 'joining'de asılı kalmaz, sonraki join başarılı olur", async () => {
    (VoiceMesh as unknown as { throwOnce: boolean }).throwOnce = true;
    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("error");
    expect(useVoiceStore.getState().connectFailed).toBe(true);
    expect(track.stop).toHaveBeenCalled();
    expect(hoisted.unsubscribeInbox).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();

    await useVoiceStore.getState().join();
    expect(useVoiceStore.getState().phase).toBe("in");
  });

  it("kimlik beklenirken leave() çağrılırsa: mikrofon bırakılır, faz idle, mesh kurulmaz", async () => {
    let resolveCredentials: (v: unknown) => void = () => undefined;
    vi.mocked(api.voiceCredentials).mockReturnValueOnce(new Promise((r) => { resolveCredentials = r; }) as never);
    const joining = useVoiceStore.getState().join();
    await tick();
    useVoiceStore.getState().leave();
    expect(useVoiceStore.getState().phase).toBe("idle");

    resolveCredentials(credentials);
    await joining;
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(track.stop).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();
  });

  it("katılım sırasında oda kapanırsa (voice null): 'in'e hiç ulaşmaz, mikrofon bırakılır", async () => {
    let resolveCredentials: (v: unknown) => void = () => undefined;
    vi.mocked(api.voiceCredentials).mockReturnValueOnce(new Promise((r) => { resolveCredentials = r; }) as never);
    const joining = useVoiceStore.getState().join();
    await tick();
    useSessionStore.setState({ view: { ...view, voice: null } as never });

    resolveCredentials(credentials);
    await joining;
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(track.stop).toHaveBeenCalled();
    expect((VoiceMesh as unknown as FakeMeshType).last).toBeNull();
  });

  it("iptal edilmiş katılımın gecikmiş kimlik reddi, sonraki başarılı katılımı bozmaz", async () => {
    let rejectFirst: (e: unknown) => void = () => undefined;
    let resolveSecond: (v: unknown) => void = () => undefined;
    vi.mocked(api.voiceCredentials)
      .mockReturnValueOnce(new Promise((_, rej) => { rejectFirst = rej; }) as never)
      .mockReturnValueOnce(new Promise((res) => { resolveSecond = res; }) as never);

    const first = useVoiceStore.getState().join();
    await tick();
    vi.useFakeTimers({ now: 0 }); // leave()'in rejoin cooldown'ı bu testin ikinci join()'ini bloklamasın
    useVoiceStore.getState().leave(); // ilk denemeyi iptal eder (jeton ilerler)
    vi.useRealTimers();

    const second = useVoiceStore.getState().join();
    await tick();
    resolveSecond(credentials);
    await second;
    expect(useVoiceStore.getState().phase).toBe("in");
    const meshAfterSecond = mesh();

    rejectFirst(new Error("stale"));
    await first;
    expect(useVoiceStore.getState().phase).toBe("in"); // gecikmiş red ikinciyi bozmadı
    expect(meshAfterSecond.closed).toBe(false);
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

  it("üyelik sağlaması: kendi id TEK görünümde roster'da yoksa hâlâ 'in' kalır", async () => {
    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true), person("a", true)] } as never });
    await useVoiceStore.getState().join();

    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true)] } as never }); // a düştü
    expect(useVoiceStore.getState().phase).toBe("in");
  });

  it("üyelik sağlaması: kendi id ÜST ÜSTE İKİ görünümde roster'da yoksa ayrılır, faz error olur", async () => {
    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true), person("a", true)] } as never });
    await useVoiceStore.getState().join();
    const m = mesh();

    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true)] } as never }); // 1. kaçırma
    expect(useVoiceStore.getState().phase).toBe("in");

    useSessionStore.setState({ view: { ...view, participants: [person("h", true, true)] } as never }); // 2. kaçırma (ardışık)
    expect(useVoiceStore.getState().phase).toBe("error");
    expect(useVoiceStore.getState().connectFailed).toBe(true);
    expect(m.closed).toBe(true);
  });

  it("roster değişmezse setRoster tekrar çağrılmaz (30 sn poll gürültüsü)", async () => {
    await useVoiceStore.getState().join();
    const spy = vi.spyOn(mesh(), "setRoster");
    useSessionStore.setState({ view: { ...view } as never }); // aynı katılımcılar, yeni referans
    expect(spy).not.toHaveBeenCalled();
  });

  it("resetRoster() sonrası DEĞİŞMEMİŞ roster bile tekrar mesh'e itilir (WS yeniden bağlanınca failed peer canlanır)", async () => {
    await useVoiceStore.getState().join();
    const spy = vi.spyOn(mesh(), "setRoster");
    useVoiceStore.getState().resetRoster();
    useSessionStore.setState({ view: { ...view } as never }); // aynı katılımcılar, yeni referans
    expect(spy).toHaveBeenCalledWith(["h"]);
  });

  it("sustur mesh'e ve duruma yazılır", async () => {
    await useVoiceStore.getState().join();
    useVoiceStore.getState().toggleMute();
    expect(useVoiceStore.getState().muted).toBe(true);
    expect(mesh().muted).toBe(true);
  });

  it("ended() mesh'i kapatır, fazı idle yapar ve sebebi yazar", async () => {
    await useVoiceStore.getState().join();
    const m = mesh();
    useVoiceStore.getState().ended("HOST");
    expect(m.closed).toBe(true);
    expect(useVoiceStore.getState().phase).toBe("idle");
    expect(useVoiceStore.getState().endedReason).toBe("HOST");
  });

  it("bitiş sebebi 10 sn görünür, sonra silinir", () => {
    vi.useFakeTimers();
    useVoiceStore.getState().ended("TIME_LIMIT");
    expect(useVoiceStore.getState().endedReason).toBe("TIME_LIMIT");
    vi.advanceTimersByTime(10_000);
    expect(useVoiceStore.getState().endedReason).toBeNull();
  });

  it("start/end sunucu uçlarını çağırır ve tazeler", async () => {
    const refresh = vi.fn();
    useSessionStore.setState({ refresh } as never);
    vi.mocked(api.voiceStart).mockResolvedValue({ endsAt: "e" } as never);
    await useVoiceStore.getState().start();
    expect(api.voiceStart).toHaveBeenCalledWith("x");
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.mocked(api.voiceEnd).mockResolvedValue(undefined as never);
    await useVoiceStore.getState().end();
    expect(api.voiceEnd).toHaveBeenCalledWith("x");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("rosterOf: inVoice olan katılımcı id'leri", () => {
    expect(rosterOf(view as never)).toEqual(["h"]);
    expect(rosterOf(null)).toEqual([]);
  });
});
