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
});
