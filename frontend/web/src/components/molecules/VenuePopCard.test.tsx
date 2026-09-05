import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenuePopCard from "./VenuePopCard";

const venue = {
  id: "v1",
  name: "Café Berlage",
  lat: 52.36,
  lng: 4.9,
  placeLink: "https://maps/place/berlage",
} as never;

describe("VenuePopCard", () => {
  it("Google Haritalar bağlantısını basar — pini tıklayan zaten inceleme modunda", () => {
    render(<VenuePopCard venue={venue} tint={0} travel={{ labels: {} }} />);
    const link = screen.getByRole("link", { name: "Google Maps'te aç" });
    expect(link).toHaveAttribute("href", "https://maps/place/berlage");
    expect(link).toHaveAttribute("target", "_blank");
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
});
