import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DeckActions from "./DeckActions";
import { ACTION_ICON } from "../../lib/deckActions";

describe("DeckActions", () => {
  // Eski el yapımı CSS glifleri 15 / 20 / 19px çiziyordu; satır dengesiz görünüyordu.
  it("üç ikonu da aynı ölçüde çizer", () => {
    const { container } = render(
      <DeckActions onUndo={() => {}} onPass={() => {}} onLike={() => {}} />,
    );
    const sizes = [...container.querySelectorAll("svg")].map((s) => [
      s.getAttribute("width"),
      s.getAttribute("height"),
    ]);

    expect(sizes).toHaveLength(3);
    expect(sizes).toEqual(sizes.map(() => [String(ACTION_ICON), String(ACTION_ICON)]));
  });

  it("her butonun erişilebilir adı var", () => {
    render(<DeckActions onUndo={() => {}} onPass={() => {}} onLike={() => {}} />);
    expect(screen.getByRole("button", { name: "Geri al" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Geç" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Beğen" })).toBeInTheDocument();
  });
});
