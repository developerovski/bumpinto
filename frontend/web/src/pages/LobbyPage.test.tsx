import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/geocode", () => ({ geocode: vi.fn(), reverseGeocode: vi.fn() }));

import { geocode } from "../lib/geocode";
import { useAuthStore } from "../store/authStore";
import { useSeatRequestsStore } from "../store/seatRequestsStore";
import { useSessionStore } from "../store/sessionStore";
import LobbyPage from "./LobbyPage";

const base = { slug: "x7k2m", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP", status: "COLLECTING", venues: [], midpoint: { lat: 51.5, lng: 5.5 }, radiusKm: 4.4, viewer: { participantId: "h", host: true } } as const;
const host = { id: "h", displayName: "Mehmet", host: true, hasLocation: true, manual: false, locationLabel: "Den Bosch", approxLocation: { lat: 51.7, lng: 5.3 } };
const kerem = { id: "k", displayName: "Kerem", host: false, hasLocation: false, manual: false };
const ayse = { id: "a", displayName: "Ayşe", host: false, hasLocation: true, manual: false, locationLabel: "Someren", approxLocation: { lat: 51.39, lng: 5.71 } };
// CTA açık görünüm (2 konum) — iskelet testi düğmenin tıklanabilir olmasını gerektiriyor.
const ready = { ...base, participants: [host, ayse] };

describe("LobbyPage", () => {
  it("açık planda host katılım istekleri panelini görür; gizli oturumda panel yok", () => {
    const load = vi.fn();
    useSeatRequestsStore.setState({ load, list: null });
    useAuthStore.setState({ status: "signed", me: { displayName: "Mehmet" } as never });
    const view = { ...base, participants: [host, ayse],
      openPlan: { meetAt: "2026-09-13T08:00:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "APPROVAL", audience: "PUBLIC" } };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    const { unmount } = render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("heading", { name: "Katılmak isteyenler" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith("x7k2m");
    unmount();
    render(<LobbyPage view={{ ...base, participants: [host, ayse] } as never} />);
    expect(screen.queryByRole("heading", { name: "Katılmak isteyenler" })).toBeNull();
  });

  it("1 konum: CTA kapalı, davet linki ve geç kalan notu", () => {
    const view = { ...base, participants: [host, kerem] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeDisabled();
    expect(screen.getByText(/\/j\/x7k2m/)).toBeInTheDocument();
    expect(screen.getByText(/Kerem yetişemezse/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orta nokta" })).toBeInTheDocument();
    expect(screen.getByText("≤ 4 km")).toBeInTheDocument();
  });
  it("2 konum: CTA açık", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });
  /** Lobi seçili alanların HEPSİNİ gösterir ve vaat cümlesini çoğullar. */
  it("üç ilgi alanını rozet ve cümle olarak basar", () => {
    const view = { ...base, activityTypes: ["COFFEE", "HIKE", "BAR"], participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByText("Kahve")).toBeInTheDocument();
    expect(screen.getByText("Doğa yürüyüşü")).toBeInTheDocument();
    expect(screen.getByText("Bar")).toBeInTheDocument();
    expect(screen.getByText(/Kahve, Doğa yürüyüşü ve Bar için buluşuyoruz/)).toBeInTheDocument();
  });

  it("lg: harita ghost'a basmadan mount edilir ve kalan yüksekliği doldurur", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("min-width: 1024px"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const view = { ...base, participants: [host, ayse] };
      useSessionStore.setState({ slug: "x7k2m", view: view as never });
      render(<LobbyPage view={view as never} />);
      const map = await screen.findByTestId("mapview");
      expect(screen.queryByRole("button", { name: "Haritada gör" })).not.toBeInTheDocument();
      /* Sabit `lg:h-[calc(100dvh-14rem)]` masaüstünde ~290px taşma bırakıyordu: kabuk 224px
         değil ~511px. Ölçü artık kabuktan gelir — haritada sabit lg yüksekliği YASAK. */
      expect(map.className).toContain("fit:h-full");
      expect(map.className).not.toMatch(/lg:h-\[/);
      expect(screen.getByRole("main")).toHaveAttribute("data-fit");
      expect(screen.getByTestId("zone-left").className).toContain("fit:overflow-y-auto");
      expect(screen.getByTestId("zone-right").className).toContain("fit:overflow-y-auto");
    } finally {
      window.matchMedia = original;
    }
  });

  /** 390'da harita yok; onu açan düğme artboard 1198'e göre orta nokta kartının içindeki
      40px ikon düğmesi ("Haritada gör") — kart altındaki tam genişlikli düğme kaldırıldı. */
  it("390: harita mount edilmez, orta nokta kartındaki 'Haritada gör' düğmesi görünür", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.queryByTestId("mapview")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Haritada gör" })).toBeInTheDocument();
  });

  /** Davet kartı v3: mono link + oturum kodu + ikon-only kopyala + "Paylaş". Kod SUNUCUDAN
      gelir (`SessionView.joinCode`) — yoksa uydurulmaz, satır yalnız "hesap gerekmez" der. */
  it("davet kartı oturum kodunu ve Paylaş düğmesini basar; kod yoksa uydurmaz", () => {
    const view = { ...base, joinCode: "X7K2M", participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    const { unmount } = render(<LobbyPage view={view as never} />);
    expect(screen.getByText("X7K2M").parentElement).toHaveTextContent("kod X7K2M · hesap gerekmez");
    expect(screen.getByRole("button", { name: "Kopyala" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Paylaş/ })).toBeInTheDocument();
    unmount();

    const noCode = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: noCode as never });
    render(<LobbyPage view={noCode as never} />);
    expect(screen.queryByText(/^kod /)).not.toBeInTheDocument();
    expect(screen.getByText("hesap gerekmez")).toBeInTheDocument();
  });

  /** B-10 çapalı oturumda `find-venues` önkoşulunu kaldırdı (DeckFlow.findVenues artık
      SessionCenter.of null mı diye bakar ve çapa varsa asla null olmaz). Kapı bunu bilmezse
      oturum COLLECTING'de kilitli kalır: backend kabul eder, düğme basılamaz. */
  it("çapalı oturumda hiç konum olmasa da CTA açık", () => {
    const view = { ...base, anchored: true, participants: [kerem] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByRole("button", { name: "Mekanları bul" })).toBeEnabled();
  });

  /** Çapalıda merkez host'un seçtiği sabit noktadır: kimsenin konumu GEREKMEZ. Sayaç, satır
      metni, rozet ve notlar bunu dürüstçe söylemeli — konumsuz host "bekleyen" değildir
      (artboard W3d 3993/4013–4022/4029/4046). */
  it("çapalı oturumda konumsuz host hazır sayılır: 1 / 1, 'gerekmiyor', çapa notları", () => {
    const hostNoLoc = { id: "h", displayName: "Mehmet", host: true, hasLocation: false, manual: false };
    const view = { ...base, anchored: true, participants: [hostNoLoc] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByText("1 / 1 hazır")).toBeInTheDocument();
    expect(screen.getByText("Konum vermedin · gerekmiyor")).toBeInTheDocument();
    expect(screen.getByText("Hazır")).toBeInTheDocument();
    expect(screen.getByText("buluşma yeri belli")).toBeInTheDocument();
    expect(screen.getByText(/Davetliler konum vermeden de katılabilir/)).toBeInTheDocument();
    expect(screen.getByText("Çapalı buluşmada tek başına da arayabilirsin.")).toBeInTheDocument();
    // "Mehmet yetişemezse sonradan katılır" — kendi kendini bekleyen host YOK.
    expect(screen.queryByText(/yetişemezse/)).not.toBeInTheDocument();
  });

  it("çapasız lobide durum rozeti ve gizlilik notu değişmez", () => {
    const view = { ...base, participants: [host, ayse] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never });
    render(<LobbyPage view={view as never} />);
    expect(screen.getByText("konumlar toplanıyor")).toBeInTheDocument();
    expect(screen.getByText(/~1 km yuvarlanarak/)).toBeInTheDocument();
  });

  it("'Mekanları bul' basılınca istek sürerken iskelet gösterilir", async () => {
    let resolve!: () => void;
    const findVenues = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    useSessionStore.setState({ findVenues } as never);
    render(<LobbyPage view={ready as never} />);
    fireEvent.click(screen.getByRole("button", { name: "Mekanları bul" }));
    expect(await screen.findByText("mekanlar aranıyor…")).toBeInTheDocument();
    await act(async () => { resolve(); });
  });

  /** REGRESYON (2026-09-09): konum değiştirme yüzeyi YALNIZ Bekle ekranında (konumsuz davetli)
      vardı; host oturum kurulduktan sonra konumunu hiçbir yerden düzeltemiyordu. Ankara'da
      çapalı buluşma kuran host "'s-Hertogenbosch · ~2695 dk" satırında kilitli kalıyordu. */
  it("host kendi konumunu lobiden değiştirebilir", async () => {
    const updateLocation = vi.fn().mockResolvedValue(undefined);
    vi.mocked(geocode).mockResolvedValue({ lat: 39.9208, lng: 32.8541, label: "Ankara" });
    const view = { ...base, anchored: true, participants: [host] };
    useSessionStore.setState({ slug: "x7k2m", view: view as never, updateLocation } as never);
    render(<LobbyPage view={view as never} />);

    fireEvent.click(screen.getByRole("button", { name: /Konumumu değiştir/ }));
    fireEvent.change(screen.getByLabelText("Şehir ya da adres"), { target: { value: "Ankara" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

    await waitFor(() =>
      expect(updateLocation).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 39.9208, lng: 32.8541, label: "Ankara" }),
      ),
    );
  });
});
