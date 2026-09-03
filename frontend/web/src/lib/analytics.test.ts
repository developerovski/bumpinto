import { afterEach, describe, expect, it, vi } from "vitest";
import { resetAnalytics, track, trackStatus } from "./analytics";

type WindowWithAnalytics = typeof window & {
  clarity?: (command: "event", name: string) => void;
  gtag?: (command: "event", name: string, props?: Record<string, unknown>) => void;
};

afterEach(() => {
  delete (window as WindowWithAnalytics).clarity;
  delete (window as WindowWithAnalytics).gtag;
  resetAnalytics();
});

describe("analytics", () => {
  it("clarity/gtag yokken sessizce yutar (hata atmaz)", () => {
    expect(() => track("map_open", { screen: "venues" })).not.toThrow();
  });

  it("window.clarity varsa çağırır", () => {
    const clarity = vi.fn();
    (window as WindowWithAnalytics).clarity = clarity;
    track("maps_js_load", { screen: "venues" });
    expect(clarity).toHaveBeenCalledWith("event", "maps_js_load");
  });

  it("window.gtag varsa parametrelerle çağırır", () => {
    const gtag = vi.fn();
    (window as WindowWithAnalytics).gtag = gtag;
    track("map_open", { screen: "venues" });
    expect(gtag).toHaveBeenCalledWith("event", "map_open", { screen: "venues" });
  });

  it("çağıran sağlayıcı throw etse bile akışı kırmaz", () => {
    (window as WindowWithAnalytics).clarity = () => {
      throw new Error("boom");
    };
    expect(() => track("map_open", { screen: "venues" })).not.toThrow();
  });

  it("aynı aşama geçişi iki kez gönderilmez", () => {
    const gtag = vi.fn();
    (window as WindowWithAnalytics).gtag = gtag;
    trackStatus("x", "BROWSING");
    trackStatus("x", "BROWSING");
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("farklı slug ya da farklı durum yeniden gönderir", () => {
    const gtag = vi.fn();
    (window as WindowWithAnalytics).gtag = gtag;
    trackStatus("x", "BROWSING");
    trackStatus("x", "SWIPING");
    trackStatus("y", "BROWSING");
    expect(gtag).toHaveBeenCalledTimes(3);
  });
});
