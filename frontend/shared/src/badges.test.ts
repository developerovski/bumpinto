import { describe, expect, it } from "vitest";
import { BADGES, badgesFor, newBadges } from "./badges";

describe("badgesFor", () => {
  it("eşikler: 1 / 3 / 10 buluşma, 3 hafta seri", () => {
    expect(badgesFor({ plansMet: 0, metStreakWeeks: 0 })).toEqual([]);
    expect(badgesFor({ plansMet: 1, metStreakWeeks: 1 })).toEqual(["first_met"]);
    expect(badgesFor({ plansMet: 3, metStreakWeeks: 0 })).toEqual(["first_met", "met_3"]);
    expect(badgesFor({ plansMet: 10, metStreakWeeks: 3 })).toEqual(["first_met", "met_3", "met_10", "streak_3"]);
  });
  it("stats yoksa boş", () => expect(badgesFor(undefined)).toEqual([]));
  it("BADGES sırası kazanım sırasıdır", () => expect(BADGES.map((b) => b.id)).toEqual(["first_met", "met_3", "met_10", "streak_3"]));
});

describe("newBadges", () => {
  it("sonradan kazanılanları verir", () => {
    expect(newBadges(["first_met"], ["first_met", "met_3"])).toEqual(["met_3"]);
    expect(newBadges(["first_met"], ["first_met"])).toEqual([]);
  });
});
