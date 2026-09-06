import { describe, expect, it } from "vitest";
import { formatRating, providerMark } from "./format";

// Test dili tr (setup i18n varsayılanı) — virgüllü ondalık.
describe("formatRating", () => {
  it("ölçek verilince '<puan> / <ölçek>' yazar, ölçek DÖNÜŞTÜRÜLMEZ", () => {
    expect(formatRating(8.7, 10)).toBe("8,7 / 10");
    expect(formatRating(4.25, 5)).toBe("4,3 / 5");
    expect(formatRating(9, 10)).toBe("9,0 / 10");
  });

  it("ölçek yoksa yalnız puan yazar", () => {
    expect(formatRating(4.5, null)).toBe("4,5");
  });
});

describe("providerMark", () => {
  it("sağlayıcı kimliğini büyük harfle başlatıp döner (küçük/büyük harf fark etmez)", () => {
    expect(providerMark("foursquare")).toBe("Foursquare");
    expect(providerMark("FOURSQUARE")).toBe("Foursquare");
  });

  it("'open' ve boş/tanımsız için null döner", () => {
    expect(providerMark("open")).toBeNull();
    expect(providerMark(undefined)).toBeNull();
    expect(providerMark("")).toBeNull();
  });
});
