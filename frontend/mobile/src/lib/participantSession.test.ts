import type { SessionView } from "@bumpinto/shared";

import { api, hasParticipantToken, rememberParticipantToken } from "./api";
import { repairParticipantToken } from "./participantSession";

jest.mock("./api", () => ({
  api: { join: jest.fn() },
  hasParticipantToken: jest.fn(() => false),
  rememberParticipantToken: jest.fn(),
}));

const join = api.join as jest.Mock;

/** Sunucunun bizi TANIDIĞI görünüm: `viewer` hesap koltuğundan çözülmüş. */
const view = (over: Partial<SessionView> = {}): SessionView =>
  ({
    slug: "x7k2m",
    status: "SWIPING",
    viewer: { participantId: "p1", host: false },
    participants: [
      { id: "p1", displayName: "Mehmet" },
      { id: "p2", displayName: "Ayşe" },
    ],
    ...over,
  }) as unknown as SessionView;

beforeEach(() => {
  jest.clearAllMocks();
  (hasParticipantToken as jest.Mock).mockReturnValue(false);
  join.mockResolvedValue({ participantId: "p1", participantToken: "TAZE" });
});

test("jetonsuz açılan oturumda katılım ucuyla onarır ve jetonu hatırlar", async () => {
  await expect(repairParticipantToken("x7k2m", view())).resolves.toBe(true);

  // Ad geri gönderilir (sunucu zorunlu tutuyor), konum GÖNDERİLMEZ: koltuk olduğu gibi döner.
  expect(join).toHaveBeenCalledWith("x7k2m", { displayName: "Mehmet" });
  expect(rememberParticipantToken).toHaveBeenCalledWith("x7k2m", "TAZE");
});

test("jeton ELDEYSE katılım ucuna hiç gitmez", async () => {
  (hasParticipantToken as jest.Mock).mockReturnValue(true);

  await expect(repairParticipantToken("x7k2m", view())).resolves.toBe(false);
  expect(join).not.toHaveBeenCalled();
});

test("sunucu bizi tanımıyorsa (viewer yok) katılım ucuna gitmez — hayalet koltuk açılmaz", async () => {
  await expect(repairParticipantToken("x7k2m", view({ viewer: undefined }))).resolves.toBe(false);
  expect(join).not.toHaveBeenCalled();
});

test("onarım patlarsa sessizce başarısız olur — çağıranın görünümü hataya düşmez", async () => {
  join.mockRejectedValue(new Error("500"));

  await expect(repairParticipantToken("x7k2m", view())).resolves.toBe(false);
  expect(rememberParticipantToken).not.toHaveBeenCalled();
});
