import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { seatRequests: vi.fn(), approveSeat: vi.fn(), declineSeat: vi.fn() } }));
vi.mock("../molecules/GoogleSignIn", () => ({ default: () => <div>google-signin</div> }));
vi.mock("../molecules/AppleSignIn", () => ({ default: () => <div>apple-signin</div> }));
import type { SeatRequestListResponse } from "@bumpinto/shared";
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useSeatRequestsStore } from "../../store/seatRequestsStore";
import { useToastStore } from "../../store/toastStore";
import SeatRequestsPanel from "./SeatRequestsPanel";

const view = { slug: "gp", name: "Genneper", status: "COLLECTING", viewer: { participantId: "h", host: true },
  openPlan: { meetAt: "2026-09-13T08:00:00Z", capacity: 4, approvedSeats: 2, confirmed: false, joinPolicy: "APPROVAL", audience: "PUBLIC" } };
const list: SeatRequestListResponse = { approvedSeats: 2, capacity: 4, confirmed: false, requests: [
  { id: "r1", displayName: "Tomás", locality: "Gestel", travelMode: "BIKE", note: "Yeni geldim", status: "PENDING", createdAt: "2026-09-08T10:00:00Z", interests: ["HIKE", "GAMES"] },
  { id: "r0", displayName: "Priya", locality: "Woensel", status: "APPROVED", createdAt: "2026-09-08T09:00:00Z", interests: [] },
] };

describe("SeatRequestsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSeatRequestsStore.getState().reset();
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({ status: "signed", me: { displayName: "Ayşe" } as never });
  });

  it("başka planın listesi bu planda BASILMAZ (depo plana bağlı)", async () => {
    useSeatRequestsStore.setState({ slug: "other", list });
    vi.mocked(api.seatRequests).mockReturnValueOnce(new Promise(() => {}) as never);
    render(<SeatRequestsPanel view={view as never} />);
    expect(screen.queryByText("Tomás")).toBeNull();
    expect(api.seatRequests).toHaveBeenCalledWith("gp");
  });

  it("hesap oturumu olmayan host: hesap ucuna gidilmez (401 çıkış kesicisi), giriş istenir", () => {
    useAuthStore.setState({ status: "anon", me: null });
    render(<SeatRequestsPanel view={view as never} />);
    expect(api.seatRequests).not.toHaveBeenCalled();
    expect(screen.getByText("google-signin")).toBeInTheDocument();
  });

  it("Onayla / Geç düğmeleri isteyen kişiye bağlı (ekran okuyucu kimi onayladığını duyar)", async () => {
    vi.mocked(api.seatRequests).mockResolvedValueOnce(list);
    render(<SeatRequestsPanel view={view as never} />);
    expect(await screen.findByRole("button", { name: "Onayla", description: "Tomás" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Geç", description: "Tomás" })).toBeInTheDocument();
  });

  it("bekleyeni onaylar; üçüncü koltukta 'kesinleşti!' damgası basılır, Onayla kalkar", async () => {
    vi.mocked(api.seatRequests).mockResolvedValueOnce(list);
    vi.mocked(api.approveSeat).mockResolvedValueOnce({ ...list, approvedSeats: 3, confirmed: true,
      requests: list.requests!.map((r) => ({ ...r, status: "APPROVED" as const })) });
    render(<SeatRequestsPanel view={view as never} />);
    expect(await screen.findByText("1 yeni")).toBeInTheDocument();
    expect(screen.getByText("“Yeni geldim”")).toBeInTheDocument();
    expect(screen.getByText("doğa yürüyüşü, oyun · Gestel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    expect(await screen.findByText("3/4 · kesinleşti!")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Onayla" })).toBeNull();
    expect(api.approveSeat).toHaveBeenCalledWith("gp", "r1");
  });

  it("geçilen istek listeden düşer (sunucu DECLINED satırını döndürmeye devam eder)", async () => {
    vi.mocked(api.seatRequests).mockResolvedValueOnce(list);
    vi.mocked(api.declineSeat).mockResolvedValueOnce({ ...list,
      requests: list.requests!.map((r) => (r.id === "r1" ? { ...r, status: "DECLINED" as const } : r)) });
    render(<SeatRequestsPanel view={view as never} />);
    fireEvent.click(await screen.findByRole("button", { name: "Geç" }));
    await vi.waitFor(() => expect(screen.queryByText("Tomás")).toBeNull());
    expect(screen.getByText("Priya")).toBeInTheDocument();
  });

  it("dolu planda onay 409 'plan full' → 'Plan doldu.' bildirimi", async () => {
    vi.mocked(api.seatRequests).mockResolvedValueOnce(list);
    vi.mocked(api.approveSeat).mockRejectedValueOnce({ response: { status: 409, data: { error: "plan full" } } });
    render(<SeatRequestsPanel view={view as never} />);
    fireEvent.click(await screen.findByRole("button", { name: "Onayla" }));
    await vi.waitFor(() => expect(useToastStore.getState().toasts.map((t) => t.messageKey)).toContain("seat.errFull"));
  });
});
