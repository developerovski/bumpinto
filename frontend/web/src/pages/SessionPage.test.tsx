import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../store/useSessionLive", () => ({ useSessionLive: () => undefined }));
import { useSessionStore } from "../store/sessionStore";
import SessionPage from "./SessionPage";

const base = { slug: "x", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP", expiresAt: "",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } },
  ], venues: [{ id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0, travelMinutes: { h: 34, a: 28 } }],
  runoffVenueIds: [], voteTally: {}, midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4 };

function at(view: object) {
  useSessionStore.setState({ slug: "x", view: view as never, error: null });
  render(<MemoryRouter initialEntries={["/j/x"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
}

/** Üye olmayan görüntüleyen: sunucu 401/403 döndü, elde yalnız kamu önizlemesi var. */
function asOutsider(status: string | null) {
  useSessionStore.setState({
    slug: "x", view: null, error: null,
    preview: status === null ? null : ({ slug: "x", status, participants: [] } as never),
  });
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

/* Kapanmış buluşmanın linki: katılım formu ÇIKMAZ SOKAKTI — gönderilince 409 dönüyordu.
   Durum kamu önizlemesinden okunur; nerede buluşulduğu bu ekranda yazmaz (link yayılmış olabilir). */
describe("SessionPage — kapanmış buluşma linki", () => {
  it("DECIDED → katılım formu değil kapanış ekranı", () => {
    asOutsider("DECIDED");
    expect(screen.getByText("Bu buluşma karara bağlandı.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Katıl" })).not.toBeInTheDocument();
  });
  it("EXPIRED → süresi doldu ekranı", () => {
    asOutsider("EXPIRED");
    expect(screen.getByText("Bu oturumun süresi dolmuş.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Katıl" })).not.toBeInTheDocument();
  });
  it("açık oturum → katılım formu", () => {
    asOutsider("COLLECTING");
    expect(screen.getByRole("button", { name: "Katıl" })).toBeInTheDocument();
  });
  it("önizleme henüz gelmediyse katılım formu (bugünkü davranış korunur)", () => {
    asOutsider(null);
    expect(screen.getByRole("button", { name: "Katıl" })).toBeInTheDocument();
  });
});
