import { render, waitFor } from "@testing-library/react-native";

import { repairParticipantToken } from "../lib/participantSession";
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

/* Jeton onarımı (K-M39) burada MOCK'lu: kendi testleri `lib/participantSession.test.ts`te.
   Burada önemli olan tek şey SIRA — el sıkışma jetonu ondan sonra okur. */
jest.mock("../lib/participantSession", () => ({
  repairParticipantToken: jest.fn(async () => true),
}));

function Probe({ slug }: { slug: string }) {
  useSessionLive(slug);
  return null;
}

beforeEach(() => jest.clearAllMocks());

test("mount'ta kanal açılır ve oturum konusuna abone olunur", async () => {
  await render(<Probe slug="x7k2m" />);

  expect(liveChannel.subscribe).toHaveBeenCalledWith("/topic/session/x7k2m", expect.any(Function));
  await waitFor(() => expect(liveChannel.open).toHaveBeenCalled());
  const [slug, baseUrl, getToken] = jest.mocked(liveChannel.open).mock.calls[0];
  expect(slug).toBe("x7k2m");
  expect(baseUrl).toBe("http://h:8060");
  expect(getToken()).toBe("tok-1");
});

/* K-M39 regresyonu: el sıkışma katılımcı jetonu ister ve jetonsuz açılan oturumda o jeton ilk
   okumanın onarımından gelir. Kanal onarımdan ÖNCE açılırsa handshake reddedilir. */
test("kanal ilk okumanın jeton onarımından SONRA açılır", async () => {
  const order: string[] = [];
  jest.mocked(repairParticipantToken).mockImplementationOnce(async () => {
    order.push("repair");
    return true;
  });
  jest.mocked(liveChannel.open).mockImplementationOnce(() => {
    order.push("open");
    return jest.fn();
  });

  await render(<Probe slug="x7k2m" />);

  await waitFor(() => expect(order).toEqual(["repair", "open"]));
});

test("unmount abonelikten çıkar ve kanalı kapatır", async () => {
  const unsubscribe = jest.fn();
  const close = jest.fn();
  jest.mocked(liveChannel.subscribe).mockReturnValueOnce(unsubscribe);
  jest.mocked(liveChannel.open).mockReturnValueOnce(close);

  const view = await render(<Probe slug="x7k2m" />);
  // Kanal artık ilk okumadan SONRA açılıyor (K-M39): açılmadan unmount edilirse kapanacak
  // bir şey de olmaz — önce açılmasını bekle.
  await waitFor(() => expect(liveChannel.open).toHaveBeenCalled());
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
