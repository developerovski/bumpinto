import { describe, expect, it } from "vitest";

import { JOIN_CODE_LENGTH, normalizeJoinCode, parseInvite } from "./joinCode";

describe("joinCode", () => {
  it("kodu kanonikleştirir: büyük harf, boşluk/tire atılır, 5 hane", () => {
    expect(normalizeJoinCode(" x7k2m ")).toBe("X7K2M");
    expect(normalizeJoinCode("x7-k2m")).toBe("X7K2M");
    expect(JOIN_CODE_LENGTH).toBe(5);
  });

  it("karışabilen harf/rakam ve yanlış uzunluk reddedilir", () => {
    expect(normalizeJoinCode("X7K2I")).toBeNull(); // I alfabede yok
    expect(normalizeJoinCode("X7K2O")).toBeNull(); // O alfabede yok
    expect(normalizeJoinCode("ABC")).toBeNull();
    expect(normalizeJoinCode("")).toBeNull();
  });

  it("parseInvite linkten slug, ham girdiden kod çıkarır", () => {
    expect(parseInvite("https://bumpinto.app/j/ab12cd34")).toEqual({ kind: "slug", slug: "ab12cd34" });
    expect(parseInvite("bumpinto://j/ab12cd34/")).toEqual({ kind: "slug", slug: "ab12cd34" });
    expect(parseInvite("x7k2m")).toEqual({ kind: "code", code: "X7K2M" });
    expect(parseInvite("  ")).toBeNull();
    expect(parseInvite("merhaba dünya")).toBeNull();
  });
});
