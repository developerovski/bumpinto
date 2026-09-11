import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store/useSessionLive", () => ({ useSessionLive: () => undefined }));
import { useSessionStore } from "../store/sessionStore";
import SessionPage from "./SessionPage";

const base = { slug: "x", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP", expiresAt: "",
  participants: [
    { id: "h", displayName: "Mehmet", host: true, hasLocation: true, deckDone: false, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } },
    { id: "a", displayName: "Ayşe", host: false, hasLocation: true, deckDone: false, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } },
  ], venues: [{
    id: "v1", name: "Café Berlage", rating: 4.6, priceLevel: 2, lat: 51.44, lng: 5.47, deckOrder: 0,
    travel: [{ participantId: "h", minutes: 34 }, { participantId: "a", minutes: 28 }],
  }],
  runoffVenueIds: [], voteTally: {}, midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4 };

function at(view: object) {
  useSessionStore.setState({ slug: "x", view: view as never, error: null });
  render(<MemoryRouter initialEntries={["/j/x"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
}

/** Üye olmayan görüntüleyen: sunucu 401/403 döndü, elde yalnız kamu önizlemesi var. */
function asOutsider(status: string | null) {
  useSessionStore.setState({
    slug: "x", view: null, error: null, previewSettled: true,
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
    // İki kopya: 1280 başlığı (`DesktopOnly`) + 390 `.cta` (`MobileCta`) — bkz. VenuesPage.
    expect(screen.getAllByRole("button", { name: "Karıştır ve kaydır" }).length).toBeGreaterThan(0);
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
  it("önizleme alınamadıysa (sessiz hata) katılım formu yedeği açılır", () => {
    asOutsider(null);
    expect(screen.getByRole("button", { name: "Katıl" })).toBeInTheDocument();
  });
  /* Görünüm/önizleme yoldayken katılım formu AÇILMAZ: form mount'ta konum izni ister ve açık
     planda yanlış ekrandır (Keşfet kartından gelen her ziyaretçi izin istemiyle karşılaşırdı). */
  it("önizleme yoldayken katılım formu açılmaz, yükleniyor durumu basılır", () => {
    useSessionStore.setState({ slug: "x", view: null, error: null, preview: null, previewSettled: false });
    render(<MemoryRouter initialEntries={["/j/x"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
    expect(screen.queryByRole("textbox", { name: "Adın" })).toBeNull();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });
});

/* W-17 W6: buluşma (pencereli planda pencere) geçince üyeye TEK soru. Yalnız cevap işaretler;
   kapatmak (scrim/Esc) bu açılışlık gizler, bir sonraki açılışta yine sorulur. */
describe("SessionPage — Buluştunuz mu?", () => {
  const planView = { ...base, status: "COLLECTING", viewer: { participantId: "a", host: false },
    openPlan: { meetAt: "2026-09-01T08:00:00Z", capacity: 4, approvedSeats: 3, confirmed: true, meetPassed: true, joinPolicy: "APPROVAL", audience: "PUBLIC" } };
  beforeEach(() => localStorage.clear());

  it("üye + openPlan.meetPassed → alt sayfa açılır", () => {
    at(planView);
    expect(screen.getByRole("dialog", { name: "Buluştunuz mu?" })).toBeInTheDocument();
  });
  it("daha önce cevaplandıysa sorulmaz", () => {
    localStorage.setItem("bumpinto.checkin.x", "1");
    at(planView);
    expect(screen.queryByRole("dialog", { name: "Buluştunuz mu?" })).toBeNull();
  });
  it("buluşma geçmediyse ya da gizli oturumsa sorulmaz", () => {
    at({ ...planView, openPlan: { ...planView.openPlan, meetPassed: false } });
    expect(screen.queryByRole("dialog", { name: "Buluştunuz mu?" })).toBeNull();
  });
});

describe("SessionPage — ses dock'u", () => {
  it("GROUP + host → 'Sesli sohbeti başlat' sayfanın altında", () => {
    at({ ...base, status: "COLLECTING", viewer: { participantId: "h", host: true } });
    expect(screen.getByRole("button", { name: /Sesli sohbeti başlat/ })).toBeInTheDocument();
  });
  it("SOLO → dock yok", () => {
    at({ ...base, status: "COLLECTING", sessionType: "SOLO", viewer: { participantId: "h", host: true } });
    expect(screen.queryByRole("button", { name: /Sesli sohbeti başlat/ })).not.toBeInTheDocument();
  });
  it("BROWSING + host → dock hâlâ görünür (aşama geçişi switch'i değiştirir, dock'u değil)", () => {
    at({ ...base, status: "BROWSING", viewer: { participantId: "h", host: true } });
    // İki kopya: 1280 başlığı (`DesktopOnly`) + 390 `.cta` (`MobileCta`) — bkz. VenuesPage.
    expect(screen.getAllByRole("button", { name: "Karıştır ve kaydır" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Sesli sohbeti başlat/ })).toBeInTheDocument();
  });

  it("EXPIRED + host → dock yok (sayfa hata ekranına düştü)", () => {
    at({ ...base, status: "EXPIRED", viewer: { participantId: "h", host: true } });
    expect(screen.getByText("Bu oturumun süresi dolmuş.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sesli sohbeti başlat/ })).not.toBeInTheDocument();
  });
});
