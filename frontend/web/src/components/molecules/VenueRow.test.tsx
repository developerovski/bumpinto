/* UI review — "her tıklanabilir alan cursor: pointer göstermeli" (app.css @layer base).
   jsdom hesaplanmış stili uygulamaz, bu yüzden imleç kuralının KENDİSİ burada doğrulanamaz —
   bu test yalnız satırın CSS seçicisinin ("[role=\"button\"]:not([aria-disabled=\"true\"])")
   eşleştiği yapıyı taşıdığını (role="button", devre dışı değil) doğrular. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VenueRow from "./VenueRow";

const venue = { id: "v1", name: "Adil Kahve", rating: 4.2, priceLevel: 2, deckOrder: 0 };
const travel = { labels: { h: "Sen" }, selfId: "h" };

describe("VenueRow", () => {
  it("role=\"button\" taşır ve aria-disabled değildir (global cursor: pointer kuralı eşleşir)", () => {
    render(
      <VenueRow
        venue={venue}
        selected={false}
        tint={0}
        travel={travel}
        onHover={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    const row = screen.getByRole("button", { name: /Adil Kahve/ });
    expect(row).toHaveAttribute("role", "button");
    expect(row).not.toHaveAttribute("aria-disabled", "true");
  });

  /** Karisik destede liste satiri hangi alandan geldigini SOYLER (liste-once ekran). */
  it("karışık destede aktivite rozeti basar", () => {
    render(
      <VenueRow
        venue={{ ...venue, activityType: "HIKE" }}
        selected={false}
        tint={0}
        travel={travel}
        mixedDeck
        onHover={vi.fn()}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
  });

  /** Atif cozulemediyse rozet UYDURULMAZ; tek alanli destede de basilmaz. */
  it("atıfsız mekânda ve tek alanlı destede rozet basmaz", () => {
    const { rerender } = render(
      <VenueRow venue={venue} selected={false} tint={0} travel={travel} mixedDeck
        onHover={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText("Doğa yürüyüşü")).not.toBeInTheDocument();

    rerender(
      <VenueRow venue={{ ...venue, activityType: "HIKE" }} selected={false} tint={0}
        travel={travel} onHover={vi.fn()} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText("Doğa yürüyüşü")).not.toBeInTheDocument();
  });
});
