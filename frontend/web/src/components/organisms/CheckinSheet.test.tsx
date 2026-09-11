import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/api", () => ({ api: { checkin: vi.fn(), me: vi.fn() } }));
import { api } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import CheckinSheet from "./CheckinSheet";

const people = [{ id: "h", displayName: "Ayşe", host: true }, { id: "m", displayName: "Mehmet" }];

describe("CheckinSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ status: "anon", me: null });
  });

  it("'Evet, buluştuk' checkin(true) çağırır, bir daha sormamak için işaretler ve kapanır", async () => {
    vi.mocked(api.checkin).mockResolvedValueOnce(undefined);
    const onDone = vi.fn();
    render(<CheckinSheet slug="gp" people={people as never} onDone={onDone} onDismiss={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Buluştunuz mu?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Evet, buluştuk" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.checkin).toHaveBeenCalledWith("gp", true);
    expect(localStorage.getItem("bumpinto.checkin.gp")).toBe("1");
  });

  it("'Olmadı' checkin(false) yollar", async () => {
    vi.mocked(api.checkin).mockResolvedValueOnce(undefined);
    const onDone = vi.fn();
    render(<CheckinSheet slug="gp" people={people as never} onDone={onDone} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Olmadı" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(api.checkin).toHaveBeenCalledWith("gp", false);
  });

  it("evet sonrası yeni rozet → kutlama hâli ('yeni rozet', '3 buluşma!', sonraki rozet); Tamam kapatır", async () => {
    vi.mocked(api.checkin).mockResolvedValueOnce(undefined);
    useAuthStore.setState({ status: "signed", me: { displayName: "M", stats: { plansMet: 2, metStreakWeeks: 0 } } as never });
    // Sayaçlar /api/me'den tazelenir (authStore.load DEĞİL: ağ hatasında kullanıcıyı çıkışa düşürürdü).
    vi.mocked(api.me).mockResolvedValueOnce({ displayName: "M", stats: { plansMet: 3, metStreakWeeks: 0 } } as never);
    const onDone = vi.fn();
    render(<CheckinSheet slug="gp" people={people as never} onDone={onDone} onDismiss={vi.fn()} />);
    // Tarayıcıda tıklama düğmeye odak verir; jsdom vermez — gerçek akışı taklit et.
    const yes = screen.getByRole("button", { name: "Evet, buluştuk" });
    yes.focus();
    fireEvent.click(yes);
    expect(await screen.findByText("3 buluşma!")).toBeInTheDocument();
    expect(screen.getByText("yeni rozet")).toBeInTheDocument();
    expect(screen.getByText("Üç kez gerçekten buluştun. Bir sonraki: 10 buluşma.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    // Rozet anı YENİ bir diyalog olarak açılır: odak içeri taşınır, adı "3 buluşma!" duyurulur.
    // POZİTİF KONTROL: jsdom kaldırılan odaklı düğmede tarayıcının odak düzeltmesini uygulamıyor, bu yüzden
    // `key`siz hâldeki odak kaybı burada YENİDEN ÜRETİLEMEDİ (mutasyonla denendi); iddia davranışı belgeler.
    const dialog = screen.getByRole("dialog", { name: "3 buluşma!" });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Tamam" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("sayaç tazelemesi düşerse kullanıcı çıkışa DÜŞMEZ; sessizce kapanır", async () => {
    vi.mocked(api.checkin).mockResolvedValueOnce(undefined);
    vi.mocked(api.me).mockRejectedValueOnce(new Error("net"));
    useAuthStore.setState({ status: "signed", me: { displayName: "M", stats: { plansMet: 2 } } as never });
    const onDone = vi.fn();
    render(<CheckinSheet slug="gp" people={people as never} onDone={onDone} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Evet, buluştuk" }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(useAuthStore.getState().status).toBe("signed");
  });

  it("buluşma saati sunucuya göre henüz geçmediyse (409) işaretlenmez, hata basılır", async () => {
    vi.mocked(api.checkin).mockRejectedValueOnce({ response: { status: 409, data: { error: "meet has not passed yet" } } });
    const onDone = vi.fn();
    render(<CheckinSheet slug="gp" people={people as never} onDone={onDone} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Evet, buluştuk" }));
    expect(await screen.findByText("Cevabın kaydedilemedi — tekrar dene.")).toBeInTheDocument();
    expect(localStorage.getItem("bumpinto.checkin.gp")).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
  });
});
