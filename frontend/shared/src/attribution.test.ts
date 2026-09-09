import { describe, expect, it } from "vitest";

import { attributionProviders } from "./attribution";

describe("attributionProviders", () => {
  it("FSQ kaynaklı tagline Foursquare atfı ekler — mekan Google'dan gelse bile", () => {
    expect(attributionProviders([{ provider: "google", taglineSource: "FSQ" }]))
      .toEqual(["google", "foursquare"]);
  });

  it("OSM kaynaklı tagline `open` atfına düşer", () => {
    expect(attributionProviders([{ provider: "open", taglineSource: "OSM" }])).toEqual(["open"]);
  });

  it("tagline kaynağı yoksa yalnız sağlayıcı kalır; tekrar ve boş satır elenir", () => {
    expect(attributionProviders([{ provider: "google" }, { provider: "google" }, null, undefined, {}]))
      .toEqual(["google"]);
  });
});
