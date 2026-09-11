import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { me: vi.fn(), loginGoogle: vi.fn(), logout: vi.fn(), updateMe: vi.fn(),
  putConsents: vi.fn(), deleteMe: vi.fn(), loginApple: vi.fn(), exportMyData: vi.fn() } }));

import { analyticsConsent, resetAnalytics } from "../lib/analytics";
import { api } from "../lib/api";
import i18n from "../i18n";
import { useAuthStore } from "./authStore";
import { useDiscoverStore } from "./discoverStore";
import { useSeatRequestsStore } from "./seatRequestsStore";

const me = { id: "u1", email: "m@x.test", displayName: "Mehmet", language: "nl",
  defaultLocation: undefined, defaultActivity: undefined, stats: { sessionsHosted: 1, friendsMet: 2 } };

describe("authStore", () => {
  beforeEach(() => {
    resetAnalytics();
    useAuthStore.setState({ status: "unknown", me: null });
  });
  afterEach(async () => {
    await i18n.changeLanguage("tr");
  });

  it("load: 401 → anon", async () => {
    vi.mocked(api.me).mockRejectedValueOnce(
      new AxiosError("x", "401", undefined, undefined, { status: 401, data: {}, statusText: "", headers: {}, config: { headers: new AxiosHeaders() } }));
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("anon");
  });

  it("load: 200 → signed ve sunucu dili uygulanır", async () => {
    vi.mocked(api.me).mockResolvedValueOnce(me);
    await useAuthStore.getState().load();
    expect(useAuthStore.getState().status).toBe("signed");
    expect(document.documentElement.lang).toBe("nl");
  });

  /* Keşfet sonuçları (önceki hesabın ilgi alanları + ev konumundan dakika) ve host istek listesi
     (isteyenlerin adı/notu) paylaşılan cihazda sonraki hesaba SIZMAMALI. */
  it("çıkış Keşfet ve istek listesi depolarını da temizler", async () => {
    vi.mocked(api.logout).mockResolvedValueOnce(undefined);
    useDiscoverStore.setState({ loaded: true, plans: [{ slug: "a" }], filter: ["HIKE"] });
    useSeatRequestsStore.setState({ slug: "gp", list: { requests: [{ id: "r1", displayName: "Tomás" }] } });
    await useAuthStore.getState().logout();
    expect(useDiscoverStore.getState()).toMatchObject({ loaded: false, plans: [], filter: [] });
    expect(useSeatRequestsStore.getState().list).toBeNull();
    useDiscoverStore.setState({ loaded: true, plans: [{ slug: "a" }] });
    useAuthStore.getState().signedOut();
    expect(useDiscoverStore.getState().loaded).toBe(false);
  });

  it("logout → anon", async () => {
    vi.mocked(api.logout).mockResolvedValueOnce(undefined);
    useAuthStore.setState({ status: "signed", me });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().status).toBe("anon");
  });

  it("load: URL'deki ?lng= sunucu tercihini ezer", async () => {
    window.history.replaceState({}, "", "/?lng=tr");
    vi.mocked(api.me).mockResolvedValueOnce({ ...me, language: "nl" });
    await useAuthStore.getState().load();
    expect(document.documentElement.lang).toBe("tr");
    window.history.replaceState({}, "", "/");
  });

  it("updatePrefs: PUT tam değişim yapar — defaultTravelMode ilgisiz bir güncellemede TEMİZLENMEZ", async () => {
    const meWithMode = { ...me, defaultTravelMode: "BIKE" as const };
    useAuthStore.setState({ status: "signed", me: meWithMode });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...meWithMode, displayName: "Mehmet S." });
    await useAuthStore.getState().updatePrefs({ displayName: "Mehmet S." });
    expect(api.updateMe).toHaveBeenCalledWith(expect.objectContaining({ defaultTravelMode: "BIKE", displayName: "Mehmet S." }));
  });

  it("me.consents.analytics true ise analitik kapısı açılır", async () => {
    vi.mocked(api.me).mockResolvedValue({ id: "u1", consents: { location: true, microphone: false, analytics: true } } as never);
    await useAuthStore.getState().load();
    expect(analyticsConsent()).toBe(true);
  });

  it("saveConsents mevcut rızaların üstüne patch biner ve me tazelenir", async () => {
    useAuthStore.setState({ status: "signed", me: { id: "u1", consents: { location: true, microphone: true, analytics: false } } as never });
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue({ id: "u1", consents: { location: true, microphone: true, analytics: true } } as never);
    await useAuthStore.getState().saveConsents({ analytics: true });
    expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: true, analytics: true });
    expect(analyticsConsent()).toBe(true);
  });

  it("deleteAccount oturumu anon'a düşürür ve analitiği kapatır", async () => {
    useAuthStore.setState({ status: "signed", me: { id: "u1" } as never });
    vi.mocked(api.deleteMe).mockResolvedValue(undefined);
    await useAuthStore.getState().deleteAccount();
    expect(useAuthStore.getState().status).toBe("anon");
    expect(analyticsConsent()).toBe(false);
  });

  it("signedOut → anon (AĞA GİTMEDEN)", () => {
    // Casus dosya boyunca paylaşılır; "hiç çağrılmadı" iddiası ancak sıfırlanmışsa anlamlı.
    vi.mocked(api.logout).mockClear();
    useAuthStore.setState({ me: { id: "u1" } as never, status: "signed" });

    useAuthStore.getState().signedOut();

    expect(useAuthStore.getState().status).toBe("anon");
    expect(useAuthStore.getState().me).toBeNull();
    expect(api.logout).not.toHaveBeenCalled();
  });
});
