import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VenueBrowser from "./VenueBrowser";

const venues = [
  { id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 34, a: 28 } },
  { id: "v2", name: "Koffie Top Hundred", rating: 4.4, priceLevel: 1, lat: 51.5, lng: 5.4, deckOrder: 1, travelMinutes: { h: 26, a: 35 } },
];
const people = [
  { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.7, lng: 5.3 } },
  { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, approxLocation: { lat: 51.39, lng: 5.71 } },
];

describe("VenueBrowser", () => {
  it("host: satırda 'Bunu seç', ikinci satırın seçimi v2'yi verir", () => {
    const onPick = vi.fn();
    render(<VenueBrowser venues={venues} participants={people} midpoint={{ lat: 51.5, lng: 5.5 }} radiusKm={4}
      mode="host" travelLabels={{ h: "Sen", a: "Ayşe" }} onPick={onPick} />);
    const buttons = screen.getAllByRole("button", { name: "Bunu seç" });
    expect(buttons).toHaveLength(3); // 2 satır + seçili mekanın pop kartı
    fireEvent.click(buttons[1]);
    expect(onPick).toHaveBeenCalledWith("v2");
    // Satır + haritadaki seçili mekan pop kartı aynı bilgiyi gösterir — ilk eşleşme yeterli.
    expect(screen.getAllByText("★ 4.6 · €€")).toHaveLength(2);
  });
  it("davetli: salt okunur, 'Bunu seç' yok", () => {
    render(<VenueBrowser venues={venues} participants={people} midpoint={null} radiusKm={null} mode="guest" travelLabels={{}} onPick={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Bunu seç" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Café Berlage")).toHaveLength(2);
  });
  it("geç gelen veride seçim, mekanlar yüklenince ilk mekana oturur", () => {
    const { rerender } = render(<VenueBrowser venues={[]} participants={people} midpoint={null} radiusKm={null}
      mode="host" travelLabels={{}} onPick={vi.fn()} />);
    rerender(<VenueBrowser venues={venues} participants={people} midpoint={{ lat: 51.5, lng: 5.5 }} radiusKm={4}
      mode="host" travelLabels={{ h: "Sen", a: "Ayşe" }} onPick={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Bunu seç" })).toHaveLength(3);
  });
});
