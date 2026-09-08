/* Plan 14 · Deste jesti — artboard'da çizilmedi; damga dili DS token'larından türetildi. */
import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  DRAG_START_PX,
  VERTICAL_DAMP,
  dragProgress,
  dragRotation,
  releaseDecision,
  swipeThreshold,
  type SwipeDir,
} from "../../lib/swipeMath";

export type SwipeFrom = { dx: number; dy: number; rot: number };
/** Kartın sahneye giriş hareketi: geri al'da gittiği yönden, buton/klavye kararında arkadan. */
export type SwipeEnter = SwipeDir | "rise" | null;

const ENTER = {
  left: "animate-fly-in-left",
  right: "animate-fly-in-right",
  rise: "animate-rise",
};
const SNAP = "transform 0.45s var(--ease-snap)";
// 4 ms altı örnekler kare-altı gürültüdür; hız yalnız gerçek kare aralıklarından okunur.
const MIN_SAMPLE_MS = 4;
// Son hareketten bu kadar süre sonra bırakılırsa parmak durmuştur — fırlatma sayılmaz.
const STALE_VELOCITY_MS = 80;

// Artboard `.stamp` (v3, 492-494): 22px üstten, 3px kenarlık, 10px köşe, 26px/1 başlık puntosu,
// .06em harf aralığı, %70 beyaz zemin. Renk KENARLIK + METİN'dir, dolgu değil: gradyan dolgulu
// eski damga karttaki fotoğrafı yutuyordu. z-4 — `.stamp` kart içeriğinin ve `.pdots`in üstünde.
const STAMP =
  "pointer-events-none absolute top-[1.375rem] z-4 rounded-[0.625rem] border-[3px] px-3.5 py-1.5 " +
  "font-head text-[1.625rem] font-extrabold uppercase leading-none tracking-[0.06em] " +
  "bg-white/70 opacity-0";
const STAMP_LIKE = `${STAMP} left-[1.125rem] -rotate-[14deg] border-grass text-grass`;
const STAMP_PASS = `${STAMP} right-[1.125rem] rotate-12 border-flame-deep text-flame-deep`;

type Drag = { id: number; x0: number; y0: number; lastX: number; lastT: number; vx: number; active: boolean };

/** Sürüklenebilir kart sarmalayıcısı: sağ = beğen, sol = geç; eşik altında yerine döner.
    Sıcak yolda React state yok — transform ve damga opaklıkları DOM'a doğrudan yazılır. */
export default function SwipeCard(props: {
  onSwipe: (dir: SwipeDir, from: SwipeFrom) => void;
  /** 0..1 — arka kartın öne gelmesi için (VenueDeck `--swipe-p`). */
  onProgress?: (p: number) => void;
  enter?: SwipeEnter;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const likeStamp = useRef<HTMLSpanElement>(null);
  const passStamp = useRef<HTMLSpanElement>(null);
  const drag = useRef<Drag | null>(null);

  function paint(dx: number, dy: number, transition: string) {
    const el = root.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = dx || dy ? `translate(${dx}px, ${dy}px) rotate(${dragRotation(dx)}deg)` : "";
    const p = dragProgress(dx, swipeThreshold(el.offsetWidth));
    if (likeStamp.current) likeStamp.current.style.opacity = dx > 0 ? String(p) : "0";
    if (passStamp.current) passStamp.current.style.opacity = dx < 0 ? String(p) : "0";
    props.onProgress?.(p);
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    // Süren giriş animasyonu satır-içi transform'u ezer; sürükleme başlarken kesilir.
    e.currentTarget.style.animation = "none";
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      lastT: performance.now(),
      vx: 0,
      active: false,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.active) {
      if (Math.abs(dx) < DRAG_START_PX) return;
      d.active = true;
    }
    const now = performance.now();
    const dt = now - d.lastT;
    if (dt >= MIN_SAMPLE_MS) {
      d.vx = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastT = now;
    }
    paint(dx, (e.clientY - d.y0) * VERTICAL_DAMP, "none");
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    const dx = e.clientX - d.x0;
    const dy = (e.clientY - d.y0) * VERTICAL_DAMP;
    const vx = performance.now() - d.lastT > STALE_VELOCITY_MS ? 0 : d.vx;
    const dir = releaseDecision(dx, vx, swipeThreshold(root.current?.offsetWidth ?? 0));
    if (dir) props.onSwipe(dir, { dx, dy, rot: dragRotation(dx) });
    else paint(0, 0, SNAP);
  }

  function onCancel(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    paint(0, 0, SNAP);
  }

  return (
    <div
      ref={root}
      className={[
        "relative touch-pan-y select-none cursor-grab active:cursor-grabbing will-change-transform",
        props.enter ? ENTER[props.enter] : null,
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      {props.children}
      <span ref={likeStamp} className={STAMP_LIKE} aria-hidden>
        {t("deck.like")}
      </span>
      <span ref={passStamp} className={STAMP_PASS} aria-hidden>
        {t("deck.pass")}
      </span>
    </div>
  );
}
