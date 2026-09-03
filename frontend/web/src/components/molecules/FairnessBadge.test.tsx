import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FairnessBadge from "./FairnessBadge";

const labels = { p1: "Sen", p2: "Ayşe", p3: "Kerem" };

describe("FairnessBadge", () => {
  it("fark ≤ 10 dk → 'Herkese ~aynı'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 30, p2: 25, p3: 35 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Herkese ~aynı")).toBeInTheDocument();
  });

  it("medyanı ≥10 aşan başkası → '{{ad}} için uzak' (ad ek almaz)", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 10, p2: 15, p3: 50 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Kerem için uzak")).toBeInTheDocument();
  });

  it("aykırı viewer ise 'Senin için uzak'", () => {
    render(<FairnessBadge venue={{ travelMinutes: { p1: 50, p2: 15, p3: 10 } }} travel={{ labels, selfId: "p1" }} />);
    expect(screen.getByText("Senin için uzak")).toBeInTheDocument();
  });

  it("tek katılımcıda rozet yok", () => {
    const { container } = render(
      <FairnessBadge venue={{ travelMinutes: { p1: 30 } }} travel={{ labels, selfId: "p1" }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
