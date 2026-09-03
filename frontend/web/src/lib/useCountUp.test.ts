import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./useCountUp";

describe("useCountUp", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reduced-motion true iken hedef değer anında döner (rAF hiç beklenmez)", () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;

    const { result } = renderHook(() => useCountUp(42));
    expect(result.current).toBe(42);

    window.matchMedia = original;
  });

  it("normal harekette 0'dan başlar, 320ms'de hedefe ulaşır", () => {
    // jsdom requestAnimationFrame sağlamıyor — vitest'in sahte zamanlayıcıları (@sinonjs/fake-timers)
    // rAF/performance.now'ı da simüle eder; bu yüzden burada gerçek animasyon adımlarını sürebiliyoruz.
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"],
    });
    const { result } = renderHook(() => useCountUp(10));
    expect(result.current).toBe(0);

    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(result.current).toBe(10);
  });

  it("hedef değişince mevcut değerden devam eder — sıfıra ZIPLAMAZ (code-review bulgusu)", () => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"],
    });
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 10 },
    });
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(result.current).toBe(10);

    rerender({ target: 14 });
    act(() => {
      vi.advanceTimersByTime(160); // yarı yol: 10'dan başlayıp 14'e gider, 0'dan DEĞİL
    });
    expect(result.current).toBe(12); // 10 + (14-10)*0.5

    act(() => {
      vi.advanceTimersByTime(160);
    });
    expect(result.current).toBe(14);
  });

  it("retarget animasyon bitmeden gelirse değer asla azalmaz (mid-flight reseed)", () => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"],
    });
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 10 },
    });

    act(() => {
      vi.advanceTimersByTime(160); // ilk animasyon YARIDA — henüz 10'a ulaşmadı
    });
    const midFlight = result.current;
    expect(midFlight).toBeGreaterThan(0);
    expect(midFlight).toBeLessThan(10);

    rerender({ target: 20 }); // animasyon TAMAMLANMADAN retarget — 0'a ya da eski hedefe değil,
    // ekranda o an görünen `midFlight`ten devam etmeli.
    expect(result.current).toBeGreaterThanOrEqual(midFlight);

    let prev = result.current;
    for (let i = 0; i < 8; i++) {
      act(() => {
        vi.advanceTimersByTime(40);
      });
      expect(result.current).toBeGreaterThanOrEqual(prev); // hiçbir karede AZALMAZ
      prev = result.current;
    }

    expect(result.current).toBe(20);
  });
});
