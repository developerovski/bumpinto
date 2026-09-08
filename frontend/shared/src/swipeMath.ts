/** Deste kaydırma geometrisi — saf; SwipeCard ve VenueDeck tek kaynaktan okur (plan 14). */
export type SwipeDir = "left" | "right";

export const DRAG_START_PX = 8;
export const SWIPE_THRESHOLD_PX = 120;
export const FLING_VELOCITY = 0.5; // px/ms
export const MAX_ROTATE_DEG = 16;
export const VERTICAL_DAMP = 0.3;
const ROTATE_DIVISOR = 18;

export function swipeThreshold(cardWidth: number): number {
  return cardWidth > 0 ? Math.min(SWIPE_THRESHOLD_PX, cardWidth * 0.35) : SWIPE_THRESHOLD_PX;
}

export function dragRotation(dx: number): number {
  return Math.max(-MAX_ROTATE_DEG, Math.min(MAX_ROTATE_DEG, dx / ROTATE_DIVISOR));
}

export function dragProgress(dx: number, threshold: number): number {
  return Math.min(1, Math.abs(dx) / threshold);
}

export function releaseDecision(dx: number, vx: number, threshold: number): SwipeDir | null {
  const dir: SwipeDir = dx < 0 ? "left" : "right";
  if (Math.abs(dx) >= threshold) return dir;
  const flung = Math.abs(vx) >= FLING_VELOCITY && Math.sign(vx) === Math.sign(dx);
  return flung ? dir : null;
}
