import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { discover: vi.fn() } }));
import type { PlanCardDto } from "@bumpinto/shared";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useDiscoverStore } from "../store/discoverStore";
import DiscoverPage from "./DiscoverPage";

const NOW = new Date("2026-09-09T10:00:00Z"); // Çarşamba
const later: PlanCardDto = { slug: "later", name: "Akşam kahvesi", activityTypes: ["COFFEE"], meetAt: "2026-09-09T16:00:00Z",
  capacity: 4, approvedSeats: 3, confirmed: true, joinPolicy: "APPROVAL", hostDisplayName: "Jonas", locality: "Merkez" };
const live: PlanCardDto = { slug: "live", name: "Öğleden sonra kahve", activityTypes: ["COFFEE"], meetAt: "2026-09-09T09:40:00Z",
  openUntil: "2026-09-09T11:20:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "OPEN",
  hostDisplayName: "Ayşe", locality: "Stratum", minutes: 20, travelMode: "BIKE" };

const renderPage = () => render(<MemoryRouter><DiscoverPage /></MemoryRouter>);

describe("DiscoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Yalnız Date sahte: RTL'nin findBy* yoklaması gerçek zamanlayıcıyla döner.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    useDiscoverStore.getState().reset();
    useAuthStore.setState({ status: "signed", me: { displayName: "M", interests: ["COFFEE"] } as never });
  });
  afterEach(() => vi.useRealTimers());

  it("süren plan üstte, kalan süre + amber damga; kesin plan sarı damga; Buradayım kısayolu", async () => {
    vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later, live] });
    renderPage();
    const cards = await screen.findAllByRole("link", { name: /kahve/i });
    expect(cards[0]).toHaveAttribute("href", "/j/live");
    expect(within(cards[0]).getByText("~1 sa 20 dk daha")).toBeInTheDocument();
    expect(within(cards[0]).getByText("2/4 · şimdi")).toBeInTheDocument();
    expect(within(cards[0]).getByText("sana ~20 dk")).toBeInTheDocument();
    expect(within(cards[1]).getByText("3/4 · kesin")).toBeInTheDocument();
    expect(within(cards[1]).getByText("1 yer")).toBeInTheDocument();
    screen.getAllByRole("link", { name: "Buradayım" }).forEach((a) => expect(a).toHaveAttribute("href", "/sessions/new?now=1"));
  });

  it("Şimdi süzgeci yalnız süren planı bırakır", async () => {
    vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later, live] });
    renderPage();
    await screen.findByText("Akşam kahvesi");
    fireEvent.click(screen.getByRole("radio", { name: "Şimdi" }));
    expect(screen.queryByText("Akşam kahvesi")).toBeNull();
    expect(screen.getByText("Öğleden sonra kahve")).toBeInTheDocument();
  });

  it("Şimdi boşken 'buradayım de' hâli; 'Bu haftanın planlarına bak' süzgeci geri alır", async () => {
    vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
    renderPage();
    await screen.findByText("Akşam kahvesi");
    fireEvent.click(screen.getByRole("radio", { name: "Şimdi" }));
    expect(screen.getByText("Şu an süren plan yok.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Buradayım" }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Bu haftanın planlarına bak" }));
    expect(screen.getByText("Akşam kahvesi")).toBeInTheDocument();
  });

  it("tek türde boş hafta: o türün planını aç; 'Diğer türlere bak' tüm türlerle sorar", async () => {
    vi.mocked(api.discover).mockResolvedValue({ filter: ["SWIM"], plans: [] });
    renderPage();
    expect(await screen.findByText("Bu hafta yüzme planı yok.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yüzme planı aç" })).toHaveAttribute("href", "/sessions/new?open=1&activity=SWIM");
    fireEvent.click(screen.getByRole("button", { name: "Diğer türlere bak" }));
    await vi.waitFor(() => expect(api.discover).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.discover).mock.calls[1][0]?.activity).toHaveLength(15);
  });

  it("kart semt dışında yer bilgisi basmaz; dakika yoksa satır yok; konum profil varsayılanından yuvarlanır", async () => {
    useAuthStore.setState({ status: "signed", me: { displayName: "M", defaultTravelMode: "WALK",
      defaultLocation: { lat: 51.44163, lng: 5.46972, label: "Kleine Berg 12" } } as never });
    vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
    renderPage();
    const card = await screen.findByRole("link", { name: /Akşam kahvesi/ });
    expect(card).toHaveTextContent("Merkez");
    expect(card.textContent).not.toMatch(/sana ~/);
    expect(screen.queryByText(/Kleine Berg/)).toBeNull();
    expect(vi.mocked(api.discover).mock.calls[0][0]).toEqual({ lat: 51.44, lng: 5.47, travelMode: "WALK" });
  });

  it("Keşfet'te tür süzgeci çip grubudur; seçili tür işaretli", async () => {
    vi.mocked(api.discover).mockResolvedValueOnce({ filter: ["COFFEE"], plans: [later] });
    renderPage();
    await screen.findByText("Akşam kahvesi");
    const group = screen.getByRole("group", { name: "Etkinlik türleri" });
    expect(within(group).getByRole("checkbox", { name: "Kahve" })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("checkbox", { name: "Yüzme" })).toHaveAttribute("aria-checked", "false");
  });
});
