import { describe, expect, it } from "vitest";
import { venueLink } from "./venueLink";

describe("venueLink", () => {
  it("mekanın kendi sayfası varsa onu döner — 'detay' isteği yorum/fotoğraf demek", () => {
    expect(venueLink({ placeLink: "https://maps/place/x", mapsUrl: "https://maps/dir/x" }))
      .toBe("https://maps/place/x");
  });

  it("kendi sayfası yoksa yol tarifi adresine düşer", () => {
    expect(venueLink({ mapsUrl: "https://maps/dir/x" })).toBe("https://maps/dir/x");
  });

  it("ikisi de yoksa null — ölü href='#' basılmaz", () => {
    expect(venueLink({})).toBeNull();
  });

  it("boş dize bağlantı sayılmaz", () => {
    expect(venueLink({ placeLink: "", mapsUrl: "https://maps/dir/x" }))
      .toBe("https://maps/dir/x");
  });
});
