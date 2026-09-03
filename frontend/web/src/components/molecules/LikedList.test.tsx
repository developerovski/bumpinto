import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LikedList from "./LikedList";

describe("LikedList", () => {
  it("yalnız beğenilen mekanları listeler ve sayar", () => {
    render(
      <LikedList
        venues={[
          { id: "a", name: "Café Berlage", rating: 4.6, travelMinutes: {} },
          { id: "b", name: "Koffie Top", rating: 4.4, travelMinutes: {} },
        ]}
        liked={{ a: true, b: false }}
      />,
    );
    expect(screen.getByText("1 mekan")).toBeInTheDocument();
    expect(screen.getByText("Café Berlage")).toBeInTheDocument();
    expect(screen.queryByText("Koffie Top")).not.toBeInTheDocument();
  });

  // Eskiden VenueCard photoOnly kullanılıyordu: yüksekliği %100 olduğu için satırda
  // 0px'e çöküyor, beğenilen mekanın görseli hiç görünmüyordu.
  it("beğenilen mekanın görselini gösterir", () => {
    render(
      <LikedList
        venues={[{ id: "a", name: "Café Berlage", photoUrl: "https://lh3/x" }]}
        liked={{ a: true }}
      />,
    );
    expect(screen.getByRole("presentation", { hidden: true })).toHaveAttribute(
      "src",
      "https://lh3/x",
    );
  });

  it("fotoğrafsız mekanda monogram gösterir", () => {
    render(
      <LikedList venues={[{ id: "a", name: "Café Berlage" }]} liked={{ a: true }} />,
    );
    expect(screen.getByText("cb")).toBeInTheDocument();
  });

  // Regresyon: DeckScreen deste modunda `travel` geçmeyi unutmuştu — viewer kendi çipinde
  // "Arkadaşın" düşüyordu, "Sen" değil (bkz. DeckScreen.tsx satır 112).
  it("travel geçildiğinde viewer'ın kendi çipi 'Sen' der, 'Arkadaşın' düşmez", () => {
    render(
      <LikedList
        venues={[{ id: "a", name: "Café Berlage", travelMinutes: { p1: 10, p2: 20 } }]}
        liked={{ a: true }}
        travel={{ labels: { p1: "Sen", p2: "Ayşe" }, selfId: "p1" }}
      />,
    );
    expect(screen.getByText("Sen")).toBeInTheDocument();
    expect(screen.queryByText("Arkadaşın")).not.toBeInTheDocument();
  });
});
