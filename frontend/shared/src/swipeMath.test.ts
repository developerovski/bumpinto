import { describe, expect, it } from "vitest";
import {
  MAX_ROTATE_DEG,
  SWIPE_THRESHOLD_PX,
  dragProgress,
  dragRotation,
  releaseDecision,
  swipeThreshold,
} from "./swipeMath";

describe("swipeMath", () => {
  it("eşik kart genişliğinin %35'i, en çok 120px; genişlik bilinmiyorsa 120", () => {
    expect(swipeThreshold(0)).toBe(SWIPE_THRESHOLD_PX);
    expect(swipeThreshold(300)).toBe(105);
    expect(swipeThreshold(1000)).toBe(SWIPE_THRESHOLD_PX);
  });

  it("dönüş dx ile orantılı, ±16° ile kesilir", () => {
    expect(dragRotation(90)).toBe(5);
    expect(dragRotation(-1000)).toBe(-MAX_ROTATE_DEG);
    expect(dragRotation(0)).toBe(0);
  });

  it("ilerleme eşiğe göre 0..1 arasında", () => {
    expect(dragProgress(60, 120)).toBe(0.5);
    expect(dragProgress(-400, 120)).toBe(1);
  });

  it("eşik aşımı ve fırlatma karar sayılır; kısa sürükleme geri döner", () => {
    expect(releaseDecision(130, 0, 120)).toBe("right");
    expect(releaseDecision(-130, 0, 120)).toBe("left");
    expect(releaseDecision(40, 0.9, 120)).toBe("right");
    expect(releaseDecision(-40, -0.9, 120)).toBe("left");
    expect(releaseDecision(40, 0, 120)).toBeNull();
    // Fırlatma yalnız sürükleme yönüyle uyumluysa: sağa sürüklerken sola hızlanma karar değil.
    expect(releaseDecision(40, -0.9, 120)).toBeNull();
  });
});
