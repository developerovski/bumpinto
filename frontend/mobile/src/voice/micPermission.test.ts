import { presentMicConsent } from "../lib/micConsent";
import { acquireMic } from "./micPermission";

/**
 * Mikrofon edinme — M-5'in rıza akışıyla WebRTC arasındaki KÖPRÜ.
 *
 * O7 ön-ekranı, sistem diyaloğu ve `granted/denied/blocked` ayrımı M-5'te yazıldı
 * (`presentMicConsent` → `app/(sheets)/mic-consent.tsx` → `requestMicrophone`). Burada ikinci
 * bir izin akışı YOK; yalnız "rıza olumluysa akışı al" adımı var.
 *
 * SÖZLEŞME (micConsent.ts): WebRTC `getUserMedia` rızadan ÖNCE ÇAĞRILMAZ.
 */
jest.mock("../lib/micConsent", () => ({ presentMicConsent: jest.fn() }));

const stream = { getTracks: () => [], getAudioTracks: () => [] };
const getUserMedia = jest.fn(async () => stream);

beforeEach(() => {
  jest.clearAllMocks();
  getUserMedia.mockResolvedValue(stream);
});

test("rıza verilince akış alınır", async () => {
  jest.mocked(presentMicConsent).mockResolvedValue("granted");

  await expect(acquireMic({ getUserMedia })).resolves.toEqual({ status: "granted", stream });
  expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
});

test.each([
  ["denied" as const, "denied"],
  ["blocked" as const, "blocked"],
  ["dismissed" as const, "dismissed"],
])("rıza '%s' ise getUserMedia HİÇ çağrılmaz", async (consent, expected) => {
  jest.mocked(presentMicConsent).mockResolvedValue(consent);

  await expect(acquireMic({ getUserMedia })).resolves.toEqual({ status: expected });
  expect(getUserMedia).not.toHaveBeenCalled();
});

test("izin verildiği hâlde cihaz akışı vermezse 'failed' — 'denied' DEĞİL", async () => {
  // Mikrofon başka uygulamada meşgul olabilir. Bunu "izin yok" diye göstermek kullanıcıyı
  // olmayan bir ayarı düzeltmeye gönderirdi.
  jest.mocked(presentMicConsent).mockResolvedValue("granted");
  getUserMedia.mockRejectedValue(new Error("NotReadableError"));

  await expect(acquireMic({ getUserMedia })).resolves.toEqual({ status: "failed" });
});
