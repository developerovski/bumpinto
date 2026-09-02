import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() } }));
import { api } from "../lib/api";
import { useNewSessionStore } from "./newSessionStore";

describe("newSessionStore", () => {
  beforeEach(() => { vi.clearAllMocks(); useNewSessionStore.getState().reset(); });

  it("SOLO: kur → noktaları ekle → mekanları bul; slug döner", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "q9d4p", sessionId: "s", participantId: "h", participantToken: undefined, expiresAt: "" });
    vi.mocked(api.addPoint).mockResolvedValue({ id: "m1", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: true, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } });
    vi.mocked(api.findVenues).mockResolvedValueOnce({ slug: "q9d4p", status: "BROWSING" } as never);
    const s = useNewSessionStore.getState();
    s.setType("SOLO"); s.setActivity("COFFEE");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712 });
    const slug = await useNewSessionStore.getState().submit("Mehmet", { lat: 51.6978, lng: 5.3037, label: "'s-Hertogenbosch" });
    expect(slug).toBe("q9d4p");
    expect(api.createSession).toHaveBeenCalledWith(expect.objectContaining({ sessionType: "SOLO", locationLabel: "'s-Hertogenbosch" }));
    expect(api.addPoint).toHaveBeenCalledWith("q9d4p", expect.objectContaining({ displayName: "Ayşe" }));
    expect(api.findVenues).toHaveBeenCalledWith("q9d4p");
  });

  it("GROUP: kur; nokta ve find-venues çağrılmaz", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "x7k2m", sessionId: "s", participantId: "h", participantToken: undefined, expiresAt: "" });
    const s = useNewSessionStore.getState();
    s.setType("GROUP");
    await useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: "Den Bosch" });
    expect(api.addPoint).not.toHaveBeenCalled();
    expect(api.findVenues).not.toHaveBeenCalled();
  });

  it("kurulum başarısız → error anahtarı + throw", async () => {
    vi.mocked(api.createSession).mockRejectedValueOnce(new Error("500"));
    await expect(useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: null })).rejects.toThrow();
    expect(useNewSessionStore.getState().error).toBe("newSession.errCreate");
  });

  it("SOLO: nokta ekleme başarısız olsa da slug döner, error yok", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "q9d4p", sessionId: "s", participantId: "h", participantToken: undefined, expiresAt: "" });
    vi.mocked(api.addPoint).mockRejectedValueOnce(new Error("409"));
    const s = useNewSessionStore.getState();
    s.setType("SOLO"); s.setActivity("COFFEE");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712 });
    await expect(useNewSessionStore.getState().submit("Mehmet", { lat: 51.6978, lng: 5.3037, label: "'s-Hertogenbosch" })).resolves.toBe("q9d4p");
    expect(useNewSessionStore.getState().error).toBeNull();
    expect(useNewSessionStore.getState().busy).toBe(false);
  });

  it("slug olmadan kurulum → error anahtarı + throw", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ sessionId: "s" } as never);
    await expect(useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: null })).rejects.toThrow();
    expect(useNewSessionStore.getState().error).toBe("newSession.errCreate");
  });
});
