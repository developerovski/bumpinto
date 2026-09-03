import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectionCard from "./SelectionCard";

const venue = { id: "v1", name: "Adil Kahve", travelMinutes: { h: 30 } };
const travel = { labels: { h: "Sen" }, selfId: "h" };

describe("SelectionCard", () => {
  it("mekan adını ve seyahat çiplerini gösterir", () => {
    render(<SelectionCard venue={venue} travel={travel} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Adil Kahve")).toBeInTheDocument();
    expect(screen.getByText("Seçimin")).toBeInTheDocument();
  });
  it("'Kilitle' onConfirm'i, 'Vazgeç' onCancel'i çağırır", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<SelectionCard venue={venue} travel={travel} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Kilitle" }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
