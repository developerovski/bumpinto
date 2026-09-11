import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  handlers: [] as ((body: string) => void)[],
  onConnectCbs: [] as (() => void)[],
  unsubscribe: vi.fn(),
  close: vi.fn(),
  view: {
    slug: "x", name: "n", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING",
    expiresAt: "", participants: [], venues: [], runoffVenueIds: [], voteTally: {},
  },
}));
vi.mock("./liveChannel", () => ({
  liveChannel: {
    subscribe: vi.fn((_d: string, h: (body: string) => void) => { hoisted.handlers.push(h); return hoisted.unsubscribe; }),
    open: vi.fn((_slug: string, onConnect: () => void) => { hoisted.onConnectCbs.push(onConnect); return hoisted.close; }),
    publish: vi.fn(),
  },
  sessionTopic: (slug: string) => `/topic/session/${slug}`,
}));
vi.mock("../lib/api", () => ({
  api: { getSession: vi.fn(() => Promise.resolve(hoisted.view)), preview: vi.fn() },
}));

import { api } from "../lib/api";
import { useAuthStore } from "./authStore";
import { useSeatRequestsStore } from "./seatRequestsStore";
import { useSessionStore } from "./sessionStore";
import { useSessionLive } from "./useSessionLive";
import { useVoiceStore } from "./voiceStore";

describe("useSessionLive", () => {
  beforeEach(() => {
    hoisted.handlers.length = 0;
    hoisted.onConnectCbs.length = 0;
    vi.clearAllMocks();
    useVoiceStore.setState({ endedReason: null });
  });

  it("voice_ended olayı sebebi ses deposuna yazar; ayrılırken mikrofon bırakılır", () => {
    const leave = vi.fn();
    useVoiceStore.setState({ leave });
    const { unmount } = renderHook(() => useSessionLive("x"));

    hoisted.handlers[0]!(JSON.stringify({ type: "voice_ended", payload: { reason: "TIME_LIMIT" } }));
    expect(useVoiceStore.getState().endedReason).toBe("TIME_LIMIT");

    hoisted.handlers[0]!("not json"); // bozuk gövde tazelemeyi kırmaz
    unmount();
    expect(hoisted.unsubscribe).toHaveBeenCalled();
    expect(hoisted.close).toHaveBeenCalled();
    expect(leave).toHaveBeenCalled();

    // Sıra önemli: mikrofon abonelik CANLIYKEN bırakılır ki UNSUBSCRIBE çerçevesi gitsin.
    const leaveOrder = leave.mock.invocationCallOrder[0];
    const unsubOrder = hoisted.unsubscribe.mock.invocationCallOrder[0];
    const closeOrder = hoisted.close.mock.invocationCallOrder[0];
    expect(leaveOrder).toBeLessThan(unsubOrder);
    expect(unsubOrder).toBeLessThan(closeOrder);
  });

  /* `seat_requests_changed` oturumun TÜM koltuklu abonelerine gider (sunucu host'a özel yayınlamaz);
     istek listesi yalnız host'ta tazelenir — üyeler o ucu çağırsa 403 alırdı. */
  it("seat_requests_changed yalnız host'ta istek listesini tazeler", async () => {
    const load = vi.fn();
    useAuthStore.setState({ status: "signed" });
    useSeatRequestsStore.setState({ load });
    vi.mocked(api.getSession).mockResolvedValueOnce({ ...hoisted.view, viewer: { participantId: "h", host: true } } as never);
    renderHook(() => useSessionLive("x"));
    await vi.waitFor(() => expect(useSessionStore.getState().view?.viewer?.host).toBe(true));
    hoisted.handlers[0]!(JSON.stringify({ type: "seat_requests_changed", payload: {} }));
    expect(load).toHaveBeenCalledWith("x");
  });

  it("seat_requests_changed host olmayanda liste çağrısı yapmaz", async () => {
    const load = vi.fn();
    useSeatRequestsStore.setState({ load });
    vi.mocked(api.getSession).mockResolvedValueOnce({ ...hoisted.view, viewer: { participantId: "a", host: false } } as never);
    renderHook(() => useSessionLive("x"));
    await vi.waitFor(() => expect(useSessionStore.getState().view?.viewer?.participantId).toBe("a"));
    hoisted.handlers[0]!(JSON.stringify({ type: "seat_requests_changed", payload: {} }));
    expect(load).not.toHaveBeenCalled();
  });

  it("liveChannel bağlanınca (ilk kuruluş/yeniden bağlanma) resetRoster() çağrılır — failed peer'ler canlanır", () => {
    const resetRoster = vi.fn();
    useVoiceStore.setState({ resetRoster });
    renderHook(() => useSessionLive("x"));

    hoisted.onConnectCbs[0]!();
    expect(resetRoster).toHaveBeenCalled();
  });
});
