import { api } from "../lib/api";
import { emitSessionEvent } from "./liveEvents";
import { NUDGE_COOLDOWN_MS, useSocialStore } from "./socialStore";
import { useToastStore } from "./toastStore";

/* `jest.mock` babel-plugin-jest-hoist ile import'ların ÜSTÜNE taşınır — burada
   import'lardan sonra durması `import/first` ile çelişmemek içindir. */
jest.mock("../lib/api", () => ({ api: { nudge: jest.fn() } }));

const mock = (fn: unknown) => fn as jest.Mock;
const keys = () => useToastStore.getState().toasts.map((t) => t.messageKey);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useSocialStore.setState({ nudgedAt: {} });
  useToastStore.setState({ toasts: [] });
});
afterEach(() => jest.useRealTimers());

test("dürtme ucu çağrılır, bildirim çıkar, 60 sn soğuma ikinci isteği keser", async () => {
  mock(api.nudge).mockResolvedValue(undefined);
  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(api.nudge).toHaveBeenCalledWith("x7k2m", "k");
  expect(keys()).toContain("presence.nudgeSent");
  expect(useSocialStore.getState().canNudge("k")).toBe(false);

  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(api.nudge).toHaveBeenCalledTimes(1);
  expect(keys()).toContain("presence.nudgeCooling");

  jest.advanceTimersByTime(NUDGE_COOLDOWN_MS);
  expect(useSocialStore.getState().canNudge("k")).toBe(true);
});

test("hata soğumayı siler ve hata bildirimi basar", async () => {
  mock(api.nudge).mockRejectedValue(new Error("boom"));
  await useSocialStore.getState().nudge("x7k2m", "k", "Kerem");
  expect(useSocialStore.getState().canNudge("k")).toBe(true);
  expect(useToastStore.getState().toasts[0].tone).toBe("flame");
  expect(keys()).toContain("presence.nudgeError");
});

test("`nudged` olayı yalnız HEDEF kişide bildirim üretir", () => {
  const stop = useSocialStore.getState().listen("me");

  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "me" } });
  expect(keys()).toContain("presence.nudged");

  useToastStore.setState({ toasts: [] });
  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "k" } });
  expect(keys()).toHaveLength(0);

  // Başka bir olay tipi (`voice_ended` gibi) bu depoyu HİÇ ilgilendirmez.
  emitSessionEvent({ type: "swipe", payload: { toParticipantId: "me" } });
  expect(keys()).toHaveLength(0);

  stop();
  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "me" } });
  expect(keys()).toHaveLength(0);
});

/* Davetli görünümünde `viewer.participantId` YOKTUR: abone olmaya çalışmak sunucudan gelen
   her `nudged` olayını herkese bildirim yapardı. */
test("kimlik yoksa hiç abone olunmaz", () => {
  useSocialStore.getState().listen(undefined)();
  emitSessionEvent({ type: "nudged", payload: { fromParticipantId: "m", toParticipantId: "me" } });
  expect(keys()).toHaveLength(0);
});
