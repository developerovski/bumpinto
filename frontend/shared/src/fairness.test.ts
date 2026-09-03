import { describe, expect, it } from "vitest";
import { byFairness, byRating, fairnessOf, roundTravel } from "./fairness";

const v = (id: string, tm: Record<string, number>, rating?: number, deckOrder = 0) =>
  ({ id, name: id, rating, deckOrder, travelMinutes: tm });

describe("fairness", () => {
  it("5 dk bandına yuvarlar, tabanı 5 dk'da tutar", () => {
    expect(roundTravel(28)).toBe(30);
    expect(roundTravel(32)).toBe(30);
    expect(roundTravel(1)).toBe(5);
    expect(roundTravel(0)).toBe(5);
  });

  it("en uzun önce sıralar; max/min/fark ve en uzun kişiyi verir", () => {
    const f = fairnessOf(v("a", { p1: 30, p2: 25, p3: 35 }))!;
    expect(f.entries.map((e) => e.id)).toEqual(["p3", "p1", "p2"]);
    expect(f.max).toBe(35);
    expect(f.min).toBe(25);
    expect(f.spread).toBe(10);
    expect(f.longestId).toBe("p3");
    expect(f.outlierId).toBeNull(); // 35 − medyan(30) = 5 < 10
  });

  it("medyanı ≥10 dk aşan kişiyi aykırı işaretler (karar dokümanı §4.2 B örneği)", () => {
    const f = fairnessOf(v("b", { p1: 10, p2: 15, p3: 50 }))!;
    expect(f.outlierId).toBe("p3");
    expect(f.spread).toBe(40);
  });

  it("sunucu alanı varsa istemci hesabını ezer (B-7:T1)", () => {
    const f = fairnessOf({
      ...v("c", { p1: 30, p2: 40 }),
      fairness: { maxMinutes: 45, spreadMinutes: 5, longestParticipantId: "p1" },
    })!;
    expect(f.max).toBe(45);
    expect(f.spread).toBe(5);
    expect(f.longestId).toBe("p1");
  });

  it("sunucu yalnız maxMinutes gönderirse spread tamamen istemciden hesaplanır (kaynak karışmaz)", () => {
    // Client: p1 30, p2 40 → client max 40, min 30, client spread 10.
    // Sunucu maxMinutes=45 gönderiyor ama spreadMinutes YOK — spread 45−30=15 OLMAMALI
    // (hibrit), istemci kaynağından 40−30=10 OLMALI.
    const f = fairnessOf({
      ...v("e", { p1: 30, p2: 40 }),
      fairness: { maxMinutes: 45 },
    })!;
    expect(f.max).toBe(45);
    expect(f.spread).toBe(10);
  });

  it("travelMinutes boşsa null", () => {
    expect(fairnessOf(v("d", {}))).toBeNull();
  });

  it("travelMinutes boş ama sunucu fairness alanı varsa — entries boş, max/spread/longestId sunucudan, total=max (WhyHere fold)", () => {
    const f = fairnessOf({
      ...v("f", {}),
      fairness: { maxMinutes: 35, spreadMinutes: 8, longestParticipantId: "p9" },
    })!;
    expect(f).not.toBeNull();
    expect(f.entries).toEqual([]);
    expect(f.max).toBe(35);
    expect(f.min).toBe(27);
    expect(f.spread).toBe(8);
    expect(f.longestId).toBe("p9");
    expect(f.outlierId).toBeNull();
    expect(f.total).toBe(35);
  });

  it("travelMinutes boş + sunucu spreadMinutes yoksa spread 0, min=max", () => {
    const f = fairnessOf({ ...v("g", {}), fairness: { maxMinutes: 20 } })!;
    expect(f.spread).toBe(0);
    expect(f.min).toBe(20);
    expect(f.longestId).toBe("");
  });

  it("adil sıra: en uzun yol artan, sonra fark artan", () => {
    const a = v("a", { p1: 30, p2: 25, p3: 35 }); // max 35, fark 10
    const b = v("b", { p1: 10, p2: 15, p3: 50 }); // max 50
    const c = v("c", { p1: 40, p2: 40, p3: 40 }); // max 40, fark 0
    expect([b, c, a].sort(byFairness).map((x) => x.id)).toEqual(["a", "c", "b"]);
  });

  it("puan sırası: puan azalan, puansız sona", () => {
    const a = v("a", { p1: 10 }, 4.2);
    const b = v("b", { p1: 10 }, 4.6);
    const c = v("c", { p1: 10 });
    expect([a, c, b].sort(byRating).map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
});
