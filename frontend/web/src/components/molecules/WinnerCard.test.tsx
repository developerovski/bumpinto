import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VenueDto as Venue } from "@bumpinto/shared";
import WinnerCard from "./WinnerCard";

const venue: Venue = {
  id: "v1",
  name: "Café Berlage",
  provider: "GOOGLE",
};

describe("WinnerCard", () => {
  it("sağlayıcı atfı TEK yerde basılır (VenueCard'ın kendi atfı bastırılır)", () => {
    render(<WinnerCard venue={venue} />);
    expect(screen.getAllByText(/Google Maps|Foursquare/)).toHaveLength(1);
  });
});
