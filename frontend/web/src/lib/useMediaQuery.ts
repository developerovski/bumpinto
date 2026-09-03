import { useSyncExternalStore } from "react";

/** Reaktif medya sorgusu — `useSyncExternalStore` ile viewport gerçekten `resize`/rotate
    olunca da doğru değeri verir (tek seferlik `window.matchMedia(...).matches` okuması,
    kod-review bulgusu: pencere sonradan büyürse/küçülürse bileşen haberi olmuyordu).
    jsdom `matchMedia` uygulamıyor — böyle ortamda güvenli varsayılan `false`. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}
