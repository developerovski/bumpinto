import { emptyOpenPlanDraft } from "@bumpinto/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { createSession: vi.fn(), addPoint: vi.fn(), findVenues: vi.fn() } }));
import { api } from "../lib/api";
import { useNewSessionStore } from "./newSessionStore";

describe("newSessionStore · Ne zaman (açık plan)", () => {
  const NOW = new Date("2026-09-13T10:00:00Z");
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    useNewSessionStore.getState().reset();
  });
  afterEach(() => vi.useRealTimers());

  it("Şimdi: openPlan penceresi + çapa kendi konumdan, OPEN ve PUBLIC varsayılan", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "NOW", durationHours: 2, whereLabel: "Café Zwart" });
    await s.submit("Ayşe", { lat: 51.44, lng: 5.47, label: "Stratum" });
    const body = vi.mocked(api.createSession).mock.calls[0][0];
    expect(body.openPlan).toEqual({ meetAt: "2026-09-13T10:00:00.000Z", openUntil: "2026-09-13T12:00:00.000Z",
      capacity: 4, joinPolicy: "OPEN", audience: "PUBLIC" });
    expect(body.anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
    expect(body.lat).toBe(51.44);
  });

  it("Tarih seç: openPlan noktasal, APPROVAL; Kimse → NONE", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "DATE", meetDate: "2026-09-20", meetTime: "10:00", audience: "NONE" });
    await s.submit("Ayşe", { lat: 51.44, lng: 5.47, label: "Stratum" });
    const body = vi.mocked(api.createSession).mock.calls[0][0];
    expect(body.openPlan).toEqual({ meetAt: new Date("2026-09-20T10:00").toISOString(), capacity: 4,
      joinPolicy: "APPROVAL", audience: "NONE" });
  });

  it("Belirsiz: openPlan gönderilmez", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
    await useNewSessionStore.getState().submit("Ayşe", { lat: 1, lng: 2, label: null });
    expect(vi.mocked(api.createSession).mock.calls[0][0].openPlan).toBeUndefined();
  });

  it("SOLO ile açık plan bir arada olamaz: plan GROUP'a, Bireysel planı Belirsiz'e çeker", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setType("SOLO");
    s.addLocalPoint({ displayName: "Ayşe", locationLabel: null, lat: 51.4, lng: 5.7, travelMode: "BIKE" });
    s.setPlan({ when: "DATE", meetDate: "2026-09-20", meetTime: "10:00" });
    expect(useNewSessionStore.getState().type).toBe("GROUP");
    await s.submit("Mehmet", { lat: 51.44, lng: 5.47, label: null });
    expect(vi.mocked(api.createSession).mock.calls[0][0].sessionType).toBe("GROUP");
    expect(api.addPoint).not.toHaveBeenCalled();
    expect(api.findVenues).not.toHaveBeenCalled();
    s.setType("SOLO");
    expect(useNewSessionStore.getState().plan.when).toBe("UNSET");
  });

  it("Şimdi: ANCHOR modunda kalmış çapa sızmaz; çapa kuranın konumu + Nerede etiketi", async () => {
    vi.mocked(api.createSession).mockResolvedValueOnce({ slug: "abc" } as never);
    const s = useNewSessionStore.getState();
    s.setAnchorMode("ANCHOR");
    s.setAnchor({ lat: 52.37, lng: 4.9, label: "Amsterdam" });
    s.setPlan({ when: "NOW", whereLabel: "Café Zwart" });
    await s.submit("Ayşe", { lat: 51.44, lng: 5.47, label: null });
    expect(vi.mocked(api.createSession).mock.calls[0][0].anchor).toEqual({ lat: 51.44, lng: 5.47, label: "Café Zwart" });
  });

  it("Şimdi: kuranın konumu yoksa istek ATILMAZ (sunucu çapasız pencereyi 400'ler)", async () => {
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "NOW", whereLabel: "Café Zwart" });
    await expect(s.submit("Ayşe", null)).rejects.toThrow();
    expect(api.createSession).not.toHaveBeenCalled();
    expect(useNewSessionStore.getState().error).toBe("newSession.ownMissing");
  });

  it("bayat taslak sessizce gizli oturuma düşmez: geçmiş tarih gönderimde reddedilir", async () => {
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" });
    await expect(s.submit("Ayşe", { lat: 1, lng: 2, label: null })).rejects.toThrow();
    expect(api.createSession).not.toHaveBeenCalled();
    expect(useNewSessionStore.getState().error).toBe("plan.errMeetAtPast");
  });

  it("moda geçiş katılım varsayılanını yeniden devreye sokar; host seçimi o modda kalır", () => {
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "NOW" });
    expect(useNewSessionStore.getState().plan.joinPolicy).toBeNull();
    s.setPlan({ joinPolicy: "APPROVAL" });
    expect(useNewSessionStore.getState().plan.joinPolicy).toBe("APPROVAL");
    s.setPlan({ when: "DATE" });
    expect(useNewSessionStore.getState().plan.joinPolicy).toBeNull();
  });

  it("validate: geçmiş tarih ve boş Nerede anahtar döner", () => {
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "DATE", meetDate: "2020-01-01", meetTime: "10:00" });
    expect(s.validate()).toBe("plan.errMeetAtPast");
    s.setPlan({ when: "NOW", whereLabel: "" });
    expect(s.validate()).toBe("plan.errWhereRequired");
  });

  it("reset planı da sıfırlar", () => {
    const s = useNewSessionStore.getState();
    s.setPlan({ when: "NOW" });
    s.reset();
    expect(useNewSessionStore.getState().plan).toEqual(emptyOpenPlanDraft());
  });
});

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
