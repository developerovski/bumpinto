import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig, VenueDto as Venue } from "@bumpinto/shared";
import { resetConfig, useConfigStore } from "../../store/configStore";
import WinnerCard from "./WinnerCard";

const venue: Venue = {
  id: "v1",
  name: "Café Berlage",
  provider: "GOOGLE",
};

// Spec §11 — atıf config'ten gelir.
const CONFIG: AppConfig = {
  mapEngine: "google",
  tiles: { styleUrl: "https://example/style" },
  sources: [{ id: "google", attributionKey: "attribution.google", attributionUrl: null, ratingScale: 5 }],
};

describe("WinnerCard", () => {
  afterEach(() => resetConfig());

  it("sağlayıcı atfı TEK yerde basılır (VenueCard'ın kendi atfı bastırılır)", () => {
    useConfigStore.setState({ config: CONFIG });
    render(<WinnerCard venue={venue} />);
    expect(screen.getAllByText(/Google Maps|Foursquare/)).toHaveLength(1);
  });
});
