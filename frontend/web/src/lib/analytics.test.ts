import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsConsent, loadLocalAnalyticsConsent, resetAnalytics,
  setAnalyticsConsent, setLocalAnalyticsConsent, track, trackStatus,
} from "./analytics";

type W = typeof window & { clarity?: (c: string, ...r: unknown[]) => void; gtag?: (c: string, n: string, p?: Record<string, unknown>) => void };

afterEach(() => {
  delete (window as W).clarity;
  delete (window as W).gtag;
  document.head.querySelectorAll("script[data-analytics]").forEach((s) => s.remove());
  localStorage.clear();
  resetAnalytics();
});

describe("analytics — rıza kapısı", () => {
  it("varsayılan kapalı: sağlayıcı çağrılmaz, betik yüklenmez", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    expect(analyticsConsent()).toBe(false);
    track("map_open", { screen: "venues" });
    expect(gtag).not.toHaveBeenCalled();
    expect(document.head.querySelectorAll("script[data-analytics]")).toHaveLength(0);
  });

  it("rıza verilince olay gider, geri alınınca susar", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    setAnalyticsConsent(true);
    track("map_open", { screen: "venues" });
    expect(gtag).toHaveBeenCalledWith("event", "map_open", { screen: "venues" });
    setAnalyticsConsent(false);
    track("map_open", {});
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("sağlayıcı throw etse bile akışı kırmaz", () => {
    setAnalyticsConsent(true);
    (window as W).clarity = () => { throw new Error("boom"); };
    expect(() => track("map_open", { screen: "venues" })).not.toThrow();
  });

  it("aynı aşama geçişi iki kez gitmez, farklı slug/durum gider", () => {
    const gtag = vi.fn();
    (window as W).gtag = gtag;
    setAnalyticsConsent(true);
    trackStatus("x", "BROWSING");
    trackStatus("x", "BROWSING");
    trackStatus("x", "SWIPING");
    trackStatus("y", "BROWSING");
    expect(gtag).toHaveBeenCalledTimes(3);
  });

  it("anonim rıza localStorage'da tutulur ve geri okunur", () => {
    setLocalAnalyticsConsent(true);
    resetAnalytics();
    expect(analyticsConsent()).toBe(false);
    loadLocalAnalyticsConsent();
    expect(analyticsConsent()).toBe(true);
  });

  it("localStorage okunamazsa rıza kapalı kalır (özel pencere)", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
    expect(() => loadLocalAnalyticsConsent()).not.toThrow();
    expect(analyticsConsent()).toBe(false);
    spy.mockRestore();
  });

  it("resetAnalytics rızayı da sıfırlar", () => {
    setAnalyticsConsent(true);
    resetAnalytics();
    expect(analyticsConsent()).toBe(false);
  });
});
