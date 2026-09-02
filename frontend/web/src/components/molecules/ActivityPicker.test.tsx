import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPicker from "./ActivityPicker";

describe("ActivityPicker", () => {
  it("4 grup başlığı, 15 chip, seçim geri çağrısı", () => {
    const onChange = vi.fn();
    render(<ActivityPicker value="COFFEE" onChange={onChange} />);
    expect(screen.getByText("Yeme-içme")).toBeInTheDocument();
    expect(screen.getByText("Eğlence")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    expect(screen.getByRole("radio", { name: "Bowling" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Kahve" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Müze" }));
    expect(onChange).toHaveBeenCalledWith("MUSEUM");
  });
});
