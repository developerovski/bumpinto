import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../store/useSessionLive", () => ({ useSessionLive: () => undefined }));
import { useSessionStore } from "../store/sessionStore";
import SessionPage from "./SessionPage";

const base = { slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP", expiresAt: "",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } },
  ], venues: [{ id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 34, a: 28 } }],
  runoffVenueIds: [], voteTally: {}, midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4 };

function at(view: object) {
  useSessionStore.setState({ slug: "x", view: view as never, error: null });
  render(<MemoryRouter initialEntries={["/j/x"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
}

describe("SessionPage yönlendirme", () => {
  it("COLLECTING + host → Lobi", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "h", host: true } });
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeInTheDocument();
  });
  it("COLLECTING + davetli → Bekle", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "a", host: false } });
    expect(screen.getByText("Mekanlar geliyor")).toBeInTheDocument();
  });
  it("COLLECTING + SOLO host → konum düzenleme", () => {
    at({ ...base, status: "COLLECTING", sessionType: "SOLO", viewer: { participantId: "h", host: true } });
    expect(screen.getByText("Konumlar")).toBeInTheDocument();
  });
  it("BROWSING + host → Mekanlar (Karıştır)", () => {
    at({ ...base, status: "BROWSING", viewer: { participantId: "h", host: true } });
    expect(screen.getByRole("button", { name: "Karıştır ve kaydır" })).toBeInTheDocument();
  });
  it("BROWSING + davetli → salt okunur rozet", () => {
    at({ ...base, status: "BROWSING", viewer: { participantId: "a", host: false } });
    expect(screen.getByText("host karıştırınca deste açılır")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bunu seç" })).not.toBeInTheDocument();
  });
});
