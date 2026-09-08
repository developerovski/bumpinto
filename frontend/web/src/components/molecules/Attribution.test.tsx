import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import Attribution from "./Attribution";

function config(mapEngine: AppConfig["mapEngine"]): AppConfig {
  return {
    mapEngine,
    tiles: { styleUrl: "https://example/style" },
    sources: [
      { id: "foursquare", attributionKey: "attribution.foursquare", attributionUrl: "https://foursquare.com", ratingScale: 10 },
      { id: "open", attributionKey: "attribution.open", attributionUrl: "https://www.openstreetmap.org/copyright", ratingScale: null },
    ],
  };
}

describe("Attribution", () => {
  afterEach(() => resetConfig());

  it("ekrandaki sağlayıcı kümesi kadar satır basar, büyük harf de eşleşir", () => {
    useConfigStore.setState({ config: config("google") });
    render(<Attribution providers={["FOURSQUARE", "open", "foursquare"]} />);
    expect(screen.getAllByText("Powered by Foursquare")).toHaveLength(1);
    expect(screen.getByText(/Overture Maps Foundation/)).toBeInTheDocument();
    expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  });

  it("bağlantısız kaynak düz metin (span) olarak basılır", () => {
    useConfigStore.setState({
      config: {
        ...config("maplibre"),
        sources: [{ id: "wiki", attributionKey: "attribution.wikimedia", attributionUrl: null, ratingScale: null }],
      },
    });
    render(<Attribution providers={["wiki"]} />);
    expect(screen.getByText("Fotoğraf: Wikimedia Commons").tagName).toBe("SPAN");
  });

  it("bilinmeyen sağlayıcı ve config yokken sessiz", () => {
    useConfigStore.setState({ config: config("google") });
    const { container } = render(<Attribution providers={["yelp"]} />);
    expect(container).toBeEmptyDOMElement();

    resetConfig();
    const { container: container2 } = render(<Attribution providers={["foursquare"]} />);
    expect(container2).toBeEmptyDOMElement();
  });
});
