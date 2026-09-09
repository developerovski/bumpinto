import { render } from "@testing-library/react-native";

import { liveChannel } from "./liveChannel";
import { endedReasonOf, useSessionLive } from "./useSessionLive";

/**
 * Canlı kanal kancası — STOMP birincil, poll yedek.
 *
 * Kanal MOCK'lu: gerçek el sıkışma bir framework yapıştırıcısıdır ve `scripts/ws-smoke.mjs`
 * ile canlı sunucuya karşı koşar.
 */
jest.mock("./liveChannel", () => ({
  liveChannel: {
    open: jest.fn(() => jest.fn()),
    subscribe: jest.fn(() => jest.fn()),
    publish: jest.fn(() => true),
  },
  sessionTopic: (slug: string) => `/topic/session/${slug}`,
}));

jest.mock("../lib/api", () => ({
  API_BASE_URL: "http://h:8060",
  participantToken: () => "tok-1",
  api: { getSession: jest.fn(async () => ({ slug: "x7k2m" })) },
}));

function Probe({ slug }: { slug: string }) {
  useSessionLive(slug);
  return null;
}

beforeEach(() => jest.clearAllMocks());

test("mount'ta kanal açılır ve oturum konusuna abone olunur", async () => {
  await render(<Probe slug="x7k2m" />);

  expect(liveChannel.subscribe).toHaveBeenCalledWith("/topic/session/x7k2m", expect.any(Function));
  const [slug, baseUrl, getToken] = jest.mocked(liveChannel.open).mock.calls[0];
  expect(slug).toBe("x7k2m");
  expect(baseUrl).toBe("http://h:8060");
  expect(getToken()).toBe("tok-1");
});

test("unmount abonelikten çıkar ve kanalı kapatır", async () => {
  const unsubscribe = jest.fn();
  const close = jest.fn();
  jest.mocked(liveChannel.subscribe).mockReturnValueOnce(unsubscribe);
  jest.mocked(liveChannel.open).mockReturnValueOnce(close);

  const view = await render(<Probe slug="x7k2m" />);
  // RNTL 14: `unmount` de asenkron — beklenmezse efekt temizliği iddiadan SONRA koşar.
  await view.unmount();

  expect(unsubscribe).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
});

test("endedReasonOf yalnız voice_ended'ın GEÇERLİ sebebini döner", () => {
  expect(endedReasonOf(JSON.stringify({ type: "voice_ended", payload: { reason: "HOST" } }))).toBe(
    "HOST",
  );
  // Başka olay tipi, bozuk gövde ve tanınmayan sebep: hepsi null — uydurma sebep yok.
  expect(endedReasonOf(JSON.stringify({ type: "session_updated" }))).toBeNull();
  expect(endedReasonOf("{bozuk")).toBeNull();
  expect(
    endedReasonOf(JSON.stringify({ type: "voice_ended", payload: { reason: "WAT" } })),
  ).toBeNull();
});
