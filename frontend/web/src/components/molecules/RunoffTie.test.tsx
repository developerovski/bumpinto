import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunoffTie from "./RunoffTie";

describe("RunoffTie", () => {
  it("host: karar ve 'Adil olana bırak' butonlarını gösterir", () => {
    render(
      <RunoffTie
        host
        hostName="Mehmet"
        choice="v1"
        sending={false}
        onDecide={vi.fn()}
        onFair={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Kararı ver" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adil olana bırak" })).toBeInTheDocument();
  });

  it("host olmayan: karar butonlarından hiçbiri görünmez ('Adil olana bırak' dahil)", () => {
    render(
      <RunoffTie
        host={false}
        hostName="Mehmet"
        choice={null}
        sending={false}
        onDecide={vi.fn()}
        onFair={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Kararı ver" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adil olana bırak" })).not.toBeInTheDocument();
  });

  // RunoffStatus'un `everyone`/`tally` dalı `RunoffScreen`'in yönlendirmesinden hiç erişilemiyordu
  // (aynı "herkes oy verdi" kümesi `tie`'ı da true yapıyor) — sayım burada, tek erişilebilir
  // yerde test edilir (code-review bulgusu, "re-point" edilen test).
  it("voteTally doluyken sayım listesi görünür (host ve guest'te aynı)", () => {
    const finalists = [
      { id: "v1", name: "Sofra", travelMinutes: {} },
      { id: "v2", name: "Abed", travelMinutes: {} },
    ];
    render(
      <RunoffTie
        host={false}
        hostName="Mehmet"
        choice={null}
        sending={false}
        onDecide={vi.fn()}
        onFair={vi.fn()}
        tally={{ v1: 2, v2: 0 }}
        finalists={finalists}
      />,
    );
    expect(screen.getByText("Oylar")).toBeInTheDocument();
    expect(screen.getByText("Sofra")).toBeInTheDocument();
  });

  it("tally yokken sayım listesi render edilmez", () => {
    render(
      <RunoffTie
        host
        hostName="Mehmet"
        choice="v1"
        sending={false}
        onDecide={vi.fn()}
        onFair={vi.fn()}
      />,
    );
    expect(screen.queryByText("Oylar")).not.toBeInTheDocument();
  });
});
