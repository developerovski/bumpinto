import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { listSessions: vi.fn() } }));
import { api } from "../lib/api";
import { useSessionsStore } from "../store/sessionsStore";
import SessionsPage from "./SessionsPage";

describe("SessionsPage", () => {
  beforeEach(() => useSessionsStore.getState().reset());

  it("açık ve geçmiş oturumları listeler", async () => {
    vi.mocked(api.listSessions).mockResolvedValueOnce({
      open: [{ slug: "x", name: "Cuma kahvesi", activityType: "COFFEE", sessionType: "GROUP",
        status: "SWIPING", createdAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-02T10:00:00Z",
        participantCount: 3, readyCount: 3, doneCount: 2 }],
      past: [{ slug: "y", name: "Öğle molası", activityType: "FOOD", sessionType: "GROUP",
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
});
