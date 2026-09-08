import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Toggle from "./Toggle";

describe("Toggle", () => {
  it("switch rolü ve aria-checked taşır", () => {
    render(<Toggle checked label="Kullanım verisi" onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Kullanım verisi" })).toHaveAttribute("aria-checked", "true");
  });

  it("tıklanınca tersini bildirir, disabled iken bildirmez", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle checked={false} label="Konum" onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Konum" }));
    expect(onChange).toHaveBeenCalledWith(true);
    rerender(<Toggle checked={false} label="Konum" disabled onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Konum" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
