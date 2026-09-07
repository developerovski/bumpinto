import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { nudge: vi.fn(), report: vi.fn(), blockParticipant: vi.fn(), getSession: vi.fn(), preview: vi.fn() },
}));

import { api } from "../lib/api";
import { useSessionStore } from "./sessionStore";
import { NUDGE_COOLDOWN_MS, useSocialStore } from "./socialStore";
import { useToastStore } from "./toastStore";

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const keys = () => useToastStore.getState().toasts.map((t) => t.messageKey);

describe("socialStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useSocialStore.setState({ nudgedAt: {}, blocked: {}, busy: false });
    useToastStore.setState({ toasts: [] });
    useSessionStore.setState({ slug: "x", refresh: vi.fn().mockResolvedValue(undefined) } as never);
  });

  afterEach(() => vi.useRealTimers());

  it("dürtme ucu çağrılır, bildirim çıkar, 60 sn soğuma kilitler", async () => {
    mock(api.nudge).mockResolvedValue(undefined);
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(api.nudge).toHaveBeenCalledWith("x", "k");
    expect(keys()).toContain("presence.nudgeSent");
    expect(useSocialStore.getState().canNudge("k")).toBe(false);
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(api.nudge).toHaveBeenCalledTimes(1);
    expect(keys()).toContain("presence.nudgeCooling");
    vi.advanceTimersByTime(NUDGE_COOLDOWN_MS);
    expect(useSocialStore.getState().canNudge("k")).toBe(true);
  });

  it("dürtme hatası soğumayı SİLER ve hata bildirimi basar", async () => {
    mock(api.nudge).mockRejectedValue(new Error("boom"));
    await useSocialStore.getState().nudge("x", "k", "Kerem");
    expect(useSocialStore.getState().canNudge("k")).toBe(true);
    expect(useToastStore.getState().toasts[0].tone).toBe("flame");
  });

  it("rapor sözleşme gövdesiyle gider, ardından engel, satır iyimser soluklaşır", async () => {
    mock(api.report).mockResolvedValue(undefined);
    mock(api.blockParticipant).mockResolvedValue({ id: "b1" });
    await useSocialStore.getState().report("x", "k", "Kerem", "OTHER", undefined);
    expect(api.report).toHaveBeenCalledWith({
      sessionSlug: "x", targetParticipantId: "k", reason: "OTHER", note: undefined });
    expect(api.blockParticipant).toHaveBeenCalledWith({ participantId: "k" });
    expect(useSocialStore.getState().blocked.k).toBe(true);
    expect(useSessionStore.getState().refresh).toHaveBeenCalled();
    expect(keys()).toContain("social.reported");
    vi.clearAllMocks();
    mock(api.blockParticipant).mockResolvedValue({ id: "b2" });
    await useSocialStore.getState().block("m", "Mehmet");
    expect(api.report).not.toHaveBeenCalled();
    expect(keys()).toContain("social.blocked");
  });
});
