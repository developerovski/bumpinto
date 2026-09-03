import { describe, expect, it } from "vitest";
import { isDeciding } from "./RunoffTrailer";

function venue(id: string, minutesA: number, minutesB: number, rating?: number) {
  return { id, rating, travelMinutes: { a: minutesA, b: minutesB } };
}

describe("isDeciding — sınır davranışları", () => {
  it("tam 5 dk fark (eşik) → karar verici (true)", () => {
    const v1 = venue("v1", 30, 25); // total 55
    const v2 = venue("v2", 35, 25); // total 60 — 60-55=5
    expect(isDeciding(v1, [v1, v2])).toBe(true);
  });

  // NOT: `total` her zaman roundTravel(5'in katı) girdilerin TOPLAMI — yani her zaman 5'in
  // katıdır; iki toplam arasındaki fark da böylece hep 5'in katıdır (gerçek "4 dk" farkı bu
  // yüzden asla üretilemez). En sıkı "eşiğin altı" senaryosu budur: fark 0 (berabere).
  it("0 dk fark (berabere) → karar verici DEĞİL", () => {
    const v1 = venue("v1", 30, 25); // total 55
    const v2 = venue("v2", 30, 25); // total 55
    expect(isDeciding(v1, [v1, v2])).toBe(false);
  });

  // 4.5 - 4.2 IEEE-754'te 0.2999999999999998'dir (< 0.3 ham karşılaştırmada) — epsilon
  // toleransı olmasaydı bu tam-eşik durumu yanlışlıkla false dönerdi.
  it("tam 0.3★ puan farkı (float sınırında) → karar verici (true)", () => {
    const v1 = venue("v1", 30, 25, 4.5);
    const v2 = venue("v2", 30, 25, 4.2);
    expect(isDeciding(v1, [v1, v2])).toBe(true);
  });

  it("0.3★'ın hemen altı (0.29) → karar verici DEĞİL", () => {
    const v1 = venue("v1", 30, 25, 4.5);
    const v2 = venue("v2", 30, 25, 4.21);
    expect(isDeciding(v1, [v1, v2])).toBe(false);
  });

  it("diğer finalistlerde hem yol hem puan verisi eksikse false döner (uydurma kazanan yok)", () => {
    const v1 = venue("v1", 30, 25, 4.5);
    const v2 = { id: "v2", travelMinutes: {} }; // fairnessOf(v2) = null, rating yok
    expect(isDeciding(v1, [v1, v2])).toBe(false);
  });

  it("kendi verisi eksikse (fairnessOf null) false döner", () => {
    const v1 = { id: "v1", travelMinutes: {} };
    const v2 = venue("v2", 30, 25);
    expect(isDeciding(v1, [v1, v2])).toBe(false);
  });

  it("tek finalist (others boş) → false", () => {
    const v1 = venue("v1", 30, 25);
    expect(isDeciding(v1, [v1])).toBe(false);
  });

  it("bazı finalistlerde puan var bazılarında yok — yalnız tanımlı olanlar kıyaslanır", () => {
    const v1 = venue("v1", 30, 25, 4.5);
    const v2 = venue("v2", 30, 25); // rating yok
    const v3 = venue("v3", 30, 25, 4.2); // rating farkı 0.3 → v1 kazanır
    expect(isDeciding(v1, [v1, v2, v3])).toBe(true);
  });
});
