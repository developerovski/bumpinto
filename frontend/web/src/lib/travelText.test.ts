import { describe, expect, it } from "vitest";
import { fairnessOf } from "@bumpinto/shared";
import { fairnessLine, initialOf } from "./travelText";
import type { TravelInfo } from "./useTravelLabels";

const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}(${Object.values(o).join(",")})` : key);
const venue = (m: Record<string, number>) => ({
  travel: Object.entries(m).map(([participantId, minutes]) => ({ participantId, minutes })),
});
// TravelInfo anotasyonu şart: anotasyonsuz literal `labels`i dar çıkarır, `anchored` ve
// eksik etiketli dallar tsc'de patlar.
const travel: TravelInfo = { labels: { s: "Sen", k: "Kerem", a: "Ayşe" }, selfId: "s" };
const line = (m: Record<string, number>, tr = travel) => fairnessLine(fairnessOf(venue(m))!, tr, t);

describe("fairnessLine", () => {
  it("fark ≤ 10 dk → yeşil 'Herkese ~aynı' + fark + en uzun yol", () => {
    expect(line({ s: 30, k: 35, a: 25 })).toEqual({
      lead: "fairness.same", leadTone: "grass",
      rest: ["travel.gap(10)", "travel.longestName(Kerem)"],
    });
  });

  it("aykırı kişi varsa lead onu adlandırır, 'en uzun yol' TEKRAR EDİLMEZ", () => {
    expect(line({ s: 20, k: 45, a: 25 })).toEqual({
      lead: "fairness.far(Kerem)", leadTone: "amber", rest: ["travel.gap(25)"],
    });
    expect(line({ s: 45, k: 20, a: 25 }).lead).toBe("fairness.farSelf");
  });

  it("çapalıda lead yok; tek kişide hiçbiri yok; beraberlikte 'en uzun yol' yazılmaz", () => {
    expect(line({ s: 30, k: 35 }, { ...travel, anchored: true }))
      .toEqual({ lead: null, leadTone: null, rest: ["travel.gap(5)", "travel.longestName(Kerem)"] });
    expect(line({ s: 30 }).rest).toEqual([]);
    expect(line({ s: 30, k: 30 }).rest).toEqual(["travel.gap(0)"]);
  });

  it("initialOf ilk harfi locale'e saygılı büyütür; ad yoksa '?'", () => {
    expect([initialOf("ışıl", "tr"), initialOf("Kerem", "tr"), initialOf("", "tr")]).toEqual(["I", "K", "?"]);
  });

  // C3: fark eşiği aşılmış ama aykırı YOK — lead basılmaz, olgu (fark + en uzun) kalır.
  it("fark > 10 ama aykırı yoksa lead basılmaz, olgu kalır", () => {
    expect(line({ s: 40, k: 35, a: 20 })).toEqual({
      lead: null, leadTone: null,
      rest: ["travel.gap(20)", "travel.longestName(Sen)"],
    });
  });

  // C3: aykırı kişinin etiketi yoksa (uydurma ad basılmaz) 'friend' düşümü.
  it("aykırı kişinin adı yoksa lead 'travel.friend'e düşer", () => {
    const { k, ...noK } = travel.labels;
    void k;
    expect(line({ s: 20, k: 45, a: 25 }, { ...travel, labels: noK }).lead).toBe("fairness.far(travel.friend)");
  });
});
