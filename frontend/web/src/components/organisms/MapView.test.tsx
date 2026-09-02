import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MapView from "./MapView";

describe("MapView", () => {
  it("anahtar yokken yapılandırma notu ve erişilebilir özet gösterir", () => {
    render(
      <MapView
        participants={[{ id: "p1", displayName: "Mehmet", host: true, hasLocation: true,
          deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } }]}
        venues={[]}
        midpoint={null}
        radiusKm={null}
        caption="Orta nokta"
      />,
    );
    expect(screen.getByText(/harita bu ortamda yapılandırılmadı/i)).toBeInTheDocument();
    expect(screen.getByText(/Mehmet · Den Bosch/)).toBeInTheDocument(); // ekran okuyucu özeti
    expect(screen.getByText("Orta nokta")).toBeInTheDocument(); // caption kapsülü anahtarsız da görünür
  });
});
