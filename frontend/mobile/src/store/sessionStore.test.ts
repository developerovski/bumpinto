import { api } from "../lib/api";
import { repairParticipantToken } from "../lib/participantSession";
import { useSessionStore } from "./sessionStore";

jest.mock("../lib/api", () => ({
  api: { getSession: jest.fn(), listSessions: jest.fn() },
}));
jest.mock("../lib/participantSession", () => ({
  repairParticipantToken: jest.fn(async () => true),
}));

const getSession = api.getSession as jest.Mock;
const repair = repairParticipantToken as jest.Mock;
const view = { slug: "x7k2m", status: "SWIPING", viewer: { participantId: "p1" } };

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({ view: null, error: null });
});

/** K-M39: her okuma jeton onarımından geçer — yoksa listeden açılan oturumda yazma uçları 403. */
test("loadView okuduğu görünümle jeton onarımını tetikler", async () => {
  getSession.mockResolvedValue(view);

  await useSessionStore.getState().loadView("x7k2m");

  expect(repair).toHaveBeenCalledWith("x7k2m", view);
  expect(useSessionStore.getState().view).toBe(view);
  expect(useSessionStore.getState().error).toBeNull();
});

test("onarım başarısızsa görünüm yine durur — ekran hataya düşmez", async () => {
  getSession.mockResolvedValue(view);
  repair.mockResolvedValue(false);

  await useSessionStore.getState().loadView("x7k2m");

  expect(useSessionStore.getState().view).toBe(view);
  expect(useSessionStore.getState().error).toBeNull();
});

test("okuma patlarsa onarım denenmez", async () => {
  getSession.mockRejectedValue(new Error("404"));

  await useSessionStore.getState().loadView("x7k2m");

  expect(repair).not.toHaveBeenCalled();
  expect(useSessionStore.getState().error).toBe("session.notFound");
});
