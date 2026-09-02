import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunoffStatus from "./RunoffStatus";

const people = [
  { id: "p1", displayName: "Mehmet", host: true, hasLocation: true, deckDone: true },
  { id: "p2", displayName: "Ayşe", host: false, hasLocation: true, deckDone: true },
];

describe("RunoffStatus", () => {
  it("kilitleyenleri rozetler, sayacı gösterir, kilit butonu seçime bağlı", () => {
    render(<RunoffStatus participants={people} votedIds={["p2"]} choice={null} sent={false}
      sending={false} onLock={vi.fn()} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Kilitledi")).toBeInTheDocument();
    expect(screen.getByText("Seçiyor…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seçimimi kilitle" })).toBeDisabled();
  });

  it("gönderildiyse kilitli kartı gösterir", () => {
    render(<RunoffStatus participants={people} votedIds={["p1", "p2"]} choice="v" sent
      sending={false} onLock={vi.fn()} />);
    expect(screen.getByText("Seçimin kilitli")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seçimimi kilitle" })).not.toBeInTheDocument();
  });
});
