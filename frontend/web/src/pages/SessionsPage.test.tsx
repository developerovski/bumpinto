import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { listSessions: vi.fn() } }));
import { api } from "../lib/api";
import { OnlineProvider } from "../lib/onlineContext";
import { useSessionsStore } from "../store/sessionsStore";
import SessionsPage from "./SessionsPage";

describe("SessionsPage", () => {
  beforeEach(() => useSessionsStore.getState().reset());

  it("açık ve geçmiş oturumları listeler", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [{ slug: "x", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP",
        status: "SWIPING", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-02T10:00:00Z",
        participantCount: 3, readyCount: 3, doneCount: 2 }],
      past: [{ slug: "y", name: "Öğle molası", activityTypes: ["FOOD"], sessionType: "GROUP",
        status: "EXPIRED", createdAt: "2026-08-02T10:00:00Z", expiresAt: "2026-08-03T10:00:00Z",
        participantCount: 2, readyCount: 2, doneCount: 0 }],
    });
    render(<SessionsPage />);
    expect(await screen.findByText("Cuma kahvesi")).toBeInTheDocument();
    expect(screen.getByText("Öğle molası")).toBeInTheDocument();
    expect(screen.getByText("2/3 bitirdi")).toBeInTheDocument();
    expect(screen.getByText("Doldu")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Desteye git · Cuma kahvesi" })).toHaveAttribute("href", "/j/x");
  });

  /** Adsız oturumun başlığı seçili alanların birleşimidir. */
  it("adsız çok alanlı oturumu birleşik etiketle listeler", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [{ slug: "z", name: undefined, activityTypes: ["COFFEE", "BAR"], sessionType: "GROUP",
        status: "COLLECTING", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-02T10:00:00Z",
        participantCount: 2, readyCount: 1, doneCount: 0 }],
      past: [],
    });
    render(<SessionsPage />);
    expect(await screen.findByRole("heading", { name: "Kahve ve Bar" })).toBeInTheDocument();
  });

  /** Eskiden `if (!loaded) return null` idi: üst çubuğun altı GET dönene dek bomboştu. */
  it("liste gelene dek başlığı çizip iskelet gösterir", async () => {
    let resolve: (v: Awaited<ReturnType<typeof api.listSessions>>) => void = () => {};
    vi.mocked(api.listSessions).mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<SessionsPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText("Henüz buluşma yok")).not.toBeInTheDocument();
    resolve({ open: [], past: [] });
    expect(await screen.findByText("Henüz buluşma yok")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  /** Artboard W10b: ağ yokken liste SON GÖRÜLEN halidir — soluklaşır, kurma eylemi kilitlenir. */
  it("çevrimdışı: gövde soluklaşır, 'Yeni buluşma kur' devre dışı düğmeye döner", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [{ slug: "x", name: "Cuma kahvesi", activityTypes: ["COFFEE"], sessionType: "GROUP",
        status: "SWIPING", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-02T10:00:00Z",
        participantCount: 3, readyCount: 3, doneCount: 2 }],
      past: [],
    });
    render(
      <OnlineProvider value={{ online: false, lastOnlineAt: Date.now() }}>
        <SessionsPage />
      </OnlineProvider>,
    );
    const card = await screen.findByText("Cuma kahvesi");
    expect(card.closest("div.opacity-60")).not.toBeNull();
    const ctas = screen.getAllByRole("button", { name: /Yeni buluşma kur/ });
    expect(ctas).toHaveLength(2); // başlık + mobil CTA
    for (const b of ctas) expect(b).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Yeni buluşma kur/ })).not.toBeInTheDocument();
  });

  it("boş durum", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({ open: [], past: [] });
    render(<SessionsPage />);
    expect(await screen.findByText("Henüz buluşma yok")).toBeInTheDocument();
  });

  it("listSessions reddedilince hata + tekrar dene gösterir", async () => {
    vi.mocked(api.listSessions).mockRejectedValueOnce(new Error("network"));
    render(<SessionsPage />);
    expect(await screen.findByText("Buluşmalar yüklenemedi — tekrar dene.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tekrar dene" })).toBeInTheDocument();
  });

  /** Geçmişte karar çıkmamış ve adsız oturum: `decidedVenueName` de `name` de yok — satır
      başlıksız kalıyordu (ekranda "?" karosu + yalnız tarih). Açık karttaki kuralın aynısı. */
  it("adsız geçmiş satırı etkinlik etiketiyle başlıklanır", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [],
      past: [{ slug: "q", name: undefined, activityTypes: ["MUSEUM", "WALK"], sessionType: "GROUP",
        status: "EXPIRED", createdAt: "2026-09-06T10:00:00Z", expiresAt: "2026-09-07T10:00:00Z",
        participantCount: 2, readyCount: 2, doneCount: 0 }],
    });
    render(<SessionsPage />);
    expect(await screen.findByRole("heading", { name: "Müze ve Yürüyüş" })).toBeInTheDocument();
    expect(screen.getByText(/karar çıkmadı/)).toBeInTheDocument();
  });

  /** Sunucu geçmişi 20 satırda kestiyse not bunu söyler — eksik satır sessizce yutulmaz. */
  it("geçmiş kesildiyse saklama notu kaç satır gösterildiğini yazar", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [],
      past: [{ slug: "p1", name: "Kahve", activityTypes: ["COFFEE"], sessionType: "GROUP",
        status: "DECIDED", createdAt: "2026-09-06T10:00:00Z", expiresAt: "2026-09-07T10:00:00Z",
        participantCount: 2, readyCount: 2, doneCount: 0, decidedVenueName: "Café Berlage" }],
      pastTruncated: true,
    });
    render(<SessionsPage />);
    expect(await screen.findByText(/Son 1 buluşma gösteriliyor/)).toBeInTheDocument();
  });
});
