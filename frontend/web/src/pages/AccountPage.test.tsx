import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({
  api: { me: vi.fn(), putConsents: vi.fn(), exportMyData: vi.fn(), logout: vi.fn() },
}));

import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import AccountPage from "./AccountPage";

const me = (analytics: boolean) => ({
  id: "u1", email: "m@x.test", displayName: "Mehmet", authProviders: ["GOOGLE"],
  consents: { location: true, microphone: false, analytics },
  stats: { sessionsHosted: 2, friendsMet: 5 },
});

function at(analytics = false) {
  useAuthStore.setState({ status: "signed", me: me(analytics) as never });
  return render(<MemoryRouter><AccountPage /></MemoryRouter>);
}

describe("AccountPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dört blok, kimlik kartı ve doğru rotalar", () => {
    at();
    expect(screen.getByRole("heading", { level: 1, name: "Hesap ve veriler" })).toBeInTheDocument();
    ["Yasal", "Veri", "Hakkında", "Tehlikeli bölge"].forEach((s) =>
      expect(screen.getAllByText(s).length).toBeGreaterThan(0));
    expect(screen.getByText(/m@x\.test/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gizlilik politikası/ })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: /Veri hakların/ })).toHaveAttribute("href", "/data-rights");
    expect(screen.getByRole("link", { name: /Açık rıza tercihlerin/ })).toHaveAttribute("href", "/account/consent");
    expect(screen.getByRole("link", { name: /Hesabı sil/ })).toHaveAttribute("href", "/account/delete");
  });

  /* Artboard 4762–4767: `Hakkında` kartı iki satır taşır ve atıf satırı destekten ÖNCE gelir. */
  it("Hakkında kartı atıf sayfasına ve desteğe götürür", () => {
    at();
    const about = screen.getByRole("list", { name: "Hakkında" });
    const links = within(about).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/attributions", "/support"]);
    expect(links[0]).toHaveAccessibleName(/Atıflar ve lisanslar/);
  });

  it("anahtar sunucudaki rızayı yansıtır ve açılınca üç alanla yazılır", async () => {
    vi.mocked(api.putConsents).mockResolvedValue(undefined);
    vi.mocked(api.me).mockResolvedValue(me(true) as never);
    at(false);
    const sw = screen.getByRole("switch", { name: "Kullanım verisi paylaş" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    await waitFor(() =>
      expect(api.putConsents).toHaveBeenCalledWith({ location: true, microphone: false, analytics: true }));
  });

  it("yazma düşerse anahtar geri alınır ve hata basılır", async () => {
    vi.mocked(api.putConsents).mockRejectedValue(new Error("net"));
    at(false);
    fireEvent.click(screen.getByRole("switch", { name: "Kullanım verisi paylaş" }));
    expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Kullanım verisi paylaş" })).toHaveAttribute("aria-checked", "false");
  });

  it("verilerimi indir ucu çağrılır", async () => {
    vi.mocked(api.exportMyData).mockResolvedValue(new Blob(["{}"], { type: "application/json" }));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    at();
    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/ }));
    await waitFor(() => expect(api.exportMyData).toHaveBeenCalled());
  });

  it("429 dönerse saatlik sınır mesajı", async () => {
    vi.mocked(api.exportMyData).mockRejectedValue({ response: { status: 429 } });
    at();
    fireEvent.click(screen.getByRole("button", { name: /Verilerimi indir/ }));
    expect(await screen.findByText(/Saatte bir kez indirilebilir/)).toBeInTheDocument();
  });
});
