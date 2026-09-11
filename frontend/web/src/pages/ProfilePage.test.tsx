import { fireEvent, render, screen, within } from "@testing-library/react";
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
    // Artboard 2735-2747: dil bloğu kartın HEP AÇIK bej ayağıdır — açmak için tıklama yok.
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

  it("varsayılan ulaşımı düzenler ve kaydeder; diğer tercihler korunur", async () => {
    useAuthStore.setState({ status: "signed", me });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, defaultTravelMode: "BIKE" });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Varsayılan ulaşım/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Bisikletle" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalledWith(
      expect.objectContaining({ defaultTravelMode: "BIKE", displayName: "Mehmet Şerefoğlu", defaultActivity: "COFFEE" })));
  });

  it("telefonda 'Hesap' bölümü /account ve /support satırlarını taşır", () => {
    useAuthStore.setState({ status: "signed", me });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    // Artboard 390 (2815-2828): masaüstünde /account avatar menüsünden açılır, telefonda o menü
    // yoktur — bu satırlar olmadan gizlilik/KVKK/hesabı sil yüzeyine hiç ulaşılamaz.
    expect(screen.getByRole("link", { name: /Hesap ve veriler/ })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: "Destek" })).toHaveAttribute("href", "/support");
  });

  /* W-17 W7: Keşfet'in varsayılan süzgeci profil ilgi alanlarıdır; en çok 5 (sunucu 400'ler). */
  it("ilgi alanlarını en çok 5 seçer ve tam tercih setiyle kaydeder", async () => {
    useAuthStore.setState({ status: "signed", me: { ...me, interests: ["COFFEE", "HIKE", "MUSEUM", "BAR"] } });
    vi.mocked(api.updateMe).mockImplementation(async (body) => ({ ...me, ...body }) as never);
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /İlgi alanların/ }));
    const group = screen.getByRole("group", { name: "İlgi alanların" });
    fireEvent.click(within(group).getByRole("checkbox", { name: "Yüzme" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalledWith(expect.objectContaining({
      interests: ["COFFEE", "HIKE", "MUSEUM", "BAR", "SWIM"], displayName: "Mehmet Şerefoğlu", defaultActivity: "COFFEE" })));
    expect(within(group).getByRole("checkbox", { name: "Sinema" })).toBeDisabled();
  });

  it("ilgi alanı kaydı düşerse çipler dokunuş anındaki değil SUNUCUNUN onayladığı listeye döner", async () => {
    useAuthStore.setState({ status: "signed", me: { ...me, interests: ["COFFEE"] } });
    // 1. dokunuşun PUT'u askıda kalır, 2. dokunuşunki düşer: geri alma [Kahve, Yüzme]'ye (sunucuda
    // hiç olmayan liste) değil, sunucunun bildiği [Kahve]'ye dönmeli.
    vi.mocked(api.updateMe)
      .mockReturnValueOnce(new Promise(() => {}) as never)
      .mockRejectedValueOnce(new Error("offline"));
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /İlgi alanların/ }));
    const group = screen.getByRole("group", { name: "İlgi alanların" });
    fireEvent.click(within(group).getByRole("checkbox", { name: "Yüzme" }));
    fireEvent.click(within(group).getByRole("checkbox", { name: "Oyun" }));
    expect(await screen.findByText("Kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(within(group).getByRole("checkbox", { name: "Yüzme" })).toHaveAttribute("aria-checked", "false");
    expect(within(group).getByRole("checkbox", { name: "Oyun" })).toHaveAttribute("aria-checked", "false");
    expect(within(group).getByRole("checkbox", { name: "Kahve" })).toHaveAttribute("aria-checked", "true");
  });

  /* Başka bir tercih kaydı ilgi alanlarını TAŞIMAZ: uçuştaki bir ilgi alanı PUT'unun yeni listesini
     bayat kopya ezmesin (sunucuda null = değiştirme). */
  it("dil kaydı gövdesine ilgi alanı listesi girmez", async () => {
    useAuthStore.setState({ status: "signed", me: { ...me, interests: ["COFFEE"] } });
    vi.mocked(api.updateMe).mockResolvedValueOnce({ ...me, language: "en" });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    await vi.waitFor(() => expect(api.updateMe).toHaveBeenCalled());
    expect(vi.mocked(api.updateMe).mock.calls.at(-1)?.[0]).not.toHaveProperty("interests");
  });

  it("rozet satırı sayaçları basar (açtığın · buluşma · hafta seri)", () => {
    useAuthStore.setState({ status: "signed", me: { ...me, stats: { sessionsHosted: 12, plansMet: 3, metStreakWeeks: 1 } } });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(screen.getByText("açtığın")).toBeInTheDocument();
    expect(screen.getByText("3 buluşma", { selector: "p" }).closest("[data-earned]")).toHaveAttribute("data-earned", "true");
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
