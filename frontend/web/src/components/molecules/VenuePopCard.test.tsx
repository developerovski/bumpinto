import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenuePopCard from "./VenuePopCard";

const venue = {
  id: "v1",
  name: "Café Berlage",
  lat: 52.36,
  lng: 4.9,
  mapsUrl: "https://maps/dir/berlage",
  placeLink: "https://cafe-berlage.example",
} as never;

describe("VenuePopCard", () => {
  it("Google Haritalar bağlantısını basar — pini tıklayan zaten inceleme modunda", () => {
    render(<VenuePopCard venue={venue} tint={0} travel={{ labels: {} }} />);
    const link = screen.getByRole("link", { name: "Google Maps'te aç" });
    // Maps düğmesi yol tarifine gider; mekanın sitesi (placeLink) AYRI bağlantıdır (2026-09-06 hatası).
    expect(link).toHaveAttribute("href", "https://maps/dir/berlage");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Web sitesi" })).toHaveAttribute("href", "https://cafe-berlage.example");
  });

  it("action yuvası doluyken de bağlantı durur — ikisi aynı yeri paylaşmıyor", () => {
    render(
      <VenuePopCard
        venue={venue}
        tint={0}
        travel={{ labels: {} }}
        action={<button type="button">Kilitle</button>}
      />,
    );
    expect(screen.getByRole("link", { name: "Google Maps'te aç" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kilitle" })).toBeInTheDocument();
  });

  it("bağlantı yoksa hiç link basılmaz — ölü href üretilmez", () => {
    render(<VenuePopCard venue={{ id: "v2", name: "X" } as never} tint={0} travel={{ labels: {} }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Kod incelemesi: VenueMeta artık hoursToday'i kendi satırında basıyor (R-W8); VenuePopCard'ın
  // kendi ayrı satırı aynı metni İKİNCİ kez basıyordu ("Bugün 08:00–18:00" iki kez görünüyordu).
  it("bugünün saati TEK kez basılır", () => {
    render(
      <VenuePopCard
        venue={{ id: "v1", name: "Café Berlage", hoursToday: "08:00 – 18:00" } as never}
        tint={0}
        travel={{ labels: {} }}
      />,
    );
    expect(screen.getAllByText(/Bugün 08:00/)).toHaveLength(1);
  });
});
