import type { SessionView } from "@bumpinto/shared";
import { render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";

import { tap } from "../../testUtils/interact";
import { useVoiceStore } from "../../store/voiceStore";
import VoiceDock from "./VoiceDock";

/**
 * P25 — dock'un yedi hâli. Karar `dockStateOf`ta (ayrı test); burada o kararın DOĞRU EKRANI
 * ürettiği sınanır.
 *
 * TEST BAŞINA TEK `render` (RNTL 14); `render` Promise döndürür.
 */
jest.mock("../../store/voiceStore", () => {
  const { create } = jest.requireActual("zustand");
  return {
    useVoiceStore: create(() => ({
      phase: "idle",
      muted: false,
      peers: {},
      selfSpeaking: false,
      endedReason: null,
      micDenied: false,
      micBlocked: false,
      connectFailed: false,
      speakerOn: false,
      join: jest.fn(),
      leave: jest.fn(),
      start: jest.fn(),
      end: jest.fn(),
      toggleMute: jest.fn(),
      toggleSpeaker: jest.fn(),
    })),
  };
});

const people = (inVoice: boolean) => [
  { id: "p1", displayName: "Mehmet", host: true, inVoice },
  { id: "p2", displayName: "Ayşe", host: false, inVoice },
];

const view = (over: object = {}): SessionView =>
  ({
    slug: "x7k2m",
    sessionType: "GROUP",
    status: "COLLECTING",
    participants: people(false),
    viewer: { participantId: "p1", host: true },
    voice: null,
    ...over,
  }) as unknown as SessionView;

const open = {
  voice: { endsAt: new Date(Date.now() + 24 * 60_000).toISOString() },
  participants: people(true),
};

const reset = (over: object = {}) =>
  useVoiceStore.setState({
    phase: "idle",
    muted: false,
    peers: {},
    selfSpeaking: false,
    endedReason: null,
    micDenied: false,
    micBlocked: false,
    connectFailed: false,
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  reset();
});

test("P25:1 kapalı + host → Başlat", async () => {
  await render(<VoiceDock view={view()} />);

  expect(screen.getByText("Başlat")).toBeTruthy();
});

test("kapalı + üye → dock HİÇ çizilmez", async () => {
  await render(<VoiceDock view={view({ viewer: { participantId: "p2", host: false } })} />);

  expect(screen.queryByText("Başlat")).toBeNull();
  expect(screen.queryByText("Katıl")).toBeNull();
});

test("P25:2 açık + dışarıda → kişi sayısı ve kalan süre", async () => {
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText("Katıl")).toBeTruthy();
  expect(screen.getByText("2 kişi")).toBeTruthy();
  // Tam dakika DEĞİL kalıp sınanır: `Math.floor` birkaç ms geçtiği için 24'ü 23 yapar ve
  // sabit sayı testi zamanlamaya bağlı kırılgan olurdu.
  expect(screen.getByText(/dk kaldı/)).toBeTruthy();
});

test("P25:3 bağlanıyor → Katıl pasif", async () => {
  reset({ phase: "joining" });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText("Bağlanıyor…")).toBeTruthy();
  expect(screen.getByLabelText("Katıl").props.accessibilityState.disabled).toBe(true);
});

test("P25:4 içeride → konuşan kişinin adı, sustur ve ayrıl", async () => {
  reset({ phase: "in", peers: { p2: { state: "connected", speaking: true } } });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText("Ayşe konuşuyor")).toBeTruthy();
  expect(screen.getByLabelText("Ayrıl")).toBeTruthy();
  expect(screen.getByLabelText("Mikrofonu kapat")).toBeTruthy();
});

test("P25:5 sessiz → 'Mikrofonun kapalı' ve düğme 'Mikrofonu aç' der", async () => {
  reset({ phase: "in", muted: true });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText("Mikrofonun kapalı")).toBeTruthy();
  expect(screen.getByLabelText("Mikrofonu aç")).toBeTruthy();
});

test("P25:6 kalıcı red → Ayarlar düğmesi sistem ayarlarını açar", async () => {
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
  reset({ phase: "error", micBlocked: true });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText(/Mikrofon izni kapalı/)).toBeTruthy();
  await tap("Ayarlar'a git");

  expect(openSettings).toHaveBeenCalled();
});

test("P25:7 süre doldu + host → Yeniden başlat", async () => {
  reset({ endedReason: "TIME_LIMIT" });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText("Süre doldu")).toBeTruthy();
  expect(screen.getByText("Yeniden başlat")).toBeTruthy();
});

test("bağlantısı düşen peer soluk çizilir ve 'sesi gelmiyor' der", async () => {
  reset({ phase: "in", peers: { p2: { state: "failed", speaking: false } } });
  await render(<VoiceDock view={view(open)} />);

  expect(screen.getByText(/sesi gelmiyor/)).toBeTruthy();
});
