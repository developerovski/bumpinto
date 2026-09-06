import { describe, expect, it } from "vitest";
import type { VenueDto } from "@bumpinto/shared";
import { venueLink } from "./venueLink";

// Sözleşme koruması: plan30 `travel[].estimated`'ı üretti; tip kaybolursa derleme BURADA kırılır.
type EstimatedFlag = NonNullable<NonNullable<VenueDto["travel"]>[number]["estimated"]>;
const _estimatedIsBoolean: EstimatedFlag = true;
void _estimatedIsBoolean;

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

  it("mapsUrl (koordinat tabanlı yol tarifi) placeLink yokken aynen geçer; ikisi de yoksa null", () => {
    expect(venueLink({ mapsUrl: "https://maps/dir/coords" })).toBe("https://maps/dir/coords");
    expect(venueLink({})).toBeNull();
  });
});
