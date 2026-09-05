import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ActivityPicker from "./ActivityPicker";

describe("ActivityPicker", () => {
  it("4 grup başlığı, 15 chip, seçim geri çağrısı", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE"]} onToggle={onToggle} />);
    expect(screen.getByText("Yeme-içme")).toBeInTheDocument();
    expect(screen.getByText("Eğlence")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(15);
    expect(screen.getByRole("checkbox", { name: "Kahve" })).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "Müze" }));
    expect(onToggle).toHaveBeenCalledWith("MUSEUM");
  });

  /** Üç seçiliyken dördüncü TIKLANAMAZ: sınır sessizce yutulmaz, chip devre dışı görünür. */
  it("3 seçiliyken seçilmemiş chip'ler devre dışı kalır", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE", "HIKE", "BAR"]} onToggle={onToggle} />);
    const fourth = screen.getByRole("checkbox", { name: "Müze" });
    expect(fourth).toBeDisabled();
    fireEvent.click(fourth);
    expect(onToggle).not.toHaveBeenCalled();
  });

  /** Sınırdayken SEÇİLİ olanlar tıklanabilir kalır — yoksa seçim kilitlenir, geri alınamaz. */
  it("3 seçiliyken seçili chip kaldırılabilir", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE", "HIKE", "BAR"]} onToggle={onToggle} />);
    const chosen = screen.getByRole("checkbox", { name: "Kahve" });
    expect(chosen).toBeEnabled();
    fireEvent.click(chosen);
    expect(onToggle).toHaveBeenCalledWith("COFFEE");
  });

  /** Profil varsayılanı tekildir: rol de tekil olmalı, ve seçili chip kilitlenmemeli. */
  it("max=1 iken radio rolü kullanır ve seçim değiştirilebilir", () => {
    const onToggle = vi.fn();
    render(<ActivityPicker value={["COFFEE"]} onToggle={onToggle} max={1} />);
    expect(screen.getAllByRole("radio")).toHaveLength(15);
    const other = screen.getByRole("radio", { name: "Müze" });
    expect(other).toBeEnabled();
    fireEvent.click(other);
    expect(onToggle).toHaveBeenCalledWith("MUSEUM");
  });
});
