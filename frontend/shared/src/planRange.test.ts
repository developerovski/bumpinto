import { describe, expect, it } from "vitest";
import { formatDuration, inRange, isInProgress, meetAtOptions, remainingMinutes, sortPlans } from "./planRange";

const NOW = new Date("2026-09-09T10:00:00Z"); // Çarşamba
const plan = (meetAt: string, openUntil?: string) => ({ slug: meetAt, meetAt, openUntil });

describe("inRange", () => {
  it("now: yalnız süren pencereli plan", () => {
    expect(inRange(plan("2026-09-09T09:30:00Z", "2026-09-09T11:00:00Z"), "now", NOW)).toBe(true);
    expect(inRange(plan("2026-09-09T11:00:00Z", "2026-09-09T13:00:00Z"), "now", NOW)).toBe(false); // henüz başlamadı
    expect(inRange(plan("2026-09-10T09:00:00Z"), "now", NOW)).toBe(false); // noktasal
  });
  it("week: 7 gün içinde; weekend: Cmt/Paz; all: hepsi", () => {
    expect(inRange(plan("2026-09-12T09:00:00Z"), "week", NOW)).toBe(true);
    expect(inRange(plan("2026-09-17T09:00:00Z"), "week", NOW)).toBe(false);
    expect(inRange(plan("2026-09-12T09:00:00Z"), "weekend", NOW)).toBe(true); // Cumartesi
    expect(inRange(plan("2026-09-11T09:00:00Z"), "weekend", NOW)).toBe(false); // Cuma
    expect(inRange(plan("2026-09-30T09:00:00Z"), "all", NOW)).toBe(true);
  });
});

describe("isInProgress", () => {
  it("pencere sonu HARİÇ (sunucunun inProgress kuralı)", () => {
    expect(isInProgress(plan("2026-09-09T09:00:00Z", "2026-09-09T10:00:00Z"), NOW)).toBe(false);
    expect(isInProgress(plan("2026-09-09T10:00:00Z", "2026-09-09T11:00:00Z"), NOW)).toBe(true);
  });
});

describe("remainingMinutes", () => {
  it("5 dk'ya yuvarlar, geçmişte 0", () => {
    expect(remainingMinutes("2026-09-09T11:23:00Z", NOW)).toBe(85);
    expect(remainingMinutes("2026-09-09T09:00:00Z", NOW)).toBe(0);
  });
});

describe("meetAtOptions", () => {
  it("6 gün içindeki plan gün adıyla yeter; ötesinde gün+ay eklenir (Keşfet penceresi 14 gün — 'Cmt' iki hafta sonunu da gösterir)", () => {
    expect(meetAtOptions(new Date("2026-09-12T08:00:00Z"), NOW, "short")).toEqual({ weekday: "short", hour: "2-digit", minute: "2-digit" });
    expect(meetAtOptions(new Date("2026-09-19T08:00:00Z"), NOW, "long")).toEqual(
      { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  });
});

describe("formatDuration", () => {
  const t = (key: string, o?: Record<string, unknown>) => `${key}:${JSON.stringify(o)}`;
  it("saat+dakika, yalnız saat, yalnız dakika — birim metni çevirinin", () => {
    expect(formatDuration(80, t)).toBe('duration.hm:{"h":1,"m":20}');
    expect(formatDuration(120, t)).toBe('duration.h:{"h":2}');
    expect(formatDuration(45, t)).toBe('duration.m:{"m":45}');
    expect(formatDuration(0, t)).toBe('duration.m:{"m":0}');
  });
});

describe("sortPlans", () => {
  it("sürenler önce, sonra meetAt artan; girdi değişmez", () => {
    const list = [plan("2026-09-10T09:00:00Z"), plan("2026-09-09T09:30:00Z", "2026-09-09T11:00:00Z"), plan("2026-09-09T12:00:00Z")];
    expect(sortPlans(list, NOW).map((p) => p.meetAt)).toEqual([
      "2026-09-09T09:30:00Z", "2026-09-09T12:00:00Z", "2026-09-10T09:00:00Z",
    ]);
    expect(list[0].meetAt).toBe("2026-09-10T09:00:00Z");
  });
});
