import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { requestSeat: vi.fn(), mySeat: vi.fn() } }));
vi.mock("../molecules/GoogleSignIn", () => ({ default: () => <div>google-signin</div> }));
vi.mock("../molecules/AppleSignIn", () => ({ default: () => <div>apple-signin</div> }));
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import SeatRequestCard from "./SeatRequestCard";

const notFound = { response: { status: 404, data: { error: "seat request not found" } } };
const renderCard = (props: Partial<Parameters<typeof SeatRequestCard>[0]> = {}) =>
  render(
    <MemoryRouter>
      <SeatRequestCard slug="gp" hostName="Ayşe" joinPolicy="APPROVAL" onSeated={vi.fn()} {...props} />
    </MemoryRouter>,
  );

describe("SeatRequestCard", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "signed", me: { displayName: "Priya", defaultTravelMode: "BIKE",
      defaultLocation: { lat: 51.45, lng: 5.48, label: "Kleine Berg 12" } } as never });
  });

  it("istek gönderir (not + profil konumu, adres ETİKETİ yok) ve bekleme hâline geçer", async () => {
    vi.mocked(api.mySeat).mockRejectedValueOnce(notFound);
    vi.mocked(api.requestSeat).mockResolvedValueOnce({ id: "r1", status: "PENDING" });
    renderCard();
    fireEvent.change(await screen.findByLabelText("Kısa bir not (isteğe bağlı)"), { target: { value: "Yeni geldim" } });
    fireEvent.click(screen.getByRole("button", { name: "Katılmak istiyorum" }));
    expect(await screen.findByText("İsteğin gönderildi")).toBeInTheDocument();
    expect(screen.getByText("Ayşe onaylayınca burası açılır.")).toBeInTheDocument();
    const body = vi.mocked(api.requestSeat).mock.calls[0][1];
    expect(body).toEqual({ displayName: "Priya", note: "Yeni geldim", travelMode: "BIKE", lat: 51.45, lng: 5.48 });
  });

  it("OPEN planda düğme 'Katıl', not 'anında koltuk'; APPROVED yanıtı oturumu açar", async () => {
    vi.mocked(api.mySeat).mockRejectedValueOnce(notFound);
    vi.mocked(api.requestSeat).mockResolvedValueOnce({ id: "r1", status: "APPROVED" });
    const onSeated = vi.fn();
    renderCard({ joinPolicy: "OPEN", onSeated });
    fireEvent.click(await screen.findByRole("button", { name: "Katıl" }));
    expect(screen.getByText("Anında koltuk alırsın, kesin noktayı görürsün.")).toBeInTheDocument();
    await vi.waitFor(() => expect(onSeated).toHaveBeenCalled());
  });

  it("zaten onaylı koltuk → oturumu açar", async () => {
    vi.mocked(api.mySeat).mockResolvedValueOnce({ status: "APPROVED" });
    const onSeated = vi.fn();
    renderCard({ onSeated });
    await vi.waitFor(() => expect(onSeated).toHaveBeenCalled());
  });

  it("plan doluysa 'Plan doldu.' — genel hata değil", async () => {
    vi.mocked(api.mySeat).mockRejectedValueOnce(notFound);
    vi.mocked(api.requestSeat).mockRejectedValueOnce({ response: { status: 409, data: { error: "plan full" } } });
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Katılmak istiyorum" }));
    expect(await screen.findByText("Plan doldu.")).toBeInTheDocument();
  });

  it("reddedilen istek: bilgi + Keşfet'e dönüş (yeniden istek yok)", async () => {
    vi.mocked(api.mySeat).mockResolvedValueOnce({ status: "DECLINED" });
    renderCard();
    expect(await screen.findByText("Bu plan dolmuş ya da uymamış.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keşfet'e dön" })).toHaveAttribute("href", "/kesfet");
    expect(screen.queryByRole("button", { name: "Katılmak istiyorum" })).toBeNull();
  });

  it("bekleme yoklamasında tek ağ hatası isteği 'yok' saymaz — yoklama sürer, onay yakalanır", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(api.mySeat)
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({ status: "APPROVED" });
    const onSeated = vi.fn();
    renderCard({ onSeated });
    expect(await screen.findByText("İsteğin gönderildi")).toBeInTheDocument();
    // `act`: hata sonrası durum güncellemesi ve efekt temizliği iddiadan ÖNCE işlensin (yoksa bayat DOM görülür).
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(api.mySeat).toHaveBeenCalledTimes(2);
    expect(screen.getByText("İsteğin gönderildi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Katılmak istiyorum" })).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(onSeated).toHaveBeenCalled();
  });

  it("anonim ziyaretçiye giriş bloğu; koltuk sorgusu atılmaz (401 çıkış kesicisini tetiklerdi)", () => {
    useAuthStore.setState({ status: "anon", me: null });
    renderCard();
    expect(screen.getByText("google-signin")).toBeInTheDocument();
    expect(api.mySeat).not.toHaveBeenCalled();
  });
});
