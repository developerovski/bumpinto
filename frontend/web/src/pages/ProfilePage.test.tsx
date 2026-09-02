import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ api: { updateMe: vi.fn(), logout: vi.fn() } }));
import { api } from "../lib/api";
import i18n from "../i18n";
import { useAuthStore } from "../store/authStore";
import ProfilePage from "./ProfilePage";

const me = { id: "u1", email: "m@x.test", displayName: "Mehmet Şerefoğlu", language: "tr",
  defaultLocation: { lat: 51.69, lng: 5.3, label: "'s-Hertogenbosch" }, defaultActivity: "COFFEE" as const,
  stats: { sessionsHosted: 12, friendsMet: 31 } };

describe("ProfilePage", () => {
  afterEach(async () => { await i18n.changeLanguage("tr"); });

  it("kimlik, istatistik ve tercihleri gösterir; dil seçimi tam tercih setiyle sunucuya yazar", async () => {
    useAuthStore.setState({ status: "signed", me });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, language: "en" });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText("m@x.test", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("'s-Hertogenbosch")).toBeInTheDocument();
    expect(screen.getAllByText("Kahve").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Dil/ }));
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ language: "en", displayName: "Mehmet Şerefoğlu", defaultActivity: "COFFEE" })));
  });

  it("varsayılan etkinliği düzenler ve kaydeder", async () => {
    useAuthStore.setState({ status: "signed", me });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, defaultActivity: "MUSEUM" });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Varsayılan etkinlik/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Müze" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ defaultActivity: "MUSEUM", displayName: "Mehmet Şerefoğlu" })));
  });

  it("adı düzenler ve kaydeder", async () => {
    useAuthStore.setState({ status: "signed", me });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, displayName: "Mehmet S." });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Adını düzenle" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Adını düzenle" }), { target: { value: "Mehmet S." } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Mehmet S." })));
    expect(await screen.findByText("Mehmet S.")).toBeInTheDocument();
  });
});
