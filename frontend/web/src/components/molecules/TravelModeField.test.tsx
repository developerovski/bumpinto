import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TravelModeField from "./TravelModeField";

describe("TravelModeField", () => {
  it("5 seçenek, varsayılan Arabayla, seçim geri çağrısı", () => {
    const onChange = vi.fn();
    render(<TravelModeField value="CAR" onChange={onChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "Arabayla" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Bisikletle" }));
    expect(onChange).toHaveBeenCalledWith("BIKE");
  });

  it("özel etiket radiogroup'a geçer", () => {
    render(<TravelModeField value="WALK" onChange={vi.fn()} label="Ayşe nasıl geliyor?" />);
    expect(screen.getByRole("radiogroup", { name: "Ayşe nasıl geliyor?" })).toBeInTheDocument();
  });

  it("hideLabel: erişilebilir ad kalır ama görünür metin basılmaz", () => {
    render(<TravelModeField value="WALK" onChange={vi.fn()} label="Ayşe nasıl geliyor?" hideLabel />);
    expect(screen.getByRole("radiogroup", { name: "Ayşe nasıl geliyor?" })).toBeInTheDocument();
    expect(screen.queryByText("Ayşe nasıl geliyor?")).not.toBeInTheDocument();
  });

  it("390 ikon-yalnız varyant: seçili modu adlandıran altyazı basılır", () => {
    render(<TravelModeField value="BIKE" onChange={vi.fn()} />);
    expect(screen.getByText("Bisikletle seçili")).toBeInTheDocument();
  });

  it("hideLabel'de altyazı tekrar basılmaz (satır zaten adı taşır)", () => {
    render(<TravelModeField value="BIKE" onChange={vi.fn()} label="Ayşe nasıl geliyor?" hideLabel />);
    expect(screen.queryByText("Bisikletle seçili")).not.toBeInTheDocument();
  });
});
