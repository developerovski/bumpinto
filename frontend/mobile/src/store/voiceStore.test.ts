import { api } from "../lib/api";
import { acquireMic } from "../voice/micPermission";
import { liveChannel } from "./liveChannel";
import { useSessionStore } from "./sessionStore";
import { useVoiceStore } from "./voiceStore";

/**
 * Sesli sohbet store'u — W-11'in davranış sözleşmesinin RN portu.
 *
 * Mesh MOCK'lu: gerçek eşleşme mantığı `@bumpinto/shared/voice`ta platformsuz test ediliyor,
 * burada sınanan şey SIRA ve KAPILAR (izin → abonelik → kimlik → mesh).
 */
const stream = { getTracks: () => [{ stop: jest.fn() }], getAudioTracks: () => [] };

jest.mock("../voice/micPermission", () => ({ acquireMic: jest.fn() }));
jest.mock("../voice/audioSession", () => ({
  createAudioSession: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    setSpeaker: jest.fn(),
    isSpeakerOn: () => false,
  }),
}));
jest.mock("../lib/api", () => ({
  api: { voiceCredentials: jest.fn(), voiceStart: jest.fn(), voiceEnd: jest.fn() },
}));
jest.mock("./liveChannel", () => ({
  liveChannel: { subscribe: jest.fn(() => jest.fn()), publish: jest.fn(() => true), open: jest.fn() },
  voiceInbox: (slug: string, id: string) => `/topic/session/${slug}/voice/${id}`,
  voiceSignal: (slug: string) => `/app/sessions/${slug}/voice/signal`,
}));

/* Sahte mesh fabrikanın İÇİNDE tanımlanır: `jest.mock` çağrıları import'ların üstüne taşınır
   ve dışarıdaki bir sınıfa erişemez. Son örnek `mock` önekli tutucudan okunur (jest'in izin
   verdiği tek yol). */
type MeshProbe = { deps: { myId: string }; roster: string[]; muted: boolean; signals: unknown[]; closed: boolean };
const mockMesh: { last: MeshProbe | null } = { last: null };

jest.mock("@bumpinto/shared", () => {
  class FakeMesh {
    /* `public deps` PARAMETRE ÖZELLİĞİ kullanılmaz: babel'in `jest.mock` kapsam denetimi onu
       kapsam dışı değişken sanıyor. Düz alan ataması aynı işi görür. */
    deps: { myId: string };
    roster: string[] = [];
    muted = false;
    signals: unknown[] = [];
    closed = false;
    constructor(deps: { myId: string }) {
      this.deps = deps;
      mockMesh.last = this as unknown as MeshProbe;
    }
    setRoster(ids: string[]) {
      this.roster = ids;
    }
    setMuted(muted: boolean) {
      this.muted = muted;
    }
    setMutedPeers() {}
    async handleSignal(signal: unknown) {
      this.signals.push(signal);
    }
    close() {
      this.closed = true;
    }
  }
  return {
    ...jest.requireActual("@bumpinto/shared"),
    VoiceMesh: jest.fn().mockImplementation((deps) => new FakeMesh(deps)),
  };
});

const view = (over: object = {}) =>
  ({
    slug: "x7k2m",
    voice: { endsAt: new Date(Date.now() + 60_000).toISOString() },
    participants: [
      { id: "me", displayName: "Ben", inVoice: true },
      { id: "b", displayName: "Ayşe", inVoice: true },
    ],
    viewer: { participantId: "me", host: true },
    ...over,
  }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockMesh.last = null;
  useSessionStore.setState({ view: view() });
  useVoiceStore.setState({
    phase: "idle",
    muted: false,
    peers: {},
    selfSpeaking: false,
    endedReason: null,
    micDenied: false,
    micBlocked: false,
    connectFailed: false,
    speakerOn: false,
  });
  jest.mocked(acquireMic).mockResolvedValue({ status: "granted", stream } as never);
  jest.mocked(api.voiceCredentials).mockResolvedValue({ iceServers: [{ urls: ["stun:x"] }] } as never);
});

test("katılım SIRASI: izin → ses kutusu aboneliği → kimlik → mesh", async () => {
  await useVoiceStore.getState().join();

  const micOrder = jest.mocked(acquireMic).mock.invocationCallOrder[0];
  const subscribeOrder = jest.mocked(liveChannel.subscribe).mock.invocationCallOrder[0];
  const credentialsOrder = jest.mocked(api.voiceCredentials).mock.invocationCallOrder[0];
  expect(micOrder).toBeLessThan(subscribeOrder);
  expect(subscribeOrder).toBeLessThan(credentialsOrder);

  expect(jest.mocked(liveChannel.subscribe).mock.calls[0][0]).toBe("/topic/session/x7k2m/voice/me");
  expect(mockMesh.last?.deps.myId).toBe("me");
  expect(mockMesh.last?.roster).toEqual(["me", "b"]);
  expect(useVoiceStore.getState().phase).toBe("in");
});

test("mikrofon reddi SUNUCUYA gitmez (spec §4.4)", async () => {
  jest.mocked(acquireMic).mockResolvedValue({ status: "denied" } as never);

  await useVoiceStore.getState().join();

  expect(api.voiceCredentials).not.toHaveBeenCalled();
  expect(useVoiceStore.getState()).toMatchObject({ phase: "error", micDenied: true });
});

test("kalıcı red (blocked) ayrı işaretlenir — kurtarma yolu Ayarlar", async () => {
  jest.mocked(acquireMic).mockResolvedValue({ status: "blocked" } as never);

  await useVoiceStore.getState().join();

  expect(useVoiceStore.getState()).toMatchObject({ phase: "error", micBlocked: true });
});

test("ön-ekran kapatılırsa HATA gösterilmez, sessizce başa dönülür", async () => {
  jest.mocked(acquireMic).mockResolvedValue({ status: "dismissed" } as never);

  await useVoiceStore.getState().join();

  expect(useVoiceStore.getState()).toMatchObject({ phase: "idle", micDenied: false });
});

test("kimlik 409 → sessiz idle; diğer hata → connectFailed", async () => {
  jest.mocked(api.voiceCredentials).mockRejectedValueOnce({ response: { status: 409 } });
  await useVoiceStore.getState().join();
  expect(useVoiceStore.getState()).toMatchObject({ phase: "idle", connectFailed: false });

  useVoiceStore.setState({ phase: "idle" });
  jest.mocked(api.voiceCredentials).mockRejectedValueOnce({ response: { status: 500 } });
  await useVoiceStore.getState().join();
  expect(useVoiceStore.getState()).toMatchObject({ phase: "error", connectFailed: true });
});

test("engellenen kişi roster'a GİRMEZ ve ondan gelen sinyal mesh'e verilmez", async () => {
  useSessionStore.setState({
    view: view({
      participants: [
        { id: "me", inVoice: true },
        { id: "b", inVoice: true, blocked: true },
      ],
    }),
  });

  await useVoiceStore.getState().join();
  expect(mockMesh.last?.roster).toEqual(["me"]);

  const handler = jest.mocked(liveChannel.subscribe).mock.calls[0][1];
  handler(JSON.stringify({ from: "b", type: "ice", candidate: {} }));
  expect(mockMesh.last?.signals).toHaveLength(0);
});

test("arka plan susturması kullanıcının KENDİ tercihini ezmez", async () => {
  await useVoiceStore.getState().join();

  useVoiceStore.getState().setBackgroundMuted(true);
  expect(mockMesh.last?.muted).toBe(true);

  useVoiceStore.getState().setBackgroundMuted(false);
  expect(mockMesh.last?.muted).toBe(false);
  expect(useVoiceStore.getState().muted).toBe(false);
});

test("ended() mikrofonu bırakır, sebebi 10 sn gösterir", async () => {
  jest.useFakeTimers();
  await useVoiceStore.getState().join();

  useVoiceStore.getState().ended("TIME_LIMIT");
  expect(useVoiceStore.getState()).toMatchObject({ phase: "idle", endedReason: "TIME_LIMIT" });

  jest.advanceTimersByTime(10_000);
  expect(useVoiceStore.getState().endedReason).toBeNull();
  jest.useRealTimers();
});

test("ayrıldıktan hemen sonra katılım SUNUCUYA gitmez (SUBSCRIBE bütçesi)", async () => {
  await useVoiceStore.getState().join();
  useVoiceStore.getState().leave();
  jest.clearAllMocks();

  await useVoiceStore.getState().join();

  expect(acquireMic).not.toHaveBeenCalled();
  expect(api.voiceCredentials).not.toHaveBeenCalled();
});
