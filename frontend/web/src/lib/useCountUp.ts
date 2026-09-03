import { useEffect, useRef, useState } from "react";

/** Karar dokümanı §5.C: sayım 320 ms, reduced-motion'da YOK. Hedef değişince (ör. tally canlı
    güncellenince) SIFIRDAN değil, o an ekranda görünen değerden devam eder (code-review bulgusu:
    önceki sürüm her `target` değişiminde 0'a zıplıyordu). Kapı sunucu tarafında: bu bileşen
    yalnız veri geldiğinde mount edilir — ayrı bir `enabled` parametresi gerekmiyor. */
export function useCountUp(target: number, duration = 320): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduced || target === from) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const next = Math.round(from + (target - from) * p);
      // Her karede reseed edilir (yalnız bitişte değil) — animasyon tamamlanmadan `target`
      // tekrar değişirse (retarget), sonraki effect çalışması burada bırakılan değerden devam
      // eder, ekrandaki sayı asla geriye ya da 0'a zıplamaz (code-review bulgusu).
      fromRef.current = next;
      setValue(next);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
