import { describe, expect, it } from "vitest";

import { ogImageUrl } from "./og";

describe("ogImageUrl", () => {
  it("sözleşme yolunu üretir ve sondaki bölüyü tekilleştirir", () => {
    expect(ogImageUrl("https://bumpinto.app", "x7k2m")).toBe("https://bumpinto.app/og/x7k2m.png");
    expect(ogImageUrl("https://bumpinto.app/", "x7k2m")).toBe("https://bumpinto.app/og/x7k2m.png");
  });

  it("taban ya da slug boşsa null", () => {
    expect(ogImageUrl("", "x7k2m")).toBeNull();
    expect(ogImageUrl("https://bumpinto.app", "")).toBeNull();
  });
});
