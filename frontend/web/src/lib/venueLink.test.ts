import { describe, expect, it } from "vitest";
import type { VenueDto } from "@bumpinto/shared";
import { venueLink, websiteLink } from "./venueLink";

// Sözleşme koruması: plan30 `travel[].estimated`'ı üretti; tip kaybolursa derleme BURADA kırılır.
type EstimatedFlag = NonNullable<NonNullable<VenueDto["travel"]>[number]["estimated"]>;
const _estimatedIsBoolean: EstimatedFlag = true;
void _estimatedIsBoolean;

describe("venueLink", () => {
  it("Maps düğmesi HER ZAMAN yol tarifi adresine gider — placeLink (site) araya girmez", () => {
    expect(venueLink({ mapsUrl: "https://maps/dir/x", placeLink: "https://cafe.example" } as VenueDto))
      .toBe("https://maps/dir/x");
  });

  it("yol tarifi yoksa null — ölü href='#' basılmaz", () => {
    expect(venueLink({})).toBeNull();
    expect(venueLink({ mapsUrl: "" })).toBeNull();
  });
});

describe("websiteLink", () => {
  it("placeLink mekanın sitesidir; boş dize bağlantı sayılmaz", () => {
    expect(websiteLink({ placeLink: "https://cafe.example" })).toBe("https://cafe.example");
    expect(websiteLink({ placeLink: "" })).toBeNull();
    expect(websiteLink({})).toBeNull();
  });
});
