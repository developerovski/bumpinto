import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import VenuesLoading from "./VenuesLoading";

describe("VenuesLoading", () => {
  it("arama başlığını, kopyayı ve dört iskelet satırı basar", () => {
    render(<VenuesLoading name="Cuma kahvesi" />);
    expect(screen.getByText("Cuma kahvesi")).toBeInTheDocument();
    expect(screen.getByText("mekanlar aranıyor…")).toBeInTheDocument();
    expect(screen.getByText("Çevredeki mekanlar aranıyor")).toBeInTheDocument();
    expect(screen.getAllByTestId("venue-skeleton")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    // Nabız yalnız hareket açıkken (app.css reduced-motion kuralını okunur kılar).
    expect(screen.getAllByTestId("venue-skeleton")[0].querySelector("span")!.className)
      .toContain("motion-safe:animate-pulse");
  });
});
