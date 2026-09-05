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
    s.setType("SOLO"); s.toggleActivity("COFFEE");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712, travelMode: "BIKE" });
    const slug = await useNewSessionStore.getState().submit("Mehmet", { lat: 51.6978, lng: 5.3037, label: "'s-Hertogenbosch" });
    expect(slug).toBe("q9d4p");
    expect(api.createSession).toHaveBeenCalledWith(expect.objectContaining({ sessionType: "SOLO", locationLabel: "'s-Hertogenbosch", travelMode: "CAR" }));
    expect(api.addPoint).toHaveBeenCalledWith("q9d4p", expect.objectContaining({ displayName: "Ayşe", travelMode: "BIKE" }));
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
    s.setType("SOLO"); s.toggleActivity("COFFEE");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712, travelMode: "BIKE" });
    await expect(useNewSessionStore.getState().submit("Mehmet", { lat: 51.6978, lng: 5.3037, label: "'s-Hertogenbosch" })).resolves.toBe("q9d4p");
    expect(useNewSessionStore.getState().error).toBeNull();
    expect(useNewSessionStore.getState().busy).toBe(false);
  });

  it("slug olmadan kurulum → error anahtarı + throw", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ sessionId: "s" } as never);
    await expect(useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: null })).rejects.toThrow();
    expect(useNewSessionStore.getState().error).toBe("newSession.errCreate");
  });

  it("setTravelMode + setLocalPointTravelMode: kendi ve nokta ulaşım türü ayrı güncellenir", () => {
    const s = useNewSessionStore.getState();
    s.setTravelMode("TRANSIT");
    expect(useNewSessionStore.getState().travelMode).toBe("TRANSIT");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: "Someren", lat: 51.3855, lng: 5.712, travelMode: "CAR" });
    s.setLocalPointTravelMode(0, "WALK");
    expect(useNewSessionStore.getState().points[0].travelMode).toBe("WALK");
  });

  it("çapa modunda istek anchor taşır ve host konumu göndermez", async () => {
    const spy = vi.mocked(api.createSession);
    spy.mockResolvedValueOnce({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setAnchorMode("ANCHOR");
    s.setAnchor({ lat: 52.3676, lng: 4.9041, label: "Amsterdam" });

    await useNewSessionStore.getState().submit("Mehmet", null);

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        anchor: { lat: 52.3676, lng: 4.9041, label: "Amsterdam" },
        lat: undefined,
        lng: undefined,
      }),
    );
  });

  it("orta nokta modunda anchor gönderilmez", async () => {
    const spy = vi.mocked(api.createSession);
    spy.mockResolvedValueOnce({ slug: "abc" } as never);
    useNewSessionStore.getState().reset();

    await useNewSessionStore.getState().submit("Mehmet", { lat: 51.7, lng: 5.3, label: "Den Bosch" });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ anchor: undefined, lat: 51.7 }));
  });

  it("reset çapayı da temizler — önceki oturumun yeri sızmaz", () => {
    const s = useNewSessionStore.getState();
    s.setAnchorMode("ANCHOR");
    s.setAnchor({ lat: 52.3, lng: 4.9, label: "Amsterdam" });
    useNewSessionStore.getState().reset();
    expect(useNewSessionStore.getState().anchor).toBeNull();
    expect(useNewSessionStore.getState().anchorMode).toBe("MIDPOINT");
  });
});

describe("newSessionStore aktivite seçimi", () => {
  beforeEach(() => useNewSessionStore.getState().reset());

  it("COFFEE ile başlar", () => {
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  it("toggle ekler ve seçim sırasını korur", () => {
    useNewSessionStore.getState().toggleActivity("HIKE");
    useNewSessionStore.getState().toggleActivity("BAR");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE", "HIKE", "BAR"]);
  });

  it("toggle seçiliyi kaldırır", () => {
    useNewSessionStore.getState().toggleActivity("HIKE");
    useNewSessionStore.getState().toggleActivity("HIKE");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  /** Son alan kaldırılamaz: backend boş listeyi 400'le reddediyor, kullanıcıyı oraya sokma. */
  it("son kalan alanı kaldırmaz", () => {
    useNewSessionStore.getState().toggleActivity("COFFEE");
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE"]);
  });

  /** Sınır store'da da tutulur: picker devre dışı bıraksa bile store tek doğrudur. */
  it("üçten fazlasını eklemez", () => {
    ["HIKE", "BAR", "SWIM"].forEach((a) => useNewSessionStore.getState().toggleActivity(a as never));
    expect(useNewSessionStore.getState().activities).toEqual(["COFFEE", "HIKE", "BAR"]);
  });

  /** Profil varsayılanı toggle ile EKLENMEZ — reset başlangıç seçimini doğrudan alır. */
  it("reset varsayılanı tek elemanlı seçim bırakır", () => {
    useNewSessionStore.getState().reset("HIKE");
    expect(useNewSessionStore.getState().activities).toEqual(["HIKE"]);
  });
});
