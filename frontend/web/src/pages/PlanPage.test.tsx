import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store/useSessionLive", () => ({ useSessionLive: () => undefined }));
vi.mock("../lib/api", () => ({ api: { mySeat: vi.fn(), requestSeat: vi.fn() } }));
vi.mock("../components/molecules/GoogleSignIn", () => ({ default: () => <div>google-signin</div> }));
vi.mock("../components/molecules/AppleSignIn", () => ({ default: () => <div>apple-signin</div> }));
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useSessionStore } from "../store/sessionStore";
import SessionPage from "./SessionPage";

const plan = { meetAt: "2026-09-13T08:00:00Z", capacity: 4, approvedSeats: 3, confirmed: true, meetPassed: false,
  inProgress: false, joinPolicy: "APPROVAL", audience: "PUBLIC" };
const preview = { slug: "gp", name: "Genneper Parken sabah yürüyüşü", activityTypes: ["HIKE"], sessionType: "GROUP",
  status: "COLLECTING", hostDisplayName: "Ayşe", participantCount: 3,
  participants: [{ displayName: "Ayşe", host: true }, { displayName: "Jonas" }, { displayName: "Priya" }], openPlan: plan };

function outsider(p: object) {
  useSessionStore.setState({ slug: "gp", view: null, error: null, previewSettled: true, preview: p as never });
  render(<MemoryRouter initialEntries={["/j/gp"]}><Routes><Route path="/j/:slug" element={<SessionPage />} /></Routes></MemoryRouter>);
}

describe("SessionPage — açık plan detayı (P2/P2a)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.mySeat).mockRejectedValue({ response: { status: 404, data: { error: "seat request not found" } } });
    useAuthStore.setState({ status: "signed", me: { displayName: "Priya", interests: ["HIKE", "COFFEE"] } as never });
  });
  afterEach(() => vi.useRealTimers());

  it("açık plan önizlemesi → plan detayı + koltuk isteği; davet katılım formu YOK", async () => {
    outsider(preview);
    expect(screen.getByRole("heading", { level: 1, name: "Genneper Parken sabah yürüyüşü" })).toBeInTheDocument();
    expect(screen.getByText("3/4 · kesinleşti")).toBeInTheDocument();
    expect(screen.getByText("ilgi alanına uyuyor: doğa yürüyüşü")).toBeInTheDocument();
    expect(screen.getByText("Ayşe · açtı")).toBeInTheDocument();
    expect(screen.getByText("1 yer boş — seninki olabilir")).toBeInTheDocument();
    expect(screen.getByText("kesin buluşma noktası onaylanınca görünür")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Katılmak istiyorum" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Adın" })).toBeNull();
  });

  it("süren OPEN planda amber damga, 'şimdi · ~… daha' + başlangıç saati ve OPEN güven metni", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-09T10:00:00Z"));
    outsider({ ...preview, name: "Öğleden sonra kahve", activityTypes: ["COFFEE"],
      openPlan: { ...plan, meetAt: "2026-09-09T09:40:00Z", openUntil: "2026-09-09T11:20:00Z", approvedSeats: 2,
        confirmed: false, inProgress: true, joinPolicy: "OPEN" } });
    expect(screen.getByText("2/4 · şimdi")).toBeInTheDocument();
    expect(screen.getByText("şimdi · ~1 sa 20 dk daha")).toBeInTheDocument();
    expect(screen.getByText("başladı 09:40")).toBeInTheDocument();
    expect(screen.getByText(/koltuk alan kesin noktayı görür/)).toBeInTheDocument();
    expect(screen.queryByText(/host katılımı onaylar/)).toBeNull();
    expect(screen.getByText("kesin buluşma noktası katılınca görünür")).toBeInTheDocument();
  });

  it("Kimse (NONE) kitleli plan da detay + koltuk isteğiyle açılır — link keşif yetkisidir, koltuk değil", () => {
    outsider({ ...preview, openPlan: { ...plan, audience: "NONE" } });
    expect(screen.queryByRole("textbox", { name: "Adın" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Genneper Parken sabah yürüyüşü" })).toBeInTheDocument();
  });
});
